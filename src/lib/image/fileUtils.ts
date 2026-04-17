export type ImageFormat = 'webp' | 'jpeg' | 'png' | 'avif'

const MIME_TYPES: Record<ImageFormat, string> = {
  webp: 'image/webp',
  jpeg: 'image/jpeg',
  png: 'image/png',
  avif: 'image/avif'
}

const EXTENSIONS: Record<ImageFormat, string> = {
  webp: '.webp',
  jpeg: '.jpg',
  png: '.png',
  avif: '.avif'
}

export function getFileType(format: ImageFormat): string {
  return MIME_TYPES[format]
}

export function getExtensionFromFormat(format: ImageFormat): string {
  return EXTENSIONS[format]
}

export function getFormatFromMimeType(mimeType: string): ImageFormat {
  if (mimeType.includes('avif')) return 'avif'
  if (mimeType.includes('webp')) return 'webp'
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpeg'
  if (mimeType.includes('png')) return 'png'
  return 'jpeg'
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Sanitizes a filename for Google Merchant Center compatibility
export function sanitizeFilename(filename: string): string {
  return (
    filename
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'image'
  )
}

export function generateFileName(originalName: string, format: ImageFormat): string {
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '')
  return `${sanitizeFilename(nameWithoutExt)}${EXTENSIONS[format]}`
}

export function ensureUniqueFilename(filename: string, used: Set<string>): string {
  if (!used.has(filename)) return filename

  const lastDot = filename.lastIndexOf('.')
  const base = lastDot > 0 ? filename.slice(0, lastDot) : filename
  const ext = lastDot > 0 ? filename.slice(lastDot) : ''

  let i = 1
  let candidate = `${base}-${i}${ext}`
  while (used.has(candidate)) {
    i += 1
    candidate = `${base}-${i}${ext}`
  }
  return candidate
}
