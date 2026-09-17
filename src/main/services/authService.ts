import { PrismaClient, User } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

export type CreateUserData = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'externalId' | 'cloudSyncedAt'> & {
  password: string
}

const RECOVERY_CODE_FILE = 'Iventello-CodeRecuperation.txt'

function getRecoveryFilePath(): string {
  return join(app.getPath('desktop'), RECOVERY_CODE_FILE)
}

export function createAuthService(prisma: PrismaClient) {
  return {
    async createUser(data: CreateUserData) {
      const passwordHash = await bcrypt.hash(data.password, 10)
      const { password, ...userData } = data
      return prisma.user.create({
        data: { ...userData, passwordHash }
      })
    },

    async verifyUser(email: string, password: string) {
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) return null
      if (!user.active) return null
      const valid = await bcrypt.compare(password, user.passwordHash)
      return valid ? user : null
    },

    async getAllUsers() {
      return prisma.user.findMany({
        include: {
          warehouseAccess: {
            include: {
              warehouse: true
            }
          }
        }
      })
    },

    async getUserById(id: string) {
      return prisma.user.findUnique({ where: { id } })
    },

    async updateUser(id: string, data: Partial<Omit<User, 'id' | 'passwordHash'>>) {
      return prisma.user.update({ where: { id }, data })
    },

    async deleteUser(id: string) {
      return prisma.user.delete({ where: { id } })
    },

    async changePassword(id: string, oldPassword: string, newPassword: string) {
      const user = await prisma.user.findUnique({ where: { id } })
      if (!user) throw new Error('Utilisateur introuvable')
      const valid = await bcrypt.compare(oldPassword, user.passwordHash)
      if (!valid) throw new Error('Ancien mot de passe incorrect')
      const passwordHash = await bcrypt.hash(newPassword, 10)
      return prisma.user.update({ where: { id }, data: { passwordHash } })
    },

    async assignWarehouseAccess(userId: string, warehouseIds: string[]) {
      await prisma.userWarehouse.deleteMany({ where: { userId } })
      await prisma.userWarehouse.createMany({
        data: warehouseIds.map(warehouseId => ({ userId, warehouseId }))
      })
    },
    
    async hasUsers() {
        const count = await prisma.user.count()
        return count > 0
    },

    async hashPassword(password: string) {
      return bcrypt.hash(password, 10)
    },

    // ── Sécurité : question de récupération ────────────────────────────

    /** Définit ou modifie la question de sécurité d'un utilisateur (raw SQL) */
    async setSecurityQuestion(id: string, question: string, answer: string) {
      const securityAnswer = await bcrypt.hash(answer.toLowerCase().trim(), 10)
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "securityQuestion" = ?, "securityAnswer" = ? WHERE "id" = ?`,
        question, securityAnswer, id
      )
      return prisma.user.findUnique({ where: { id } })
    },

    /** Vérifie si un email a une question de sécurité (raw SQL) */
    async hasSecurityQuestion(email: string): Promise<{ has: boolean; question: string | null }> {
      const rows = await prisma.$queryRawUnsafe<{ securityQuestion: string | null; securityAnswer: string | null }[]>(
        `SELECT "securityQuestion", "securityAnswer" FROM "User" WHERE "email" = ?`,
        email
      )
      if (!rows.length || !rows[0].securityQuestion || !rows[0].securityAnswer) {
        return { has: false, question: null }
      }
      return { has: true, question: rows[0].securityQuestion }
    },

    /** Vérifie la réponse à la question de sécurité (raw SQL) */
    async verifySecurityAnswer(email: string, answer: string): Promise<boolean> {
      const rows = await prisma.$queryRawUnsafe<{ securityAnswer: string | null }[]>(
        `SELECT "securityAnswer" FROM "User" WHERE "email" = ?`,
        email
      )
      if (!rows.length || !rows[0].securityAnswer) return false
      return bcrypt.compare(answer.toLowerCase().trim(), rows[0].securityAnswer)
    },

    /** Réinitialise le mot de passe sans vérifier l'ancien */
    async resetPassword(email: string, newPassword: string) {
      const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT "id" FROM "User" WHERE "email" = ?`, email
      )
      if (!rows.length) throw new Error('Utilisateur introuvable')
      const passwordHash = await bcrypt.hash(newPassword, 10)
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "passwordHash" = ? WHERE "email" = ?`,
        passwordHash, email
      )
      return prisma.user.findUnique({ where: { email } })
    },

    /** PROPRIETAIRE : réinitialise le mot de passe d'un autre utilisateur */
    async adminResetPassword(id: string, newPassword: string) {
      const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT "id" FROM "User" WHERE "id" = ?`, id
      )
      if (!rows.length) throw new Error('Utilisateur introuvable')
      const passwordHash = await bcrypt.hash(newPassword, 10)
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "passwordHash" = ? WHERE "id" = ?`,
        passwordHash, id
      )
      return prisma.user.findUnique({ where: { id } })
    },

    // ── Code de récupération (pour PROPRIETAIRE) ───────────────────────

    /** Génère un code de récupération pour le propriétaire */
    async generateRecoveryCode(userId: string): Promise<string> {
      const code = randomBytes(8).toString('hex').toUpperCase().slice(0, 12)
      const recoveryCodeHash = await bcrypt.hash(code, 10)
      
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "recoveryCodeHash" = ? WHERE "id" = ?`,
        recoveryCodeHash, userId
      )

      // Sauvegarde sur le bureau
      const filePath = getRecoveryFilePath()
      const content = [
        '═══════════════════════════════════════════',
        '  CODE DE RÉCUPÉRATION IVENTELLO',
        '  Conservez ce code précieusement.',
        '  Il vous permet de réinitialiser votre',
        '  mot de passe si vous l\'oubliez.',
        '',
        `  Code : ${code}`,
        '',
        '  Ne partagez pas ce code avec d\'autres.',
        '═══════════════════════════════════════════',
      ].join('\n')
      
      writeFileSync(filePath, content, 'utf-8')
      return code
    },

    /** Vérifie un code de récupération (raw SQL) */
    async verifyRecoveryCode(email: string, code: string): Promise<boolean> {
      const rows = await prisma.$queryRawUnsafe<{ recoveryCodeHash: string | null }[]>(
        `SELECT "recoveryCodeHash" FROM "User" WHERE "email" = ?`,
        email
      )
      if (!rows.length || !rows[0].recoveryCodeHash) return false
      return bcrypt.compare(code.toUpperCase(), rows[0].recoveryCodeHash)
    },

    /** Vérifie si l'utilisateur a un code de récupération (raw SQL) */
    async hasRecoveryCode(email: string): Promise<boolean> {
      const rows = await prisma.$queryRawUnsafe<{ recoveryCodeHash: string | null }[]>(
        `SELECT "recoveryCodeHash" FROM "User" WHERE "email" = ?`,
        email
      )
      return rows.length > 0 && !!rows[0].recoveryCodeHash
    },

    /** Vérifie si le mot de passe correspond à un compte Propriétaire ou Admin */
    async verifyOwnerPassword(password: string): Promise<boolean> {
      const owners = await prisma.user.findMany({
        where: { role: { in: ['PROPRIETAIRE', 'ADMIN'] }, active: true }
      })
      for (const owner of owners) {
        const valid = await bcrypt.compare(password, owner.passwordHash)
        if (valid) return true
      }
      return false
    }
  }
}
