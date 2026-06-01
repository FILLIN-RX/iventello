import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import { ipcMain, BrowserWindow } from 'electron'

export function initAutoUpdater(mainWindow: BrowserWindow) {
  // Configurer le logger
  autoUpdater.logger = log
  // @ts-ignore (electron-log types can be tricky)
  autoUpdater.logger.transports.file.level = 'info'

  log.info('App starting...')

  // Vérifier les mises à jour et notifier
  // autoUpdater.checkForUpdatesAndNotify() 
  // On va plutôt le faire manuellement ou au démarrage via IPC

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...')
  })

  autoUpdater.on('update-available', (info) => {
    log.info('Update available.')
    mainWindow.webContents.send('update:available', info)
  })

  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available.')
  })

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater: ' + err)
    mainWindow.webContents.send('update:error', err.toString())
  })

  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond
    log_message = log_message + ' - Downloaded ' + progressObj.percentage + '%'
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')'
    log.info(log_message)
  })

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded')
    mainWindow.webContents.send('update:downloaded', info)
  })

  // Handlers IPC
  ipcMain.on('update:check', () => {
    autoUpdater.checkForUpdatesAndNotify()
  })

  ipcMain.on('update:install', () => {
    autoUpdater.quitAndInstall()
  })
}
