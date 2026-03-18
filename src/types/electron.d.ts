export interface SaveResult {
  success: boolean
  filePath?: string
  canceled?: boolean
  error?: string
}

export interface ElectronOptimizationPayload {
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

export interface ElectronOptimizationResult {
  success: boolean
  buffer?: ArrayBuffer
  mimeType?: string
  width?: number
  height?: number
  error?: string
}

export interface ElectronAPI {
  saveFile: (buffer: ArrayBuffer, defaultName: string) => Promise<SaveResult>
  saveZip: (buffer: ArrayBuffer, defaultName: string) => Promise<SaveResult>
  optimizeImage: (payload: ElectronOptimizationPayload) => Promise<ElectronOptimizationResult>
  getAppVersion: () => Promise<string>
  isElectron: boolean
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
