/**
 * Image Processor Module
 *
 * KNOWN LIMITATIONS AND DESIGN DECISIONS:
 *
 * 1. PNG OPTIMIZATION:
 *    - PNG quality parameter is always set to 1.0 (lossless) regardless of user selection
 *    - This is technically correct since PNG is lossless by nature
 *    - Canvas API doesn't provide true PNG compression (no pngquant/similar libraries)
 *    - Quality slider for PNG only affects whether to skip processing entirely
 *
 * 2. QUALITY MAPPING:
 *    - User-selected 100% quality is mapped to 90% internally to prevent file size increases
 *    - This is now transparent to users via UI notifications
 *    - Applies to JPEG and WebP, but not PNG
 *
 * 3. JPEG LIMITATIONS:
 *    - No progressive JPEG support (all JPEGs are baseline)
 *    - Progressive JPEGs would improve web loading performance
 *    - Could be added using canvas with additional processing
 *
 * 4. EXIF DATA:
 *    - All EXIF metadata is lost during optimization
 *    - This includes camera settings, GPS data, copyright info
 *    - Would require exif-js or piexifjs library to preserve
 *
 * 5. maxSizeMB LIMITATION:
 *    - Only applies when quality < 0.8 (see line 674)
 *    - This prevents aggressive compression at high quality
 *    - Not exposed in UI - internal optimization only
 *
 * 6. WEBP OPTIMIZATION:
 *    - No lossless WebP option available
 *    - Always uses lossy compression
 *    - No quality capping like JPEG (100% -> 90%)
 *
 * 7. PNG CONVERSION THRESHOLD:
 *    - Hard-coded 5% size increase threshold (line 491)
 *    - Not configurable by users
 *    - Could be made adaptive based on image characteristics
 *
 * 8. BROWSER COMPATIBILITY:
 *    - Safari has reduced quality cap (85%) and dimension limits (1600px)
 *    - Web Workers disabled for Safari due to stability issues
 *    - Uses canvas-only approach for Safari instead of hybrid
 *
 * FUTURE IMPROVEMENTS:
 * - Add progressive JPEG option
 * - Add EXIF preservation option
 * - Add lossless WebP option
 * - Add true PNG compression library (pngquant)
 * - Make PNG conversion threshold configurable
 * - Expose maxSizeMB in UI for user control
 */

import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';
import piexif from 'piexifjs';
import { encode as encodeAvif } from '@jsquash/avif';
import { detectBrowser, getBrowserCapabilities } from './browserDetection';
import { type CropArea } from '@/types/crop';
import '@/types/electron.d.ts';

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

export interface OptimizationOptions {
  format: 'webp' | 'jpeg' | 'png' | 'avif';
  quality: number; // 0.1 to 1.0 (1.0 = maximum quality)
  maxSizeMB?: number; // Optional file size limit - now configurable in UI
  maxWidthOrHeight?: number; // Maximum dimension in pixels
  preserveExif?: boolean; // Preserve EXIF metadata (camera, GPS, copyright)
  progressiveJpeg?: boolean; // Create progressive JPEG (better web loading)
  losslessWebP?: boolean; // Use lossless WebP compression
  pngCompressionLevel?: number; // PNG compression level 0-9 (higher = smaller but slower)
  cropArea?: CropArea; // Optional crop area to apply before optimization
}

// File validation types and constants
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  fileName: string;
}

interface BatchValidationResult {
  validFiles: File[];
  invalidFiles: FileValidationResult[];
  hasValidFiles: boolean;
  hasInvalidFiles: boolean;
}

// Allowed image formats
const ALLOWED_IMAGE_FORMATS = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif']
} as const;

const ALLOWED_MIME_TYPES = Object.keys(ALLOWED_IMAGE_FORMATS) as string[];
const IMAGE_LOAD_TIMEOUT_MS = 15000;
const CANVAS_BLOB_TIMEOUT_MS = 15000;
const MAX_CANVAS_SIDE = 8192;
const MAX_CANVAS_PIXELS = 40_000_000;

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
  optimizationOptions?: OptimizationOptions; // Store options used for re-optimization after crop
}

