import { useState, useReducer, useRef, useEffect, useCallback } from 'react';
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

type ZoomPanState = {
    scale: number;
    position: { x: number; y: number };
    isPanning: boolean;
    startPan: { x: number; y: number };
};

type ZoomPanAction =
    | { type: 'PAN_START'; clientX: number; clientY: number; positionX: number; positionY: number }
    | { type: 'PAN_MOVE'; clientX: number; clientY: number }
    | { type: 'PAN_END' }
    | { type: 'ZOOM'; scale: number }
    | { type: 'RESET' };

const initialZoomPanState: ZoomPanState = {
    scale: 1,
    position: { x: 0, y: 0 },
    isPanning: false,
    startPan: { x: 0, y: 0 },
};

function zoomPanReducer(state: ZoomPanState, action: ZoomPanAction): ZoomPanState {
    switch (action.type) {
        case 'PAN_START':
            return {
                ...state,
                isPanning: true,
                startPan: {
                    x: action.clientX - action.positionX,
                    y: action.clientY - action.positionY,
                },
            };
        case 'PAN_MOVE':
            return {
                ...state,
                position: {
                    x: action.clientX - state.startPan.x,
                    y: action.clientY - state.startPan.y,
                },
            };
        case 'PAN_END':
            return {
                ...state,
                isPanning: false,
            };
        case 'ZOOM':
            return {
                ...state,
                scale: action.scale,
                position: action.scale === 1 ? { x: 0, y: 0 } : state.position,
            };
        case 'RESET':
            return {
                ...state,
                scale: 1,
                position: { x: 0, y: 0 },
                isPanning: false,
            };
        default:
            return state;
    }
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
    const [zoomPan, dispatch] = useReducer(zoomPanReducer, initialZoomPanState);
    const { scale, position, isPanning } = zoomPan;

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
        dispatch({ type: 'PAN_START', clientX, clientY, positionX: position.x, positionY: position.y });
    };

    const handlePanMove = useCallback((clientX: number, clientY: number) => {
        if (!enableZoom) return;
        dispatch({ type: 'PAN_MOVE', clientX, clientY });
    }, [enableZoom]);

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
            dispatch({ type: 'PAN_END' });
        };

        if (isDraggingSlider || (isPanning && enableZoom)) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleUp);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
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

        dispatch({ type: 'ZOOM', scale: newScale });
    };

    const resetZoom = () => {
        dispatch({ type: 'RESET' });
    };

    return (
        <div
            ref={containerRef}
            role="application"
            aria-label="Image comparison slider"
            tabIndex={0}
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
                    alt="Imagem optimizada"
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
                        alt="Imagem original"
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
                role="slider"
                tabIndex={0}
                aria-label="Comparison slider"
                aria-valuenow={Math.round(sliderPosition)}
                aria-valuemin={0}
                aria-valuemax={100}
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
                onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') { e.preventDefault(); setSliderPosition(p => Math.max(0, p - 1)); }
                    else if (e.key === 'ArrowRight') { e.preventDefault(); setSliderPosition(p => Math.min(100, p + 1)); }
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
                        onClick={(e) => { e.stopPropagation(); dispatch({ type: 'ZOOM', scale: Math.max(1, scale - 0.5) }); }}
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
                        onClick={(e) => { e.stopPropagation(); dispatch({ type: 'ZOOM', scale: Math.min(8, scale + 0.5) }); }}
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
