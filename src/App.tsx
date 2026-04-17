import { useState, useCallback, useRef, useEffect, useReducer } from 'react';
import { Analytics } from '@vercel/analytics/react';
import '@/types/electron.d.ts';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!window.electronAPI;
import ImageUpload, { type ImageUploadRef } from '@/components/file-upload/image-upload';
import OptimizationControls from '@/components/optimization/OptimizationControls';
import ImagePreview from '@/components/optimization/ImagePreview';
import ProcessingOverlay from '@/components/optimization/ProcessingOverlay';
import { ImagePreviewSkeletons } from '@/components/optimization/ImagePreviewSkeleton';
import ZipDownloadDialog from '@/components/dialogs/ZipDownloadDialog';
import BatchRenameDialog, { type BatchRenamePattern } from '@/components/dialogs/BatchRenameDialog';
import BatchCropDialog, { type CropStyleOptions, type BatchCropResult } from '@/components/dialogs/BatchCropDialog';
import ResetProjectDialog from '@/components/dialogs/ResetProjectDialog';
import { type SizePreset } from '@/types/crop';
import InstallButton from '@/components/pwa/InstallButton';
import BrowserCompatibilityAlert, { useBrowserCompatibility } from '@/components/browser/BrowserCompatibilityAlert';
import FloatingSupport from '@/components/support/FloatingSupport';
import UpdateNotification from '@/components/updates/UpdateNotification';
import VersionDisplay from '@/components/updates/VersionDisplay';
import { Button } from '@/components/ui/button';
import OwnerNotice from '@/components/OwnerNotice';
import { ImageProcessor, type OptimizationOptions, type ProcessedImage, type FileValidationResult } from '@/lib/imageProcessor';
import { detectBrowser, getBrowserCapabilities, logBrowserInfo } from '@/lib/browserDetection';
import { Package, Edit3, Trash2, Crop } from 'lucide-react';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

type ActiveDialog = 'zip' | 'batchRename' | 'batchCrop' | 'resetProject' | null;

type ProcessingState = { isProcessing: boolean; progress: number; imageName: string };
type ProcessingAction =
  | { type: 'START' }
  | { type: 'UPDATE'; progress: number; imageName: string }
  | { type: 'FINISH' };

function processingReducer(state: ProcessingState, action: ProcessingAction): ProcessingState {
  switch (action.type) {
    case 'START':
      return { isProcessing: true, progress: 0, imageName: '' };
    case 'UPDATE':
      return { ...state, progress: action.progress, imageName: action.imageName };
    case 'FINISH':
      return { isProcessing: false, progress: 0, imageName: '' };
  }
}

