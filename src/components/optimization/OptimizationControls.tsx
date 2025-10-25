
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider, SliderThumb } from '@/components/ui/slider';
import { Settings, Zap, AlertTriangle } from 'lucide-react';
import { type OptimizationOptions } from '@/lib/imageProcessor';
import { detectBrowser, getBrowserCapabilities } from '@/lib/browserDetection';

interface OptimizationControlsProps {
  options: OptimizationOptions;
  onOptionsChange: (options: OptimizationOptions) => void;
  onOptimize: () => void;
  isProcessing: boolean;
  hasImages: boolean;
  processedCount: number;
  totalImages: number;
}

export default function OptimizationControls({
  options,
  onOptionsChange,
  onOptimize,
  isProcessing,
  hasImages,
  processedCount,
  totalImages,
}: OptimizationControlsProps) {
  // Browser compatibility detection
  const browserInfo = detectBrowser();
  const capabilities = getBrowserCapabilities(browserInfo);

  const formatOptions = [
    {
      value: 'webp',
      label: 'WebP',
      supported: capabilities.canUseWebP
    },
    {
      value: 'jpeg',
      label: 'JPEG',
      supported: true
    },
    {
      value: 'png',
      label: 'PNG',
      supported: true
    },
  ] as const;

  const qualityPresets = [
    { value: 0.4, label: 'Small' },
    { value: 0.7, label: 'Balanced' },
    { value: 0.9, label: 'High' },
    { value: 1.0, label: 'Maximum' },
  ];

  return (
    <Card className="w-full">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Optimization Settings</h3>
        </div>

        {/* Format Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Output Format</label>
          <div className="flex gap-2">
            {formatOptions.map((format) => (
              <Button
                key={format.value}
                variant={options.format === format.value ? "primary" : "outline"}
                size="md"
                onClick={() => onOptionsChange({ ...options, format: format.value })}
                className={`flex-1 relative ${!format.supported ? 'opacity-50' : ''}`}
                disabled={!format.supported}
              >
                <span className="flex items-center gap-1">
                  {format.label}
                  {!format.supported && (
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                  )}
                </span>
              </Button>
            ))}
          </div>
          {!capabilities.canUseWebP && options.format === 'webp' && (
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
              WebP not supported in {browserInfo.name}. JPEG will be used instead.
            </p>
          )}
          {options.format === 'jpeg' && (
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
              <strong>JPEG Note:</strong> JPEG doesn't support transparency. PNG/WebP images with transparency will have a white background.
            </p>
          )}
          {options.format === 'png' && (
            <div className="space-y-2">
              <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                <strong>PNG Info:</strong> PNG is lossless - quality slider affects compression level, not visual quality. Images always maintain perfect quality.
              </p>
              <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                Smart PNG conversion: If PNG increases file size by more than 5%, original format will be kept automatically.
              </p>
            </div>
          )}
        </div>

        {/* Quality Control */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-foreground">Quality</label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{Math.round(options.quality * 100)}%</span>
            </div>
          </div>

          <Slider
            value={[options.quality]}
            onValueChange={([value]) => onOptionsChange({ ...options, quality: value })}
            min={0.1}
            max={1}
            step={0.1}
            className="w-full"
          >
            <SliderThumb />
          </Slider>

          <div className="flex gap-2">
            {qualityPresets.map((preset) => (
              <Button
                key={preset.value}
                variant={Math.abs(options.quality - preset.value) < 0.05 ? "secondary" : "outline"}
                size="md"
                onClick={() => onOptionsChange({
                  ...options,
                  quality: preset.value
                })}
                className="flex-1"
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Quality mapping info for 100% */}
          {options.quality >= 1.0 && options.format !== 'png' && (
            <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
              <strong>Smart optimization:</strong> To prevent file size increases, 100% quality is processed at 90% internally for optimal results.
            </p>
          )}
        </div>

        {/* Advanced Options */}
        <div className="space-y-4 border-t border-border pt-6">
          <h4 className="text-sm font-medium text-foreground">Advanced Options</h4>

          {/* Max File Size */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Maximum File Size (optional)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.1"
                max="50"
                step="0.1"
                placeholder="MB"
                value={options.maxSizeMB || ''}
                onChange={(e) => onOptionsChange({
                  ...options,
                  maxSizeMB: e.target.value ? parseFloat(e.target.value) : undefined
                })}
                className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">MB</span>
            </div>
            {options.maxSizeMB && (
              <p className="text-xs text-muted-foreground">
                Images will be compressed to stay under {options.maxSizeMB} MB
              </p>
            )}
          </div>

          {/* Preserve EXIF (JPEG only) */}
          {options.format === 'jpeg' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="preserveExif"
                checked={options.preserveExif || false}
                onChange={(e) => onOptionsChange({ ...options, preserveExif: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="preserveExif" className="text-sm text-foreground cursor-pointer">
                Preserve EXIF metadata (camera, GPS, copyright)
              </label>
            </div>
          )}

          {/* Lossless WebP */}
          {options.format === 'webp' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="losslessWebP"
                checked={options.losslessWebP || false}
                onChange={(e) => onOptionsChange({ ...options, losslessWebP: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="losslessWebP" className="text-sm text-foreground cursor-pointer">
                Lossless WebP (larger files, perfect quality)
              </label>
            </div>
          )}
        </div>

        {/* Browser Compatibility Info */}
        {capabilities.showCompatibilityWarning && (
          <div className="pt-4 border-t border-border">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  Limited Browser Support
                </span>
              </div>
              <p className="text-xs text-amber-700 mb-2">
                {browserInfo.name} has reduced performance. For best results, use Chrome, Firefox, or Edge.
              </p>
              <div className="text-xs text-amber-600">
                Quality limited to {Math.round(capabilities.maxQualityRecommended * 100)}%
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-6 border-t border-border">
          <Button
            onClick={onOptimize}
            disabled={!hasImages || isProcessing}
            className="w-full flex items-center justify-center gap-2"
            size="lg"
            variant="primary"
          >
            <Zap className="h-4 w-4" />
            {isProcessing
              ? `Processing... (${processedCount}/${totalImages})`
              : 'Optimize Images'
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
