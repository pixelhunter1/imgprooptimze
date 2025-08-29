import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';
import { detectBrowser, getBrowserCapabilities } from './browserDetection';

export interface OptimizationOptions {
  format: 'webp' | 'jpeg' | 'png';
  quality: number; // 0.1 to 1.0 (1.0 = maximum quality)
  maxSizeMB?: number; // Optional file size limit (only applied for quality < 0.8)
  maxWidthOrHeight?: number; // Maximum dimension in pixels
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
   * Maps user-facing quality to internal processing quality
   * This prevents file size increases at 100% quality by using 90% internally
   */
  static mapQualityForProcessing(userQuality: number): number {
    // If user selects 100% (1.0), use 90% (0.9) internally for better results
    if (userQuality >= 1.0) {
      return 0.9;
    }
    // For all other quality levels, use as-is
    return userQuality;
  }

  /**
   * Determines if processing can be skipped (no compression needed)
   */
  static shouldSkipProcessing(file: File, options: OptimizationOptions): boolean {
    const inputFormat = this.getFormatFromMimeType(file.type);
    const outputFormat = options.format;

    // Skip if same format and maximum quality (100%)
    if (inputFormat === outputFormat && options.quality >= 1.0) {
      return true;
    }

    // Skip if no dimension constraints and same format with very high quality
    if (inputFormat === outputFormat &&
        options.quality >= 0.95 &&
        !options.maxWidthOrHeight &&
        !options.maxSizeMB) {
      return true;
    }

    return false;
  }

  /**
   * Creates a processed image result without actual processing
   */
  static createUnprocessedResult(file: File, options: OptimizationOptions): ProcessedImage {
    const originalUrl = URL.createObjectURL(file);
    const optimizedUrl = URL.createObjectURL(file); // Create separate URL even for same file

    // Unprocessed URLs created successfully

    return {
      id: crypto.randomUUID(),
      originalFile: file,
      optimizedFile: file, // Same file, no processing
      originalSize: file.size,
      optimizedSize: file.size,
      compressionRatio: 0, // No compression applied
      originalUrl,
      optimizedUrl,
      format: options.format,
      quality: options.quality,
    };
  }

