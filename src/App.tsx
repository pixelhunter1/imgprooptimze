import { useState, useCallback } from 'react';
import ImageUpload from '@/components/file-upload/image-upload';
import OptimizationControls from '@/components/optimization/OptimizationControls';
import ImagePreview from '@/components/optimization/ImagePreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ImageProcessor, type OptimizationOptions, type ProcessedImage } from '@/lib/imageProcessor';

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

  const handleDownloadAll = useCallback(async () => {
    try {
      await ImageProcessor.downloadMultipleFiles(processedImages);
    } catch (err) {
      console.error('Download failed:', err);
    }
  }, [processedImages]);

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
          <Card className="bg-card border border-border rounded-lg shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Upload Images</h2>
              <p className="text-sm text-muted-foreground">Drag and drop or click to select images.</p>
              <ImageUpload
                onImagesChange={handleImagesUploaded}
                onUploadComplete={() => {}}
                onOptimize={handleOptimizeImages}
                maxFiles={10}
                maxSize={50 * 1024 * 1024} // 50MB
                accept="image/*"
              />
            </CardContent>
          </Card>

          {uploadedImages.length > 0 && (
            <Card className="bg-card border border-border rounded-lg shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Optimization Settings</h2>
                <p className="text-sm text-muted-foreground">Choose output format and quality.</p>
                <OptimizationControls
                  options={optimizationOptions}
                  onOptionsChange={setOptimizationOptions}
                  onOptimize={handleOptimizeImages}
                  onDownloadAll={handleDownloadAll}
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
          <Card className="bg-card border border-border rounded-lg shadow-sm">
            <CardContent className="p-6 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Optimized Images</h2>
                  {processedImages.length > 0 && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      <span>Total saved: {ImageProcessor.formatFileSize(totalSavings)}</span>
                      <span className="mx-2">•</span>
                      <span>Average compression: {averageCompression.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
                {processedImages.length > 0 && (
                  <Button variant="primary" onClick={handleDownloadAll}>
                    Download All ({processedImages.length})
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {processedImages.map((img) => (
              <ImagePreview
                key={img.id}
                processedImage={img}
                onDownload={(image) => ImageProcessor.downloadFile(image.optimizedFile)}
                onRemove={(id) => setProcessedImages((prev) => prev.filter((p) => p.id !== id))}
              />
            ))}
          </div>
        </div>


      </div>
    </div>
  );
}

export default App;
