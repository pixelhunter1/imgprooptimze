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

export type UpdaterStatus =
  | { type: 'checking' }
  | { type: 'available'; version: string; releaseNotes?: string | null }
  | { type: 'not-available'; version: string }
  | { type: 'download-progress'; percent: number; bytesPerSecond: number; transferred: number; total: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

export interface ElectronUpdaterAPI {
  check: () => Promise<{ ok: boolean; version?: string | null; error?: string }>
  download: () => Promise<{ ok: boolean; error?: string }>
  install: () => Promise<void>
  onStatus: (callback: (status: UpdaterStatus) => void) => () => void
}

export interface ElectronAPI {
  saveFile: (buffer: ArrayBuffer, defaultName: string) => Promise<SaveResult>
  saveZip: (buffer: ArrayBuffer, defaultName: string) => Promise<SaveResult>
  optimizeImage: (payload: ElectronOptimizationPayload) => Promise<ElectronOptimizationResult>
  getAppVersion: () => Promise<string>
  updater: ElectronUpdaterAPI
  isElectron: boolean
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
