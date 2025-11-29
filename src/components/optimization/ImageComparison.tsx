import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronsLeftRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageComparisonProps {
    originalUrl: string;
    optimizedUrl: string;
    originalSize?: number;
    optimizedSize?: number;
    className?: string;
    enableZoom?: boolean;
}

export default function ImageComparison({
    originalUrl,
    optimizedUrl,
    className = '',
    enableZoom = false,
}: ImageComparisonProps) {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDraggingSlider, setIsDraggingSlider] = useState(false);

    // Zoom & Pan State
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);

    // Slider Logic
    const handleSliderMove = useCallback((clientX: number) => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
            const percentage = (x / rect.width) * 100;
            setSliderPosition(percentage);
        }
    }, []);

    // Pan Logic
    const handlePanStart = (clientX: number, clientY: number) => {
        if (!enableZoom) return;
        setIsPanning(true);
        setStartPan({ x: clientX - position.x, y: clientY - position.y });
    };

    const handlePanMove = useCallback((clientX: number, clientY: number) => {
        if (!enableZoom) return;
        setPosition({
            x: clientX - startPan.x,
            y: clientY - startPan.y
        });
    }, [startPan, enableZoom]);

    // Global Mouse/Touch Handlers
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDraggingSlider) {
                handleSliderMove(e.clientX);
                e.preventDefault(); // Prevent selection
            } else if (isPanning && enableZoom) {
                handlePanMove(e.clientX, e.clientY);
                e.preventDefault();
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (isDraggingSlider) {
                handleSliderMove(e.touches[0].clientX);
            } else if (isPanning && enableZoom) {
                handlePanMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };

        const handleUp = () => {
            setIsDraggingSlider(false);
            setIsPanning(false);
        };

        if (isDraggingSlider || (isPanning && enableZoom)) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleUp);
            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('touchend', handleUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [isDraggingSlider, isPanning, handleSliderMove, handlePanMove, enableZoom]);

    // Zoom Logic
    const handleWheel = (e: React.WheelEvent) => {
        if (!enableZoom) return;
        e.preventDefault();
        e.stopPropagation();

        const delta = -e.deltaY;
        const zoomFactor = 0.1;
        const newScale = Math.min(Math.max(1, scale + (delta > 0 ? zoomFactor : -zoomFactor)), 8);

        // Calculate zoom origin (optional, for now simple center zoom or just scale)
        // For better UX, we should zoom towards mouse, but that requires more complex math with offsets.
        // Let's stick to simple zoom for now, or maybe just update scale.
        // If we want to zoom towards pointer, we need to adjust position as well.

        setScale(newScale);

        // If zooming out to 1, reset position
        if (newScale === 1) {
            setPosition({ x: 0, y: 0 });
        }
    };

    const resetZoom = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full select-none overflow-hidden group ${className} ${enableZoom ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            onWheel={handleWheel}
            onMouseDown={(e) => {
                // If clicking the slider handle, don't pan
                if ((e.target as HTMLElement).closest('.slider-handle')) return;
                handlePanStart(e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
                if ((e.target as HTMLElement).closest('.slider-handle')) return;
                handlePanStart(e.touches[0].clientX, e.touches[0].clientY);
            }}
        >
            {/* Optimized Image (Background - "After") */}
            <div
                className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none"
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transition: isPanning ? 'none' : 'transform 0.1s ease-out'
                }}
            >
                <img
                    src={optimizedUrl}
                    alt="Optimized"
                    className="max-w-full max-h-full object-contain"
                    draggable={false}
                />
            </div>

            {/* Label After */}
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white text-xs font-medium px-2 py-1 rounded pointer-events-none z-10">
                After
            </div>

            {/* Original Image (Foreground - "Before") - Clipped */}
            <div
                className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
                <div
                    className="absolute inset-0 w-full h-full flex items-center justify-center"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transition: isPanning ? 'none' : 'transform 0.1s ease-out'
                    }}
                >
                    <img
                        src={originalUrl}
                        alt="Original"
                        className="max-w-full max-h-full object-contain"
                        draggable={false}
                    />
                </div>

                {/* Label Before */}
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white text-xs font-medium px-2 py-1 rounded z-10">
                    Before
                </div>
            </div>

            {/* Slider Handle */}
            <div
                className="slider-handle absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)] hover:bg-primary/50 transition-colors"
                style={{ left: `${sliderPosition}%` }}
                onMouseDown={(e) => {
                    e.stopPropagation(); // Prevent pan start
                    setIsDraggingSlider(true);
                    handleSliderMove(e.clientX);
                }}
                onTouchStart={(e) => {
                    e.stopPropagation();
                    setIsDraggingSlider(true);
                    handleSliderMove(e.touches[0].clientX);
                }}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-primary hover:scale-110 transition-transform">
                    <ChevronsLeftRight className="w-4 h-4" />
                </div>
            </div>

            {/* Zoom Controls */}
            {enableZoom && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-md p-1.5 rounded-full z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                        onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(1, s - 0.5)); }}
                    >
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-white text-xs font-medium w-12 text-center select-none">
                        {Math.round(scale * 100)}%
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                        onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(8, s + 0.5)); }}
                    >
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-4 bg-white/20 mx-1" />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                        onClick={(e) => { e.stopPropagation(); resetZoom(); }}
                        title="Reset Zoom"
                    >
                        <RotateCcw className="w-3 h-3" />
                    </Button>
                </div>
            )}
        </div>
    );
}
