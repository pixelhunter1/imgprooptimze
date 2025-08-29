
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider, SliderThumb } from '@/components/ui/slider';
import { Settings, Zap } from 'lucide-react';
import { type OptimizationOptions } from '@/lib/imageProcessor';

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
  const formatOptions = [
    { value: 'webp', label: 'WebP', description: 'Best compression, modern browsers' },
    { value: 'jpeg', label: 'JPEG', description: 'Good compression, universal support' },
    { value: 'png', label: 'PNG', description: 'Lossless, supports transparency' },
  ] as const;

  const qualityPresets = [
    { value: 0.4, label: 'Small', description: 'High compression' },
    { value: 0.7, label: 'Balanced', description: 'Good trade-off' },
    { value: 0.9, label: 'High', description: 'Sharp & clear' },
    { value: 1.0, label: 'Maximum', description: 'Best quality' },
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
          <label className="text-sm font-medium">Output Format</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {formatOptions.map((format) => (
              <button
                key={format.value}
                onClick={() => onOptionsChange({ ...options, format: format.value })}
                className={`p-3 text-left border rounded-lg transition-colors ${
                  options.format === format.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <div className="font-medium">{format.label}</div>
                <div className="text-xs text-gray-500">{format.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Quality Control */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Quality</label>
            <div className="flex items-center gap-2">
              {options.preserveQuality && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  Max Quality
                </span>
              )}
              <span className="text-sm text-gray-500">{Math.round(options.quality * 100)}%</span>
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
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {qualityPresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => onOptionsChange({
                  ...options,
                  quality: preset.value,
                  preserveQuality: preset.value >= 0.9 // Auto-enable preserve quality for high settings
                })}
                className={`p-2 text-xs border rounded transition-colors ${
                  Math.abs(options.quality - preset.value) < 0.05
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <div className="font-medium">{preset.label}</div>
                <div className="text-gray-500">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Maximum Quality Toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Maximum Quality Mode</label>
              <p className="text-xs text-muted-foreground">
                Prioritizes image sharpness over file size
              </p>
            </div>
            <button
              onClick={() => onOptionsChange({
                ...options,
                preserveQuality: !options.preserveQuality,
                quality: !options.preserveQuality ? 1.0 : options.quality
              })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                options.preserveQuality ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  options.preserveQuality ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t">
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

        {/* Progress Info */}
        {isProcessing && (
          <div className="text-center text-sm text-gray-600">
            Processing {processedCount} of {totalImages} images...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
