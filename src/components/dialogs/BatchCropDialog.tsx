import { useState, useEffect, memo } from 'react';
import { X, Crop, Loader2 } from 'lucide-react';
import { type ProcessedImage } from '@/lib/imageProcessor';
import {
  type SizePreset,
  SIZE_PRESETS_BY_CATEGORY,
} from '@/types/crop';

interface BatchCropDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (preset: SizePreset, imageIds: string[]) => Promise<void>;
  images: ProcessedImage[];
}

// Memoized image component to prevent re-render issues
const ImageThumbnail = memo(({ image, index }: { image: ProcessedImage; index: number }) => {
  const [imgSrc, setImgSrc] = useState<string>('');

  useEffect(() => {
    try {
      const freshUrl = URL.createObjectURL(image.optimizedFile);
      setImgSrc(freshUrl);
      return () => {
        URL.revokeObjectURL(freshUrl);
      };
    } catch {
      setImgSrc(image.optimizedUrl);
    }
  }, [image.id, image.optimizedFile, image.optimizedUrl]);

  if (!imgSrc) {
    return (
      <div className="w-16 h-16 bg-muted rounded-md border border-border flex items-center justify-center">
        <span className="text-xs text-muted-foreground">...</span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={`Preview ${index + 1}`}
      className="w-16 h-16 object-cover rounded-md border border-border"
    />
  );
});

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  social: 'Social Media',
  video: 'Video',
  web: 'Web',
  ecommerce: 'E-commerce',
};

export default function BatchCropDialog({
  isOpen,
  onClose,
  onApply,
  images,
}: BatchCropDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<SizePreset | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('social');
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    if (!selectedPreset || images.length === 0) return;

    setIsApplying(true);
    try {
      await onApply(selectedPreset, images.map(img => img.id));
      onClose();
    } catch (error) {
      console.error('Batch crop failed:', error);
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  const categoryPresets = SIZE_PRESETS_BY_CATEGORY[selectedCategory as keyof typeof SIZE_PRESETS_BY_CATEGORY] || [];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-5xl bg-neutral-900 border border-neutral-800 rounded-lg flex flex-col h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Crop className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-medium text-white">Crop All Images</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isApplying}
            className="p-1 text-neutral-500 hover:text-white rounded hover:bg-neutral-800 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <style>{`
            .scrollbar-thin::-webkit-scrollbar {
              width: 4px;
            }
            .scrollbar-thin::-webkit-scrollbar-track {
              background: transparent;
            }
            .scrollbar-thin::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.1);
              border-radius: 4px;
            }
            .scrollbar-thin::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.2);
            }
          `}</style>

          {/* Category Selection */}
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-400 mb-2 block">Category</label>
            <div className="grid grid-cols-4 gap-1.5">
              {Object.keys(SIZE_PRESETS_BY_CATEGORY).map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setSelectedPreset(null);
                  }}
                  disabled={isApplying}
                  className={`px-2 py-2 text-xs rounded ${
                    selectedCategory === category
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  } disabled:opacity-50`}
                >
                  {CATEGORY_LABELS[category]}
                </button>
              ))}
            </div>
          </div>

          {/* Size Presets */}
          <div>
            <label className="text-xs uppercase tracking-wide text-neutral-400 mb-2 block">
              Size Preset
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[350px] overflow-y-auto scrollbar-thin p-1">
              {categoryPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset)}
                  disabled={isApplying}
                  className={`flex flex-col items-center justify-center p-3 text-xs rounded border ${
                    selectedPreset?.id === preset.id
                      ? 'border-emerald-500 bg-emerald-600/20 text-white'
                      : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:border-neutral-600'
                  } disabled:opacity-50`}
                >
                  <span className="font-medium text-center">{preset.label}</span>
                  <span className="text-[10px] text-neutral-500">
                    {preset.width} × {preset.height}px
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Image Thumbnails - Always visible */}
          <div className="p-3 bg-neutral-800 rounded space-y-3">
            {/* Selected Preset Info */}
            {selectedPreset ? (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-white font-medium">{selectedPreset.label}</span>
                  <span className="text-xs text-neutral-400 ml-2">
                    {selectedPreset.width} × {selectedPreset.height}px
                  </span>
                </div>
                <span className="text-xs text-neutral-500">{selectedPreset.description}</span>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 text-center">
                Select a size preset above to crop all images
              </p>
            )}

            {/* Image Thumbnails */}
            <div>
              <label className="text-[10px] uppercase tracking-wide text-neutral-500 mb-2 block">
                Images to crop ({images.length})
              </label>
              <div className="flex flex-wrap gap-3 max-h-[200px] overflow-y-auto scrollbar-thin p-1">
                {images.map((image, index) => (
                  <ImageThumbnail
                    key={image.id}
                    image={image}
                    index={index}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t border-neutral-800">
          <button
            onClick={onClose}
            disabled={isApplying}
            className="flex-1 px-3 py-2 text-xs rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedPreset || images.length === 0 || isApplying}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded ${
              !selectedPreset || images.length === 0 || isApplying
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isApplying ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Cropping...
              </>
            ) : (
              <>
                <Crop className="h-3.5 w-3.5" />
                Crop {images.length} Image{images.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
