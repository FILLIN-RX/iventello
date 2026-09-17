import { app } from 'electron'
import { join } from 'node:path'
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { appLog } from '../logger'

const MAX_BACKUPS = 7
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24h

export interface BackupInfo {
  fileName: string
  filePath: string
  date: string
  sizeBytes: number
}

function getBackupDir(): string {
  return join(app.getPath('userData'), 'backups')
}

function getDbPath(): string {
  return join(app.getPath('userData'), 'database.db')
}

function formatDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function formatDateTime(): string {
  const now = new Date()
  return `${formatDate()}_${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`
}

function ensureBackupDir(): string {
  const dir = getBackupDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function pruneOldBackups(dir: string): void {
  try {
    const files = readdirSync(dir)
      .filter(f => f.startsWith('database-') && f.endsWith('.db'))
      .map(f => ({ name: f, path: join(dir, f), mtime: statSync(join(dir, f)).mtime.getTime() }))
      .sort((a, b) => b.mtime - a.mtime)

    // Supprimer les backups au-delà de MAX_BACKUPS
    for (const file of files.slice(MAX_BACKUPS)) {
      unlinkSync(file.path)
      appLog('INFO', 'backup', `Ancienne sauvegarde supprimée : ${file.name}`)
    }
  } catch (e) {
    appLog('WARN', 'backup', `Erreur élagage sauvegardes : ${e}`)
  }
}

export const backupService = {
  /** Crée une sauvegarde immédiate de la base */
  createBackup(): BackupInfo {
    const dir = ensureBackupDir()
    const dbPath = getDbPath()

    if (!existsSync(dbPath)) {
      throw new Error('Base de données introuvable — sauvegarde impossible')
    }

    const fileName = `database-${formatDateTime()}.db`
    const destPath = join(dir, fileName)
    copyFileSync(dbPath, destPath)
    const sizeBytes = statSync(destPath).size

    pruneOldBackups(dir)

    appLog('INFO', 'backup', `Sauvegarde créée : ${fileName} (${Math.round(sizeBytes / 1024)} Ko)`)
    return { fileName, filePath: destPath, date: new Date().toISOString(), sizeBytes }
  },

  /** Liste toutes les sauvegardes disponibles, du plus récent au plus ancien */
  listBackups(): BackupInfo[] {
    const dir = getBackupDir()
    if (!existsSync(dir)) return []

    return readdirSync(dir)
      .filter(f => f.startsWith('database-') && f.endsWith('.db'))
      .map(f => {
        const p = join(dir, f)
        const stat = statSync(p)
        return { fileName: f, filePath: p, date: stat.mtime.toISOString(), sizeBytes: stat.size }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  },

  /** Restaure une sauvegarde (remplace la DB active — DANGER) */
  restoreBackup(backupFilePath: string): void {
    const dbPath = getDbPath()
    if (!existsSync(backupFilePath)) throw new Error('Fichier de sauvegarde introuvable')

    // Sauvegarde de sécurité avant restauration
    const safetyBackup = join(getBackupDir(), `database-pre-restore-${formatDateTime()}.db`)
    if (existsSync(dbPath)) copyFileSync(dbPath, safetyBackup)

    copyFileSync(backupFilePath, dbPath)
    appLog('INFO', 'backup', `Base restaurée depuis : ${backupFilePath}`)
  },

  /** Lance la sauvegarde automatique au démarrage + toutes les 24h */
  startAutoBackup(): void {
    // Sauvegarde immédiate au démarrage
    try {
      this.createBackup()
    } catch (e) {
      appLog('WARN', 'backup', `Sauvegarde démarrage échouée : ${e}`)
    }

    // Sauvegarde toutes les 24h
    setInterval(() => {
      try {
        this.createBackup()
      } catch (e) {
        appLog('WARN', 'backup', `Sauvegarde automatique échouée : ${e}`)
      }
    }, BACKUP_INTERVAL_MS)
  }
}
