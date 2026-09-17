import Module from 'node:module'
import { join, dirname } from 'node:path'
import { existsSync } from 'node:fs'

const _originalResolveFilename = (Module as any)._resolveFilename

;(Module as any)._resolveFilename = function (request: string, parent: any, ...rest: any[]) {
  if (request === '.prisma/client/default') {
    try {
      return _originalResolveFilename.call(this, request, parent, ...rest)
    } catch {
      const candidates: string[] = []

      if (parent?.filename) {
        candidates.push(join(dirname(parent.filename), '.prisma', 'client', 'default.js'))
      }

      try {
        const appPath = require('electron').app.isPackaged
          ? join(require('electron').process.resourcesPath, 'app')
          : process.cwd()
        candidates.push(join(appPath, 'node_modules', '@prisma', 'client', '.prisma', 'client', 'default.js'))
        candidates.push(join(appPath, 'node_modules', '.prisma', 'client', 'default.js'))
      } catch { /* ignore */ }

      candidates.push(join(process.cwd(), 'node_modules', '@prisma', 'client', '.prisma', 'client', 'default.js'))
      candidates.push(join(process.cwd(), 'node_modules', '.prisma', 'client', 'default.js'))

      for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate
      }

      throw new Error(
        `Cannot find module '.prisma/client/default'. Tried:\n${candidates.map(c => `  - ${c}`).join('\n')}`
      )
    }
  }
  return _originalResolveFilename.call(this, request, parent, ...rest)
}
