import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';
import { detectBrowser, getBrowserCapabilities } from './browserDetection';

export interface OptimizationOptions {
  format: 'webp' | 'jpeg' | 'png';
  quality: number; // 0.1 to 1.0 (1.0 = maximum quality)
  maxSizeMB?: number; // Optional file size limit (only applied for quality < 0.8)
  maxWidthOrHeight?: number; // Maximum dimension in pixels
  preserveQuality?: boolean; // When true, prioritizes quality over file size
}

// File validation types and constants
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  fileName: string;
}

export interface BatchValidationResult {
  validFiles: File[];
  invalidFiles: FileValidationResult[];
  hasValidFiles: boolean;
  hasInvalidFiles: boolean;
}

// Allowed image formats
export const ALLOWED_IMAGE_FORMATS = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp']
} as const;

export const ALLOWED_MIME_TYPES = Object.keys(ALLOWED_IMAGE_FORMATS) as string[];
export const ALLOWED_EXTENSIONS = Object.values(ALLOWED_IMAGE_FORMATS).flat();

export interface ProcessedImage {
  id: string;
  originalFile: File;
  optimizedFile: File;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  originalUrl: string;
  optimizedUrl: string;
  format: string;
  quality: number;
  customFilename?: string; // User-defined filename (without extension)
}

export class ImageProcessor {
  /**
   * Applies browser-specific optimizations to options
   */
  static applyBrowserOptimizations(options: OptimizationOptions, capabilities: ReturnType<typeof getBrowserCapabilities>): OptimizationOptions {
    const optimized = { ...options };

    // Adjust quality for Safari
    if (capabilities.showCompatibilityWarning) {
      optimized.quality = Math.min(optimized.quality, capabilities.maxQualityRecommended);
    }

    // Force format change if WebP not supported
    if (!capabilities.canUseWebP && optimized.format === 'webp') {
      optimized.format = capabilities.recommendedFormat;
    }

    // Limit dimensions for mobile Safari
    const browserInfo = detectBrowser();
    if (browserInfo.isIOS && browserInfo.isMobile) {
      optimized.maxWidthOrHeight = Math.min(optimized.maxWidthOrHeight || 1920, 1600);
    }

    return optimized;
  }

  /**
   * Safari-optimized compression method
   * Uses canvas-only approach to avoid Safari-specific issues
   */
  static async safariOptimizedCompression(
    file: File,
    options: OptimizationOptions,
    onProgress?: (progress: number) => void
  ): Promise<File> {
    if (onProgress) onProgress(10);

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        try {
          if (onProgress) onProgress(30);

          // Calculate dimensions with Safari-safe limits
          const maxDimension = options.maxWidthOrHeight || 1600; // Lower for Safari
          let { width, height } = img;

          if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          if (onProgress) onProgress(50);

          // Use Safari-optimized canvas settings
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium'; // Use medium instead of high for Safari
          ctx.drawImage(img, 0, 0, width, height);

          if (onProgress) onProgress(80);

          // Use lower quality for Safari to prevent issues
          const safariQuality = Math.min(options.quality, 0.85);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              const fileName = this.generateFileName(file.name, options.format);
              const compressedFile = new File([blob], fileName, {
                type: this.getFileType(options.format),
              });

              if (onProgress) onProgress(100);
              resolve(compressedFile);
            },
            this.getFileType(options.format),
            safariQuality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Validates a single file for allowed image formats
   * Checks both MIME type and file extension for security
   */
  static validateImageFile(file: File): FileValidationResult {
    const fileName = file.name;
    const mimeType = file.type;
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));

