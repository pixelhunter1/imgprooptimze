import imageCompression from 'browser-image-compression';

export interface OptimizationOptions {
  format: 'webp' | 'jpeg' | 'png';
  quality: number; // 0.1 to 1.0 (1.0 = maximum quality)
  maxSizeMB?: number; // Optional file size limit (only applied for quality < 0.8)
  maxWidthOrHeight?: number; // Maximum dimension in pixels
  preserveQuality?: boolean; // When true, prioritizes quality over file size
}

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
}

export class ImageProcessor {
  static async optimizeImage(
    file: File,
    options: OptimizationOptions,
    onProgress?: (progress: number) => void
  ): Promise<ProcessedImage> {
    try {
      let finalFile: File;

      // For maximum quality (>= 0.9) or when preserveQuality is true, use direct Canvas conversion
      if (options.preserveQuality || options.quality >= 0.9) {
        finalFile = await this.highQualityOptimization(file, options, onProgress);
      } else {
        // Use browser-image-compression for lower quality settings
        finalFile = await this.standardOptimization(file, options, onProgress);
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
    // Configure compression options - prioritize quality over file size for better results
    const compressionOptions: any = {
      maxWidthOrHeight: options.maxWidthOrHeight || 1920,
      useWebWorker: true,
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
}
