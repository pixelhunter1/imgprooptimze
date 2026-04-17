import { describe, it, expect } from 'vitest'
import {
  ensureUniqueFilename,
  formatFileSize,
  generateFileName,
  getExtensionFromFormat,
  getFileType,
  getFormatFromMimeType,
  sanitizeFilename
} from './fileUtils'

describe('getFileType', () => {
  it('returns the correct MIME type for each format', () => {
    expect(getFileType('webp')).toBe('image/webp')
    expect(getFileType('jpeg')).toBe('image/jpeg')
    expect(getFileType('png')).toBe('image/png')
    expect(getFileType('avif')).toBe('image/avif')
  })
})

describe('getExtensionFromFormat', () => {
  it('returns extensions with leading dot', () => {
    expect(getExtensionFromFormat('webp')).toBe('.webp')
    expect(getExtensionFromFormat('jpeg')).toBe('.jpg')
    expect(getExtensionFromFormat('png')).toBe('.png')
    expect(getExtensionFromFormat('avif')).toBe('.avif')
  })
})

describe('getFormatFromMimeType', () => {
  it('maps common MIME strings', () => {
    expect(getFormatFromMimeType('image/avif')).toBe('avif')
    expect(getFormatFromMimeType('image/webp')).toBe('webp')
    expect(getFormatFromMimeType('image/jpeg')).toBe('jpeg')
    expect(getFormatFromMimeType('image/png')).toBe('png')
  })

  it('recognizes the "jpg" substring', () => {
    expect(getFormatFromMimeType('image/jpg')).toBe('jpeg')
  })

  it('falls back to jpeg for unknown types', () => {
    expect(getFormatFromMimeType('image/tiff')).toBe('jpeg')
    expect(getFormatFromMimeType('')).toBe('jpeg')
  })
})

describe('formatFileSize', () => {
  it('formats bytes, KB, MB and GB', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1024 * 1024)).toBe('1 MB')
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
  })

  it('keeps two decimals when not exact', () => {
    expect(formatFileSize(1500)).toBe('1.46 KB')
  })
})

describe('sanitizeFilename', () => {
  it('lowercases and strips diacritics', () => {
    expect(sanitizeFilename('Olá Mundo')).toBe('ola-mundo')
    expect(sanitizeFilename('café-à-pé')).toBe('cafe-a-pe')
  })

  it('replaces spaces with a single hyphen', () => {
    expect(sanitizeFilename('a   b   c')).toBe('a-b-c')
  })

  it('collapses repeated hyphens and trims edges', () => {
    expect(sanitizeFilename('--foo--bar--')).toBe('foo-bar')
  })

  it('falls back to "image" when everything is stripped', () => {
    expect(sanitizeFilename('!!!???')).toBe('image')
    expect(sanitizeFilename('')).toBe('image')
  })
})

describe('generateFileName', () => {
  it('replaces the extension based on the target format', () => {
    expect(generateFileName('photo.jpg', 'webp')).toBe('photo.webp')
    expect(generateFileName('Photo With Spaces.PNG', 'jpeg')).toBe('photo-with-spaces.jpg')
  })

  it('sanitizes the base name', () => {
    expect(generateFileName('Minha Foto.jpeg', 'avif')).toBe('minha-foto.avif')
  })
})

describe('ensureUniqueFilename', () => {
  it('returns the same name when it is not taken', () => {
    expect(ensureUniqueFilename('a.webp', new Set())).toBe('a.webp')
  })

  it('appends -1, -2, ... when collisions exist', () => {
    const used = new Set(['a.webp', 'a-1.webp'])
    expect(ensureUniqueFilename('a.webp', used)).toBe('a-2.webp')
  })

  it('handles names without an extension', () => {
    const used = new Set(['file'])
    expect(ensureUniqueFilename('file', used)).toBe('file-1')
  })
})
