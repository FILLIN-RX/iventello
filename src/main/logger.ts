import { appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const DESKTOP_LOG = join(homedir(), 'Desktop', 'iventello.log')

export function appLog(level: string, module: string, msg: string): void {
  try { appendFileSync(DESKTOP_LOG, `[${new Date().toISOString()}] [${level}] [${module}] ${msg}\n`) } catch (_) {}
}

export function initLog(): void {
  try {
    const { writeFileSync } = require('node:fs') as typeof import('node:fs')
    writeFileSync(DESKTOP_LOG, `=== Iventello Log — ${new Date().toISOString()} ===\n`)
  } catch (_) {}
  appLog('INFO', 'main', `Plateforme: ${process.platform} | Node: ${process.version} | Electron: ${process.versions?.electron || '?'}`)
}
