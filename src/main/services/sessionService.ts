import { User } from '@prisma/client'
import { app } from 'electron'
import { join } from 'node:path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'

let currentSession: User | null = null

function getSessionPath(): string {
  const userData = app.getPath('userData')
  return join(userData, 'session.json')
}

function loadFromDisk(): User | null {
  try {
    const path = getSessionPath()
    if (!existsSync(path)) return null
    const raw = readFileSync(path, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveToDisk(user: User | null): void {
  try {
    if (!user) {
      const path = getSessionPath()
      if (existsSync(path)) writeFileSync(path, '', 'utf-8')
      return
    }
    const dir = app.getPath('userData')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(getSessionPath(), JSON.stringify(user), 'utf-8')
  } catch { /* ignore */ }
}

export const sessionService = {
  getCurrentSession: (): User | null => {
    if (!currentSession) {
      currentSession = loadFromDisk()
    }
    return currentSession
  },
  setCurrentSession: (user: User | null) => {
    currentSession = user
    saveToDisk(user)
  },
  clearSession: () => {
    currentSession = null
    saveToDisk(null)
  }
}
