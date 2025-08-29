import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, Zap, X, Edit2 } from 'lucide-react';
import { Badge } from '@/components/ui/base-badge';
import { type ProcessedImage, ImageProcessor } from '@/lib/imageProcessor';

interface ImagePreviewProps {
  processedImage: ProcessedImage;
  onDownload: (image: ProcessedImage) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, newFilename: string) => void;
  isProcessing?: boolean;
  processingProgress?: number;
}

export default function ImagePreview({
  processedImage,
  onDownload,
  onRemove,
  onRename,
  isProcessing = false,
  processingProgress = 0,
}: ImagePreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedFilename, setEditedFilename] = useState('');

  const {
    originalFile,
    originalSize,
    optimizedSize,
    compressionRatio,
    optimizedUrl,
    format,
    customFilename,
  } = processedImage;

  // Get current display filename
  const getCurrentFilename = () => {
    if (customFilename) {
      return customFilename;
    }
    return originalFile.name.replace(/\.[^/.]+$/, ''); // Remove extension
  };

  const handleStartEdit = () => {
    setEditedFilename(getCurrentFilename());
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editedFilename.trim() && editedFilename.trim() !== getCurrentFilename()) {
      onRename(processedImage.id, editedFilename.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedFilename('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const getCompressionColor = (ratio: number) => {
    if (ratio >= 80) return 'text-green-600 dark:text-green-400';
    if (ratio >= 60) return 'text-blue-600 dark:text-blue-400';
    if (ratio >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };




  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm w-full overflow-hidden hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-0">
        {/* Remove Button - Positioned absolutely */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(processedImage.id)}
          className="absolute top-3 right-3 z-10 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background border border-border/50 rounded-full shadow-sm"
          title="Remove image"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Processing State */}
        {isProcessing && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Zap className="h-8 w-8 animate-pulse text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Optimizing Image</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {originalFile.name}
                </p>
              </div>
              <div className="w-full space-y-2">
                <Progress value={processingProgress} className="w-full h-2" />
                <p className="text-xs text-muted-foreground">
                  {processingProgress}% complete
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Processed State */}
        {!isProcessing && (
          <>
            {/* Image Preview */}
            <div className="relative">
              <div className="relative aspect-video bg-muted/50">
                <img
                  src={optimizedUrl}
                  alt="Optimized"
                  className="w-full h-full object-cover"
                />
                {/* Simple Format Badge */}
                <div className="absolute bottom-3 right-3">
                  <Badge appearance="light" variant="secondary" size="sm" className="bg-background/90 backdrop-blur-sm">
                    {format.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* File Info */}
              <div className="space-y-3">
                <h3 className="font-medium text-foreground truncate" title={originalFile.name}>
                  {originalFile.name}
                </h3>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{ImageProcessor.formatFileSize(originalSize)} → {ImageProcessor.formatFileSize(optimizedSize)}</span>
                  <span className={`font-medium ${getCompressionColor(compressionRatio)}`}>
                    -{compressionRatio.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Filename Editing */}
              <div className="space-y-2">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editedFilename}
                        onChange={(e) => setEditedFilename(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Enter filename"
                        autoFocus
                      />
                      <div className="px-3 py-2 text-sm text-muted-foreground bg-muted rounded-md border border-border">
                        {ImageProcessor.getExtensionFromFormat(format as 'webp' | 'jpeg' | 'png')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={!editedFilename.trim()}
                        className="flex-1"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="group flex items-center gap-2 p-3 rounded-md border border-dashed border-border hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors"
                    onClick={handleStartEdit}
                    title="Click to rename this file"
                  >
                    <span className="flex-1 text-sm font-mono text-foreground truncate">
                      {getCurrentFilename()}{ImageProcessor.getExtensionFromFormat(format as 'webp' | 'jpeg' | 'png')}
                    </span>
                    <Edit2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                )}
              </div>

              {/* Download Button */}
              <Button
                onClick={() => onDownload(processedImage)}
                className="w-full flex items-center justify-center gap-2"
                size="md"
                variant="primary"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
