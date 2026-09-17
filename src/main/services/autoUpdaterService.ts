import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import { ipcMain, BrowserWindow } from 'electron'
import { appLog } from '../logger'

export function initAutoUpdater(mainWindow: BrowserWindow) {
  autoUpdater.logger = log
  // @ts-ignore
  autoUpdater.logger.transports.file.level = 'info'

  appLog('INFO', 'updater', 'Initialisation auto-updater')

  autoUpdater.on('checking-for-update', () => {
    appLog('INFO', 'updater', 'Vérification des mises à jour...')
  })

  autoUpdater.on('update-available', (info) => {
    appLog('INFO', 'updater', `Mise à jour disponible : ${info.version}`)
    mainWindow.webContents.send('update:available', info)
  })

  autoUpdater.on('update-not-available', () => {
    appLog('INFO', 'updater', 'Pas de mise à jour disponible')
  })

  autoUpdater.on('error', (err) => {
    const msg = String(err)
    // Ignorer silencieusement les erreurs 404 / latest.yml (pas de release GitHub)
    if (msg.includes('latest.yml') || msg.includes('404') || msg.includes('Cannot find')) {
      appLog('WARN', 'updater', `Check silencié (pas de release) : ${msg}`)
      return
    }
    appLog('ERROR', 'updater', `Erreur : ${msg}`)
    mainWindow.webContents.send('update:error', msg)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    appLog('INFO', 'updater', `Téléchargement : ${(progressObj as any).percentage?.toFixed(0) ?? progressObj.percent?.toFixed(0)}%`)
  })

  autoUpdater.on('update-downloaded', (info) => {
    appLog('INFO', 'updater', `Mise à jour téléchargée : ${info.version}`)
    mainWindow.webContents.send('update:downloaded', info)
  })

  ipcMain.on('update:check', () => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      const msg = String(err)
      if (msg.includes('latest.yml') || msg.includes('404') || msg.includes('Cannot find')) {
        appLog('WARN', 'updater', `Check silencié (pas de release) : ${msg}`)
        return
      }
      appLog('ERROR', 'updater', `Erreur checkForUpdates : ${msg}`)
    })
  })

  ipcMain.on('update:install', () => {
    autoUpdater.quitAndInstall()
  })
}
