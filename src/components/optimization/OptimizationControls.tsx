
import { Card, CardContent } from '@/components/ui/card';
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
  currentImageProgress?: number;
  currentImageName?: string;
}

export default function OptimizationControls({
  options,
  onOptionsChange,
  onOptimize,
  isProcessing,
  hasImages,
  processedCount,
  totalImages,
  currentImageProgress = 0,
  currentImageName = '',
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
      value: 'avif',
      label: 'AVIF',
      supported: true
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
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-neutral-400" />
          <h3 className="text-sm font-medium text-white">Optimization Settings</h3>
        </div>

        {/* Format Selection */}
        <div className="space-y-3">
          <label className="text-xs uppercase tracking-wide text-neutral-400">Output Format</label>
          <div className="grid grid-cols-4 gap-1.5">
            {formatOptions.map((format) => (
              <button
                key={format.value}
                onClick={() => onOptionsChange({ ...options, format: format.value })}
                disabled={!format.supported}
                className={`flex items-center justify-center gap-1.5 px-2 py-2 text-xs rounded ${
                  options.format === format.value
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                } ${!format.supported ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {format.label}
                {!format.supported && (
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                )}
              </button>
            ))}
          </div>
          {!capabilities.canUseWebP && options.format === 'webp' && (
            <p className="text-[10px] text-amber-500/80 bg-amber-950/30 p-2 rounded border border-amber-900/30">
              WebP not supported in {browserInfo.name}. JPEG will be used instead.
            </p>
          )}
          {options.format === 'avif' && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-emerald-400/80 bg-emerald-950/30 p-2 rounded border border-emerald-900/30">
                <strong className="text-emerald-400">AVIF:</strong> Best compression (30-50% smaller than WebP). Ideal for photos.
              </p>
              <p className="text-[10px] text-amber-500/80 bg-amber-950/30 p-2 rounded border border-amber-900/30">
                <strong className="text-amber-500">Note:</strong> AVIF encoding is slower (5-30 seconds per image).
              </p>
            </div>
          )}
          {options.format === 'jpeg' && (
            <p className="text-[10px] text-amber-500/80 bg-amber-950/30 p-2 rounded border border-amber-900/30">
              <strong className="text-amber-500">JPEG Note:</strong> JPEG doesn't support transparency. PNG/WebP images with transparency will have a white background.
            </p>
          )}
          {options.format === 'png' && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-blue-400/80 bg-blue-950/30 p-2 rounded border border-blue-900/30">
                <strong className="text-blue-400">PNG Info:</strong> PNG is lossless - quality slider affects compression level, not visual quality.
              </p>
              <p className="text-[10px] text-blue-400/80 bg-blue-950/30 p-2 rounded border border-blue-900/30">
                Smart PNG conversion: If PNG increases file size by more than 5%, original format will be kept automatically.
              </p>
            </div>
          )}
        </div>

        {/* Quality Control */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs uppercase tracking-wide text-neutral-400">Quality</label>
            <span className="text-xs text-neutral-300">{Math.round(options.quality * 100)}%</span>
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

          <div className="grid grid-cols-5 gap-1.5">
            {qualityPresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => onOptionsChange({
                  ...options,
                  quality: preset.value
                })}
                className={`px-2 py-1.5 text-[10px] rounded ${
                  Math.abs(options.quality - preset.value) < 0.05
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Quality mapping info for 100% */}
          {options.quality >= 1.0 && options.format !== 'png' && (
            <p className="text-[10px] text-blue-400/80 bg-blue-950/30 p-2 rounded border border-blue-900/30">
              <strong className="text-blue-400">Smart optimization:</strong> To prevent file size increases, 100% quality is processed at 90% internally.
            </p>
          )}
        </div>

        {/* Advanced Options */}
        <div className="space-y-3 border-t border-neutral-800 pt-4">
          <h4 className="text-xs uppercase tracking-wide text-neutral-400">Advanced Options</h4>

          {/* Max File Size */}
          <div className="space-y-2">
            <label className="text-xs text-neutral-400">Maximum File Size (optional)</label>
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
                className="flex-1 px-3 py-2 text-sm rounded bg-neutral-800 text-neutral-300 border-none focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              <span className="text-xs text-neutral-500">MB</span>
            </div>
            {options.maxSizeMB && (
              <p className="text-[10px] text-neutral-500">
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
                className="h-4 w-4 rounded bg-neutral-800 border-neutral-700 text-emerald-600 focus:ring-emerald-600 focus:ring-offset-0"
              />
              <label htmlFor="preserveExif" className="text-xs text-neutral-300 cursor-pointer">
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
                className="h-4 w-4 rounded bg-neutral-800 border-neutral-700 text-emerald-600 focus:ring-emerald-600 focus:ring-offset-0"
              />
              <label htmlFor="losslessWebP" className="text-xs text-neutral-300 cursor-pointer">
                Lossless WebP (larger files, perfect quality)
              </label>
            </div>
          )}
        </div>

        {/* Browser Compatibility Info */}
        {capabilities.showCompatibilityWarning && (
          <div className="pt-3 border-t border-neutral-800">
            <div className="bg-amber-950/30 border border-amber-900/30 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-500">
                  Limited Browser Support
                </span>
              </div>
              <p className="text-[10px] text-amber-500/80 mb-1">
                {browserInfo.name} has reduced performance. For best results, use Chrome, Firefox, or Edge.
              </p>
              <div className="text-[10px] text-amber-500/60">
                Quality limited to {Math.round(capabilities.maxQualityRecommended * 100)}%
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-4 border-t border-neutral-800">
          <button
            onClick={onOptimize}
            disabled={!hasImages || isProcessing}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded ${
              !hasImages || isProcessing
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <Zap className="h-4 w-4" />
            {isProcessing
              ? `Processing... (${processedCount}/${totalImages})`
              : 'Optimize Images'
            }
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