  /**
   * Checks if an image needs to be resized based on maxWidthOrHeight constraint
   */
  static async checkIfResizeNeeded(file: File, maxWidthOrHeight?: number): Promise<boolean> {
    if (!maxWidthOrHeight) {
      return false;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const needsResize = img.width > maxWidthOrHeight || img.height > maxWidthOrHeight;
        URL.revokeObjectURL(img.src);
        resolve(needsResize);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve(false); // If we can't load the image, assume no resize needed
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Selects the best optimization method based on format, quality, and browser capabilities
   */
  static async selectOptimizationMethod(
    file: File,
    options: OptimizationOptions,
    capabilities: ReturnType<typeof getBrowserCapabilities>,
    onProgress?: (progress: number) => void
  ): Promise<File> {
    const outputFormat = options.format;
    const isHighQuality = options.quality >= 0.9;
    const isPngOutput = outputFormat === 'png';

    // Format-specific optimization strategy
    if (isPngOutput) {
      return await this.highQualityOptimization(file, options, onProgress);
    }

    if (isHighQuality) {
      return await this.highQualityOptimization(file, options, onProgress);
    }

    if (capabilities.compressionMethod === 'canvas') {
      return await this.safariOptimizedCompression(file, options, onProgress);
    }

    if (capabilities.compressionMethod === 'library' && capabilities.canUseWebWorkers) {
      return await this.standardOptimization(file, options, onProgress);
    }

    return await this.highQualityOptimization(file, options, onProgress);
  }

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

      const imageUrl = URL.createObjectURL(file);

      img.onload = () => {
        try {
          // Clean up the temporary URL
          URL.revokeObjectURL(imageUrl);

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

      img.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        reject(new Error('Failed to load image'));
      };
      img.src = imageUrl;
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
      // Apply browser-specific optimizations first to get capabilities
      const browserInfo = detectBrowser();
      const capabilities = getBrowserCapabilities(browserInfo);

      // Check if we can skip processing entirely
      if (this.shouldSkipProcessing(file, options)) {
        if (onProgress) onProgress(100);
        return this.createUnprocessedResult(file, options);
      }

      // Map quality for internal processing (100% -> 90% to prevent size increases)
      const mappedQuality = this.mapQualityForProcessing(options.quality);
      const processingOptions = {
        ...options,
        quality: mappedQuality
      };

      // Log quality mapping for debugging
      if (options.quality !== mappedQuality) {
        console.log(`🎯 QUALITY MAPPING: User selected ${Math.round(options.quality * 100)}% → Processing with ${Math.round(mappedQuality * 100)}%`);
      }

      // Apply browser-specific optimizations for actual processing
      const optimizedOptions = this.applyBrowserOptimizations(processingOptions, capabilities);

      if (onProgress) onProgress(5);

      let finalFile: File;

      // Choose optimization method based on format, quality, and browser capabilities
      finalFile = await this.selectOptimizationMethod(file, optimizedOptions, capabilities, onProgress);

      // Calculate compression ratio
      const originalSize = file.size;
      const optimizedSize = finalFile.size;

      // Fix compression ratio calculation for size increases
      let compressionRatio: number;
      if (optimizedSize <= originalSize) {
        // Normal compression (file got smaller or same size)
        compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100;
      } else {
        // File got bigger - show as negative increase percentage
        compressionRatio = -((optimizedSize - originalSize) / originalSize) * 100;
      }



      // Create URLs for preview
      const originalUrl = URL.createObjectURL(file);
      const optimizedUrl = URL.createObjectURL(finalFile);

      // URLs created successfully

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
        quality: options.quality, // Show original user-selected quality, not mapped quality
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
    const inputFormat = this.getFormatFromMimeType(file.type);
    const outputFormat = options.format;

    if (onProgress) onProgress(10);

    // Check if we need to resize the image
    const needsResize = await this.checkIfResizeNeeded(file, options.maxWidthOrHeight);

    // If same format, maximum quality, and no resize needed, return original
    if (inputFormat === outputFormat &&
        options.quality >= 1.0 &&
        !needsResize) {
      if (onProgress) onProgress(100);
      return file;
    }

    // For PNG output at high quality, be extra careful to avoid size increases
    if (outputFormat === 'png' && options.quality >= 0.95) {
      // If input is already PNG and no resize needed, return original
      if (inputFormat === 'png' && !needsResize) {
        if (onProgress) onProgress(100);
        return file;
      }
    }

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      const imageUrl = URL.createObjectURL(file);

      img.onload = () => {
        try {
          // Clean up the temporary URL
          URL.revokeObjectURL(imageUrl);

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

          // Format-specific background handling
          if (outputFormat === 'jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          if (onProgress) onProgress(50);

          // Draw image with high quality
          ctx.drawImage(img, 0, 0, width, height);

          if (onProgress) onProgress(80);

          // Format-specific quality handling
          let finalQuality = options.quality;
          if (outputFormat === 'png') {
            // PNG is lossless, use 1.0 for best compression
            finalQuality = 1.0;
          }

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
            finalQuality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        reject(new Error('Failed to load image'));
      };
      img.src = imageUrl;
    });
  }

  static async standardOptimization(
    file: File,
    options: OptimizationOptions,
    onProgress?: (progress: number) => void
  ): Promise<File> {
    // Check browser capabilities for web worker support
    const capabilities = getBrowserCapabilities();
    const inputFormat = this.getFormatFromMimeType(file.type);

    // For PNG format, use more conservative compression to avoid size increases
    const isPngOutput = options.format === 'png';
    const isPngInput = inputFormat === 'png';

    // Configure compression options - prioritize quality over file size for better results
    const compressionOptions: any = {
      maxWidthOrHeight: options.maxWidthOrHeight || 1920,
      useWebWorker: capabilities.canUseWebWorkers, // Disable for Safari
      fileType: this.getFileType(options.format),
      initialQuality: options.quality,
      onProgress: onProgress,
    };

    // PNG-specific optimizations
    if (isPngOutput || isPngInput) {
      // For PNG, be more conservative with compression to avoid size increases
      if (options.quality >= 0.9) {
        // At high quality, skip browser-image-compression for PNG to avoid size increases
        if (options.format === inputFormat) {
          // Same format, just return original if high quality
          return file;
        } else {
          // Different format, use direct conversion
          return await this.convertFormat(file, options.format, options.quality);
        }
      }
    }

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

      const imageUrl = URL.createObjectURL(file);

      img.onload = () => {
        // Clean up the temporary URL
        URL.revokeObjectURL(imageUrl);

        canvas.width = img.width;
        canvas.height = img.height;

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Enable high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Format-specific background handling
        if (targetFormat === 'jpeg') {
          // Only add white background for JPEG (which doesn't support transparency)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        // For PNG and WebP, preserve transparency by not adding background

        ctx.drawImage(img, 0, 0);

        // Format-specific quality handling
        let finalQuality = quality;
        if (targetFormat === 'png') {
          // PNG is lossless, so quality parameter is ignored by most browsers
          // Use 1.0 to ensure best compression without quality loss
          finalQuality = 1.0;
        }

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
          finalQuality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        reject(new Error('Failed to load image'));
      };
      img.src = imageUrl;
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
   * Cleans up blob URLs from processed images to prevent memory leaks
   * @param processedImages Array of processed images to clean up
   */
  static cleanupProcessedImages(processedImages: ProcessedImage[]): void {
    processedImages.forEach(img => {
      if (img.originalUrl) {
        URL.revokeObjectURL(img.originalUrl);
      }
      if (img.optimizedUrl && img.optimizedUrl !== img.originalUrl) {
        URL.revokeObjectURL(img.optimizedUrl);
      }
    });
  }

  /**
   * Cleans up a single processed image's blob URLs
   * @param processedImage The processed image to clean up
   */
  static cleanupProcessedImage(processedImage: ProcessedImage): void {
    if (processedImage.originalUrl) {
      URL.revokeObjectURL(processedImage.originalUrl);
    }
    if (processedImage.optimizedUrl && processedImage.optimizedUrl !== processedImage.originalUrl) {
      URL.revokeObjectURL(processedImage.optimizedUrl);
    }
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
