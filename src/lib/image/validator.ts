export interface FileValidationResult {
  isValid: boolean
  error?: string
  fileName: string
}

export interface BatchValidationResult {
  validFiles: File[]
  invalidFiles: FileValidationResult[]
  hasValidFiles: boolean
  hasInvalidFiles: boolean
}

export const ALLOWED_IMAGE_FORMATS = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif']
} as const

export const ALLOWED_MIME_TYPES = Object.keys(ALLOWED_IMAGE_FORMATS) as string[]

const INTEGRITY_TIMEOUT_MS = 5000

export function validateImageFile(file: File): FileValidationResult {
  const fileName = file.name
  const mimeType = file.type
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      isValid: false,
      error: `Invalid file type. Only PNG, WebP, AVIF and JPEG/JPG images are allowed. Found: ${mimeType || 'unknown'}`,
      fileName
    }
  }

  const allowedExtensions = ALLOWED_IMAGE_FORMATS[mimeType as keyof typeof ALLOWED_IMAGE_FORMATS]
  if (!allowedExtensions || !(allowedExtensions as readonly string[]).includes(extension)) {
    return {
      isValid: false,
      error: `File extension "${extension}" doesn't match the file type "${mimeType}". Possible security risk detected.`,
      fileName
    }
  }

  if (!extension || extension === fileName) {
    return {
      isValid: false,
      error: 'File must have a valid image extension (.png, .jpg, .jpeg, .webp or .avif)',
      fileName
    }
  }

  return { isValid: true, fileName }
}

export function validateImageFiles(files: File[] | FileList): BatchValidationResult {
  const validFiles: File[] = []
  const invalidFiles: FileValidationResult[] = []

  Array.from(files).forEach((file) => {
    const validation = validateImageFile(file)
    if (validation.isValid) {
      validFiles.push(file)
    } else {
      invalidFiles.push(validation)
    }
  })

  return {
    validFiles,
    invalidFiles,
    hasValidFiles: validFiles.length > 0,
    hasInvalidFiles: invalidFiles.length > 0
  }
}

export async function verifyImageIntegrity(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    let settled = false
    const settle = (result: boolean): void => {
      if (settled) return
      settled = true
      URL.revokeObjectURL(url)
      resolve(result)
    }

    img.onload = () => settle(true)
    img.onerror = () => settle(false)
    setTimeout(() => settle(false), INTEGRITY_TIMEOUT_MS)

    img.src = url
  })
}
