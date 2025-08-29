import { useState, useCallback, useRef } from 'react';
import ImageUpload, { type ImageUploadRef } from '@/components/file-upload/image-upload';
import OptimizationControls from '@/components/optimization/OptimizationControls';
import ImagePreview from '@/components/optimization/ImagePreview';
import { ImagePreviewSkeletons } from '@/components/optimization/ImagePreviewSkeleton';
import ZipDownloadDialog from '@/components/dialogs/ZipDownloadDialog';
import BatchRenameDialog, { type BatchRenamePattern } from '@/components/dialogs/BatchRenameDialog';
import ResetProjectDialog from '@/components/dialogs/ResetProjectDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ImageProcessor, type OptimizationOptions, type ProcessedImage } from '@/lib/imageProcessor';
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

  const [optimizationOptions, setOptimizationOptions] = useState<OptimizationOptions>({
    format: 'webp',
    quality: 0.8, // Higher default quality for better results
    maxWidthOrHeight: 1920,
    preserveQuality: false, // Allow users to toggle this
  });

  const handleImagesUploaded = useCallback((images: UploadedImage[]) => {
    setUploadedImages(images);

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

  const handleResetProject = useCallback(() => {
    // Clear all uploaded and processed images
    setUploadedImages([]);
    setProcessedImages([]);
    setIsProcessing(false);
    // Reset the ImageUpload component
    imageUploadRef.current?.resetUpload();
    // Keep optimization settings unchanged
  }, []);

  // Summary stats for results
  const totalSavings = processedImages.reduce(
    (acc, img) => acc + (img.originalSize - img.optimizedSize),
    0
  );
  const averageCompression = processedImages.length
    ? processedImages.reduce((acc, img) => acc + img.compressionRatio, 0) / processedImages.length
    : 0;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-start">
        {/* Left Column: Upload + Settings stacked */}
        <div className="space-y-6 lg:sticky lg:top-8 self-start">
          <Card className="bg-card border border-border rounded-lg">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Upload Images</h2>
              <p className="text-sm text-muted-foreground">Drag and drop or click to select images.</p>
              <ImageUpload
                ref={imageUploadRef}
                onImagesChange={handleImagesUploaded}
                onUploadComplete={() => {}}
                maxFiles={10}
                maxSize={50 * 1024 * 1024} // 50MB
                accept="image/*"
              />
            </CardContent>
          </Card>

          {uploadedImages.length > 0 && (
            <Card className="bg-card border border-border rounded-lg">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Optimization Settings</h2>
                <OptimizationControls
                  options={optimizationOptions}
                  onOptionsChange={setOptimizationOptions}
                  onOptimize={handleOptimizeImages}
                  isProcessing={isProcessing}
                  hasImages={uploadedImages.some(img => img.status === 'completed')}
                  processedCount={processedImages.length}
                  totalImages={uploadedImages.filter(img => img.status === 'completed').length}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Results only */}
        <div className="space-y-4">
          <Card className="bg-card border border-border rounded-lg">
            <CardContent className="p-6 space-y-4">
              {/* Header and Stats */}
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Optimized Images</h2>
                {processedImages.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <span>Total saved: {ImageProcessor.formatFileSize(totalSavings)}</span>
                    <span className="mx-2">•</span>
                    <span>Average compression: {averageCompression.toFixed(1)}%</span>
                  </div>
                )}
              </div>

              {/* Action Buttons - Moved below text */}
              {processedImages.length > 0 && (
                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowBatchRenameDialog(true)}
                      className="flex items-center justify-center gap-2 flex-1"
                      size="lg"
                    >
                      <Edit3 className="h-4 w-4" />
                      Rename All
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleDownloadAll}
                      className="flex items-center justify-center gap-2 flex-1"
                      size="lg"
                    >
                      <Package className="h-4 w-4" />
                      Download ZIP ({processedImages.length})
                    </Button>
                  </div>
                  {/* Reset Project button - only show when there are processed images */}
                  <Button
                    variant="destructive"
                    onClick={() => setShowResetProjectDialog(true)}
                    className="flex items-center justify-center gap-2"
                    size="sm"
                  >
                    <Trash2 className="h-3 w-3" />
                    Reset Project
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>



          {/* Show processed images or skeleton loading as default empty state */}
          {processedImages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {processedImages.map((img) => (
                <ImagePreview
                  key={img.id}
                  processedImage={img}
                  onDownload={(image) => ImageProcessor.downloadFile(image.optimizedFile)}
                  onRemove={(id) => setProcessedImages((prev) => prev.filter((p) => p.id !== id))}
                  onRename={handleRenameImage}
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
    </div>
  );
}

export default App;
