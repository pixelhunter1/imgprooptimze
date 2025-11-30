import { useState, useCallback, useRef, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import ImageUpload, { type ImageUploadRef } from '@/components/file-upload/image-upload';
import OptimizationControls from '@/components/optimization/OptimizationControls';
import ImagePreview from '@/components/optimization/ImagePreview';
import { ImagePreviewSkeletons } from '@/components/optimization/ImagePreviewSkeleton';
import ZipDownloadDialog from '@/components/dialogs/ZipDownloadDialog';
import BatchRenameDialog, { type BatchRenamePattern } from '@/components/dialogs/BatchRenameDialog';
import ResetProjectDialog from '@/components/dialogs/ResetProjectDialog';
import InstallButton from '@/components/pwa/InstallButton';
import BrowserCompatibilityAlert, { useBrowserCompatibility } from '@/components/browser/BrowserCompatibilityAlert';
import FloatingSupport from '@/components/support/FloatingSupport';
import UpdateNotification from '@/components/updates/UpdateNotification';
import VersionDisplay from '@/components/updates/VersionDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ImageProcessor, type OptimizationOptions, type ProcessedImage, type FileValidationResult } from '@/lib/imageProcessor';
import { detectBrowser, getBrowserCapabilities, logBrowserInfo } from '@/lib/browserDetection';
import { Package, Edit3, Trash2 } from 'lucide-react';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

function App() {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showZipDialog, setShowZipDialog] = useState(false);
  const [showBatchRenameDialog, setShowBatchRenameDialog] = useState(false);
  const [showResetProjectDialog, setShowResetProjectDialog] = useState(false);
  const imageUploadRef = useRef<ImageUploadRef>(null);

  // Log browser info on mount
  useEffect(() => {
    logBrowserInfo();
  }, []);

  // Browser compatibility detection
  useBrowserCompatibility();

  // Mobile device detection
  // const { isMobile, isTablet } = useMobileDetection();
  // const shouldBlockMobile = isMobile || isTablet;

  // Cleanup blob URLs when page unloads (refresh, close, navigate away)
  useEffect(() => {
    const cleanupAllBlobUrls = () => {
      // Clean up processed images
      processedImages.forEach(img => {
        if (img.originalUrl) {
          try { URL.revokeObjectURL(img.originalUrl); } catch (e) { /* ignore */ }
        }
        if (img.optimizedUrl) {
          try { URL.revokeObjectURL(img.optimizedUrl); } catch (e) { /* ignore */ }
        }
      });

      // Clean up uploaded images
      uploadedImages.forEach(img => {
        if (img.preview) {
          try { URL.revokeObjectURL(img.preview); } catch (e) { /* ignore */ }
        }
      });
    };

    // Handle page unload (refresh, close tab, navigate away)
    const handleBeforeUnload = () => {
      cleanupAllBlobUrls();
    };

    // Handle visibility change (tab switch, minimize)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is being hidden - cleanup if no images are being processed
        if (!isProcessing && processedImages.length === 0 && uploadedImages.length === 0) {
          cleanupAllBlobUrls();
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanupAllBlobUrls();
    };
  }, [processedImages, uploadedImages, isProcessing]);

  const [optimizationOptions, setOptimizationOptions] = useState<OptimizationOptions>(() => {
    // Set initial options based on browser capabilities
    const browser = detectBrowser();
    const caps = getBrowserCapabilities(browser);

    return {
      format: caps.recommendedFormat, // Will use WebP if available, then JPEG
      quality: 0.8, // Default to 80% quality for good balance of size and quality
      maxWidthOrHeight: browser.isIOS ? 1600 : 1920, // Lower for iOS
      preserveExif: false, // Disabled by default
      progressiveJpeg: false, // Disabled by default
      losslessWebP: false, // Disabled by default
      pngCompressionLevel: 6, // Default PNG compression level
      maxSizeMB: undefined, // No limit by default
    };
  });

  const handleImagesUploaded = useCallback((images: UploadedImage[]) => {
    setUploadedImages(images);

  }, []);

  const handleValidationError = useCallback((errors: FileValidationResult[]) => {
    // Log validation errors for debugging
    console.warn('File validation errors:', errors);
  }, []);

  const handleOptimizeImages = useCallback(async () => {
    if (uploadedImages.length === 0) return;

    setIsProcessing(true);
    setProcessedImages([]);

    try {
      const newProcessedImages: ProcessedImage[] = [];

      for (const uploadedImage of uploadedImages) {
        if (uploadedImage.status !== 'completed') continue;

        try {
          const processedImage = await ImageProcessor.optimizeImage(
            uploadedImage.file,
            optimizationOptions
          );

          newProcessedImages.push(processedImage);
          setProcessedImages(prev => [...prev, processedImage]);
        } catch (err) {
          console.error(`Failed to process ${uploadedImage.file.name}:`, err);
        }
      }
    } catch (err) {
      console.error('Optimization failed:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedImages, optimizationOptions]);

  const handleDownloadAll = useCallback(() => {
    setShowZipDialog(true);
  }, []);

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

  const handleCropImage = useCallback((imageId: string, croppedFile: File, croppedUrl: string) => {
    setProcessedImages(prev =>
      prev.map(img => {
        if (img.id === imageId) {
          // Revoke old optimized URL to prevent memory leak
          if (img.optimizedUrl) {
            URL.revokeObjectURL(img.optimizedUrl);
          }
          return {
            ...img,
            optimizedFile: croppedFile,
            optimizedUrl: croppedUrl,
            optimizedSize: croppedFile.size,
            // Recalculate compression ratio
            compressionRatio: ((img.originalSize - croppedFile.size) / img.originalSize) * 100,
          };
        }
        return img;
      })
    );
  }, []);

  const handleResetProject = useCallback(() => {
    // Clean up blob URLs from processed images to prevent memory leaks
    processedImages.forEach(img => {
      if (img.originalUrl) {
        try { URL.revokeObjectURL(img.originalUrl); } catch (e) { /* ignore */ }
      }
      if (img.optimizedUrl) {
        try { URL.revokeObjectURL(img.optimizedUrl); } catch (e) { /* ignore */ }
      }
    });

    // Revoke blob URLs from uploaded images to prevent memory leaks
    uploadedImages.forEach(img => {
      if (img.preview) {
        try { URL.revokeObjectURL(img.preview); } catch (e) { /* ignore */ }
      }
    });

    // Clear all uploaded and processed images immediately
    setUploadedImages([]);
    setProcessedImages([]);
    setIsProcessing(false);

    // Reset the ImageUpload component (this will handle its own blob URL cleanup)
    imageUploadRef.current?.resetUpload();

    // Force garbage collection hint by clearing references
    // Note: This doesn't guarantee immediate GC but helps the browser know these objects can be collected
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        // @ts-ignore - gc is only available when Chrome is run with --expose-gc flag
        window.gc();
      } catch (e) {
        // gc not available, which is normal
      }
    }

    // Keep optimization settings unchanged
  }, [processedImages, uploadedImages]);

  // Mobile blocker removed to allow responsive usage
  // if (shouldBlockMobile) {
  //   return <MobileBlocker />;
  // }

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
                isProcessing={isProcessing}
                hasImages={uploadedImages.some(img => img.status === 'completed')}
                processedCount={processedImages.length}
                totalImages={uploadedImages.filter(img => img.status === 'completed').length}
              />
            )}
          </div>

          {/* Right Column: Results only */}
          <div className="space-y-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
              <h2 className="text-sm font-medium text-white">Optimized Images</h2>

              {/* Action Buttons - Moved below text */}
              {processedImages.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setShowBatchRenameDialog(true)}
                    className="flex-1"
                    size="sm"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Rename All
                  </Button>
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
                    onClick={() => setShowResetProjectDialog(true)}
                    size="sm"
                    title="Reset Project"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
                  />
                ))}
              </div>
            ) : (
              /* Show skeleton loading as default empty state */
              <ImagePreviewSkeletons count={4} />
            )}
          </div>
        </div>

        {/* Dialogs */}
        <ZipDownloadDialog
          isOpen={showZipDialog}
          onClose={() => setShowZipDialog(false)}
          onDownload={handleZipDownload}
          fileCount={processedImages.length}
        />

        <BatchRenameDialog
          isOpen={showBatchRenameDialog}
          onClose={() => setShowBatchRenameDialog(false)}
          onApply={handleBatchRename}
          images={processedImages}
        />

        <ResetProjectDialog
          isOpen={showResetProjectDialog}
          onClose={() => setShowResetProjectDialog(false)}
          onConfirm={handleResetProject}
        />

        {/* PWA Install Button */}
        <InstallButton />

        {/* Update Notification */}
        <UpdateNotification />

        {/* Floating Support Button */}
        <FloatingSupport />

        {/* Version Display (bottom right corner) */}
        <div className="fixed bottom-4 right-4 z-40">
          <VersionDisplay />
        </div>

        {/* Vercel Analytics */}
        <Analytics />
      </div>
    </div>
  );
}

export default App;
