import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { writeFile } from 'fs/promises'
import { createMenu } from './menu'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: false,
    titleBarStyle: 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the app
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// IPC Handlers for native file operations
ipcMain.handle('save-file', async (_event, buffer: ArrayBuffer, defaultName: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: 'Guardar Imagem',
    defaultPath: defaultName,
    filters: [
      { name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'webp', 'avif'] },
      { name: 'Todos os ficheiros', extensions: ['*'] }
    ]
  })

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true }
  }

  try {
    await writeFile(result.filePath, Buffer.from(buffer))
    return { success: true, filePath: result.filePath }
  } catch (error) {
    console.error('Error saving file:', error)
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('save-zip', async (_event, buffer: ArrayBuffer, defaultName: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: 'Guardar ZIP',
    defaultPath: defaultName,
    filters: [
      { name: 'Arquivo ZIP', extensions: ['zip'] },
      { name: 'Todos os ficheiros', extensions: ['*'] }
    ]
  })

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true }
  }

  try {
    await writeFile(result.filePath, Buffer.from(buffer))
    return { success: true, filePath: result.filePath }
  } catch (error) {
    console.error('Error saving ZIP:', error)
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

// App lifecycle
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.imgoptimizerpro.app')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  createMenu()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
