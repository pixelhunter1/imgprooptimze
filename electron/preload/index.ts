import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Save a single file with native dialog
  saveFile: (buffer: ArrayBuffer, defaultName: string): Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }> => {
    return ipcRenderer.invoke('save-file', buffer, defaultName)
  },

  // Save a ZIP file with native dialog
  saveZip: (buffer: ArrayBuffer, defaultName: string): Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }> => {
    return ipcRenderer.invoke('save-zip', buffer, defaultName)
  },

  optimizeImage: (payload: {
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
  }): Promise<{ success: boolean; buffer?: ArrayBuffer; mimeType?: string; width?: number; height?: number; error?: string }> => {
    return ipcRenderer.invoke('optimize-image', payload)
  },

  // Get app version
  getAppVersion: (): Promise<string> => {
    return ipcRenderer.invoke('get-app-version')
  },

  // Check if running in Electron
  isElectron: true
})
