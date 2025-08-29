import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
        // Custom mode: prefix + suffix (without original name)
        if (prefix && suffix) {
          // When both prefix and suffix are provided, use only prefix + suffix
          newName = prefix + suffix;
        } else if (prefix) {
          // Only prefix: prefix + original name
          newName = prefix + image.originalFile.name.replace(/\.[^/.]+$/, '');
        } else if (suffix) {
          // Only suffix: original name + suffix
          newName = image.originalFile.name.replace(/\.[^/.]+$/, '') + suffix;
        } else {
          // Neither prefix nor suffix: keep original name
          newName = image.originalFile.name.replace(/\.[^/.]+$/, '');
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

  const previews = generatePreview();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl bg-card border border-border">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Edit3 className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Rename All Images</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-8">

            {/* Rename Options */}
            <div className="space-y-6">
              {/* Option Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Keep Original Names */}
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    mode === 'simple'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setMode('simple')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Type className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Keep Original</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Keep the original filenames unchanged
                  </p>
                </div>

                {/* Numbered Names */}
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    mode === 'numbered'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setMode('numbered')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Numbered</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use a base name with numbers (recommended)
                  </p>
                </div>

                {/* Custom Pattern */}
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    mode === 'custom'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setMode('custom')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Edit3 className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Custom</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add prefix and/or suffix (replaces original if both used)
                  </p>
                </div>

                {/* Individual Custom Names */}
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    mode === 'individual'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setMode('individual')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Individual</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set custom name for each image individually
                  </p>
                </div>
              </div>

              {/* Settings for Selected Mode */}
              {mode === 'numbered' && (
                <div className="space-y-4 p-6 bg-muted/50 rounded-lg">
                  <div className="space-y-3">
                    <label className="text-base font-medium">Base name</label>
                    <input
                      type="text"
                      value={baseName}
                      onChange={(e) => setBaseName(e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Base name"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-base font-medium">Start from number</label>
                    <input
                      type="number"
                      value={startNumber}
                      onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-3 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      min="1"
                    />
                  </div>
                </div>
              )}

              {mode === 'custom' && (
                <div className="space-y-4 p-6 bg-muted/50 rounded-lg">
                  <div className="space-y-3">
                    <label className="text-base font-medium">Add before filename (prefix)</label>
                    <input
                      type="text"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Prefix"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-base font-medium">Add after filename (suffix)</label>
                    <input
                      type="text"
                      value={suffix}
                      onChange={(e) => setSuffix(e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Suffix"
                    />
                  </div>
                </div>
              )}

              {mode === 'individual' && (
                <div className="space-y-4 p-6 bg-muted/50 rounded-lg max-h-96 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-base font-medium">Custom names for each image</span>
                  </div>
                  <div className="space-y-4">
                    {images.map((image, index) => (
                      <div key={image.id} className="flex items-center gap-4 p-3 bg-background rounded-lg border border-border">
                        {/* Image Thumbnail */}
                        <div className="flex-shrink-0">
                          <img
                            src={image.optimizedUrl || URL.createObjectURL(image.originalFile)}
                            alt={`Preview ${index + 1}`}
                            className="w-16 h-16 object-cover rounded-md border border-border"
                          />
                        </div>

                        {/* Image Info and Input */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-primary">#{index + 1}</span>
                            <span className="text-xs text-muted-foreground truncate">
                              Original: {image.originalFile.name}
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
                            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Filename"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Preview - Only show for non-individual modes */}
            {mode !== 'individual' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-base font-medium">Preview of new filenames</span>
                </div>
                <div className="bg-background border border-border rounded-lg p-5 space-y-3">
                  {previews.map((filename, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm">
                      <span className="w-7 h-7 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="font-mono bg-muted px-3 py-2 rounded text-foreground">
                        {filename}
                      </span>
                    </div>
                  ))}
                  {images.length > 3 && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground italic pt-3 border-t border-border">
                      <span>... and {images.length - 3} more images will be renamed similarly</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions - Moved to bottom */}
          <div className="flex gap-3 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              size="lg"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleApply}
              className="flex-1 flex items-center gap-2"
              size="lg"
              disabled={
                (mode === 'numbered' && !baseName.trim()) ||
                (mode === 'individual' && customNames.some(name => !name.trim()))
              }
            >
              <Edit3 className="h-4 w-4" />
              Rename {images.length} Images
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
