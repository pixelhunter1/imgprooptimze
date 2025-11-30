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

  // Get app version
  getAppVersion: (): Promise<string> => {
    return ipcRenderer.invoke('get-app-version')
  },

  // Check if running in Electron
  isElectron: true
})
