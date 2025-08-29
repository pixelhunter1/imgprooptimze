
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider, SliderThumb } from '@/components/ui/slider';
import { Settings, Download, Zap } from 'lucide-react';
import { type OptimizationOptions } from '@/lib/imageProcessor';

interface OptimizationControlsProps {
  options: OptimizationOptions;
  onOptionsChange: (options: OptimizationOptions) => void;
  onOptimize: () => void;
  onDownloadAll: () => void;
  isProcessing: boolean;
  hasImages: boolean;
  processedCount: number;
  totalImages: number;
}

export default function OptimizationControls({
  options,
  onOptionsChange,
  onOptimize,
  onDownloadAll,
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
    { value: 0.35, label: 'Smallest', description: 'Max compression' },
    { value: 0.6, label: 'Balanced', description: 'Best trade-off' },
    { value: 0.8, label: 'Sharp', description: 'Higher quality' },
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
            <span className="text-sm text-gray-500">{Math.round(options.quality * 100)}%</span>
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
          
          <div className="grid grid-cols-3 gap-2">
            {qualityPresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => onOptionsChange({ ...options, quality: preset.value })}
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



        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button
            onClick={onOptimize}
            disabled={!hasImages || isProcessing}
            className="flex-1 flex items-center gap-2"
            size="lg"
            variant="primary"
          >
            <Zap className="h-4 w-4" />
            {isProcessing 
              ? `Processing... (${processedCount}/${totalImages})`
              : 'Optimize Images'
            }
          </Button>
          
          <Button
            onClick={onDownloadAll}
            disabled={processedCount === 0}
            variant="primary"
            className="flex items-center gap-2"
            size="lg"
          >
            <Download className="h-4 w-4" />
            Download All ({processedCount})
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