export class ImageProcessor {
  private static async yieldToMainThread(): Promise<void> {
    await new Promise<void>((resolve) => {
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => resolve());
        return;
      }

      setTimeout(resolve, 0);
    });
  }

  private static createFileFromBlob(blob: Blob, filename: string, fallbackMime: string): File {
    return new File([blob], filename, {
      type: blob.type || fallbackMime,
      lastModified: Date.now(),
    });
  }

  private static async nativeElectronOptimization(
    file: File,
    options: OptimizationOptions,
    onProgress?: (progress: number) => void
  ): Promise<File> {
    if (!window.electronAPI?.optimizeImage) {
      throw new Error('Electron optimization API is not available')
    }

    if (onProgress) onProgress(15)
    await this.yieldToMainThread()

    const buffer = await file.arrayBuffer()
    const result = await window.electronAPI.optimizeImage({
      buffer,
      fileName: file.name,
      mimeType: file.type,
      options: {
        format: options.format,
        quality: options.quality,
        maxSizeMB: options.maxSizeMB,
        maxWidthOrHeight: options.maxWidthOrHeight,
        preserveExif: options.preserveExif,
        progressiveJpeg: options.progressiveJpeg,
        losslessWebP: options.losslessWebP,
        pngCompressionLevel: options.pngCompressionLevel,
      }
    })

    if (!result.success || !result.buffer || !result.mimeType) {
      throw new Error(result.error || 'Electron optimization failed')
    }

    const actualFormat = this.getFormatFromMimeType(result.mimeType)
    const fileName = this.generateFileName(file.name, actualFormat)
    const optimizedBlob = new Blob([result.buffer], { type: result.mimeType })

    if (onProgress) onProgress(100)
    return this.createFileFromBlob(optimizedBlob, fileName, result.mimeType)
  }

  private static loadImageFromUrl(
    imageUrl: string,
    operationName: string,
    timeoutMs: number = IMAGE_LOAD_TIMEOUT_MS
  ): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let settled = false;

      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
      };

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(`${operationName} timed out while loading image`));
      }, timeoutMs);

      img.onload = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        cleanup();
        resolve(img);
      };

      img.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        cleanup();
        reject(new Error(`${operationName} failed to load image`));
      };

      img.src = imageUrl;
    });
  }

  private static async loadImageFromFile(
    file: File,
    operationName: string,
    timeoutMs: number = IMAGE_LOAD_TIMEOUT_MS
  ): Promise<HTMLImageElement> {
    const imageUrl = URL.createObjectURL(file);
    try {
      return await this.loadImageFromUrl(imageUrl, operationName, timeoutMs);
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  private static canvasToBlobWithTimeout(
    canvas: HTMLCanvasElement,
    mimeType: string,
    quality: number | undefined,
    operationName: string,
    timeoutMs: number = CANVAS_BLOB_TIMEOUT_MS
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`${operationName} timed out while encoding image`));
      }, timeoutMs);

      try {
        canvas.toBlob((blob) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);

          if (!blob) {
            reject(new Error(`${operationName} failed to encode image`));
            return;
          }

          resolve(blob);
        }, mimeType, quality);
      } catch (error) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private static assertValidCanvasSize(width: number, height: number, operationName: string): void {
    const safeWidth = Math.round(width);
    const safeHeight = Math.round(height);

    if (!Number.isFinite(safeWidth) || !Number.isFinite(safeHeight) || safeWidth <= 0 || safeHeight <= 0) {
      throw new Error(`${operationName}: invalid output dimensions ${width}x${height}`);
    }

    if (safeWidth > MAX_CANVAS_SIDE || safeHeight > MAX_CANVAS_SIDE) {
      throw new Error(
        `${operationName}: output dimensions ${safeWidth}x${safeHeight} exceed browser canvas limit (${MAX_CANVAS_SIDE}px max side)`
      );
    }

    if (safeWidth * safeHeight > MAX_CANVAS_PIXELS) {
      throw new Error(
        `${operationName}: output size ${safeWidth}x${safeHeight} exceeds browser canvas pixel limit (${MAX_CANVAS_PIXELS.toLocaleString()} px)`
      );
    }
  }

  /**
   * Crops an image file based on the provided crop area
   * @param file The image file to crop
   * @param cropArea The crop area coordinates and dimensions
   * @returns A new cropped File
   */
  static async cropImage(file: File, cropArea: CropArea): Promise<File> {
    const img = await this.loadImageFromFile(file, 'Crop');

    const srcX = Math.max(0, Math.floor(cropArea.x));
    const srcY = Math.max(0, Math.floor(cropArea.y));
    const srcW = Math.min(img.width - srcX, Math.max(1, Math.floor(cropArea.width)));
    const srcH = Math.min(img.height - srcY, Math.max(1, Math.floor(cropArea.height)));

    if (srcW <= 0 || srcH <= 0) {
      throw new Error(`Crop: invalid crop area ${cropArea.width}x${cropArea.height} at (${cropArea.x}, ${cropArea.y})`);
    }

    this.assertValidCanvasSize(srcW, srcH, 'Crop');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    canvas.width = srcW;
    canvas.height = srcH;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

    const blob = await this.canvasToBlobWithTimeout(
      canvas,
      'image/png',
      1.0,
      'Crop'
    );

    const croppedFile = this.createFileFromBlob(blob, file.name, 'image/png');
    console.log(`✂️ Image cropped: ${srcW}x${srcH} from ${img.width}x${img.height}`);
    return croppedFile;
  }

  /**
   * Converts a data URL to a File object
   * @param dataUrl The data URL string
   * @param filename The filename for the resulting File
   * @returns A File object
   */
  static dataUrlToFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  /**
   * Extracts EXIF data from an image file
   * @param file The image file
   * @returns EXIF data as base64 string, or null if no EXIF data
   */
  static async extractExifData(file: File): Promise<string | null> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const dataUrl = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      const exifObj = piexif.load('data:image/jpeg;base64,' + dataUrl);

      // Check if there's any EXIF data
      if (Object.keys(exifObj).length === 0) {
        return null;
      }

      return JSON.stringify(exifObj);
    } catch (error) {
      console.warn('Failed to extract EXIF data:', error);
      return null;
    }
  }

  /**
   * Inserts EXIF data into an optimized image
   * @param optimizedFile The optimized image file
   * @param exifDataJson EXIF data as JSON string
   * @returns New file with EXIF data inserted
   */
  static async insertExifData(optimizedFile: File, exifDataJson: string): Promise<File> {
    try {
      const exifObj = JSON.parse(exifDataJson);
      const arrayBuffer = await optimizedFile.arrayBuffer();
      const dataUrl = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const exifBytes = piexif.dump(exifObj);
      const newDataUrl = piexif.insert(exifBytes, 'data:image/jpeg;base64,' + dataUrl);

      // Convert data URL back to File
      const base64Data = newDataUrl.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return new File([bytes], optimizedFile.name, {
        type: optimizedFile.type,
      });
    } catch (error) {
      console.warn('Failed to insert EXIF data:', error);
      return optimizedFile; // Return original if insertion fails
    }
  }

  /**
   * Maps user-facing quality to internal processing quality
   * This prevents file size increases at 100% quality by using 90% internally
   */
  static mapQualityForProcessing(userQuality: number): number {
    // Return the exact quality requested by the user
    // We no longer cap at 0.9 for 100% selection to ensure maximum quality
    return userQuality;
  }

  /**
   * Determines if processing can be skipped (no compression needed)
   */
  static shouldSkipProcessing(file: File, options: OptimizationOptions): boolean {
    const inputFormat = this.getFormatFromMimeType(file.type);
    const outputFormat = options.format;
    const hasResizeConstraint = typeof options.maxWidthOrHeight === 'number' && options.maxWidthOrHeight > 0;
    const hasSizeLimit = typeof options.maxSizeMB === 'number' && options.maxSizeMB > 0;

    if (inputFormat !== outputFormat || hasResizeConstraint || hasSizeLimit) {
      return false;
    }

    // Preserve originals when the user requests maximum quality with no resize or file-size target.
    if ((outputFormat === 'jpeg' || outputFormat === 'webp' || outputFormat === 'avif') && options.quality >= 1.0) {
      return true;
    }

    // For PNG: Skip if same format and maximum quality (100%)
    if (outputFormat === 'png' && options.quality >= 1.0) {
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
    const isAvifOutput = outputFormat === 'avif';
    const hasResizeConstraint = typeof options.maxWidthOrHeight === 'number' && options.maxWidthOrHeight > 0;
    const canUseWorkerPipeline =
      capabilities.canUseWebWorkers &&
      capabilities.compressionMethod !== 'canvas';

    // AVIF encoding using jsquash (WASM-based)
    if (isAvifOutput) {
      return await this.avifOptimization(file, options, onProgress);
    }

    // Format-specific optimization strategy with size increase prevention
    if (isPngOutput) {
      return await this.smartPngOptimization(file, options, onProgress);
    }

    // Prefer the worker-backed path whenever resize is requested on supported browsers.
    if (hasResizeConstraint && canUseWorkerPipeline) {
      return await this.standardOptimization(file, options, onProgress);
    }

    if (isHighQuality) {
      return await this.highQualityOptimization(file, options, onProgress);
    }

    if (capabilities.compressionMethod === 'canvas') {
      return await this.safariOptimizedCompression(file, options, onProgress);
    }

    if (canUseWorkerPipeline) {
      return await this.standardOptimization(file, options, onProgress);
    }

    return await this.highQualityOptimization(file, options, onProgress);
  }

  /**
   * AVIF optimization using jsquash WASM encoder
   * Note: AVIF encoding is slower than other formats but provides better compression
   * Uses simulated progress since encodeAvif doesn't report intermediate progress
   */
  static async avifOptimization(
    file: File,
    options: OptimizationOptions,
    onProgress?: (progress: number) => void
  ): Promise<File> {
    if (onProgress) onProgress(5);

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      const imageUrl = URL.createObjectURL(file);

      img.onload = async () => {
        let progressInterval: ReturnType<typeof setInterval> | null = null;
        let currentProgress = 10;

        try {
          URL.revokeObjectURL(imageUrl);

          if (onProgress) onProgress(10);

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

          // Draw image
          ctx.drawImage(img, 0, 0, width, height);

          if (onProgress) onProgress(15);

          // Yield before extracting raw pixels and running the AVIF encoder.
          await this.yieldToMainThread();

          // Get ImageData for jsquash encoder
          const imageData = ctx.getImageData(0, 0, width, height);

          if (onProgress) onProgress(20);
          currentProgress = 20;

          // AVIF quality: jsquash uses 0-100 scale
          // Speed: 0-10 (higher = faster but lower quality)
          const avifQuality = Math.round(options.quality * 100);
          const speed = options.quality >= 0.9 ? 4 : 6; // Slower for high quality

          console.log(`🖼️ AVIF encoding: ${width}x${height}, quality: ${avifQuality}, speed: ${speed}`);

          // Estimate encoding time based on image size and quality
          // Larger images and higher quality = slower encoding
          const pixels = width * height;
          const estimatedSeconds = Math.max(3, Math.min(30, (pixels / 500000) * (11 - speed)));
          const progressPerInterval = (75 - currentProgress) / (estimatedSeconds * 10); // Update every 100ms

          // Start simulated progress during encoding
          if (onProgress) {
            progressInterval = setInterval(() => {
              currentProgress = Math.min(currentProgress + progressPerInterval, 90);
              onProgress(Math.round(currentProgress));
            }, 100);
          }

          // Encode to AVIF using jsquash
          const avifBuffer = await encodeAvif(imageData, {
            quality: avifQuality,
            speed: speed,
          });

          // Stop simulated progress
          if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
          }

          if (onProgress) onProgress(95);

          // Create File from ArrayBuffer
          const fileName = this.generateFileName(file.name, 'avif');
          const avifFile = new File([avifBuffer], fileName, {
            type: 'image/avif',
          });

          console.log(`✅ AVIF encoded: ${this.formatFileSize(avifFile.size)}`);

          if (onProgress) onProgress(100);
          resolve(avifFile);
        } catch (error) {
          // Clean up interval on error
          if (progressInterval) {
            clearInterval(progressInterval);
          }
          console.error('AVIF encoding failed:', error);
          reject(new Error(`AVIF encoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        reject(new Error('Failed to load image for AVIF encoding'));
      };

      img.src = imageUrl;
    });
  }

  /**
   * Applies browser-specific optimizations to options
   */
  static applyBrowserOptimizations(options: OptimizationOptions, capabilities: ReturnType<typeof getBrowserCapabilities>): OptimizationOptions {
    const optimized = { ...options };

    // Force format change if WebP not supported
    if (!capabilities.canUseWebP && optimized.format === 'webp') {
      optimized.format = capabilities.recommendedFormat;
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
    const img = await this.loadImageFromFile(file, 'Safari compression');
    if (onProgress) onProgress(30);

    let { width, height } = img;

    if (options.maxWidthOrHeight && (width > options.maxWidthOrHeight || height > options.maxWidthOrHeight)) {
      const maxDimension = options.maxWidthOrHeight;
      const ratio = Math.min(maxDimension / width, maxDimension / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    this.assertValidCanvasSize(width, height, 'Safari compression');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    canvas.width = width;
    canvas.height = height;
    if (onProgress) onProgress(50);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    if (onProgress) onProgress(80);

    const targetType = this.getFileType(options.format);
    const blob = await this.canvasToBlobWithTimeout(
      canvas,
      targetType,
      options.quality,
      'Safari compression'
    );
    const fileName = this.generateFileName(file.name, options.format);
    const compressedFile = this.createFileFromBlob(blob, fileName, targetType);

    if (onProgress) onProgress(100);
    return compressedFile;
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
      const canUseElectronOptimization = isElectron && !!window.electronAPI?.optimizeImage;

      // Apply browser-specific optimizations first to get capabilities
      const browserInfo = detectBrowser();
      const capabilities = getBrowserCapabilities(browserInfo);

      // Apply crop if specified
      let workingFile = file;
      if (options.cropArea) {
        if (onProgress) onProgress(2);
        console.log('✂️ Applying crop before optimization...');
        workingFile = await this.cropImage(file, options.cropArea);
        if (onProgress) onProgress(5);
      }

      // Extract EXIF data if preservation is enabled (JPEG/TIFF only)
      let exifData: string | null = null;
      if (!canUseElectronOptimization && options.preserveExif && (workingFile.type === 'image/jpeg' || workingFile.type === 'image/tiff')) {
        exifData = await this.extractExifData(workingFile);
        if (exifData) {
          console.log('📸 EXIF data extracted successfully');
        }
      }

      // Check if we can skip processing entirely
      if (!canUseElectronOptimization && this.shouldSkipProcessing(workingFile, options)) {
        if (onProgress) onProgress(100);
        return this.createUnprocessedResult(workingFile, options);
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

      if (canUseElectronOptimization) {
        finalFile = await this.nativeElectronOptimization(workingFile, processingOptions, onProgress);
      } else {
        // Choose optimization method based on format, quality, and browser capabilities
        finalFile = await this.selectOptimizationMethod(workingFile, optimizedOptions, capabilities, onProgress);
      }

      // Insert EXIF data back if it was extracted and output is JPEG
      if (exifData && options.preserveExif && options.format === 'jpeg') {
        finalFile = await this.insertExifData(finalFile, exifData);
        console.log('📸 EXIF data inserted successfully');
      }

      // SAFEGUARD: If the "optimized" file is larger than the original, and we haven't changed format,
      // it's better to keep the original file.
      // Exception: If user specifically requested 100% quality, they might accept a size increase,
      // but generally "optimization" implies size reduction.
      // We'll be safe: if it's bigger and same format, keep original.
      // Note: If crop was applied, we compare against the cropped file, not the original
      const inputFormat = this.getFormatFromMimeType(workingFile.type);
      if (finalFile.size > workingFile.size && inputFormat === options.format && !options.cropArea) {
        console.log(`⚠️ Optimized file is larger (${this.formatFileSize(finalFile.size)} > ${this.formatFileSize(workingFile.size)}). Keeping original.`);
        finalFile = workingFile;
        // We also need to ensure the "optimized" URL points to the original
        // This is handled below where we create URLs from finalFile
      }

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
        optimizationOptions: { ...options }, // Store options for re-optimization after crop
      };
    } catch (error) {
      console.error('Image optimization failed:', error);
      throw new Error(`Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Smart PNG optimization that prevents file size increases
   */
  static async smartPngOptimization(
    file: File,
    options: OptimizationOptions,
    onProgress?: (progress: number) => void
  ): Promise<File> {
    const inputFormat = this.getFormatFromMimeType(file.type);

    if (onProgress) onProgress(10);

    // If already PNG, use standard optimization
    if (inputFormat === 'png') {
      return await this.highQualityOptimization(file, options, onProgress);
    }

    // For non-PNG to PNG conversion, test the conversion first
    if (onProgress) onProgress(30);

    try {
      // Create a test conversion to check file size
      const testConversion = await this.convertFormat(file, 'png', options.quality, false);

      if (onProgress) onProgress(70);

      // Compare file sizes
      const originalSize = file.size;
      const convertedSize = testConversion.size;
      const sizeIncrease = ((convertedSize - originalSize) / originalSize) * 100;

      console.log(`🔍 PNG CONVERSION CHECK: ${this.formatFileSize(originalSize)} → ${this.formatFileSize(convertedSize)} (${sizeIncrease > 0 ? '+' : ''}${sizeIncrease.toFixed(1)}%)`);

      // If conversion increases file size by more than 20%, keep original format
      // Reverted from 50% to 20% to avoid excessive size increases while still allowing some flexibility
      if (sizeIncrease > 20) {
        console.log(`⚠️ PNG conversion would increase size by ${sizeIncrease.toFixed(1)}%. Keeping original ${inputFormat.toUpperCase()} format.`);

        // Optimize in original format instead
        const optimizedOptions = { ...options, format: inputFormat as 'webp' | 'jpeg' | 'png' };
        const result = await this.highQualityOptimization(file, optimizedOptions, onProgress);

        if (onProgress) onProgress(100);
        return result;
      }

      // Size increase is acceptable, return the PNG conversion
      if (onProgress) onProgress(100);
      return testConversion;

    } catch (error) {
      console.error('Error during PNG conversion test:', error);
      // Fallback to original format optimization
      const optimizedOptions = { ...options, format: inputFormat as 'webp' | 'jpeg' | 'png' };
      return await this.highQualityOptimization(file, optimizedOptions, onProgress);
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

    // If the user requested maximum quality with no resize or file-size target, keep the original.
    if (inputFormat === outputFormat &&
      options.quality >= 1.0 &&
      !needsResize &&
      !options.maxSizeMB) {
      if (onProgress) onProgress(100);
      return file;
    }

    // For PNG: If same format, maximum quality, and no resize needed, return original
    if (inputFormat === outputFormat &&
      outputFormat === 'png' &&
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

      img.onload = async () => {
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

          await this.yieldToMainThread();

          // Draw image with high quality
          ctx.drawImage(img, 0, 0, width, height);

          if (onProgress) onProgress(80);

          // Format-specific quality handling
          let finalQuality: number | undefined = options.quality;
          if (outputFormat === 'png') {
            // PNG is lossless, use 1.0 for best compression
            finalQuality = 1.0;
          } else if (outputFormat === 'webp' && options.losslessWebP) {
            // Lossless WebP
            finalQuality = undefined;
          }

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to convert image format'));
                return;
              }

              // Check if browser actually encoded in the requested format
              const requestedType = this.getFileType(options.format);
              const actualType = blob.type;

              if (actualType !== requestedType) {
                console.warn(`⚠️ ENCODING FAILED: Requested ${options.format.toUpperCase()} but got ${actualType}`);
                console.warn(`Your browser cannot ENCODE ${options.format.toUpperCase()} - falling back to ${actualType}`);
              }

              const fileName = this.generateFileName(file.name, options.format);
              const convertedFile = new File([blob], fileName, {
                type: blob.type, // Use actual blob type
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
    const compressionOptions: {
      useWebWorker: boolean;
      initialQuality: number;
      onProgress?: (progress: number) => void;
      maxWidthOrHeight?: number;
      fileType?: string;
      maxSizeMB?: number;
    } = {
      useWebWorker: capabilities.canUseWebWorkers, // Disable for Safari
      initialQuality: options.quality,
      onProgress: onProgress,
    };

    if (options.maxWidthOrHeight) {
      compressionOptions.maxWidthOrHeight = options.maxWidthOrHeight;
    }

    if (options.format !== inputFormat) {
      compressionOptions.fileType = this.getFileType(options.format);
    }

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
          return await this.convertFormat(file, options.format, options.quality, options.losslessWebP);
        }
      }
    }

    // Only add maxSizeMB if explicitly set (removed quality < 0.8 restriction)
    // This allows users to control file size even at high quality
    if (options.maxSizeMB) {
      compressionOptions.maxSizeMB = options.maxSizeMB;
    }

    // Compress the image
    const compressedFile = await imageCompression(file, compressionOptions);

    // Avoid a second lossy encode if the library already returned the requested format.
    if (options.format !== this.getFormatFromMimeType(compressedFile.type || file.type)) {
      return await this.convertFormat(compressedFile, options.format, options.quality, options.losslessWebP);
    }

    return compressedFile;
  }

  static async convertFormat(
    file: File,
    targetFormat: 'webp' | 'jpeg' | 'png' | 'avif',
    quality: number,
    lossless?: boolean
  ): Promise<File> {
    // AVIF requires special encoding via jsquash (canvas.toBlob doesn't support AVIF)
    if (targetFormat === 'avif') {
      return await this.avifOptimization(file, { format: 'avif', quality });
    }

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
        let finalQuality: number | undefined = quality;
        if (targetFormat === 'png') {
          // PNG is lossless, so quality parameter is ignored by most browsers
          // Use 1.0 to ensure best compression without quality loss
          finalQuality = 1.0;
        } else if (targetFormat === 'webp' && lossless) {
          // For lossless WebP, quality should be undefined or 1.0
          finalQuality = undefined;
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to convert image format'));
              return;
            }

            // IMPORTANT: Check if browser actually encoded in the requested format
            const requestedType = this.getFileType(targetFormat);
            const actualType = blob.type;

            if (actualType !== requestedType) {
              console.warn(`⚠️ ENCODING FAILED: Requested ${targetFormat.toUpperCase()} (${requestedType}) but got ${actualType}`);
              console.warn(`This means your browser cannot ENCODE ${targetFormat.toUpperCase()} via Canvas API`);
              console.warn(`File will be saved as the fallback format instead`);
            } else {
              console.log(`✅ Successfully encoded as ${targetFormat.toUpperCase()}`);
            }

            const fileName = this.generateFileName(file.name, targetFormat);
            const convertedFile = new File([blob], fileName, {
              type: blob.type, // Use actual blob type, not requested type
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

  static getFileType(format: 'webp' | 'jpeg' | 'png' | 'avif'): string {
    const mimeTypes = {
      webp: 'image/webp',
      jpeg: 'image/jpeg',
      png: 'image/png',
      avif: 'image/avif',
    };
    return mimeTypes[format];
  }

  static getFormatFromMimeType(mimeType: string): 'webp' | 'jpeg' | 'png' | 'avif' {
    if (mimeType.includes('avif')) return 'avif';
    if (mimeType.includes('webp')) return 'webp';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpeg';
    if (mimeType.includes('png')) return 'png';
    return 'jpeg'; // default fallback
  }

  /**
   * Sanitizes a filename for Google Merchant Center compatibility
   * Removes special characters, accents, converts to lowercase, and normalizes hyphens
   * @param filename The filename to sanitize (without extension)
   * @returns Sanitized filename safe for Google Merchant
   */
  static sanitizeFilename(filename: string): string {
    return filename
      // Convert to lowercase
      .toLowerCase()
      // Remove accents (normalize and remove diacritics)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Convert en-dash/em-dash to normal hyphen
      .replace(/[\u2013\u2014]/g, '-')
      // Replace spaces with hyphens
      .replace(/\s+/g, '-')
      // Remove special characters (keep only letters, numbers, and hyphens)
      .replace(/[^a-z0-9-]/g, '')
      // Remove multiple consecutive hyphens
      .replace(/-+/g, '-')
      // Remove hyphens at start and end
      .replace(/^-+|-+$/g, '')
      // Fallback if empty
      || 'image';
  }

  static generateFileName(originalName: string, format: 'webp' | 'jpeg' | 'png' | 'avif'): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const sanitizedName = this.sanitizeFilename(nameWithoutExt);
    const extensions = {
      webp: '.webp',
      jpeg: '.jpg',
      png: '.png',
      avif: '.avif',
    };
    return `${sanitizedName}${extensions[format]}`;
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static async downloadFile(file: File, filename?: string): Promise<void> {
    const finalFilename = filename || file.name;

    // Use native Electron dialog if available
    if (isElectron && window.electronAPI) {
      const buffer = await file.arrayBuffer();
      const result = await window.electronAPI.saveFile(buffer, finalFilename);
      if (!result.success && !result.canceled) {
        throw new Error(result.error || 'Failed to save file');
      }
      return;
    }

    // Fallback to browser download
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
    const usedFilenames = new Set<string>();

    // Add each file to the ZIP
    for (let i = 0; i < files.length; i++) {
      const processedImage = files[i];
      const baseFilename = this.getFinalFilename(processedImage);
      const filename = this.ensureUniqueFilename(baseFilename, usedFilenames);
      usedFilenames.add(filename);

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

    // Use native Electron dialog if available
    if (isElectron && window.electronAPI) {
      const zipArrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });
      if (onProgress) onProgress(100);
      const result = await window.electronAPI.saveZip(zipArrayBuffer, `${zipFilename}.zip`);
      if (!result.success && !result.canceled) {
        throw new Error(result.error || 'Failed to save ZIP file');
      }
      return;
    }

    // Fallback to browser download
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    if (onProgress) onProgress(100);
    const zipFile = new File([zipBlob], `${zipFilename}.zip`, { type: 'application/zip' });
    await this.downloadFile(zipFile, `${zipFilename}.zip`);
  }

  /**
   * Gets the final filename for a processed image, considering custom naming
   * Applies sanitization for Google Merchant Center compatibility
   * @param processedImage The processed image
   * @returns Final filename with extension (sanitized)
   */
  static getFinalFilename(processedImage: ProcessedImage): string {
    const extension = this.getExtensionFromFormat(processedImage.format as 'webp' | 'jpeg' | 'png' | 'avif');

    let baseName: string;
    if (processedImage.customFilename) {
      // Use custom filename, ensuring it doesn't already have an extension
      baseName = processedImage.customFilename.replace(/\.[^/.]+$/, '');
    } else {
      // Use original filename without extension
      baseName = processedImage.originalFile.name.replace(/\.[^/.]+$/, '');
    }

    const sanitizedName = this.sanitizeFilename(baseName);
    return `${sanitizedName}${extension}`;
  }

  /**
   * Ensures a filename is unique within a set by appending -1, -2, ...
   */
  static ensureUniqueFilename(filename: string, used: Set<string>): string {
    if (!used.has(filename)) return filename;

    const lastDot = filename.lastIndexOf('.');
    const base = lastDot > 0 ? filename.slice(0, lastDot) : filename;
    const ext = lastDot > 0 ? filename.slice(lastDot) : '';

    let i = 1;
    let candidate = `${base}-${i}${ext}`;
    while (used.has(candidate)) {
      i += 1;
      candidate = `${base}-${i}${ext}`;
    }
    return candidate;
  }

  /**
   * Gets file extension from format
   * @param format Image format
   * @returns File extension with dot
   */
  static getExtensionFromFormat(format: 'webp' | 'jpeg' | 'png' | 'avif'): string {
    const extensions = {
      webp: '.webp',
      jpeg: '.jpg',
      png: '.png',
      avif: '.avif',
    };
    return extensions[format];
  }

  /**
   * Cleans up blob URLs from processed images to prevent memory leaks
   * @param processedImages Array of processed images to clean up
   */
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
   * Crops an image to a specific aspect ratio, centered, then resizes to target dimensions
   * Works with any image size - crops with correct aspect ratio and scales to target
   * @param file The image file to crop
   * @param targetWidth Target width in pixels
   * @param targetHeight Target height in pixels
   * @returns A new cropped File at the exact target dimensions
   */
  static async cropImageToSize(file: File, targetWidth: number, targetHeight: number): Promise<File> {
    const safeTargetWidth = Math.max(1, Math.round(targetWidth));
    const safeTargetHeight = Math.max(1, Math.round(targetHeight));
    this.assertValidCanvasSize(safeTargetWidth, safeTargetHeight, 'Batch crop');

    const img = await this.loadImageFromFile(file, 'Batch crop');
    const targetRatio = safeTargetWidth / safeTargetHeight;
    const imageRatio = img.width / img.height;

    let cropX: number, cropY: number, cropWidth: number, cropHeight: number;

    if (imageRatio > targetRatio) {
      cropHeight = img.height;
      cropWidth = cropHeight * targetRatio;
      cropX = (img.width - cropWidth) / 2;
      cropY = 0;
    } else {
      cropWidth = img.width;
      cropHeight = cropWidth / targetRatio;
      cropX = 0;
      cropY = (img.height - cropHeight) / 2;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    canvas.width = safeTargetWidth;
    canvas.height = safeTargetHeight;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, safeTargetWidth, safeTargetHeight);

    const blob = await this.canvasToBlobWithTimeout(
      canvas,
      'image/png',
      1.0,
      'Batch crop'
    );

    const croppedFile = this.createFileFromBlob(blob, file.name, 'image/png');
    console.log(`✂️ Batch crop: ${img.width}x${img.height} → ${safeTargetWidth}x${safeTargetHeight}`);
    return croppedFile;
  }

  /**
   * Crop image with advanced style options (padding, background, shadow, frame, border radius)
   * Similar to CropEditor output but for batch processing
   */
  static async cropImageWithStyles(
    file: File,
    targetWidth: number,
    targetHeight: number,
    styleOptions: {
      padding: number;
      borderRadius: number;
      bgColor: string;
      shadow: 'none' | 'spread' | 'hug' | 'lg';
      frameStyle: 'none' | 'glass-light' | 'glass-dark' | 'inset-light' | 'inset-dark' | 'outline' | 'border' | 'liquid';
      borderWidth: number;
      borderColor: string;
    }
  ): Promise<File> {
    const safeTargetWidth = Math.max(1, Math.round(targetWidth));
    const safeTargetHeight = Math.max(1, Math.round(targetHeight));
    const safePadding = Math.max(0, Math.round(styleOptions.padding));
    const safeBorderRadius = Math.max(0, Math.round(styleOptions.borderRadius));
    const safeBorderWidth = Math.max(1, Math.round(styleOptions.borderWidth));

    this.assertValidCanvasSize(safeTargetWidth, safeTargetHeight, 'Styled batch crop');

    const outW = safeTargetWidth;
    const outH = safeTargetHeight;
    const finalW = outW + safePadding * 2;
    const finalH = outH + safePadding * 2;
    this.assertValidCanvasSize(finalW, finalH, 'Styled batch crop');

    const img = await this.loadImageFromFile(file, 'Styled batch crop');
    const targetRatio = outW / outH;
    const imageRatio = img.width / img.height;

    let cropX: number, cropY: number, cropWidth: number, cropHeight: number;

    if (imageRatio > targetRatio) {
      cropHeight = img.height;
      cropWidth = cropHeight * targetRatio;
      cropX = (img.width - cropWidth) / 2;
      cropY = 0;
    } else {
      cropWidth = img.width;
      cropHeight = cropWidth / targetRatio;
      cropX = 0;
      cropY = (img.height - cropHeight) / 2;
    }

    const { bgColor, shadow, frameStyle, borderColor } = styleOptions;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    canvas.width = finalW;
    canvas.height = finalH;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, finalW, finalH);
    }

    if (shadow !== 'none') {
      const shadowSizes = {
        spread: { blur: 30, offset: 0, opacity: 0.15, spread: true },
        hug: { blur: 8, offset: 4, opacity: 0.25, spread: false },
        lg: { blur: 40, offset: 15, opacity: 0.35, spread: false },
      };
      const shadowConfig = shadowSizes[shadow];

      ctx.save();
      ctx.shadowColor = `rgba(0, 0, 0, ${shadowConfig.opacity})`;
      ctx.shadowBlur = shadowConfig.blur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = shadowConfig.spread ? 0 : shadowConfig.offset;
      ctx.fillStyle = bgColor !== 'transparent' ? bgColor : '#ffffff';

      if (safeBorderRadius > 0) {
        const r = Math.min(safeBorderRadius, outW / 2, outH / 2);
        ctx.beginPath();
        ctx.roundRect(safePadding, safePadding, outW, outH, r);
        ctx.fill();
      } else {
        ctx.fillRect(safePadding, safePadding, outW, outH);
      }
      ctx.restore();
    }

    if (safeBorderRadius > 0) {
      ctx.save();
      const r = Math.min(safeBorderRadius, outW / 2, outH / 2);
      ctx.beginPath();
      ctx.roundRect(safePadding, safePadding, outW, outH, r);
      ctx.clip();
    }

    ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, safePadding, safePadding, outW, outH);

    if (safeBorderRadius > 0) {
      ctx.restore();
    }

    if (frameStyle !== 'none') {
      const bw = safeBorderWidth;
      const r = Math.min(safeBorderRadius, outW / 2, outH / 2);

      const drawRoundedRectPath = (x: number, y: number, w: number, h: number, radius: number) => {
        ctx.beginPath();
        if (radius > 0) {
          ctx.roundRect(x, y, w, h, radius);
        } else {
          ctx.rect(x, y, w, h);
        }
      };

      switch (frameStyle) {
        case 'glass-light':
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = bw;
          drawRoundedRectPath(safePadding + bw / 2, safePadding + bw / 2, outW - bw, outH - bw, Math.max(0, r - bw / 2));
          ctx.stroke();
          break;
        case 'glass-dark':
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.lineWidth = bw;
          drawRoundedRectPath(safePadding + bw / 2, safePadding + bw / 2, outW - bw, outH - bw, Math.max(0, r - bw / 2));
          ctx.stroke();
          break;
        case 'inset-light':
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          ctx.shadowBlur = bw * 1.5;
          ctx.shadowOffsetX = bw * 0.5;
          ctx.shadowOffsetY = bw * 0.5;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = bw;
          drawRoundedRectPath(safePadding + bw / 2, safePadding + bw / 2, outW - bw, outH - bw, Math.max(0, r - bw / 2));
          ctx.stroke();
          ctx.restore();
          break;
        case 'inset-dark':
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = bw * 1.5;
          ctx.shadowOffsetX = bw * 0.5;
          ctx.shadowOffsetY = bw * 0.5;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.lineWidth = bw;
          drawRoundedRectPath(safePadding + bw / 2, safePadding + bw / 2, outW - bw, outH - bw, Math.max(0, r - bw / 2));
          ctx.stroke();
          ctx.restore();
          break;
        case 'outline':
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 1;
          drawRoundedRectPath(safePadding + 0.5, safePadding + 0.5, outW - 1, outH - 1, r);
          ctx.stroke();
          break;
        case 'border':
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = bw;
          drawRoundedRectPath(safePadding + bw / 2, safePadding + bw / 2, outW - bw, outH - bw, Math.max(0, r - bw / 2));
          ctx.stroke();
          break;
        case 'liquid': {
          const liquidGradient = ctx.createLinearGradient(0, 0, finalW, finalH);
          liquidGradient.addColorStop(0, '#f97316');
          liquidGradient.addColorStop(0.5, '#eab308');
          liquidGradient.addColorStop(1, '#f97316');
          ctx.save();
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = bw * 2;
          ctx.strokeStyle = liquidGradient;
          ctx.lineWidth = bw;
          drawRoundedRectPath(safePadding + bw / 2, safePadding + bw / 2, outW - bw, outH - bw, Math.max(0, r - bw / 2));
          ctx.stroke();
          ctx.restore();
          break;
        }
      }
    }

    const blob = await this.canvasToBlobWithTimeout(canvas, 'image/png', 1.0, 'Styled batch crop');
    const croppedFile = this.createFileFromBlob(blob, file.name, 'image/png');
    console.log(`✂️ Styled crop: ${img.width}x${img.height} → ${finalW}x${finalH} (with styles)`);
    return croppedFile;
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
        // Custom mode: prefix + original name + suffix
        const originalName = image.originalFile.name.replace(/\.[^/.]+$/, '');

        if (pattern.prefix && pattern.suffix) {
          // Both prefix and suffix: prefix + original name + suffix
          newName = pattern.prefix + originalName + pattern.suffix;
        } else if (pattern.prefix) {
          // Only prefix: prefix + original name
          newName = pattern.prefix + originalName;
        } else if (pattern.suffix) {
          // Only suffix: original name + suffix
          newName = originalName + pattern.suffix;
        } else {
          // Neither prefix nor suffix: keep original name
          newName = originalName;
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
