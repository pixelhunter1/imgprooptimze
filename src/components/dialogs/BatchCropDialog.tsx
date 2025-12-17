import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { X, Crop, Loader2, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type ProcessedImage } from '@/lib/imageProcessor';
import {
  type SizePreset,
  SIZE_PRESETS,
} from '@/types/crop';

// Style options type (same as CropEditor)
type FrameStyle = 'none' | 'glass-light' | 'glass-dark' | 'inset-light' | 'inset-dark' | 'outline' | 'border' | 'liquid';
type ShadowStyle = 'none' | 'spread' | 'hug' | 'lg';

export interface CropStyleOptions {
  padding: number;
  borderRadius: number;
  bgColor: string;
  shadow: ShadowStyle;
  frameStyle: FrameStyle;
  borderWidth: number;
  borderColor: string;
}

interface BatchCropDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (preset: SizePreset, styleOptions: CropStyleOptions, imageIds: string[], onProgress?: (current: number, total: number) => void) => Promise<void>;
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
      <div className="w-12 h-12 bg-muted rounded-md border border-border flex items-center justify-center">
        <span className="text-xs text-muted-foreground">...</span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={`Preview ${index + 1}`}
      className="w-12 h-12 object-cover rounded-md border border-border"
    />
  );
});

const DEFAULT_STYLE_OPTIONS: CropStyleOptions = {
  padding: 0,
  borderRadius: 0,
  bgColor: 'transparent',
  shadow: 'none',
  frameStyle: 'none',
  borderWidth: 15,
  borderColor: '#ffffff',
};

