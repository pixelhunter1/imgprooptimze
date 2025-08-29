
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
