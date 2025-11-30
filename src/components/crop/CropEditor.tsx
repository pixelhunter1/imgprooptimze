import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, RotateCcw, Move, Crop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  type CropArea,
  type SizePreset,
  SIZE_PRESETS,
} from '@/types/crop';

interface CropEditorProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName: string;
  onCropComplete: (cropArea: CropArea | null, croppedImageUrl: string, outputSize?: { width: number; height: number }) => void;
  initialCropArea?: CropArea | null;
}

export default function CropEditor({
  isOpen,
  onClose,
  imageUrl,
  imageName: _imageName,
  onCropComplete,
  initialCropArea,
}: CropEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Simple state
  const [selectedSize, setSelectedSize] = useState<SizePreset | null>(null);
  const [cropArea, setCropArea] = useState<CropArea | null>(initialCropArea || null);

  // Interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Mode: 'crop' = move crop area, 'image' = move/scale image within fixed crop
  const [dragMode, setDragMode] = useState<'crop' | 'image'>('crop');

  // Image transform state (for 'image' mode) - x, y are image position, scale is zoom
  const [imageTransform, setImageTransform] = useState({ x: 0, y: 0, scale: 1 });

  // Which corner is being resized in image mode (null = dragging, 'nw'/'ne'/'sw'/'se' = resizing)
  const [imageResizeHandle, setImageResizeHandle] = useState<string | null>(null);

  // Snap guides state - which guides are currently active
  const [activeGuides, setActiveGuides] = useState<{
    centerX: boolean;
    centerY: boolean;
    left: boolean;
    right: boolean;
    top: boolean;
    bottom: boolean;
  }>({ centerX: false, centerY: false, left: false, right: false, top: false, bottom: false });

  // Image state
  const [imageLoaded, setImageLoaded] = useState(false);
  const [displayScale, setDisplayScale] = useState(1);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Snap threshold in pixels
  const SNAP_THRESHOLD = 8;

  // Get current locked ratio (from selected size preset)
  const lockedRatio = useMemo(() => {
    if (selectedSize) {
      return selectedSize.width / selectedSize.height;
    }
    return null;
  }, [selectedSize]);

  // Load image
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    setImageLoaded(false);
    const img = new Image();

    if (!imageUrl.startsWith('blob:') && !imageUrl.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      imageRef.current = img;
      setImageSize({ width: img.width, height: img.height });
      setImageLoaded(true);

      const container = containerRef.current;
      if (container) {
        const maxWidth = container.clientWidth - 32;
        const maxHeight = container.clientHeight - 32;
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        setDisplayScale(scale);

        // Initialize crop area to 80% of image
        if (!initialCropArea) {
          const cropW = img.width * 0.8;
          const cropH = img.height * 0.8;
          setCropArea({
            x: (img.width - cropW) / 2,
            y: (img.height - cropH) / 2,
            width: cropW,
            height: cropH,
          });
        }
      }
    };

    img.onerror = () => setImageLoaded(false);
    img.src = imageUrl;

    return () => {
      imageRef.current = null;
      setImageLoaded(false);
    };
  }, [isOpen, imageUrl, initialCropArea]);

  // Handle size preset selection
  const handleSizeSelect = useCallback((size: SizePreset) => {
    setSelectedSize(size);

    if (!imageRef.current || !containerRef.current) return;

    const img = imageRef.current;
    const container = containerRef.current;
    const ratio = size.width / size.height;

    let cropW, cropH;

    if (img.width / img.height > ratio) {
      cropH = Math.min(size.height, img.height);
      cropW = cropH * ratio;
    } else {
      cropW = Math.min(size.width, img.width);
      cropH = cropW / ratio;
    }

    if (cropW > img.width) {
      cropW = img.width;
      cropH = cropW / ratio;
    }
    if (cropH > img.height) {
      cropH = img.height;
      cropW = cropH * ratio;
    }

    const x = (img.width - cropW) / 2;
    const y = (img.height - cropH) / 2;

    // Recalculate displayScale to ensure the crop fits in the visible area
    const maxWidth = container.clientWidth - 32;
    const maxHeight = container.clientHeight - 32;

    // We need to fit the entire image in the container, considering the crop might be anywhere
    const newScale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
    setDisplayScale(newScale);

    setCropArea({ x, y, width: cropW, height: cropH });
  }, []);

  // Calculate image bounds in image mode (for hit testing and drawing)
  const getImageBounds = useCallback(() => {
    if (!imageRef.current || !cropArea) return null;
    const img = imageRef.current;
    const scaledW = img.width * imageTransform.scale;
    const scaledH = img.height * imageTransform.scale;
    return {
      x: imageTransform.x,
      y: imageTransform.y,
      width: scaledW,
      height: scaledH,
    };
  }, [imageTransform, cropArea]);

  // Draw canvas
  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !imageRef.current || !cropArea) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;

    if (dragMode === 'image') {
      // Image mode: FIXED canvas size, crop centered, image moves behind
      const container = containerRef.current;
      if (!container) return;

      // Calculate canvas size based on container
      const maxCanvasW = container.clientWidth - 32;
      const maxCanvasH = container.clientHeight - 32;

      // Calculate the scale needed to fit the crop area in the canvas with some padding
      const padding = 100; // Extra space around crop for image manipulation
      const scaleToFitCrop = Math.min(
        (maxCanvasW - padding) / cropArea.width,
        (maxCanvasH - padding) / cropArea.height,
        1 // Don't scale up
      );

      // Canvas size should accommodate the crop at the calculated scale
      const cropW = cropArea.width * scaleToFitCrop;
      const cropH = cropArea.height * scaleToFitCrop;

      // Canvas is larger than crop to allow image manipulation
      const canvasW = Math.min(maxCanvasW, cropW + padding);
      const canvasH = Math.min(maxCanvasH, cropH + padding);

      canvas.width = canvasW;
      canvas.height = canvasH;

      // Use the calculated scale for this render (temporarily override displayScale for image mode)
      const effectiveScale = scaleToFitCrop;
      const cropX = (canvasW - cropW) / 2;
      const cropY = (canvasH - cropH) / 2;

      // Draw dark background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Calculate image position relative to centered crop
      // imageTransform.x/y are relative to crop origin (0,0)
      const imgW = img.width * imageTransform.scale * effectiveScale;
      const imgH = img.height * imageTransform.scale * effectiveScale;
      const imgX = cropX + imageTransform.x * effectiveScale;
      const imgY = cropY + imageTransform.y * effectiveScale;

      // Draw the image
      ctx.drawImage(img, imgX, imgY, imgW, imgH);

      // Draw image border (blue dotted)
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(imgX, imgY, imgW, imgH);
      ctx.setLineDash([]);

      // Draw resize handles on image corners (blue squares)
      const handleSize = 14;
      ctx.fillStyle = '#3b82f6';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      const corners = [
        [imgX, imgY], // nw
        [imgX + imgW, imgY], // ne
        [imgX, imgY + imgH], // sw
        [imgX + imgW, imgY + imgH], // se
      ];
      corners.forEach(([cx, cy]) => {
        ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
      });

      // Draw semi-transparent overlay OVER the image, except inside crop area
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      // Top
      ctx.fillRect(0, 0, canvasW, cropY);
      // Bottom
      ctx.fillRect(0, cropY + cropH, canvasW, canvasH - cropY - cropH);
      // Left
      ctx.fillRect(0, cropY, cropX, cropH);
      // Right
      ctx.fillRect(cropX + cropW, cropY, canvasW - cropX - cropW, cropH);

      // Draw crop border (green, fixed in center)
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.strokeRect(cropX, cropY, cropW, cropH);

      // Draw corner highlights on crop
      const cornerLen = 20;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(cropX, cropY + cornerLen);
      ctx.lineTo(cropX, cropY);
      ctx.lineTo(cropX + cornerLen, cropY);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(cropX + cropW - cornerLen, cropY);
      ctx.lineTo(cropX + cropW, cropY);
      ctx.lineTo(cropX + cropW, cropY + cornerLen);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(cropX, cropY + cropH - cornerLen);
      ctx.lineTo(cropX, cropY + cropH);
      ctx.lineTo(cropX + cornerLen, cropY + cropH);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(cropX + cropW - cornerLen, cropY + cropH);
      ctx.lineTo(cropX + cropW, cropY + cropH);
      ctx.lineTo(cropX + cropW, cropY + cropH - cornerLen);
      ctx.stroke();

      // Draw grid inside crop
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cropX + (cropW / 3) * i, cropY);
        ctx.lineTo(cropX + (cropW / 3) * i, cropY + cropH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cropX, cropY + (cropH / 3) * i);
        ctx.lineTo(cropX + cropW, cropY + (cropH / 3) * i);
        ctx.stroke();
      }

      // Draw snap guide lines when active
      ctx.strokeStyle = '#f59e0b'; // Amber/yellow color for guides
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);

      // Center X guide (vertical line through center)
      if (activeGuides.centerX) {
        ctx.beginPath();
        ctx.moveTo(canvasW / 2, 0);
        ctx.lineTo(canvasW / 2, canvasH);
        ctx.stroke();
      }

      // Center Y guide (horizontal line through center)
      if (activeGuides.centerY) {
        ctx.beginPath();
        ctx.moveTo(0, canvasH / 2);
        ctx.lineTo(canvasW, canvasH / 2);
        ctx.stroke();
      }

      // Edge guides
      if (activeGuides.left) {
        ctx.beginPath();
        ctx.moveTo(cropX, 0);
        ctx.lineTo(cropX, canvasH);
        ctx.stroke();
      }

      if (activeGuides.right) {
        ctx.beginPath();
        ctx.moveTo(cropX + cropW, 0);
        ctx.lineTo(cropX + cropW, canvasH);
        ctx.stroke();
      }

      if (activeGuides.top) {
        ctx.beginPath();
        ctx.moveTo(0, cropY);
        ctx.lineTo(canvasW, cropY);
        ctx.stroke();
      }

      if (activeGuides.bottom) {
        ctx.beginPath();
        ctx.moveTo(0, cropY + cropH);
        ctx.lineTo(canvasW, cropY + cropH);
        ctx.stroke();
      }

      ctx.setLineDash([]);

      // Store crop position and scale for hit testing
      canvas.dataset.cropX = String(cropX);
      canvas.dataset.cropY = String(cropY);
      canvas.dataset.effectiveScale = String(effectiveScale);
    } else {
      // Crop mode: normal behavior
      const dw = img.width * displayScale;
      const dh = img.height * displayScale;

      canvas.width = dw;
      canvas.height = dh;

      ctx.drawImage(img, 0, 0, dw, dh);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, dw, dh);

      const sc = {
        x: cropArea.x * displayScale,
        y: cropArea.y * displayScale,
        w: cropArea.width * displayScale,
        h: cropArea.height * displayScale,
      };

      ctx.clearRect(sc.x, sc.y, sc.w, sc.h);
      ctx.drawImage(img, cropArea.x, cropArea.y, cropArea.width, cropArea.height, sc.x, sc.y, sc.w, sc.h);

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(sc.x, sc.y, sc.w, sc.h);

      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(sc.x + (sc.w / 3) * i, sc.y);
        ctx.lineTo(sc.x + (sc.w / 3) * i, sc.y + sc.h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sc.x, sc.y + (sc.h / 3) * i);
        ctx.lineTo(sc.x + sc.w, sc.y + (sc.h / 3) * i);
        ctx.stroke();
      }

      ctx.fillStyle = '#10b981';
      const hs = 8;
      [[sc.x, sc.y], [sc.x + sc.w, sc.y], [sc.x, sc.y + sc.h], [sc.x + sc.w, sc.y + sc.h]].forEach(([hx, hy]) => {
        ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
      });
    }
  }, [cropArea, imageLoaded, displayScale, dragMode, imageTransform, activeGuides]);

  // Mouse handlers
  const getCoords = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!canvasRef.current || !imageRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Get mouse position relative to canvas
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Account for any CSS scaling of the canvas (when max-w-full/max-h-full causes the canvas to be rendered smaller than its internal size)
    const cssScaleX = rect.width / canvas.width;
    const cssScaleY = rect.height / canvas.height;

    // Convert to canvas coordinates, then to image coordinates
    const canvasX = mouseX / cssScaleX;
    const canvasY = mouseY / cssScaleY;

    // In crop mode, canvas coordinates = image coordinates * displayScale
    // So divide by displayScale to get image coordinates
    return {
      x: canvasX / displayScale,
      y: canvasY / displayScale,
    };
  }, [displayScale]);

  const getHandle = useCallback((x: number, y: number) => {
    if (!cropArea) return null;
    const t = 12 / displayScale;
    const handles: Record<string, [number, number]> = {
      nw: [cropArea.x, cropArea.y],
      ne: [cropArea.x + cropArea.width, cropArea.y],
      sw: [cropArea.x, cropArea.y + cropArea.height],
      se: [cropArea.x + cropArea.width, cropArea.y + cropArea.height],
    };
    for (const [h, [hx, hy]] of Object.entries(handles)) {
      if (Math.abs(x - hx) < t && Math.abs(y - hy) < t) return h;
    }
    return null;
  }, [cropArea, displayScale]);

  const isInside = useCallback((x: number, y: number) => {
    if (!cropArea) return false;
    return x >= cropArea.x && x <= cropArea.x + cropArea.width && y >= cropArea.y && y <= cropArea.y + cropArea.height;
  }, [cropArea]);

  // Get image handle in image mode
  const getImageHandle = useCallback((mouseX: number, mouseY: number) => {
    if (!canvasRef.current || !cropArea || !imageRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Get crop position and effective scale from dataset
    const cropCanvasX = parseFloat(canvas.dataset.cropX || '0');
    const cropCanvasY = parseFloat(canvas.dataset.cropY || '0');
    const effectiveScale = parseFloat(canvas.dataset.effectiveScale || String(displayScale));

    // Mouse position on canvas (account for CSS scaling)
    const cssScaleX = rect.width / canvas.width;
    const cssScaleY = rect.height / canvas.height;
    const canvasMouseX = (mouseX - rect.left) / cssScaleX;
    const canvasMouseY = (mouseY - rect.top) / cssScaleY;

    // Image position on canvas
    const img = imageRef.current;
    const imgW = img.width * imageTransform.scale * effectiveScale;
    const imgH = img.height * imageTransform.scale * effectiveScale;
    const imgX = cropCanvasX + imageTransform.x * effectiveScale;
    const imgY = cropCanvasY + imageTransform.y * effectiveScale;

    const t = 18; // Tolerance for handle hit
    const handles: Record<string, [number, number]> = {
      nw: [imgX, imgY],
      ne: [imgX + imgW, imgY],
      sw: [imgX, imgY + imgH],
      se: [imgX + imgW, imgY + imgH],
    };

    for (const [h, [hx, hy]] of Object.entries(handles)) {
      if (Math.abs(canvasMouseX - hx) < t && Math.abs(canvasMouseY - hy) < t) return h;
    }
    return null;
  }, [cropArea, displayScale, imageTransform]);

  // Check if mouse is inside image bounds
  const isInsideImage = useCallback((mouseX: number, mouseY: number) => {
    if (!canvasRef.current || !cropArea || !imageRef.current) return false;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const cropCanvasX = parseFloat(canvas.dataset.cropX || '0');
    const cropCanvasY = parseFloat(canvas.dataset.cropY || '0');
    const effectiveScale = parseFloat(canvas.dataset.effectiveScale || String(displayScale));

    // Account for CSS scaling
    const cssScaleX = rect.width / canvas.width;
    const cssScaleY = rect.height / canvas.height;
    const canvasMouseX = (mouseX - rect.left) / cssScaleX;
    const canvasMouseY = (mouseY - rect.top) / cssScaleY;

    const img = imageRef.current;
    const imgW = img.width * imageTransform.scale * effectiveScale;
    const imgH = img.height * imageTransform.scale * effectiveScale;
    const imgX = cropCanvasX + imageTransform.x * effectiveScale;
    const imgY = cropCanvasY + imageTransform.y * effectiveScale;

    return canvasMouseX >= imgX && canvasMouseX <= imgX + imgW &&
           canvasMouseY >= imgY && canvasMouseY <= imgY + imgH;
  }, [cropArea, displayScale, imageTransform]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const { x, y } = getCoords(e);

    if (dragMode === 'image') {
      // Check for corner handle first (resize)
      const handle = getImageHandle(e.clientX, e.clientY);
      if (handle) {
        setIsResizing(true);
        setImageResizeHandle(handle);
        setDragStart({ x: e.clientX, y: e.clientY });
      } else if (isInsideImage(e.clientX, e.clientY)) {
        // Dragging the image
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    } else {
      const handle = getHandle(x, y);
      if (handle) {
        setIsResizing(true);
        setResizeHandle(handle);
        setDragStart({ x, y });
      } else if (isInside(x, y)) {
        setIsDragging(true);
        setDragStart({ x: x - (cropArea?.x || 0), y: y - (cropArea?.y || 0) });
      }
    }
  }, [getCoords, getHandle, isInside, cropArea, dragMode, getImageHandle, isInsideImage]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!cropArea || !imageRef.current) return;

    if (dragMode === 'image') {
      // Get effective scale from canvas dataset (set during render)
      const canvas = canvasRef.current;
      const effectiveScale = canvas ? parseFloat(canvas.dataset.effectiveScale || String(displayScale)) : displayScale;

      const dx = (e.clientX - dragStart.x) / effectiveScale;
      const dy = (e.clientY - dragStart.y) / effectiveScale;

      if (isResizing && imageResizeHandle) {
        // Resize the image by changing scale
        const img = imageRef.current;
        const bounds = getImageBounds();
        if (!bounds) return;

        // Calculate new scale based on which corner is being dragged
        let newScale = imageTransform.scale;
        let newX = imageTransform.x;
        let newY = imageTransform.y;

        // Get the fixed corner (opposite to the one being dragged)
        const currentW = img.width * imageTransform.scale;
        const currentH = img.height * imageTransform.scale;

        if (imageResizeHandle === 'se') {
          // Fixed corner is NW, resize from SE
          const newW = currentW + dx;
          const newH = currentH + dy;
          // Maintain aspect ratio based on larger dimension change
          const scaleX = newW / img.width;
          const scaleY = newH / img.height;
          newScale = Math.max(0.1, Math.min(scaleX, scaleY));
        } else if (imageResizeHandle === 'sw') {
          // Fixed corner is NE
          const newW = currentW - dx;
          const newH = currentH + dy;
          const scaleX = newW / img.width;
          const scaleY = newH / img.height;
          newScale = Math.max(0.1, Math.min(scaleX, scaleY));
          // Adjust X position to keep NE corner fixed
          newX = imageTransform.x + (currentW - img.width * newScale);
        } else if (imageResizeHandle === 'ne') {
          // Fixed corner is SW
          const newW = currentW + dx;
          const newH = currentH - dy;
          const scaleX = newW / img.width;
          const scaleY = newH / img.height;
          newScale = Math.max(0.1, Math.min(scaleX, scaleY));
          // Adjust Y position to keep SW corner fixed
          newY = imageTransform.y + (currentH - img.height * newScale);
        } else if (imageResizeHandle === 'nw') {
          // Fixed corner is SE
          const newW = currentW - dx;
          const newH = currentH - dy;
          const scaleX = newW / img.width;
          const scaleY = newH / img.height;
          newScale = Math.max(0.1, Math.min(scaleX, scaleY));
          // Adjust both X and Y to keep SE corner fixed
          newX = imageTransform.x + (currentW - img.width * newScale);
          newY = imageTransform.y + (currentH - img.height * newScale);
        }

        setImageTransform({ x: newX, y: newY, scale: newScale });
        setDragStart({ x: e.clientX, y: e.clientY });
        return;
      }

      if (isDragging) {
        // Image mode: move the image with snap guides
        const img = imageRef.current;
        const imgW = img.width * imageTransform.scale;
        const imgH = img.height * imageTransform.scale;

        let newX = imageTransform.x + dx;
        let newY = imageTransform.y + dy;

        // Calculate snap positions
        // Image center relative to crop center (crop is at 0,0)
        const imgCenterX = newX + imgW / 2;
        const imgCenterY = newY + imgH / 2;
        const cropCenterX = cropArea.width / 2;
        const cropCenterY = cropArea.height / 2;

        // Image edges relative to crop edges
        const imgLeft = newX;
        const imgRight = newX + imgW;
        const imgTop = newY;
        const imgBottom = newY + imgH;

        const guides = {
          centerX: false,
          centerY: false,
          left: false,
          right: false,
          top: false,
          bottom: false,
        };

        // Snap to center X
        if (Math.abs(imgCenterX - cropCenterX) < SNAP_THRESHOLD) {
          newX = cropCenterX - imgW / 2;
          guides.centerX = true;
        }

        // Snap to center Y
        if (Math.abs(imgCenterY - cropCenterY) < SNAP_THRESHOLD) {
          newY = cropCenterY - imgH / 2;
          guides.centerY = true;
        }

        // Snap left edge of image to left edge of crop
        if (Math.abs(imgLeft) < SNAP_THRESHOLD) {
          newX = 0;
          guides.left = true;
        }

        // Snap right edge of image to right edge of crop
        if (Math.abs(imgRight - cropArea.width) < SNAP_THRESHOLD) {
          newX = cropArea.width - imgW;
          guides.right = true;
        }

        // Snap top edge of image to top edge of crop
        if (Math.abs(imgTop) < SNAP_THRESHOLD) {
          newY = 0;
          guides.top = true;
        }

        // Snap bottom edge of image to bottom edge of crop
        if (Math.abs(imgBottom - cropArea.height) < SNAP_THRESHOLD) {
          newY = cropArea.height - imgH;
          guides.bottom = true;
        }

        setActiveGuides(guides);
        setImageTransform(prev => ({
          ...prev,
          x: newX,
          y: newY,
        }));
        setDragStart({ x: e.clientX, y: e.clientY });
        return;
      }
      return;
    }

    const { x, y } = getCoords(e);
    const img = imageRef.current;

    if (isDragging) {
      // Move Crop: drag the crop window
      let nx = x - dragStart.x;
      let ny = y - dragStart.y;

      // Clamp to image bounds
      nx = Math.max(0, Math.min(nx, img.width - cropArea.width));
      ny = Math.max(0, Math.min(ny, img.height - cropArea.height));

      setCropArea({ ...cropArea, x: nx, y: ny });
    } else if (isResizing && resizeHandle) {
      let nc = { ...cropArea };
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;

      if (resizeHandle.includes('w')) {
        const nw = Math.max(50, cropArea.width - dx);
        const nx = cropArea.x + cropArea.width - nw;
        if (nx >= 0) { nc.x = nx; nc.width = nw; }
      }
      if (resizeHandle.includes('e')) {
        const nw = Math.max(50, cropArea.width + dx);
        if (cropArea.x + nw <= img.width) nc.width = nw;
      }
      if (resizeHandle.includes('n')) {
        const nh = Math.max(50, cropArea.height - dy);
        const ny = cropArea.y + cropArea.height - nh;
        if (ny >= 0) { nc.y = ny; nc.height = nh; }
      }
      if (resizeHandle.includes('s')) {
        const nh = Math.max(50, cropArea.height + dy);
        if (cropArea.y + nh <= img.height) nc.height = nh;
      }

      if (lockedRatio) {
        if (resizeHandle.includes('e') || resizeHandle.includes('w')) {
          nc.height = nc.width / lockedRatio;
        } else {
          nc.width = nc.height * lockedRatio;
        }
        if (nc.x + nc.width > img.width) {
          nc.width = img.width - nc.x;
          nc.height = nc.width / lockedRatio;
        }
        if (nc.y + nc.height > img.height) {
          nc.height = img.height - nc.y;
          nc.width = nc.height * lockedRatio;
        }
      }

      setDragStart({ x, y });
      setCropArea(nc);
    }
  }, [isDragging, isResizing, resizeHandle, cropArea, dragStart, lockedRatio, dragMode, getCoords, imageResizeHandle, imageTransform, displayScale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    setImageResizeHandle(null);
    // Clear guides after a short delay so user sees the final snap
    setTimeout(() => {
      setActiveGuides({ centerX: false, centerY: false, left: false, right: false, top: false, bottom: false });
    }, 300);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Reset
  const handleReset = useCallback(() => {
    if (!imageRef.current) return;
    const img = imageRef.current;
    const w = img.width * 0.8;
    const h = img.height * 0.8;
    setCropArea({ x: (img.width - w) / 2, y: (img.height - h) / 2, width: w, height: h });
    setSelectedSize(null);
    setDragMode('crop');
  }, []);

  // Apply
  const handleApply = useCallback(() => {
    if (!cropArea || !imageRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let outW = Math.round(cropArea.width);
    let outH = Math.round(cropArea.height);

    if (selectedSize) {
      outW = Math.min(selectedSize.width, Math.round(cropArea.width));
      outH = Math.min(selectedSize.height, Math.round(cropArea.height));
    }

    canvas.width = outW;
    canvas.height = outH;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (dragMode === 'image') {
      // Image mode: the crop area is at (0,0) and image is transformed relative to it
      const img = imageRef.current;
      const scaleRatio = outW / cropArea.width; // Scale to output size

      // Fill with background color
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, outW, outH);

      // Draw the image with its transform, scaled to output size
      const drawX = imageTransform.x * scaleRatio;
      const drawY = imageTransform.y * scaleRatio;
      const drawW = img.width * imageTransform.scale * scaleRatio;
      const drawH = img.height * imageTransform.scale * scaleRatio;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } else {
      // Crop mode: standard crop
      ctx.drawImage(
        imageRef.current,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, outW, outH
      );
    }

    const url = canvas.toDataURL('image/png', 1.0);
    onCropComplete(dragMode === 'crop' ? cropArea : null, url, { width: outW, height: outH });
    onClose();
  }, [cropArea, selectedSize, dragMode, imageTransform, onCropComplete, onClose]);

  // Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const availableSizes = SIZE_PRESETS.filter(() => imageSize.width >= 100 && imageSize.height >= 100);
  const socialSizes = availableSizes.filter(s => s.category === 'social');
  const videoSizes = availableSizes.filter(s => s.category === 'video');
  const webSizes = availableSizes.filter(s => s.category === 'web');
  const ecommerceSizes = availableSizes.filter(s => s.category === 'ecommerce');

  return createPortal(
    <div className="fixed inset-0 z-50 flex bg-neutral-950">
      {/* Left Sidebar */}
      <div className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-neutral-800">
          <h3 className="text-white text-sm font-medium">Settings</h3>
        </div>

        {/* Sidebar Content - Scrollable with minimal scrollbar */}
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
          {/* Drag Mode Toggle */}
          <div className="p-4 border-b border-neutral-800">
            <h4 className="text-neutral-400 text-xs uppercase tracking-wide mb-3">Edit Mode</h4>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  setDragMode('image');
                  // Initialize image transform to center the image in crop
                  if (cropArea && imageRef.current) {
                    const img = imageRef.current;
                    // Start with image filling the crop area
                    const scaleToFit = Math.max(
                      cropArea.width / img.width,
                      cropArea.height / img.height
                    );
                    setImageTransform({
                      x: (cropArea.width - img.width * scaleToFit) / 2,
                      y: (cropArea.height - img.height * scaleToFit) / 2,
                      scale: scaleToFit,
                    });
                  }
                }}
                className={`flex items-center justify-center gap-1.5 px-2 py-2 text-xs rounded ${
                  dragMode === 'image'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                Fit Image
              </button>
              <button
                onClick={() => setDragMode('crop')}
                className={`flex items-center justify-center gap-1.5 px-2 py-2 text-xs rounded ${
                  dragMode === 'crop'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                <Crop className="w-3.5 h-3.5" />
                Move Crop
              </button>
            </div>
            <p className="text-neutral-500 text-[10px] mt-2">
              {dragMode === 'image'
                ? 'Drag image to position. Resize from corners.'
                : 'Drag the crop area over the image. Resize from corners.'}
            </p>

            {/* Quick actions and zoom slider for image mode */}
            {dragMode === 'image' && (
              <>
                {/* Quick action buttons */}
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      // Center the image in the crop
                      if (!imageRef.current || !cropArea) return;
                      const img = imageRef.current;
                      const imgW = img.width * imageTransform.scale;
                      const imgH = img.height * imageTransform.scale;
                      setImageTransform(prev => ({
                        ...prev,
                        x: (cropArea.width - imgW) / 2,
                        y: (cropArea.height - imgH) / 2,
                      }));
                    }}
                    className="px-2 py-1.5 text-[10px] rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  >
                    Center
                  </button>
                  <button
                    onClick={() => {
                      // Fill: scale image to cover the crop area completely
                      if (!imageRef.current || !cropArea) return;
                      const img = imageRef.current;
                      const scaleToFill = Math.max(
                        cropArea.width / img.width,
                        cropArea.height / img.height
                      );
                      const imgW = img.width * scaleToFill;
                      const imgH = img.height * scaleToFill;
                      setImageTransform({
                        x: (cropArea.width - imgW) / 2,
                        y: (cropArea.height - imgH) / 2,
                        scale: scaleToFill,
                      });
                    }}
                    className="px-2 py-1.5 text-[10px] rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  >
                    Fill
                  </button>
                  <button
                    onClick={() => {
                      // Fit: scale image to fit entirely inside the crop
                      if (!imageRef.current || !cropArea) return;
                      const img = imageRef.current;
                      const scaleToFit = Math.min(
                        cropArea.width / img.width,
                        cropArea.height / img.height
                      );
                      const imgW = img.width * scaleToFit;
                      const imgH = img.height * scaleToFit;
                      setImageTransform({
                        x: (cropArea.width - imgW) / 2,
                        y: (cropArea.height - imgH) / 2,
                        scale: scaleToFit,
                      });
                    }}
                    className="px-2 py-1.5 text-[10px] rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  >
                    Fit
                  </button>
                  <button
                    onClick={() => {
                      // Reset to original size centered
                      if (!imageRef.current || !cropArea) return;
                      const img = imageRef.current;
                      setImageTransform({
                        x: (cropArea.width - img.width) / 2,
                        y: (cropArea.height - img.height) / 2,
                        scale: 1,
                      });
                    }}
                    className="px-2 py-1.5 text-[10px] rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  >
                    100%
                  </button>
                </div>

                {/* Zoom slider */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-neutral-500 mb-1">
                    <span>Zoom</span>
                    <span>{Math.round(imageTransform.scale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.01"
                    value={imageTransform.scale}
                    onChange={(e) => {
                      const newScale = parseFloat(e.target.value);
                      setImageTransform(prev => {
                        // Keep the image centered when scaling
                        const oldCenterX = prev.x + (imageRef.current?.width || 0) * prev.scale / 2;
                        const oldCenterY = prev.y + (imageRef.current?.height || 0) * prev.scale / 2;
                        const newCenterX = (imageRef.current?.width || 0) * newScale / 2;
                        const newCenterY = (imageRef.current?.height || 0) * newScale / 2;
                        return {
                          x: oldCenterX - newCenterX,
                          y: oldCenterY - newCenterY,
                          scale: newScale,
                        };
                      });
                    }}
                    className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </>
            )}
          </div>

          {/* Size Presets - E-commerce first */}
          {ecommerceSizes.length > 0 && (
            <div className="p-4 border-b border-neutral-800">
              <h4 className="text-neutral-400 text-xs uppercase tracking-wide mb-3">E-commerce</h4>
              <div className="space-y-1">
                {ecommerceSizes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSizeSelect(s)}
                    className={`w-full text-left px-3 py-2 text-xs rounded flex justify-between items-center ${
                      selectedSize?.id === s.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    <span>{s.label}</span>
                    <span className="opacity-60">{s.width}×{s.height}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {socialSizes.length > 0 && (
            <div className="p-4 border-b border-neutral-800">
              <h4 className="text-neutral-400 text-xs uppercase tracking-wide mb-3">Social Media</h4>
              <div className="space-y-1">
                {socialSizes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSizeSelect(s)}
                    className={`w-full text-left px-3 py-2 text-xs rounded flex justify-between items-center ${
                      selectedSize?.id === s.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    <span>{s.label}</span>
                    <span className="opacity-60">{s.width}×{s.height}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {videoSizes.length > 0 && (
            <div className="p-4 border-b border-neutral-800">
              <h4 className="text-neutral-400 text-xs uppercase tracking-wide mb-3">Video</h4>
              <div className="space-y-1">
                {videoSizes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSizeSelect(s)}
                    className={`w-full text-left px-3 py-2 text-xs rounded flex justify-between items-center ${
                      selectedSize?.id === s.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    <span>{s.label}</span>
                    <span className="opacity-60">{s.width}×{s.height}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {webSizes.length > 0 && (
            <div className="p-4 border-b border-neutral-800">
              <h4 className="text-neutral-400 text-xs uppercase tracking-wide mb-3">Web</h4>
              <div className="space-y-1">
                {webSizes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSizeSelect(s)}
                    className={`w-full text-left px-3 py-2 text-xs rounded flex justify-between items-center ${
                      selectedSize?.id === s.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    <span>{s.label}</span>
                    <span className="opacity-60">{s.width}×{s.height}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer - Actions */}
        <div className="p-4 border-t border-neutral-800 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="w-full text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleApply}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            <Check className="w-4 h-4 mr-2" />
            Apply Crop
          </Button>
        </div>
      </div>

      {/* Main Canvas Area - Takes maximum space */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Minimal top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <h2 className="text-white text-sm font-medium">Crop</h2>
            {imageSize.width > 0 && (
              <span className="text-neutral-500 text-xs">
                {imageSize.width} × {imageSize.height}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 flex items-center justify-center p-4 min-h-0 overflow-auto">
          {imageLoaded ? (
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              className="max-w-full max-h-full"
              style={{
                cursor: isDragging
                  ? 'grabbing'
                  : isResizing
                  ? (imageResizeHandle === 'nw' || imageResizeHandle === 'se' ? 'nwse-resize' :
                     imageResizeHandle === 'ne' || imageResizeHandle === 'sw' ? 'nesw-resize' : 'nwse-resize')
                  : dragMode === 'image'
                  ? 'grab'
                  : 'crosshair'
              }}
            />
          ) : (
            <div className="text-neutral-500 flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
              Loading...
            </div>
          )}
        </div>

        {/* Bottom info bar */}
        <div className="px-4 py-2 bg-neutral-900/50 text-xs text-neutral-400">
          {cropArea && (
            <span>
              Selection: <span className="text-white">{Math.round(cropArea.width)} × {Math.round(cropArea.height)}</span>
              {selectedSize && (
                <span className="ml-3">
                  Output: <span className="text-emerald-400">{Math.min(selectedSize.width, Math.round(cropArea.width))} × {Math.min(selectedSize.height, Math.round(cropArea.height))}</span>
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
