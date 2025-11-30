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
    if (ratio < 0) return 'text-red-400'; // File size increased
    if (ratio >= 80) return 'text-emerald-400';
    if (ratio >= 60) return 'text-blue-400';
    if (ratio >= 40) return 'text-yellow-400';
    return 'text-red-400';
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
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg w-full overflow-hidden">
      {/* Processing State */}
      {isProcessing && (
        <div className="p-4 space-y-3">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-600/20 rounded-full flex items-center justify-center">
              <Zap className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Optimizing Image</h3>
              <p className="text-xs text-neutral-500 mt-1">
                {originalFile.name}
              </p>
            </div>
            <div className="w-full space-y-1">
              <Progress value={processingProgress} className="w-full h-1 [&>div]:bg-emerald-600" />
              <p className="text-[10px] text-neutral-500">
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
            className="relative aspect-video bg-neutral-800 overflow-hidden group cursor-pointer"
            onClick={() => setShowModal(true)}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src={processedImage.optimizedUrl}
                alt="Optimized Preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Overlay with "Click to Compare" hint */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="bg-neutral-900/80 text-white text-xs px-3 py-1.5 rounded font-medium flex items-center gap-2">
                <Maximize2 className="w-3 h-3" />
                Click to Compare
              </span>
            </div>

            {/* Action Buttons */}
            <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 z-20">
              {/* Crop Button */}
              {onCrop && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCropEditor(true);
                  }}
                  className="h-7 w-7 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center"
                  title="Crop image"
                >
                  <Crop className="h-3.5 w-3.5" />
                </button>
              )}
              {/* Remove Button */}
              {onRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(processedImage.id);
                  }}
                  className="h-7 w-7 rounded bg-neutral-800 hover:bg-red-600 text-neutral-300 hover:text-white flex items-center justify-center"
                  title="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {/* Simple Format Badge */}
            <div className="absolute bottom-2 right-2 pointer-events-none z-20">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral-900/80 text-neutral-300">
                {format.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Modal for Detailed Comparison */}
          <Modal isOpen={showModal} onClose={() => setShowModal(false)} className="h-[80vh]">
            <div className="w-full h-full flex flex-col">
              <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
                <h3 className="text-sm font-medium text-white">{originalFile.name}</h3>
                <div className="flex items-center gap-3 text-xs text-neutral-400">
                  <span>{ImageProcessor.formatFileSize(originalSize)} → {ImageProcessor.formatFileSize(optimizedSize)}</span>
                  <span className={`font-medium ${getCompressionColor(compressionRatio)}`}>
                    {getCompressionDisplay(compressionRatio)}
                  </span>
                </div>
              </div>
              <div className="flex-1 relative bg-neutral-950 overflow-hidden">
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
          <div className="p-3 space-y-3">
            {/* File Info */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-white truncate" title={originalFile.name}>
                {originalFile.name}
              </h3>

              <div className="flex items-center justify-between text-[10px] bg-neutral-800 p-2 rounded">
                <span className="text-neutral-400">{ImageProcessor.formatFileSize(originalSize)} → {ImageProcessor.formatFileSize(optimizedSize)}</span>
                <span className={`font-medium ${getCompressionColor(compressionRatio)}`}>
                  {getCompressionDisplay(compressionRatio)}
                </span>
              </div>
            </div>

            {/* Filename Editing */}
            <div>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={editedFilename}
                      onChange={(e) => setEditedFilename(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className="flex-1 px-2 py-1.5 text-xs rounded bg-neutral-800 text-white border-none focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      placeholder="Filename"
                      autoFocus
                    />
                    <div className="px-2 py-1.5 text-xs text-neutral-500 bg-neutral-800 rounded">
                      {ImageProcessor.getExtensionFromFormat(format as 'webp' | 'jpeg' | 'png')}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={!editedFilename.trim()}
                      className="flex-1 text-xs"
                    >
                      Save
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="flex-1 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="group flex items-center gap-2 p-1.5 rounded hover:bg-neutral-800 cursor-pointer"
                  onClick={handleStartEdit}
                  title="Click to rename this file"
                >
                  <Edit2 className="h-3 w-3 text-neutral-500 group-hover:text-emerald-500" />
                  <span className="flex-1 text-xs text-neutral-400 group-hover:text-neutral-300 truncate">
                    {getCurrentFilename()}{ImageProcessor.getExtensionFromFormat(format as 'webp' | 'jpeg' | 'png')}
                  </span>
                </div>
              )}
            </div>

            {/* Download Button */}
            <Button
              variant="primary"
              onClick={() => onDownload(processedImage)}
              className="w-full"
              size="sm"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        </>
      )}

      {/* Crop Editor Modal */}
      <CropEditor
        isOpen={showCropEditor}
        onClose={() => setShowCropEditor(false)}
        imageUrl={processedImage.optimizedUrl}
        imageName={processedImage.optimizedFile.name}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