function App() {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [processing, dispatchProcessing] = useReducer(processingReducer, { isProcessing: false, progress: 0, imageName: '' });
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const imageUploadRef = useRef<ImageUploadRef>(null);

  const yieldToBrowser = useCallback(async () => {
    await new Promise<void>((resolve) => {
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => resolve());
        return;
      }

      setTimeout(resolve, 0);
    });
  }, []);

  // Log browser info on mount
  useEffect(() => {
    logBrowserInfo();
  }, []);

  // Browser compatibility detection
  useBrowserCompatibility();


  // Use refs to track blob URLs for cleanup without causing effect re-runs
  const processedImagesRef = useRef<ProcessedImage[]>([]);
  const uploadedImagesRef = useRef<UploadedImage[]>([]);

  // Keep refs in sync with state
  useEffect(() => {
    processedImagesRef.current = processedImages;
  }, [processedImages]);

  useEffect(() => {
    uploadedImagesRef.current = uploadedImages;
  }, [uploadedImages]);

  // Cleanup blob URLs ONLY when page unloads - NOT on every state change
  // Use a flag to prevent cleanup during React StrictMode double-mount
  const isUnmountingRef = useRef(false);

  useEffect(() => {
    const cleanupAllBlobUrls = () => {
      // Clean up processed images using ref (current values at cleanup time)
      processedImagesRef.current.forEach(img => {
        if (img.originalUrl) {
          try { URL.revokeObjectURL(img.originalUrl); } catch { /* ignore */ }
        }
        if (img.optimizedUrl) {
          try { URL.revokeObjectURL(img.optimizedUrl); } catch { /* ignore */ }
        }
      });

      // Clean up uploaded images using ref
      uploadedImagesRef.current.forEach(img => {
        if (img.preview) {
          try { URL.revokeObjectURL(img.preview); } catch { /* ignore */ }
        }
      });
    };

    // Handle page unload (refresh, close tab, navigate away)
    const handleBeforeUnload = () => {
      isUnmountingRef.current = true;
      cleanupAllBlobUrls();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    // Cleanup only on ACTUAL page unload, not on StrictMode remount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      // DON'T cleanup URLs here - it causes issues with StrictMode
      // URLs will be cleaned up on beforeunload/pagehide events instead
    };
  }, []); // Empty dependency array - only run on mount/unmount

  const [optimizationOptions, setOptimizationOptions] = useState<OptimizationOptions>(() => {
    // Browser-derived defaults.
    const browser = detectBrowser();
    const caps = getBrowserCapabilities(browser);
    const defaults: OptimizationOptions = {
      format: caps.recommendedFormat,
      quality: 0.8,
      maxWidthOrHeight: undefined,
      preserveExif: false,
      progressiveJpeg: false,
      losslessWebP: false,
      pngCompressionLevel: 6,
      maxSizeMB: undefined,
    };

    // Restore last-used options from the previous session, if any.
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('optimization_options') : null;
      if (!raw) return defaults;
      const saved = JSON.parse(raw) as Partial<OptimizationOptions>;
      const allowedFormats: OptimizationOptions['format'][] = ['webp', 'jpeg', 'png', 'avif'];
      const format = allowedFormats.includes(saved.format as OptimizationOptions['format'])
        ? (saved.format as OptimizationOptions['format'])
        : defaults.format;
      // Degrade gracefully if the saved format is no longer supported.
      const finalFormat = format === 'webp' && !caps.canUseWebP ? caps.recommendedFormat : format;
      return {
        ...defaults,
        ...saved,
        format: finalFormat,
        quality:
          typeof saved.quality === 'number' && saved.quality > 0 && saved.quality <= 1
            ? saved.quality
            : defaults.quality,
      };
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('optimization_options', JSON.stringify(optimizationOptions));
    } catch {
      // Quota exceeded or storage disabled — silently ignore.
    }
  }, [optimizationOptions]);

  const handleImagesUploaded = useCallback((images: UploadedImage[]) => {
    setUploadedImages(images);

  }, []);

  const handleValidationError = useCallback((errors: FileValidationResult[]) => {
    // Log validation errors for debugging
    console.warn('File validation errors:', errors);
  }, []);

  const handleOptimizeImages = useCallback(async () => {
    if (uploadedImages.length === 0) return;

    dispatchProcessing({ type: 'START' });
    setProcessedImages([]);

    try {
      // Use a ref-like pattern to accumulate results and update state correctly
      const accumulatedImages: ProcessedImage[] = [];

      for (const uploadedImage of uploadedImages) {
        if (uploadedImage.status !== 'completed') continue;

        try {
          await yieldToBrowser();

          // Set current image name for progress display
          dispatchProcessing({ type: 'UPDATE', progress: 0, imageName: uploadedImage.file.name });

          const processedImage = await ImageProcessor.optimizeImage(
            uploadedImage.file,
            optimizationOptions,
            (progress) => {
              dispatchProcessing({ type: 'UPDATE', progress, imageName: uploadedImage.file.name });
            }
          );

          accumulatedImages.push(processedImage);
          // Update state with a copy of the accumulated array to ensure React sees a new reference
          setProcessedImages([...accumulatedImages]);
          await yieldToBrowser();
        } catch (err) {
          console.error(`Failed to process ${uploadedImage.file.name}:`, err);
        }
      }
    } catch (err) {
      console.error('Optimization failed:', err);
    } finally {
      dispatchProcessing({ type: 'FINISH' });
    }
  }, [uploadedImages, optimizationOptions, yieldToBrowser]);

  const handleDownloadAll = useCallback(() => {
    setActiveDialog('zip');
  }, []);

  // Keyboard shortcuts: Ctrl/Cmd+O open, Ctrl/Cmd+S download first,
  // Ctrl/Cmd+Shift+S open ZIP dialog, Escape close active dialog.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const mod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement | null;
      const inField = target
        ? ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
        : false;

      if (e.key === 'Escape' && activeDialog) {
        setActiveDialog(null);
        return;
      }

      if (inField) return;

      if (mod && !e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        imageUploadRef.current?.openFileDialog();
        return;
      }

      if (mod && e.shiftKey && e.key.toLowerCase() === 's') {
        if (processedImagesRef.current.length > 0) {
          e.preventDefault();
          setActiveDialog('zip');
        }
        return;
      }

      if (mod && !e.shiftKey && e.key.toLowerCase() === 's') {
        const first = processedImagesRef.current[0];
        if (first) {
          e.preventDefault();
          void ImageProcessor.downloadFile(
            first.optimizedFile,
            ImageProcessor.getFinalFilename(first)
          );
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeDialog]);

  const handleZipDownload = useCallback(async (zipFilename: string) => {
    try {
      await ImageProcessor.downloadAsZip(processedImages, zipFilename);
    } catch (err) {
      console.error('ZIP download failed:', err);
    }
  }, [processedImages]);

  const handleRenameImage = useCallback((id: string, newFilename: string) => {
    setProcessedImages(prev =>
      prev.map(img =>
        img.id === id
          ? { ...img, customFilename: newFilename }
          : img
      )
    );
  }, []);

  const handleBatchRename = useCallback((pattern: BatchRenamePattern) => {
    const renamedImages = ImageProcessor.applyBatchRename(processedImages, pattern);
    setProcessedImages(renamedImages);
  }, [processedImages]);

  const handleDownloadImage = useCallback(async (image: ProcessedImage) => {
    const finalFilename = ImageProcessor.getFinalFilename(image);
    await ImageProcessor.downloadFile(image.optimizedFile, finalFilename);
  }, []);

  const handleRestoreOriginal = useCallback((imageId: string) => {
    setProcessedImages(prev =>
      prev.map(img => {
        if (img.id !== imageId || !img.preCropSnapshot) return img;
        const snapshot = img.preCropSnapshot;

        // Revoke the URLs of the cropped version we're replacing.
        if (img.originalUrl) {
          try { URL.revokeObjectURL(img.originalUrl); } catch { /* ignore */ }
        }
        if (img.optimizedUrl && img.optimizedUrl !== img.originalUrl) {
          try { URL.revokeObjectURL(img.optimizedUrl); } catch { /* ignore */ }
        }

        return {
          ...img,
          originalFile: snapshot.originalFile,
          originalUrl: snapshot.originalUrl,
          originalSize: snapshot.originalSize,
          optimizedFile: snapshot.optimizedFile,
          optimizedUrl: snapshot.optimizedUrl,
          optimizedSize: snapshot.optimizedSize,
          compressionRatio: snapshot.compressionRatio,
          preCropSnapshot: undefined,
        };
      })
    );
  }, []);

  const handleRemoveImage = useCallback((imageId: string) => {
    // Find the image to clean up its URLs
    const imageToRemove = processedImages.find(img => img.id === imageId);
    if (imageToRemove) {
      // Clean up blob URLs to prevent memory leaks
      ImageProcessor.cleanupProcessedImage(imageToRemove);

      // Also remove the corresponding uploaded image from ImageUpload component
      const originalFileName = imageToRemove.originalFile.name;
      imageUploadRef.current?.removeImageByName(originalFileName);
    }

    // Remove from processed images state
    setProcessedImages(prev => prev.filter(img => img.id !== imageId));
  }, [processedImages]);

  const handleCropImage = useCallback(async (imageId: string, croppedFile: File, croppedUrl: string) => {
    // Find the image to get its optimization options
    const imageToUpdate = processedImages.find(img => img.id === imageId);
    if (!imageToUpdate) return;

    // Get the optimization options used for this image (or use current global options as fallback)
    const optionsToUse = imageToUpdate.optimizationOptions || optimizationOptions;

    try {
      // Re-optimize the cropped image with the same settings
      const reOptimized = await ImageProcessor.optimizeImage(croppedFile, optionsToUse);

      // Revoke old URLs now that we have replacements
      if (imageToUpdate.optimizedUrl) {
        URL.revokeObjectURL(imageToUpdate.optimizedUrl);
      }
      if (imageToUpdate.originalUrl) {
        URL.revokeObjectURL(imageToUpdate.originalUrl);
      }
      URL.revokeObjectURL(croppedUrl);

      setProcessedImages(prev =>
        prev.map(img => {
          if (img.id === imageId) {
            return {
              ...img,
              // Keep the cropped image as the new "original" for before/after comparison
              originalFile: croppedFile,
              originalUrl: reOptimized.originalUrl,
              originalSize: croppedFile.size,
              // Use the re-optimized version
              optimizedFile: reOptimized.optimizedFile,
              optimizedUrl: reOptimized.optimizedUrl,
              optimizedSize: reOptimized.optimizedSize,
              compressionRatio: reOptimized.compressionRatio,
              // Preserve the optimization options
              optimizationOptions: optionsToUse,
            };
          }
          return img;
        })
      );
    } catch (error) {
      console.error('Failed to re-optimize cropped image:', error);
      // Revoke old URLs before replacing them with the fallback
      if (imageToUpdate.optimizedUrl) {
        URL.revokeObjectURL(imageToUpdate.optimizedUrl);
      }
      if (imageToUpdate.originalUrl) {
        URL.revokeObjectURL(imageToUpdate.originalUrl);
      }
      URL.revokeObjectURL(croppedUrl);

      // Fallback: use the cropped image both as original and optimized. Create
      // two distinct blob URLs so cleanup can revoke each independently.
      const fallbackOriginalUrl = URL.createObjectURL(croppedFile);
      const fallbackOptimizedUrl = URL.createObjectURL(croppedFile);
      setProcessedImages(prev =>
        prev.map(img => {
          if (img.id === imageId) {
            return {
              ...img,
              originalFile: croppedFile,
              originalUrl: fallbackOriginalUrl,
              originalSize: croppedFile.size,
              optimizedFile: croppedFile,
              optimizedUrl: fallbackOptimizedUrl,
              optimizedSize: croppedFile.size,
              compressionRatio: 0,
              optimizationOptions: optionsToUse,
            };
          }
          return img;
        })
      );
    }
  }, [processedImages, optimizationOptions]);

  const handleBatchCrop = useCallback(async (
    preset: SizePreset,
    styleOptions: CropStyleOptions,
    imageIds: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<BatchCropResult> => {
    const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`));
        }, timeoutMs);
      });

      try {
        return await Promise.race([promise, timeoutPromise]);
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    // Check if style options have any effects (if so, we use styled crop)
    const hasStyles = styleOptions.padding > 0 ||
                      styleOptions.borderRadius > 0 ||
                      styleOptions.bgColor !== 'transparent' ||
                      styleOptions.shadow !== 'none' ||
                      styleOptions.frameStyle !== 'none';

    const total = imageIds.length;
    const browser = detectBrowser();
    const errors: string[] = [];
    let processed = 0;
    let failed = 0;

    // Process each image sequentially to avoid memory issues
    for (let i = 0; i < imageIds.length; i++) {
      const imageId = imageIds[i];

      // Report progress (1-indexed for display)
      if (onProgress) {
        onProgress(i + 1, total);
      }

      const imageToUpdate = processedImagesRef.current.find(img => img.id === imageId);
      if (!imageToUpdate) {
        failed++;
        errors.push(`Image ${imageId}: image no longer exists in current state`);
        continue;
      }

      try {
        let croppedFile: File;

        if (hasStyles) {
          // Use styled crop with all effects
          croppedFile = await withTimeout(
            ImageProcessor.cropImageWithStyles(
              imageToUpdate.optimizedFile,
              preset.width,
              preset.height,
              styleOptions
            ),
            20000,
            `Styled crop for ${imageToUpdate.originalFile.name}`
          );
        } else {
          // Simple centered crop without styles
          croppedFile = await withTimeout(
            ImageProcessor.cropImageToSize(
              imageToUpdate.optimizedFile,
              preset.width,
              preset.height
            ),
            20000,
            `Batch crop for ${imageToUpdate.originalFile.name}`
          );
        }

        // Get the optimization options used for this image
        const optionsToUse = imageToUpdate.optimizationOptions || optimizationOptions;

        // Re-optimize the cropped image
        const reOptimized = await withTimeout(
          ImageProcessor.optimizeImage(croppedFile, optionsToUse),
          30000,
          `Re-optimization for ${imageToUpdate.originalFile.name}`
        );

        // Preserve the pre-crop files so the user can restore them later.
        // Any existing snapshot is discarded (one level of undo, its URLs
        // revoked here to avoid leaks).
        if (imageToUpdate.preCropSnapshot) {
          URL.revokeObjectURL(imageToUpdate.preCropSnapshot.originalUrl);
          if (imageToUpdate.preCropSnapshot.optimizedUrl !== imageToUpdate.preCropSnapshot.originalUrl) {
            URL.revokeObjectURL(imageToUpdate.preCropSnapshot.optimizedUrl);
          }
        }

        const snapshot: ProcessedImage['preCropSnapshot'] = {
          originalFile: imageToUpdate.originalFile,
          originalSize: imageToUpdate.originalSize,
          originalUrl: imageToUpdate.originalUrl,
          optimizedFile: imageToUpdate.optimizedFile,
          optimizedSize: imageToUpdate.optimizedSize,
          optimizedUrl: imageToUpdate.optimizedUrl,
          compressionRatio: imageToUpdate.compressionRatio,
        };

        // Update the image in state
        setProcessedImages(prev =>
          prev.map(img => {
            if (img.id === imageId) {
              return {
                ...img,
                originalFile: croppedFile,
                originalUrl: reOptimized.originalUrl,
                originalSize: croppedFile.size,
                optimizedFile: reOptimized.optimizedFile,
                optimizedUrl: reOptimized.optimizedUrl,
                optimizedSize: reOptimized.optimizedSize,
                compressionRatio: reOptimized.compressionRatio,
                optimizationOptions: optionsToUse,
                preCropSnapshot: snapshot,
              };
            }
            return img;
          })
        );
        processed++;
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${imageToUpdate.originalFile.name}: ${errorMessage}`);
        console.error(`Failed to batch crop image ${imageId}:`, {
          error,
          fileName: imageToUpdate.originalFile.name,
          outputPreset: `${preset.width}x${preset.height}`,
          outputFormat: imageToUpdate.optimizationOptions?.format || optimizationOptions.format,
          hasStyles,
          browser: `${browser.name} ${browser.version}`,
          userAgent: navigator.userAgent,
        });
        // Continue with next image
      }
    }

    // Report final progress (all done)
    if (onProgress) {
      onProgress(total, total);
    }

    return { processed, failed, errors };
  }, [optimizationOptions]);

  const handleResetProject = useCallback(() => {
    // Clean up blob URLs from processed images to prevent memory leaks
    processedImages.forEach(img => {
      if (img.originalUrl) {
        try { URL.revokeObjectURL(img.originalUrl); } catch { /* ignore */ }
      }
      if (img.optimizedUrl) {
        try { URL.revokeObjectURL(img.optimizedUrl); } catch { /* ignore */ }
      }
    });

    // Revoke blob URLs from uploaded images to prevent memory leaks
    uploadedImages.forEach(img => {
      if (img.preview) {
        try { URL.revokeObjectURL(img.preview); } catch { /* ignore */ }
      }
    });

    // Clear all uploaded and processed images immediately
    setUploadedImages([]);
    setProcessedImages([]);
    dispatchProcessing({ type: 'FINISH' });

    // Reset the ImageUpload component (this will handle its own blob URL cleanup)
    imageUploadRef.current?.resetUpload();

    // Force garbage collection hint by clearing references
    // Note: This doesn't guarantee immediate GC but helps the browser know these objects can be collected
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        const gcWindow = window as Window & { gc?: () => void };
        gcWindow.gc?.();
      } catch {
        // gc not available, which is normal
      }
    }

    // Keep optimization settings unchanged
  }, [processedImages, uploadedImages]);

  return (
    <div className="min-h-screen bg-neutral-950 py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* Browser Compatibility Alert */}
        <BrowserCompatibilityAlert />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:items-start">
          {/* Left Column: Upload + Settings stacked */}
          <div className="space-y-4 lg:sticky lg:top-6 self-start">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-white">Upload Images</h2>
              </div>
              <p className="text-xs text-neutral-500">Drag and drop or click to select images.</p>
              <ImageUpload
                ref={imageUploadRef}
                onImagesChange={handleImagesUploaded}
                onUploadComplete={() => { }}
                onValidationError={handleValidationError}
                maxFiles={10}
                maxSize={50 * 1024 * 1024} // 50MB
                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              />
            </div>

            {uploadedImages.length > 0 && (
              <OptimizationControls
                options={optimizationOptions}
                onOptionsChange={setOptimizationOptions}
                onOptimize={handleOptimizeImages}
                isProcessing={processing.isProcessing}
                hasImages={uploadedImages.some(img => img.status === 'completed')}
                processedCount={processedImages.length}
                totalImages={uploadedImages.filter(img => img.status === 'completed').length}
                currentImageProgress={processing.progress}
                currentImageName={processing.imageName}
              />
            )}
          </div>

          {/* Right Column: Results only */}
          <div className="space-y-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
              <h2 className="text-sm font-medium text-white">Optimized Images</h2>

              {/* Action Buttons - Moved below text */}
              {processedImages.length > 0 && (
                <div className="flex flex-col gap-2">
                  {/* Row 1: Edit actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setActiveDialog('batchRename')}
                      className="flex-1"
                      size="sm"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Rename All
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setActiveDialog('batchCrop')}
                      className="flex-1"
                      size="sm"
                    >
                      <Crop className="h-3.5 w-3.5" />
                      Crop All
                    </Button>
                  </div>
                  {/* Row 2: Download and Reset */}
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      onClick={handleDownloadAll}
                      className="flex-1"
                      size="sm"
                    >
                      <Package className="h-3.5 w-3.5" />
                      Download ZIP ({processedImages.length})
                    </Button>
                    {/* Reset Project button - icon only with destructive styling */}
                    <Button
                      variant="destructive"
                      onClick={() => setActiveDialog('resetProject')}
                      size="sm"
                      title="Reset Project"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Show processed images or skeleton loading as default empty state */}
            {processedImages.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {processedImages.map((img) => (
                  <ImagePreview
                    key={img.id}
                    processedImage={img}
                    onDownload={handleDownloadImage}
                    onRename={handleRenameImage}
                    onRemove={handleRemoveImage}
                    onCrop={handleCropImage}
                    onRestoreOriginal={handleRestoreOriginal}
                  />
                ))}
              </div>
            ) : (
              /* Show skeleton loading as default empty state */
              <ImagePreviewSkeletons count={4} />
            )}
          </div>
        </div>

        {/* Processing Overlay */}
        <ProcessingOverlay
          isProcessing={processing.isProcessing}
          currentImageName={processing.imageName}
          currentImageProgress={processing.progress}
          processedCount={processedImages.length}
          totalImages={uploadedImages.filter(img => img.status === 'completed').length}
          format={optimizationOptions.format}
        />

        {/* Dialogs */}
        <ZipDownloadDialog
          isOpen={activeDialog === 'zip'}
          onClose={() => setActiveDialog(null)}
          onDownload={handleZipDownload}
          fileCount={processedImages.length}
        />

        <BatchRenameDialog
          isOpen={activeDialog === 'batchRename'}
          onClose={() => setActiveDialog(null)}
          onApply={handleBatchRename}
          images={processedImages}
        />

        <BatchCropDialog
          isOpen={activeDialog === 'batchCrop'}
          onClose={() => setActiveDialog(null)}
          onApply={handleBatchCrop}
          images={processedImages}
        />

        <ResetProjectDialog
          isOpen={activeDialog === 'resetProject'}
          onClose={() => setActiveDialog(null)}
          onConfirm={handleResetProject}
        />

        {/* PWA Install Button - hidden in Electron */}
        {!isElectron && <InstallButton />}

        {/* Update Notification - hidden in Electron */}
        {!isElectron && <UpdateNotification />}

        {/* Ownership information */}
        <OwnerNotice
          ownerName="Pixelhunter.pt"
          website="https://www.pixelhunter.pt"
          contactEmail="geral@pixelhunter.pt"
        />

        {/* Floating Support Button */}
        <FloatingSupport />

        {/* Version Display (bottom right corner) */}
        <div className="fixed bottom-4 right-4 z-40">
          <VersionDisplay />
        </div>

        {/* Vercel Analytics - hidden in Electron */}
        {!isElectron && <Analytics />}
      </div>
    </div>
  );
}

export default App;
