export interface SaveResult {
  success: boolean
  filePath?: string
  canceled?: boolean
  error?: string
}

export interface ElectronAPI {
  saveFile: (buffer: ArrayBuffer, defaultName: string) => Promise<SaveResult>
  saveZip: (buffer: ArrayBuffer, defaultName: string) => Promise<SaveResult>
  getAppVersion: () => Promise<string>
  isElectron: boolean
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
