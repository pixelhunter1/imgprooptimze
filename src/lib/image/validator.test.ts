import { describe, it, expect } from 'vitest'
import { validateImageFile, validateImageFiles } from './validator'

function makeFile(name: string, type: string): File {
  return new File([new Uint8Array(4)], name, { type })
}

describe('validateImageFile', () => {
  it('accepts png/jpeg/webp/avif with matching extension', () => {
    expect(validateImageFile(makeFile('a.png', 'image/png')).isValid).toBe(true)
    expect(validateImageFile(makeFile('a.jpg', 'image/jpeg')).isValid).toBe(true)
    expect(validateImageFile(makeFile('a.jpeg', 'image/jpeg')).isValid).toBe(true)
    expect(validateImageFile(makeFile('a.webp', 'image/webp')).isValid).toBe(true)
    expect(validateImageFile(makeFile('a.avif', 'image/avif')).isValid).toBe(true)
  })

  it('rejects disallowed MIME types', () => {
    const result = validateImageFile(makeFile('a.gif', 'image/gif'))
    expect(result.isValid).toBe(false)
    expect(result.error).toMatch(/Invalid file type/)
  })

  it('rejects extension/MIME mismatches', () => {
    const result = validateImageFile(makeFile('a.png', 'image/jpeg'))
    expect(result.isValid).toBe(false)
    expect(result.error).toMatch(/doesn't match/)
  })
})

describe('validateImageFiles', () => {
  it('separates valid and invalid files', () => {
    const files = [
      makeFile('a.png', 'image/png'),
      makeFile('b.gif', 'image/gif'),
      makeFile('c.webp', 'image/webp')
    ]
    const result = validateImageFiles(files)
    expect(result.validFiles).toHaveLength(2)
    expect(result.invalidFiles).toHaveLength(1)
    expect(result.hasValidFiles).toBe(true)
    expect(result.hasInvalidFiles).toBe(true)
  })
})
