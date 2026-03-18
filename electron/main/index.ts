import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { writeFile } from 'fs/promises'
import sharp from 'sharp'
import { createMenu } from './menu'

let mainWindow: BrowserWindow | null = null

type OptimizeImageRequest = {
  buffer: ArrayBuffer
  fileName: string
  mimeType: string
  options: {
    format: 'webp' | 'jpeg' | 'png' | 'avif'
    quality: number
    maxSizeMB?: number
    maxWidthOrHeight?: number
    preserveExif?: boolean
    progressiveJpeg?: boolean
    losslessWebP?: boolean
    pngCompressionLevel?: number
  }
}

type OptimizeImageResponse = {
  success: boolean
  buffer?: ArrayBuffer
  mimeType?: string
  width?: number
  height?: number
  error?: string
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
}

function getTargetMimeType(format: OptimizeImageRequest['options']['format']): string {
  switch (format) {
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'avif':
      return 'image/avif'
  }
}

function getFormatFromMetadata(format?: string): OptimizeImageRequest['options']['format'] | null {
  switch (format) {
    case 'jpeg':
    case 'jpg':
      return 'jpeg'
    case 'png':
      return 'png'
    case 'webp':
      return 'webp'
    case 'avif':
      return 'avif'
    default:
      return null
  }
}

async function encodeWithSharp(
  inputBuffer: Buffer,
  options: OptimizeImageRequest['options']
): Promise<{ data: Buffer; info: sharp.OutputInfo }> {
  const metadata = await sharp(inputBuffer, { failOn: 'none', sequentialRead: true }).metadata()
  const inputFormat = getFormatFromMetadata(metadata.format)
  const originalSize = inputBuffer.byteLength
  const maxBytes = options.maxSizeMB ? Math.round(options.maxSizeMB * 1024 * 1024) : undefined
  const baseQuality = Math.max(1, Math.min(100, Math.round(options.quality * 100)))
  const candidateQualities = [baseQuality]
  const canIterateQuality = options.format !== 'png' && !(options.format === 'webp' && options.losslessWebP)
  const shouldTargetSmallerOutput = !maxBytes && inputFormat === options.format
  const shouldResize = Boolean(
    options.maxWidthOrHeight &&
    metadata.width &&
    metadata.height &&
    (metadata.width > options.maxWidthOrHeight || metadata.height > options.maxWidthOrHeight)
  )

  if ((maxBytes || shouldTargetSmallerOutput) && canIterateQuality) {
    let nextQuality = baseQuality - 8
    while (nextQuality >= 35) {
      candidateQualities.push(nextQuality)
      nextQuality -= 8
    }
  }

  let bestResult: { data: Buffer; info: sharp.OutputInfo } | null = null

  for (const quality of candidateQualities) {
    let pipeline = sharp(inputBuffer, { failOn: 'none', sequentialRead: true }).rotate()

    if (options.format === 'jpeg' && metadata.hasAlpha) {
      pipeline = pipeline.flatten({ background: '#ffffff' })
    }

    if (shouldResize && options.maxWidthOrHeight) {
      pipeline = pipeline.resize({
        width: options.maxWidthOrHeight,
        height: options.maxWidthOrHeight,
        fit: 'inside',
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3
      }).sharpen()
    }

    if (options.preserveExif) {
      pipeline = pipeline.withMetadata()
    }

    switch (options.format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({
          quality,
          mozjpeg: true,
          progressive: options.progressiveJpeg ?? true,
          chromaSubsampling: quality >= 90 ? '4:4:4' : '4:2:0'
        })
        break
      case 'webp':
        pipeline = pipeline.webp({
          quality: options.losslessWebP ? 100 : quality,
          lossless: options.losslessWebP ?? false,
          effort: 6,
          alphaQuality: 100,
          smartSubsample: true,
          smartDeblock: quality < 85,
          nearLossless: !options.losslessWebP && quality >= 85,
          preset: metadata.hasAlpha ? 'picture' : 'photo'
        })
        break
      case 'avif':
        pipeline = pipeline.avif({
          quality,
          effort: quality >= 90 ? 8 : 6,
          chromaSubsampling: quality >= 85 ? '4:4:4' : '4:2:0'
        })
        break
      case 'png':
        pipeline = pipeline.png({
          compressionLevel: options.pngCompressionLevel ?? 6,
          progressive: false,
          adaptiveFiltering: true,
          palette: options.quality < 1.0,
          quality: Math.max(60, quality)
        })
        break
    }

    const result = await pipeline.toBuffer({ resolveWithObject: true })
    if (!bestResult || result.data.byteLength < bestResult.data.byteLength) {
      bestResult = result
    }

    if (maxBytes && result.data.byteLength <= maxBytes) {
      return result
    }

    if (shouldTargetSmallerOutput && result.data.byteLength < originalSize) {
      return result
    }

    if (!maxBytes && !shouldTargetSmallerOutput) {
      return result
    }
  }

  if (!bestResult) {
    throw new Error('Failed to encode image')
  }

  return bestResult
}

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

ipcMain.handle('optimize-image', async (_event, payload: OptimizeImageRequest): Promise<OptimizeImageResponse> => {
  try {
    const inputBuffer = Buffer.from(payload.buffer)
    const result = await encodeWithSharp(inputBuffer, payload.options)

    return {
      success: true,
      buffer: toArrayBuffer(result.data),
      mimeType: getTargetMimeType(payload.options.format),
      width: result.info.width,
      height: result.info.height
    }
  } catch (error) {
    console.error('Error optimizing image:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
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