export default function BatchCropDialog({
  isOpen,
  onClose,
  onApply,
  images,
}: BatchCropDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<SizePreset | null>(null);
  const [styleOptions, setStyleOptions] = useState<CropStyleOptions>(DEFAULT_STYLE_OPTIONS);
  const [isApplying, setIsApplying] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [customWidth, setCustomWidth] = useState(1080);
  const [customHeight, setCustomHeight] = useState(1080);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const wasOpenRef = useRef(false);

  // Get preview image (first image)
  const previewImage = images[0];

  // Ensure we have a default preset on first open so the preview canvas renders immediately.
  // (Without a preset/custom size, effectivePreset is null and we don't draw the preview.)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      if (!useCustomSize && !selectedPreset) {
        const defaultPreset = SIZE_PRESETS.find(p => p.id === 'ig-post') ?? SIZE_PRESETS[0] ?? null;
        if (defaultPreset) setSelectedPreset(defaultPreset);
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, useCustomSize, selectedPreset]);

  // Create effective preset (custom or selected)
  const effectivePreset: SizePreset | null = useCustomSize
    ? {
        id: 'custom',
        label: 'Custom',
        width: customWidth,
        height: customHeight,
        category: 'web',
        description: 'Custom size',
      }
    : selectedPreset;

  // Load preview image
  useEffect(() => {
    if (!isOpen || !previewImage) return;

    setPreviewLoaded(false);
    const img = new Image();
    const imageUrl = URL.createObjectURL(previewImage.optimizedFile);

    img.onload = () => {
      previewImageRef.current = img;
      setPreviewLoaded(true);
    };

    img.onerror = () => {
      console.error('Failed to load preview image');
    };

    img.src = imageUrl;

    return () => {
      URL.revokeObjectURL(imageUrl);
      previewImageRef.current = null;
      setPreviewLoaded(false);
    };
  }, [isOpen, previewImage]);

  // Draw preview canvas
  const drawCanvas = useCallback(() => {
    if (!previewLoaded || !canvasRef.current || !previewImageRef.current || !effectivePreset) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = previewImageRef.current;
    const container = containerRef.current;
    if (!container) return;

    // Get container dimensions (with minimum fallback)
    const containerWidth = Math.max(container.clientWidth, 200);
    const containerHeight = Math.max(container.clientHeight, 200);

    const { padding, borderRadius, bgColor, shadow, frameStyle, borderWidth, borderColor } = styleOptions;

    // Calculate the preview size
    const targetWidth = effectivePreset.width;
    const targetHeight = effectivePreset.height;
    const outW = targetWidth;
    const outH = targetHeight;
    const finalW = outW + padding * 2;
    const finalH = outH + padding * 2;

    // Scale down to fit container; do not upscale small presets.
    const maxWidth = containerWidth - 40;
    const maxHeight = containerHeight - 40;

    const scaleX = maxWidth / finalW;
    const scaleY = maxHeight / finalH;
    const scale = Math.min(scaleX, scaleY, 1);

    const displayW = finalW * scale;
    const displayH = finalH * scale;

    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = displayW + 'px';
    canvas.style.height = displayH + 'px';
    ctx.scale(dpr, dpr);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Helper function to draw checkered background
    const drawCheckerboard = (x: number, y: number, w: number, h: number, size: number = 8) => {
      const lightColor = '#3a3a3a';
      const darkColor = '#2a2a2a';
      for (let row = 0; row < Math.ceil(h / size); row++) {
        for (let col = 0; col < Math.ceil(w / size); col++) {
          const isLight = (row + col) % 2 === 0;
          ctx.fillStyle = isLight ? lightColor : darkColor;
          const cellX = x + col * size;
          const cellY = y + row * size;
          const cellW = Math.min(size, x + w - cellX);
          const cellH = Math.min(size, y + h - cellY);
          ctx.fillRect(cellX, cellY, cellW, cellH);
        }
      }
    };

    // Clear canvas with dark background
    ctx.fillStyle = '#171717';
    ctx.fillRect(0, 0, displayW, displayH);

    // Scale all values for preview
    const scaledPadding = padding * scale;
    const scaledOutW = outW * scale;
    const scaledOutH = outH * scale;
    const scaledRadius = Math.min(borderRadius * scale, scaledOutW / 2, scaledOutH / 2);
    const scaledBorderWidth = borderWidth * scale;

    // Draw checkered background for transparent areas
    drawCheckerboard(0, 0, displayW, displayH);

    // Step 1: Fill background color
    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, displayW, displayH);
    }

    // Step 2: Apply shadow if set
    if (shadow !== 'none') {
      const shadowSizes = {
        spread: { blur: 30 * scale, offset: 0, opacity: 0.15, spread: true },
        hug: { blur: 8 * scale, offset: 4 * scale, opacity: 0.25, spread: false },
        lg: { blur: 40 * scale, offset: 15 * scale, opacity: 0.35, spread: false },
      };
      const shadowConfig = shadowSizes[shadow];

      ctx.save();
      if (shadowConfig.spread) {
        ctx.shadowColor = `rgba(0, 0, 0, ${shadowConfig.opacity})`;
        ctx.shadowBlur = shadowConfig.blur;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      } else {
        ctx.shadowColor = `rgba(0, 0, 0, ${shadowConfig.opacity})`;
        ctx.shadowBlur = shadowConfig.blur;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = shadowConfig.offset;
      }

      ctx.fillStyle = bgColor !== 'transparent' ? bgColor : '#ffffff';

      if (scaledRadius > 0) {
        ctx.beginPath();
        ctx.roundRect(scaledPadding, scaledPadding, scaledOutW, scaledOutH, scaledRadius);
        ctx.fill();
      } else {
        ctx.fillRect(scaledPadding, scaledPadding, scaledOutW, scaledOutH);
      }
      ctx.restore();
    }

    // Step 3: Apply border radius clipping
    if (scaledRadius > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(scaledPadding, scaledPadding, scaledOutW, scaledOutH, scaledRadius);
      ctx.clip();
    }

    // Step 4: Draw the image (centered crop)
    const targetRatio = targetWidth / targetHeight;
    const imageRatio = img.width / img.height;
    let cropX: number, cropY: number, cropWidth: number, cropHeight: number;

    if (imageRatio > targetRatio) {
      cropHeight = img.height;
      cropWidth = cropHeight * targetRatio;
      cropX = (img.width - cropWidth) / 2;
      cropY = 0;
    } else {
      cropWidth = img.width;
      cropHeight = cropWidth / targetRatio;
      cropX = 0;
      cropY = (img.height - cropHeight) / 2;
    }

    ctx.drawImage(
      img,
      cropX, cropY, cropWidth, cropHeight,
      scaledPadding, scaledPadding, scaledOutW, scaledOutH
    );

    if (scaledRadius > 0) {
      ctx.restore();
    }

    // Step 5: Draw frame styles
    if (frameStyle !== 'none') {
      const bw = scaledBorderWidth;
      const r = scaledRadius;

      const drawRoundedRectPath = (x: number, y: number, w: number, h: number, radius: number) => {
        ctx.beginPath();
        if (radius > 0) {
          ctx.roundRect(x, y, w, h, radius);
        } else {
          ctx.rect(x, y, w, h);
        }
      };

      switch (frameStyle) {
        case 'glass-light':
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = bw;
          drawRoundedRectPath(scaledPadding + bw/2, scaledPadding + bw/2, scaledOutW - bw, scaledOutH - bw, Math.max(0, r - bw/2));
          ctx.stroke();
          break;

        case 'glass-dark':
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.lineWidth = bw;
          drawRoundedRectPath(scaledPadding + bw/2, scaledPadding + bw/2, scaledOutW - bw, scaledOutH - bw, Math.max(0, r - bw/2));
          ctx.stroke();
          break;

        case 'inset-light':
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          ctx.shadowBlur = bw * 1.5;
          ctx.shadowOffsetX = bw * 0.5;
          ctx.shadowOffsetY = bw * 0.5;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = bw;
          drawRoundedRectPath(scaledPadding + bw/2, scaledPadding + bw/2, scaledOutW - bw, scaledOutH - bw, Math.max(0, r - bw/2));
          ctx.stroke();
          ctx.restore();
          break;

        case 'inset-dark':
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = bw * 1.5;
          ctx.shadowOffsetX = bw * 0.5;
          ctx.shadowOffsetY = bw * 0.5;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.lineWidth = bw;
          drawRoundedRectPath(scaledPadding + bw/2, scaledPadding + bw/2, scaledOutW - bw, scaledOutH - bw, Math.max(0, r - bw/2));
          ctx.stroke();
          ctx.restore();
          break;

        case 'outline':
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 1;
          drawRoundedRectPath(scaledPadding + 0.5, scaledPadding + 0.5, scaledOutW - 1, scaledOutH - 1, r);
          ctx.stroke();
          break;

        case 'border':
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = bw;
          drawRoundedRectPath(scaledPadding + bw/2, scaledPadding + bw/2, scaledOutW - bw, scaledOutH - bw, Math.max(0, r - bw/2));
          ctx.stroke();
          break;

        case 'liquid': {
          const liquidGradient = ctx.createLinearGradient(0, 0, displayW, displayH);
          liquidGradient.addColorStop(0, '#f97316');
          liquidGradient.addColorStop(0.5, '#eab308');
          liquidGradient.addColorStop(1, '#f97316');
          ctx.save();
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = bw * 2;
          ctx.strokeStyle = liquidGradient;
          ctx.lineWidth = bw;
          drawRoundedRectPath(scaledPadding + bw/2, scaledPadding + bw/2, scaledOutW - bw, scaledOutH - bw, Math.max(0, r - bw/2));
          ctx.stroke();
          ctx.restore();
          break;
        }
      }
    }

    // Draw green border if no frame style
    if (frameStyle === 'none') {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (scaledRadius > 0) {
        ctx.roundRect(scaledPadding, scaledPadding, scaledOutW, scaledOutH, scaledRadius);
      } else {
        ctx.rect(scaledPadding, scaledPadding, scaledOutW, scaledOutH);
      }
      ctx.stroke();
    }
  }, [previewLoaded, effectivePreset, styleOptions]);

  // Call drawCanvas when dependencies change and handle container resize
  useEffect(() => {
    drawCanvas();

    // Add resize observer to redraw when container size changes
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      drawCanvas();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [drawCanvas]);

  const handleApply = useCallback(async () => {
    if (!effectivePreset || images.length === 0) return;

    setIsApplying(true);
    setProcessingProgress({ current: 0, total: images.length });

    try {
      await onApply(
        effectivePreset,
        styleOptions,
        images.map(img => img.id),
        (current, total) => {
          setProcessingProgress({ current, total });
        }
      );
      onClose();
    } catch (error) {
      console.error('Batch crop failed:', error);
    } finally {
      setIsApplying(false);
      setProcessingProgress({ current: 0, total: 0 });
    }
  }, [effectivePreset, styleOptions, images, onApply, onClose]);

  const handleReset = useCallback(() => {
    setStyleOptions(DEFAULT_STYLE_OPTIONS);
    setSelectedPreset(null);
    setUseCustomSize(false);
    setCustomWidth(1080);
    setCustomHeight(1080);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isApplying) onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isApplying, onClose]);

  if (!isOpen) return null;

  // Group presets by category
  const ecommerceSizes = SIZE_PRESETS.filter(s => s.category === 'ecommerce');
  const socialSizes = SIZE_PRESETS.filter(s => s.category === 'social');
  const videoSizes = SIZE_PRESETS.filter(s => s.category === 'video');
  const webSizes = SIZE_PRESETS.filter(s => s.category === 'web');

  return createPortal(
    <div className="fixed inset-0 z-50 flex bg-neutral-950">
      {/* Left Sidebar - Size Presets */}
      <div className="w-56 bg-neutral-900 border-r border-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-800">
          <h3 className="text-white text-sm font-medium">Size</h3>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
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

          {/* Custom Size */}
          <div className="p-3 border-b border-neutral-800">
            <h4 className="text-neutral-400 text-xs uppercase tracking-wide mb-2">Custom Size</h4>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setUseCustomSize(true);
                  setSelectedPreset(null);
                }}
                disabled={isApplying}
                className={`w-full text-left px-2 py-1.5 text-xs rounded flex justify-between items-center ${
                  useCustomSize
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                } disabled:opacity-50`}
              >
                <span>Custom</span>
                {useCustomSize && (
                  <span className="opacity-80 text-[10px]">{customWidth}×{customHeight}</span>
                )}
              </button>

              {useCustomSize && (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-neutral-500 mb-1 block">Width</label>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(Math.max(1, parseInt(e.target.value) || 1))}
                        disabled={isApplying}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-500 mb-1 block">Height</label>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(Math.max(1, parseInt(e.target.value) || 1))}
                        disabled={isApplying}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>
                  {/* Common aspect ratio shortcuts */}
                  <div className="flex gap-1 flex-wrap">
                    {[
                      { label: '1:1', w: 1080, h: 1080 },
                      { label: '4:3', w: 1200, h: 900 },
                      { label: '16:9', w: 1920, h: 1080 },
                      { label: '9:16', w: 1080, h: 1920 },
                    ].map((ratio) => (
                      <button
                        key={ratio.label}
                        onClick={() => {
                          setCustomWidth(ratio.w);
                          setCustomHeight(ratio.h);
                        }}
                        disabled={isApplying}
                        className="px-1.5 py-0.5 text-[10px] bg-neutral-700 text-neutral-300 rounded hover:bg-neutral-600 disabled:opacity-50"
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* E-commerce */}
          {ecommerceSizes.length > 0 && (
            <div className="p-3 border-b border-neutral-800">
              <h4 className="text-neutral-400 text-xs uppercase tracking-wide mb-2">E-commerce</h4>
              <div className="space-y-0.5">
                {ecommerceSizes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedPreset(s);
                      setUseCustomSize(false);
                    }}
                    disabled={isApplying}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded flex justify-between items-center ${
                      !useCustomSize && selectedPreset?.id === s.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    } disabled:opacity-50`}
                  >
                    <span className="truncate">{s.label}</span>
                    <span className="opacity-60 text-[10px] ml-1">{s.width}×{s.height}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Social */}
          {socialSizes.length > 0 && (
            <div className="p-3 border-b border-neutral-800">
              <h4 className="text-neutral-400 text-xs uppercase tracking-wide mb-2">Social Media</h4>
              <div className="space-y-0.5">
                {socialSizes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedPreset(s);
                      setUseCustomSize(false);
                    }}
                    disabled={isApplying}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded flex justify-between items-center ${
                      !useCustomSize && selectedPreset?.id === s.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    } disabled:opacity-50`}
                  >
                    <span className="truncate">{s.label}</span>
                    <span className="opacity-60 text-[10px] ml-1">{s.width}×{s.height}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Video */}
          {videoSizes.length > 0 && (
            <div className="p-3 border-b border-neutral-800">
              <h4 className="text-neutral-400 text-xs uppercase tracking-wide mb-2">Video</h4>
              <div className="space-y-0.5">
                {videoSizes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedPreset(s);
                      setUseCustomSize(false);
                    }}
                    disabled={isApplying}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded flex justify-between items-center ${
                      !useCustomSize && selectedPreset?.id === s.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    } disabled:opacity-50`}
                  >
                    <span className="truncate">{s.label}</span>
                    <span className="opacity-60 text-[10px] ml-1">{s.width}×{s.height}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Web */}
          {webSizes.length > 0 && (
            <div className="p-3 border-b border-neutral-800">
              <h4 className="text-neutral-400 text-xs uppercase tracking-wide mb-2">Web</h4>
              <div className="space-y-0.5">
                {webSizes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedPreset(s);
                      setUseCustomSize(false);
                    }}
                    disabled={isApplying}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded flex justify-between items-center ${
                      !useCustomSize && selectedPreset?.id === s.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    } disabled:opacity-50`}
                  >
                    <span className="truncate">{s.label}</span>
                    <span className="opacity-60 text-[10px] ml-1">{s.width}×{s.height}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <Crop className="h-4 w-4 text-emerald-500" />
            <h2 className="text-white text-sm font-medium">Crop All Images</h2>
            <span className="text-neutral-500 text-xs">({images.length} images)</span>
          </div>
          <button
            onClick={onClose}
            disabled={isApplying}
            className="text-neutral-400 hover:text-white disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 flex items-center justify-center p-4 min-h-0 overflow-auto relative">
          {previewLoaded && effectivePreset ? (
            <canvas ref={canvasRef} />
          ) : (
            <div className="text-neutral-500 flex flex-col items-center gap-3">
              {!effectivePreset ? (
                <>
                  <Crop className="w-12 h-12 text-neutral-600" />
                  <span className="text-sm">Select a size or enter custom dimensions</span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading preview...</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Bottom info bar with thumbnails and progress */}
        <div className="px-4 py-3 bg-neutral-900/50 border-t border-neutral-800">
          {isApplying ? (
            /* Processing Progress */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                  <span className="text-sm text-white font-medium">
                    Cropping image {processingProgress.current} of {processingProgress.total}...
                  </span>
                </div>
                <span className="text-xs text-neutral-400">
                  {Math.round((processingProgress.current / processingProgress.total) * 100)}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                />
              </div>
              {/* Thumbnail progress indicators */}
              <div className="flex gap-1.5 justify-center">
                {images.slice(0, 10).map((image, index) => {
                  // Progress is 1-indexed, so compare index+1 with current
                  const imageNumber = index + 1;
                  const isCompleted = imageNumber < processingProgress.current;
                  const isProcessing = imageNumber === processingProgress.current;

                  return (
                    <div
                      key={image.id}
                      className={`relative w-10 h-10 rounded border-2 overflow-hidden transition-all ${
                        isCompleted
                          ? 'border-emerald-500 opacity-100'
                          : isProcessing
                          ? 'border-emerald-500 opacity-100 ring-2 ring-emerald-500/50'
                          : 'border-neutral-700 opacity-40'
                      }`}
                    >
                      <ImageThumbnail image={image} index={index} />
                      {isCompleted && (
                        <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center">
                          <Check className="w-4 h-4 text-emerald-400" />
                        </div>
                      )}
                      {isProcessing && (
                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                        </div>
                      )}
                    </div>
                  );
                })}
                {images.length > 10 && (
                  <div className="w-10 h-10 bg-neutral-800 rounded border-2 border-neutral-700 flex items-center justify-center text-[10px] text-neutral-400 opacity-40">
                    +{images.length - 10}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Normal state - Show output info and thumbnails */
            <div className="flex items-center gap-4">
              <div className="flex-1">
                {effectivePreset && (
                  <span className="text-xs text-neutral-400">
                    Output: <span className="text-emerald-400">{effectivePreset.width + styleOptions.padding * 2} × {effectivePreset.height + styleOptions.padding * 2}</span>
                    {styleOptions.padding > 0 && (
                      <span className="text-neutral-500 ml-2">(includes {styleOptions.padding}px padding)</span>
                    )}
                    {useCustomSize && (
                      <span className="text-blue-400 ml-2">(custom)</span>
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-400">
                  <span className="text-white font-medium">{images.length}</span> {images.length === 1 ? 'image' : 'images'} selected
                </span>
                <div className="flex gap-1">
                  {images.slice(0, 5).map((image, index) => (
                    <div key={image.id} className="w-8 h-8 rounded border border-neutral-700 overflow-hidden">
                      <ImageThumbnail image={image} index={index} />
                    </div>
                  ))}
                  {images.length > 5 && (
                    <div className="w-8 h-8 bg-neutral-800 rounded border border-neutral-700 flex items-center justify-center text-[10px] text-neutral-400">
                      +{images.length - 5}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Style Options */}
      <div className="w-56 bg-neutral-900 border-l border-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-800">
          <h3 className="text-white text-sm font-medium">Design</h3>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Style Options */}
          <div className="p-3 border-b border-neutral-800">
            <h4 className="text-neutral-400 text-xs uppercase tracking-wide mb-3">Style</h4>

            {/* Padding & Corner Radius */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[10px] text-neutral-500 mb-1 block">Padding</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={styleOptions.padding}
                    onChange={(e) => setStyleOptions(prev => ({ ...prev, padding: Math.max(0, parseInt(e.target.value) || 0) }))}
                    disabled={isApplying}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:border-emerald-500 focus:outline-none disabled:opacity-50"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-500">px</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-neutral-500 mb-1 block">Radius</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={styleOptions.borderRadius}
                    onChange={(e) => setStyleOptions(prev => ({ ...prev, borderRadius: Math.max(0, parseInt(e.target.value) || 0) }))}
                    disabled={isApplying}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:border-emerald-500 focus:outline-none disabled:opacity-50"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-500">px</span>
                </div>
              </div>
            </div>

            {/* Background Color */}
            <div className="mb-3">
              <div className="text-[10px] text-neutral-500 mb-1">Background</div>
              <div className="grid grid-cols-5 gap-1">
                <button
                  onClick={() => setStyleOptions(prev => ({ ...prev, bgColor: 'transparent' }))}
                  disabled={isApplying}
                  className={`h-6 rounded border-2 ${
                    styleOptions.bgColor === 'transparent'
                      ? 'border-emerald-500'
                      : 'border-neutral-700 hover:border-neutral-600'
                  } disabled:opacity-50`}
                  style={{
                    background: 'linear-gradient(45deg, #374151 25%, transparent 25%), linear-gradient(-45deg, #374151 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #374151 75%), linear-gradient(-45deg, transparent 75%, #374151 75%)',
                    backgroundSize: '6px 6px',
                    backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px'
                  }}
                  title="Transparent"
                />
                <button
                  onClick={() => setStyleOptions(prev => ({ ...prev, bgColor: '#ffffff' }))}
                  disabled={isApplying}
                  className={`h-6 rounded border-2 bg-white ${
                    styleOptions.bgColor === '#ffffff'
                      ? 'border-emerald-500'
                      : 'border-neutral-700 hover:border-neutral-600'
                  } disabled:opacity-50`}
                  title="White"
                />
                <button
                  onClick={() => setStyleOptions(prev => ({ ...prev, bgColor: '#000000' }))}
                  disabled={isApplying}
                  className={`h-6 rounded border-2 bg-black ${
                    styleOptions.bgColor === '#000000'
                      ? 'border-emerald-500'
                      : 'border-neutral-700 hover:border-neutral-600'
                  } disabled:opacity-50`}
                  title="Black"
                />
                <button
                  onClick={() => setStyleOptions(prev => ({ ...prev, bgColor: '#1a1a1a' }))}
                  disabled={isApplying}
                  className={`h-6 rounded border-2 ${
                    styleOptions.bgColor === '#1a1a1a'
                      ? 'border-emerald-500'
                      : 'border-neutral-700 hover:border-neutral-600'
                  } disabled:opacity-50`}
                  style={{ background: '#1a1a1a' }}
                  title="Dark Gray"
                />
                <div className="relative">
                  <input
                    type="color"
                    value={styleOptions.bgColor.startsWith('#') ? styleOptions.bgColor : '#ffffff'}
                    onChange={(e) => setStyleOptions(prev => ({ ...prev, bgColor: e.target.value }))}
                    disabled={isApplying}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div
                    className={`h-6 rounded border-2 flex items-center justify-center ${
                      !['transparent', '#ffffff', '#000000', '#1a1a1a'].includes(styleOptions.bgColor)
                        ? 'border-emerald-500'
                        : 'border-neutral-700 hover:border-neutral-600'
                    }`}
                    style={{
                      background: !['transparent', '#ffffff', '#000000', '#1a1a1a'].includes(styleOptions.bgColor)
                        ? styleOptions.bgColor
                        : 'linear-gradient(135deg, #ef4444 0%, #f59e0b 25%, #22c55e 50%, #3b82f6 75%, #a855f7 100%)'
                    }}
                    title="Custom Color"
                  >
                    {['transparent', '#ffffff', '#000000', '#1a1a1a'].includes(styleOptions.bgColor) && (
                      <span className="text-[8px] text-white font-bold drop-shadow-sm">+</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Shadow */}
            <div className="mb-3">
              <div className="text-[10px] text-neutral-500 mb-1">Shadow</div>
              <div className="grid grid-cols-4 gap-1">
                {([
                  { id: 'none', label: 'None' },
                  { id: 'spread', label: 'Spread' },
                  { id: 'hug', label: 'Hug' },
                  { id: 'lg', label: 'Heavy' },
                ] as const).map((shadow) => (
                  <button
                    key={shadow.id}
                    onClick={() => setStyleOptions(prev => ({ ...prev, shadow: shadow.id }))}
                    disabled={isApplying}
                    className={`px-1 py-1 text-[10px] rounded ${
                      styleOptions.shadow === shadow.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    } disabled:opacity-50`}
                  >
                    {shadow.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame Styles */}
            <div>
              <div className="text-[10px] text-neutral-500 mb-1">Frame Style</div>
              <div className="grid grid-cols-2 gap-1 mb-2">
                {([
                  { id: 'none', label: 'None', preview: 'bg-neutral-700' },
                  { id: 'glass-light', label: 'Glass Light', preview: 'bg-gradient-to-br from-white/50 to-white/20 border border-white/30' },
                  { id: 'glass-dark', label: 'Glass Dark', preview: 'bg-gradient-to-br from-black/30 to-black/10 border border-black/20' },
                  { id: 'inset-light', label: 'Inset Light', preview: 'bg-neutral-600 shadow-inner' },
                  { id: 'inset-dark', label: 'Inset Dark', preview: 'bg-neutral-800 shadow-inner' },
                  { id: 'outline', label: 'Outline', preview: 'bg-transparent border border-white' },
                  { id: 'border', label: 'Border', preview: 'bg-transparent border-2 border-white' },
                  { id: 'liquid', label: 'Liquid', preview: 'bg-gradient-to-br from-orange-500 via-yellow-500 to-orange-500' },
                ] as const).map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setStyleOptions(prev => ({ ...prev, frameStyle: style.id }))}
                    disabled={isApplying}
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded ${
                      styleOptions.frameStyle === style.id
                        ? 'bg-emerald-600/20 ring-1 ring-emerald-500'
                        : 'bg-neutral-800 hover:bg-neutral-700'
                    } disabled:opacity-50`}
                  >
                    <div className={`w-6 h-4 rounded ${style.preview}`} />
                    <span className="text-[8px] text-neutral-300">{style.label}</span>
                  </button>
                ))}
              </div>

              {/* Border Width - show for styles that have visible borders */}
              {styleOptions.frameStyle !== 'none' && (
                <div className="space-y-2">
                  <div>
                    <div className="text-[10px] text-neutral-500 mb-1">Border Width</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={styleOptions.borderWidth}
                        onChange={(e) => setStyleOptions(prev => ({ ...prev, borderWidth: Math.max(1, Math.min(500, parseInt(e.target.value) || 1)) }))}
                        disabled={isApplying}
                        className="w-16 px-2 py-1 text-[10px] bg-neutral-800 border border-neutral-700 rounded text-white text-center focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                      />
                      <span className="text-[10px] text-neutral-500">px</span>
                    </div>
                  </div>

                  {/* Border Color */}
                  {(styleOptions.frameStyle === 'outline' || styleOptions.frameStyle === 'border') && (
                    <div>
                      <div className="text-[10px] text-neutral-500 mb-1">Border Color</div>
                      <div className="grid grid-cols-5 gap-1">
                        {['#ffffff', '#000000', '#6366f1', '#ec4899', '#22c55e'].map((color) => (
                          <button
                            key={color}
                            onClick={() => setStyleOptions(prev => ({ ...prev, borderColor: color }))}
                            disabled={isApplying}
                            className={`h-5 rounded border-2 ${
                              styleOptions.borderColor === color
                                ? 'border-emerald-500'
                                : 'border-neutral-700 hover:border-neutral-600'
                            } disabled:opacity-50`}
                            style={{ background: color }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Footer - Actions */}
        <div className="p-3 border-t border-neutral-800 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isApplying}
            className="w-full text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-2" />
            Reset
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleApply}
            disabled={!effectivePreset || images.length === 0 || isApplying}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApplying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Cropping...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 mr-2" />
                Crop {images.length} Image{images.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
