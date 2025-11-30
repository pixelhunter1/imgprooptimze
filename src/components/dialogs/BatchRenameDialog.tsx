import { useState, useEffect, memo } from 'react';
import { X, Edit3, FileText, Hash, Type } from 'lucide-react';
import { type ProcessedImage, ImageProcessor } from '@/lib/imageProcessor';

interface BatchRenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (pattern: BatchRenamePattern) => void;
  images: ProcessedImage[];
}

export interface BatchRenamePattern {
  prefix?: string;
  suffix?: string;
  useNumbering?: boolean;
  startNumber?: number;
  originalName?: boolean;
  customNames?: string[];
}

type RenameMode = 'simple' | 'numbered' | 'custom' | 'individual';

// Memoized image component to prevent re-render issues
const ImageThumbnail = memo(({ image, index }: { image: ProcessedImage; index: number }) => {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [hasError, setHasError] = useState(false);

  // Create a fresh blob URL for this specific image
  useEffect(() => {
    console.log(`🔍 Creating fresh URL for image ${index + 1}:`, {
      originalFile: image.originalFile.name,
      optimizedFile: image.optimizedFile.name,
      originalUrl: image.originalUrl,
      optimizedUrl: image.optimizedUrl,
      sameFile: image.originalFile === image.optimizedFile
    });

    // Try to create a fresh URL from the optimized file
    try {
      const freshUrl = URL.createObjectURL(image.optimizedFile);
      setImgSrc(freshUrl);
      console.log(`✅ Fresh URL created for ${image.originalFile.name}:`, freshUrl);

      // Cleanup function to revoke the URL when component unmounts
      return () => {
        URL.revokeObjectURL(freshUrl);
      };
    } catch (error) {
      console.error(`❌ Failed to create fresh URL for ${image.originalFile.name}:`, error);
      setImgSrc(image.optimizedUrl);
    }
  }, [image.id, image.optimizedFile]); // Only re-run if image changes

  if (!imgSrc) {
    return (
      <div className="w-16 h-16 bg-muted rounded-md border border-border flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={`Preview ${index + 1}`}
      className="w-16 h-16 object-cover rounded-md border border-border"
      onLoad={() => {
        console.log(`✅ Image ${index + 1} (${image.originalFile.name}) loaded successfully with fresh URL`);
        setHasError(false);
      }}
      onError={(e) => {
        console.error(`❌ Image ${index + 1} (${image.originalFile.name}) failed to load with fresh URL`);
        if (!hasError) {
          setHasError(true);
          // Try original URL as fallback
          const target = e.target as HTMLImageElement;
          target.src = image.originalUrl;
          console.log(`🔄 Trying original URL fallback for image ${index + 1}:`, image.originalUrl);
        }
      }}
    />
  );
});

export default function BatchRenameDialog({
  isOpen,
  onClose,
  onApply,
  images,
}: BatchRenameDialogProps) {
  const [mode, setMode] = useState<RenameMode>('numbered');
  const [baseName, setBaseName] = useState('image');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [startNumber, setStartNumber] = useState(1);
  const [customNames, setCustomNames] = useState<string[]>(
    images.map(img => img.originalFile.name.replace(/\.[^/.]+$/, ''))
  );

  const handleApply = () => {
    const pattern: BatchRenamePattern = {
      prefix: mode === 'custom' ? prefix : '',
      suffix: mode === 'custom' ? suffix : '',
      useNumbering: mode === 'numbered',
      startNumber: mode === 'numbered' ? startNumber : 1,
      originalName: mode === 'simple',
      customNames: mode === 'individual' ? customNames : undefined,
    };

    // For numbered mode, use baseName as prefix
    if (mode === 'numbered') {
      pattern.prefix = baseName;
    }

    onApply(pattern);
    onClose();
  };

  const generatePreview = (): string[] => {
    return images.slice(0, 3).map((image, index) => {
      let newName = '';

      if (mode === 'simple') {
        // Simple mode: Keep original names unchanged
        newName = image.originalFile.name.replace(/\.[^/.]+$/, '');
      } else if (mode === 'numbered') {
        // Numbered mode: Use prefix (baseName) + number (match ImageProcessor logic)
        if (baseName.trim()) {
          newName += baseName.trim();
        }
        const number = startNumber + index;
        newName += `_${number.toString().padStart(3, '0')}`;
      } else if (mode === 'individual') {
        // Individual custom names mode
        newName = customNames[index] || image.originalFile.name.replace(/\.[^/.]+$/, '');
      } else {
        // Custom mode: prefix + original name + suffix
        const originalName = image.originalFile.name.replace(/\.[^/.]+$/, '');

        if (prefix && suffix) {
          // Both prefix and suffix: prefix + original name + suffix
          newName = prefix + originalName + suffix;
        } else if (prefix) {
          // Only prefix: prefix + original name
          newName = prefix + originalName;
        } else if (suffix) {
          // Only suffix: original name + suffix
          newName = originalName + suffix;
        } else {
          // Neither prefix nor suffix: keep original name
          newName = originalName;
        }
      }

      // Fallback to original name if somehow empty (match ImageProcessor logic)
      if (!newName) {
        newName = image.originalFile.name.replace(/\.[^/.]+$/, '');
      }

      const extension = ImageProcessor.getExtensionFromFormat(image.format as 'webp' | 'jpeg' | 'png');
      return `${newName}${extension}`;
    });
  };

  if (!isOpen) return null;

  // Debug: Log image URLs (only once)
  if (images.length > 0) {
    console.log('🔍 BatchRenameDialog - Images loaded:', images.length);
  }

  const previews = generatePreview();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-medium text-white">Rename All Images</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-500 hover:text-white rounded hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content - fixed height to prevent resize when switching tabs */}
        <div className="p-4 space-y-4 h-[420px] overflow-y-auto scrollbar-thin">
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
            {/* Mode Selection - Crop modal style buttons */}
            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-400 mb-2 block">Rename Mode</label>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => setMode('simple')}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 text-xs rounded ${
                    mode === 'simple'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  Keep Original
                </button>
                <button
                  onClick={() => setMode('numbered')}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 text-xs rounded ${
                    mode === 'numbered'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5" />
                  Numbered
                </button>
                <button
                  onClick={() => setMode('custom')}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 text-xs rounded ${
                    mode === 'custom'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Custom
                </button>
                <button
                  onClick={() => setMode('individual')}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 text-xs rounded ${
                    mode === 'individual'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Individual
                </button>
              </div>
            </div>

            {/* Settings for Selected Mode */}
            {mode === 'numbered' && (
              <div className="space-y-3 p-3 bg-neutral-800 rounded">
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400">Base name</label>
                  <input
                    type="text"
                    value={baseName}
                    onChange={(e) => setBaseName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded bg-neutral-900 text-white border-none focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    placeholder="image"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400">Start from number</label>
                  <input
                    type="number"
                    value={startNumber}
                    onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm rounded bg-neutral-900 text-white border-none focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    min="1"
                  />
                </div>
              </div>
            )}

            {mode === 'custom' && (
              <div className="space-y-3 p-3 bg-neutral-800 rounded">
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400">Prefix (before filename)</label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded bg-neutral-900 text-white border-none focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    placeholder="prefix_"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400">Suffix (after filename)</label>
                  <input
                    type="text"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded bg-neutral-900 text-white border-none focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    placeholder="_suffix"
                  />
                </div>
              </div>
            )}

            {mode === 'individual' && (
              <div className="space-y-2 p-3 bg-neutral-800 rounded max-h-[320px] overflow-y-auto scrollbar-thin">
                {images.map((image, index) => (
                  <div key={`${image.id}-${index}`} className="flex items-center gap-3 p-2 bg-neutral-900 rounded">
                    <div className="flex-shrink-0">
                      <ImageThumbnail image={image} index={index} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-emerald-500">#{index + 1}</span>
                        <span className="text-[10px] text-neutral-500 truncate">
                          {image.originalFile.name}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={customNames[index] || ''}
                        onChange={(e) => {
                          const newNames = [...customNames];
                          newNames[index] = e.target.value;
                          setCustomNames(newNames);
                        }}
                        className="w-full px-2 py-1.5 text-xs rounded bg-neutral-800 text-white border-none focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        placeholder="New filename"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Preview - Only show for non-individual modes */}
            {mode !== 'individual' && (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-neutral-400">Preview</label>
                <div className="bg-neutral-800 rounded p-3 space-y-1.5">
                  {previews.map((filename, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 bg-emerald-600/20 text-emerald-500 rounded flex items-center justify-center text-[10px]">
                        {index + 1}
                      </span>
                      <span className="font-mono text-neutral-300 bg-neutral-900 px-2 py-1 rounded">
                        {filename}
                      </span>
                    </div>
                  ))}
                  {images.length > 3 && (
                    <p className="text-[10px] text-neutral-500 pt-2 border-t border-neutral-700">
                      ... and {images.length - 3} more images
                    </p>
                  )}
                </div>
              </div>
            )}
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="flex gap-2 p-4 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 text-xs rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={
              (mode === 'numbered' && !baseName.trim()) ||
              (mode === 'individual' && customNames.some(name => !name.trim()))
            }
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded ${
              (mode === 'numbered' && !baseName.trim()) ||
              (mode === 'individual' && customNames.some(name => !name.trim()))
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" />
            Rename {images.length} Images
          </button>
        </div>
      </div>
    </div>
  );
}
