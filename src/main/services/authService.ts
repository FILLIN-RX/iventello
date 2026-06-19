import { PrismaClient, User } from '@prisma/client'
import bcrypt from 'bcryptjs'

export type CreateUserData = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'externalId' | 'cloudSyncedAt'> & {
  password: string
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
      const valid = await bcrypt.compare(password, user.passwordHash)
      return valid ? user : null
    },

    async getAllUsers() {
      return prisma.user.findMany()
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
    }
  }
}
