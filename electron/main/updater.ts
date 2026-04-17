import { app, BrowserWindow, ipcMain } from 'electron'
import pkg from 'electron-updater'
import log from 'electron-log'

const { autoUpdater } = pkg

type UpdaterStatus =
  | { type: 'checking' }
  | { type: 'available'; version: string; releaseNotes?: string | null }
  | { type: 'not-available'; version: string }
  | { type: 'download-progress'; percent: number; bytesPerSecond: number; transferred: number; total: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

function broadcast(status: UpdaterStatus): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('updater:status', status)
    }
  }
}

export function initAutoUpdater(): void {
  if (!app.isPackaged) {
    log.info('Auto-updater disabled in dev mode')
    return
  }

  autoUpdater.logger = log
  log.transports.file.level = 'info'

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => broadcast({ type: 'checking' }))

  autoUpdater.on('update-available', (info) => {
    broadcast({
      type: 'available',
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    broadcast({ type: 'not-available', version: info.version })
  })

  autoUpdater.on('download-progress', (p) => {
    broadcast({
      type: 'download-progress',
      percent: p.percent,
      bytesPerSecond: p.bytesPerSecond,
      transferred: p.transferred,
      total: p.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    broadcast({ type: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', (err) => {
    broadcast({ type: 'error', message: err?.message ?? 'Unknown updater error' })
  })

  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { ok: true, version: result?.updateInfo.version ?? null }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall()
  })

  // Initial check a few seconds after launch
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.warn('Initial update check failed:', err)
    })
  }, 5000)
}
