import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, FileImage, TrendingDown, Zap, X } from 'lucide-react';
import { Badge } from '@/components/ui/base-badge';
import { type ProcessedImage, ImageProcessor } from '@/lib/imageProcessor';

interface ImagePreviewProps {
  processedImage: ProcessedImage;
  onDownload: (image: ProcessedImage) => void;
  onRemove: (id: string) => void;
  isProcessing?: boolean;
  processingProgress?: number;
}

export default function ImagePreview({
  processedImage,
  onDownload,
  onRemove,
  isProcessing = false,
  processingProgress = 0,
}: ImagePreviewProps) {
  const {
    originalFile,
    originalSize,
    optimizedSize,
    compressionRatio,
    optimizedUrl,
    format,
    quality,
  } = processedImage;

  const getCompressionColor = (ratio: number) => {
    if (ratio >= 80) return 'text-green-600';
    if (ratio >= 60) return 'text-blue-600';
    if (ratio >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };


  return (
    <Card className="bg-card border border-border rounded-lg shadow-sm w-full overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 border-b bg-muted">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <FileImage className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-sm truncate flex-1">
                {originalFile.name}
              </span>
              <Badge appearance="light" variant="info" size="sm" className="shrink-0">
                {format.toUpperCase()}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(processedImage.id)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Processing State */}
        {isProcessing && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 animate-pulse text-blue-500" />
              <span className="text-sm">Optimizing...</span>
            </div>
            <Progress value={processingProgress} className="w-full" />
          </div>
        )}

        {/* Processed State */}
        {!isProcessing && (
          <>
            {/* Image Preview */}
            <div className="relative">
              <div className="relative aspect-video bg-muted">
                <img
                  src={optimizedUrl}
                  alt="Optimized"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="p-4 space-y-4">
              {/* Compression Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Original Size</div>
                  <div className="font-medium">
                    {ImageProcessor.formatFileSize(originalSize)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Optimized Size</div>
                  <div className="font-medium">
                    {ImageProcessor.formatFileSize(optimizedSize)}
                  </div>
                </div>
              </div>

              {/* Compression Ratio */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingDown className={`h-4 w-4 ${getCompressionColor(compressionRatio)}`} />
                  <span className={`font-bold text-lg ${getCompressionColor(compressionRatio)}`}>
                    {compressionRatio.toFixed(1)}% smaller
                  </span>
                </div>
                <div className="flex items-center justify-center">
                  <span className="sr-only">Compression level:</span>
                  <Badge appearance="light" variant={
                    compressionRatio >= 80 ? 'success' :
                    compressionRatio >= 60 ? 'primary' :
                    compressionRatio >= 40 ? 'warning' : 'destructive'
                  }>
                    {compressionRatio >= 80 ? 'Excellent' :
                     compressionRatio >= 60 ? 'Very Good' :
                     compressionRatio >= 40 ? 'Good' : 'Moderate'}
                  </Badge>
                </div>
              </div>

              {/* Format & Quality Info */}
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span>Format: {format.toUpperCase()}</span>
                <span className="mx-1">•</span>
                <span>Quality: {Math.round(quality * 100)}%</span>
              </div>

              {/* Download Button */}
              <Button
                onClick={() => onDownload(processedImage)}
                className="w-full flex items-center gap-2"
                size="sm"
                variant="primary"
              >
                <Download className="h-4 w-4" />
                Download Optimized
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