    // Check if MIME type is allowed
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return {
        isValid: false,
        error: `Invalid file type. Only PNG, WebP, and JPEG/JPG images are allowed. Found: ${mimeType || 'unknown'}`,
        fileName
      };
    }

    // Check if file extension matches the MIME type
    const allowedExtensions = ALLOWED_IMAGE_FORMATS[mimeType as keyof typeof ALLOWED_IMAGE_FORMATS];
    if (!allowedExtensions || !(allowedExtensions as readonly string[]).includes(extension)) {
      return {
        isValid: false,
        error: `File extension "${extension}" doesn't match the file type "${mimeType}". Possible security risk detected.`,
        fileName
      };
    }

    // Additional check: ensure file has an extension
    if (!extension || extension === fileName) {
      return {
        isValid: false,
        error: 'File must have a valid image extension (.png, .jpg, .jpeg, or .webp)',
        fileName
      };
    }

    return {
      isValid: true,
      fileName
    };
  }

  /**
   * Validates multiple files and separates valid from invalid ones
   */
  static validateImageFiles(files: File[] | FileList): BatchValidationResult {
    const validFiles: File[] = [];
    const invalidFiles: FileValidationResult[] = [];

    Array.from(files).forEach(file => {
      const validation = this.validateImageFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        invalidFiles.push(validation);
      }
    });

    return {
      validFiles,
      invalidFiles,
      hasValidFiles: validFiles.length > 0,
      hasInvalidFiles: invalidFiles.length > 0
    };
  }

  /**
   * Checks if the file appears to be a real image by attempting to load it
   * This provides additional security against renamed files
   */
  static async verifyImageIntegrity(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(true);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };

      // Set a timeout to avoid hanging
      setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve(false);
      }, 5000);

      img.src = url;
    });
  }

  static async optimizeImage(
    file: File,
    options: OptimizationOptions,
    onProgress?: (progress: number) => void
  ): Promise<ProcessedImage> {
    try {
      // Apply browser-specific optimizations
      const browserInfo = detectBrowser();
      const capabilities = getBrowserCapabilities(browserInfo);
      const optimizedOptions = this.applyBrowserOptimizations(options, capabilities);

      if (onProgress) onProgress(5);

      let finalFile: File;

      // Choose optimization method based on browser capabilities and settings
      if (capabilities.compressionMethod === 'canvas' || optimizedOptions.preserveQuality || optimizedOptions.quality >= 0.9) {
        finalFile = await this.highQualityOptimization(file, optimizedOptions, onProgress);
      } else if (capabilities.compressionMethod === 'library' && capabilities.canUseWebWorkers) {
        finalFile = await this.standardOptimization(file, optimizedOptions, onProgress);
      } else {
        // Hybrid approach - use canvas for Safari and problematic browsers
        finalFile = await this.safariOptimizedCompression(file, optimizedOptions, onProgress);
      }

      // Calculate compression ratio
      const originalSize = file.size;
      const optimizedSize = finalFile.size;
      const compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100;

      // Create URLs for preview
      const originalUrl = URL.createObjectURL(file);
      const optimizedUrl = URL.createObjectURL(finalFile);

      return {
        id: crypto.randomUUID(),
        originalFile: file,
        optimizedFile: finalFile,
        originalSize,
        optimizedSize,
        compressionRatio,
        originalUrl,
        optimizedUrl,
        format: options.format,
        quality: options.quality,
      };
    } catch (error) {
      console.error('Image optimization failed:', error);
      throw new Error(`Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async highQualityOptimization(
    file: File,
    options: OptimizationOptions,
    onProgress?: (progress: number) => void
  ): Promise<File> {
    // For high quality, use direct Canvas conversion without browser-image-compression
    // This avoids double compression and preserves maximum quality

    if (onProgress) onProgress(10);

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate dimensions respecting maxWidthOrHeight
          let { width, height } = img;
          if (options.maxWidthOrHeight) {
            const maxDimension = options.maxWidthOrHeight;
            if (width > maxDimension || height > maxDimension) {
              const ratio = Math.min(maxDimension / width, maxDimension / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }
          }

          canvas.width = width;
          canvas.height = height;

          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Use high-quality rendering settings
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          if (onProgress) onProgress(50);

          // Draw image with high quality
          ctx.drawImage(img, 0, 0, width, height);

          if (onProgress) onProgress(80);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to convert image format'));
                return;
              }

              const fileName = this.generateFileName(file.name, options.format);
              const convertedFile = new File([blob], fileName, {
                type: this.getFileType(options.format),
              });

              if (onProgress) onProgress(100);
              resolve(convertedFile);
            },
            this.getFileType(options.format),
            options.quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  static async standardOptimization(
    file: File,
    options: OptimizationOptions,
    onProgress?: (progress: number) => void
  ): Promise<File> {
    // Check browser capabilities for web worker support
    const capabilities = getBrowserCapabilities();

    // Configure compression options - prioritize quality over file size for better results
    const compressionOptions: any = {
      maxWidthOrHeight: options.maxWidthOrHeight || 1920,
      useWebWorker: capabilities.canUseWebWorkers, // Disable for Safari
      fileType: this.getFileType(options.format),
      initialQuality: options.quality,
      onProgress: onProgress,
    };

    // Only add maxSizeMB if explicitly set and quality is moderate
    // This prevents aggressive compression that causes blurriness
    if (options.maxSizeMB && options.quality < 0.8) {
      compressionOptions.maxSizeMB = options.maxSizeMB;
    }

    // Compress the image
    const compressedFile = await imageCompression(file, compressionOptions);

    // If we need format conversion, use high-quality Canvas conversion
    if (options.format !== this.getFormatFromMimeType(file.type)) {
      return await this.convertFormat(compressedFile, options.format, options.quality);
    }

    return compressedFile;
  }

  static async convertFormat(
    file: File,
    targetFormat: 'webp' | 'jpeg' | 'png',
    quality: number
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Enable high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // For PNG, fill with white background to avoid transparency issues
        if (targetFormat === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to convert image format'));
              return;
            }

            const fileName = this.generateFileName(file.name, targetFormat);
            const convertedFile = new File([blob], fileName, {
              type: this.getFileType(targetFormat),
            });

            resolve(convertedFile);
          },
          this.getFileType(targetFormat),
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  static getFileType(format: 'webp' | 'jpeg' | 'png'): string {
    const mimeTypes = {
      webp: 'image/webp',
      jpeg: 'image/jpeg',
      png: 'image/png',
    };
    return mimeTypes[format];
  }

  static getFormatFromMimeType(mimeType: string): 'webp' | 'jpeg' | 'png' {
    if (mimeType.includes('webp')) return 'webp';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpeg';
    if (mimeType.includes('png')) return 'png';
    return 'jpeg'; // default fallback
  }

  static generateFileName(originalName: string, format: 'webp' | 'jpeg' | 'png'): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const extensions = {
      webp: '.webp',
      jpeg: '.jpg',
      png: '.png',
    };
    return `${nameWithoutExt}_optimized${extensions[format]}`;
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static async downloadFile(file: File, filename?: string): Promise<void> {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static async downloadMultipleFiles(files: ProcessedImage[]): Promise<void> {
    for (const processedImage of files) {
      await this.downloadFile(processedImage.optimizedFile);
      // Small delay to prevent browser blocking multiple downloads
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Creates and downloads a ZIP file containing all processed images
   * @param files Array of processed images
   * @param zipFilename Name for the ZIP file (without .zip extension)
   * @param onProgress Optional progress callback
   */
  static async downloadAsZip(
    files: ProcessedImage[],
    zipFilename: string = 'optimized-images',
    onProgress?: (progress: number) => void
  ): Promise<void> {
    if (files.length === 0) {
      throw new Error('No files to download');
    }

    const zip = new JSZip();
    const totalFiles = files.length;

    // Add each file to the ZIP
    for (let i = 0; i < files.length; i++) {
      const processedImage = files[i];
      const filename = this.getFinalFilename(processedImage);

      // Convert file to array buffer
      const arrayBuffer = await processedImage.optimizedFile.arrayBuffer();
      zip.file(filename, arrayBuffer);

      // Update progress
      if (onProgress) {
        onProgress(Math.round(((i + 1) / totalFiles) * 80)); // 80% for adding files
      }
    }

    // Generate ZIP file
    if (onProgress) onProgress(90);
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Download the ZIP
    if (onProgress) onProgress(100);
    const zipFile = new File([zipBlob], `${zipFilename}.zip`, { type: 'application/zip' });
    await this.downloadFile(zipFile, `${zipFilename}.zip`);
  }

  /**
   * Gets the final filename for a processed image, considering custom naming
   * @param processedImage The processed image
   * @returns Final filename with extension
   */
  static getFinalFilename(processedImage: ProcessedImage): string {
    const extension = this.getExtensionFromFormat(processedImage.format as 'webp' | 'jpeg' | 'png');

    if (processedImage.customFilename) {
      // Use custom filename, ensuring it doesn't already have an extension
      const cleanName = processedImage.customFilename.replace(/\.[^/.]+$/, '');
      return `${cleanName}${extension}`;
    }

    // Use original filename with optimized suffix
    return this.generateFileName(processedImage.originalFile.name, processedImage.format as 'webp' | 'jpeg' | 'png');
  }

  /**
   * Gets file extension from format
   * @param format Image format
   * @returns File extension with dot
   */
  static getExtensionFromFormat(format: 'webp' | 'jpeg' | 'png'): string {
    const extensions = {
      webp: '.webp',
      jpeg: '.jpg',
      png: '.png',
    };
    return extensions[format];
  }

  /**
   * Applies batch renaming to multiple images
   * @param images Array of processed images
   * @param pattern Renaming pattern object
   * @returns Updated array of processed images
   */
  static applyBatchRename(
    images: ProcessedImage[],
    pattern: {
      prefix?: string;
      suffix?: string;
      useNumbering?: boolean;
      startNumber?: number;
      originalName?: boolean;
      customNames?: string[];
    }
  ): ProcessedImage[] {
    return images.map((image, index) => {
      let newName = '';

      if (pattern.customNames && pattern.customNames[index]) {
        // Individual custom names mode
        newName = pattern.customNames[index].trim();
      } else if (pattern.originalName) {
        // Simple mode: Keep original names unchanged
        newName = image.originalFile.name.replace(/\.[^/.]+$/, '');
      } else if (pattern.useNumbering) {
        // Numbered mode: Use prefix (baseName) + number
        if (pattern.prefix) {
          newName += pattern.prefix;
        }
        const number = (pattern.startNumber || 1) + index;
        newName += `_${number.toString().padStart(3, '0')}`;
      } else {
        // Custom mode: prefix + suffix (without original name)
        if (pattern.prefix && pattern.suffix) {
          // When both prefix and suffix are provided, use only prefix + suffix
          newName = pattern.prefix + pattern.suffix;
        } else if (pattern.prefix) {
          // Only prefix: prefix + original name
          newName = pattern.prefix + image.originalFile.name.replace(/\.[^/.]+$/, '');
        } else if (pattern.suffix) {
          // Only suffix: original name + suffix
          newName = image.originalFile.name.replace(/\.[^/.]+$/, '') + pattern.suffix;
        } else {
          // Neither prefix nor suffix: keep original name
          newName = image.originalFile.name.replace(/\.[^/.]+$/, '');
        }
      }

      // Fallback to original name if somehow empty
      if (!newName) {
        newName = image.originalFile.name.replace(/\.[^/.]+$/, '');
      }

      return {
        ...image,
        customFilename: newName
      };
    });
  }
}
