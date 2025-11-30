import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, Zap, Edit2, X, Maximize2, Crop } from 'lucide-react';
import ImageComparison from './ImageComparison';
import Modal from '@/components/ui/modal';
import { Badge } from '@/components/ui/base-badge';
import { type ProcessedImage, ImageProcessor } from '@/lib/imageProcessor';
import CropEditor from '@/components/crop/CropEditor';
import { type CropArea } from '@/types/crop';

interface ImagePreviewProps {
  processedImage: ProcessedImage;
  onDownload: (image: ProcessedImage) => void;
  onRename: (id: string, newFilename: string) => void;
  onRemove?: (id: string) => void;
  onCrop?: (id: string, croppedFile: File, croppedUrl: string) => void;
  isProcessing?: boolean;
  processingProgress?: number;
}

export default function ImagePreview({
  processedImage,
  onDownload,
  onRename,
  onRemove,
  onCrop,
  isProcessing = false,
  processingProgress = 0,
}: ImagePreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedFilename, setEditedFilename] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showCropEditor, setShowCropEditor] = useState(false);

  // Handle crop completion
  const handleCropComplete = useCallback(
    (_cropArea: CropArea | null, croppedImageUrl: string, _outputSize?: { width: number; height: number }) => {
      if (!onCrop) return;

      // Convert cropped image URL to File
      const croppedFile = ImageProcessor.dataUrlToFile(
        croppedImageUrl,
        processedImage.optimizedFile.name
      );

      onCrop(processedImage.id, croppedFile, croppedImageUrl);
      setShowCropEditor(false);
    },
    [onCrop, processedImage]
  );

  const {
    originalFile,
    originalSize,
    optimizedSize,
    compressionRatio,
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
    if (ratio < 0) return 'text-red-600 dark:text-red-400'; // File size increased
    if (ratio >= 80) return 'text-green-600 dark:text-green-400';
    if (ratio >= 60) return 'text-blue-600 dark:text-blue-400';
    if (ratio >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getCompressionDisplay = (ratio: number) => {
    if (ratio < 0) {
      // File size increased
      return `+${Math.abs(ratio).toFixed(0)}% larger`;
    } else if (ratio === 0) {
      // No compression
      return 'Same size';
    } else {
      // Normal compression (file got smaller)
      return `${ratio.toFixed(0)}% smaller`;
    }
  };





  return (
    <Card className="bg-card border border-border rounded-xl w-full overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-0">

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
            {/* Image Preview (Static) */}
            <div
              className="relative aspect-video bg-muted/50 overflow-hidden group cursor-pointer"
              onClick={() => setShowModal(true)}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src={processedImage.optimizedUrl}
                  alt="Optimized Preview"
                  className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Overlay with "Click to Compare" hint */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm font-medium flex items-center gap-2">
                  <Maximize2 className="w-3 h-3" />
                  Click to Compare
                </span>
              </div>



              {/* Action Buttons */}
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 z-20">
                {/* Crop Button */}
                {onCrop && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCropEditor(true);
                    }}
                    className="h-8 w-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-lg"
                    title="Crop image"
                  >
                    <Crop className="h-4 w-4" />
                  </button>
                )}
                {/* Remove Button */}
                {onRemove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(processedImage.id);
                    }}
                    className="h-8 w-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg"
                    title="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {/* Simple Format Badge */}
              <div className="absolute bottom-3 right-3 pointer-events-none z-20">
                <Badge appearance="light" variant="secondary" size="sm" className="bg-background/90 backdrop-blur-sm shadow-sm">
                  {format.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Modal for Detailed Comparison */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} className="h-[80vh]">
              <div className="w-full h-full flex flex-col">
                <div className="p-4 border-b border-border flex justify-between items-center">
                  <h3 className="font-semibold text-lg">{originalFile.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{ImageProcessor.formatFileSize(originalSize)} → {ImageProcessor.formatFileSize(optimizedSize)}</span>
                    <span className={`font-bold ${getCompressionColor(compressionRatio)}`}>
                      {getCompressionDisplay(compressionRatio)}
                    </span>
                  </div>
                </div>
                <div className="flex-1 relative bg-muted/20 overflow-hidden">
                  <ImageComparison
                    originalUrl={processedImage.originalUrl}
                    optimizedUrl={processedImage.optimizedUrl}
                    enableZoom={true}
                    className="h-full"
                  />
                </div>
              </div>
            </Modal>

            {/* Content */}
            <div className="p-5 space-y-5">
              {/* File Info */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-foreground truncate flex-1" title={originalFile.name}>
                    {originalFile.name}
                  </h3>
                </div>

                <div className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded-lg">
                  <span className="text-muted-foreground">{ImageProcessor.formatFileSize(originalSize)} → {ImageProcessor.formatFileSize(optimizedSize)}</span>
                  <span className={`font-bold ${getCompressionColor(compressionRatio)}`}>
                    {getCompressionDisplay(compressionRatio)}
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
                        placeholder="Filename"
                        autoFocus
                      />
                      <div className="px-3 py-2 text-sm text-muted-foreground bg-muted rounded-md border border-border">
                        {ImageProcessor.getExtensionFromFormat(format as 'webp' | 'jpeg' | 'png')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={!editedFilename.trim()}
                        className="flex-1"
                      >
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="group flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={handleStartEdit}
                    title="Click to rename this file"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="flex-1 text-sm text-muted-foreground group-hover:text-foreground truncate transition-colors">
                      {getCurrentFilename()}{ImageProcessor.getExtensionFromFormat(format as 'webp' | 'jpeg' | 'png')}
                    </span>
                  </div>
                )}
              </div>

              {/* Download Button */}
              <Button
                variant="primary"
                onClick={() => onDownload(processedImage)}
                className="w-full flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all"
                size="lg"
              >
                <Download className="h-4 w-4" />
                Download Optimized
              </Button>
            </div>
          </>
        )}
      </CardContent>

      {/* Crop Editor Modal */}
      <CropEditor
        isOpen={showCropEditor}
        onClose={() => setShowCropEditor(false)}
        imageUrl={processedImage.optimizedUrl}
        imageName={processedImage.optimizedFile.name}
        onCropComplete={handleCropComplete}
      />
    </Card>
  );
}
