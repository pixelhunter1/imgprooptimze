'use client';

import { useCallback, useState, forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CircleX, CloudUpload, ImageIcon, TriangleAlert, XIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageProcessor, type FileValidationResult } from '@/lib/imageProcessor';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

interface ImageUploadProps {
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
  className?: string;
  onImagesChange?: (images: ImageFile[]) => void;
  onUploadComplete?: (images: ImageFile[]) => void;
  onValidationError?: (errors: FileValidationResult[]) => void;
}

export interface ImageUploadRef {
  resetUpload: () => void;
  removeImageByName: (fileName: string) => void;
}

const ImageUpload = forwardRef<ImageUploadRef, ImageUploadProps>(({
  maxFiles = 10,
  maxSize = 2 * 1024 * 1024, // 2MB
  accept = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp', // Restrict to allowed formats
  className,
  onImagesChange,
  onUploadComplete,
  onValidationError,
}, ref) => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<FileValidationResult[]>([]);

  // Keep track of all blob URLs created for cleanup
  const blobUrlsRef = useRef<Set<string>>(new Set());

  // Cleanup all blob URLs on page unload only (NOT on StrictMode remount)
  useEffect(() => {
    const cleanupBlobUrls = () => {
      blobUrlsRef.current.forEach(url => {
        try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
      });
      blobUrlsRef.current.clear();
    };

    // Handle page unload (refresh, close tab)
    const handleBeforeUnload = () => {
      cleanupBlobUrls();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      // DON'T cleanup URLs here - it causes issues with React StrictMode
      // URLs will be cleaned up on beforeunload/pagehide events instead
    };
  }, []);

  // Expose reset and remove functions via ref
  useImperativeHandle(ref, () => ({
    resetUpload: () => {
      // Clear all images and revoke object URLs
      images.forEach(image => {
        try { URL.revokeObjectURL(image.preview); } catch (e) { /* ignore */ }
        blobUrlsRef.current.delete(image.preview);
      });
      // Also cleanup any tracked URLs that might have been orphaned
      blobUrlsRef.current.forEach(url => {
        try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
      });
      blobUrlsRef.current.clear();

      setImages([]);
      setErrors([]);
      setValidationErrors([]);
      setIsDragging(false);

      // Notify parent that images have been cleared
      onImagesChange?.([]);
    },
    removeImageByName: (fileName: string) => {
      // Find and remove image by file name
      const imageToRemove = images.find(img => img.file.name === fileName);
      if (imageToRemove) {
        // Clean up blob URL
        try { URL.revokeObjectURL(imageToRemove.preview); } catch (e) { /* ignore */ }
        blobUrlsRef.current.delete(imageToRemove.preview);

        // Update state
        const updatedImages = images.filter(img => img.file.name !== fileName);
        setImages(updatedImages);

        // Notify parent
        onImagesChange?.(updatedImages);
      }
    }
  }), [images, onImagesChange]);

  const validateFile = (file: File): string | null => {
    // Check if it's actually a file (not a directory)
    if (file.size === 0 && file.type === '') {
      return 'Folders are not supported. Please select image files only.';
    }

    // First check file type validation using ImageProcessor
    const typeValidation = ImageProcessor.validateImageFile(file);
    if (!typeValidation.isValid) {
      return typeValidation.error || 'Invalid file type';
    }

    // Then check size constraints
    if (file.size > maxSize) {
      return `File size must be less than ${(maxSize / 1024 / 1024).toFixed(1)}MB`;
    }

    // Check file count limit
    if (images.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`;
    }

    return null;
  };

  const addImages = useCallback(
    async (files: FileList | File[]) => {
      // First, validate all files using the comprehensive validation
      const batchValidation = ImageProcessor.validateImageFiles(files);

      // If no valid files, show error and prevent upload
      if (!batchValidation.hasValidFiles) {
        setValidationErrors(batchValidation.invalidFiles);
        onValidationError?.(batchValidation.invalidFiles);

        // Show summary error
        const errorMessage = `No valid image files selected. ${batchValidation.invalidFiles.length} file(s) rejected.`;
        setErrors(prev => [...prev, errorMessage]);
        return;
      }

      // Process valid files and check additional constraints
      const newImages: ImageFile[] = [];
      const newErrors: string[] = [];
      const rejectedFiles: FileValidationResult[] = [...batchValidation.invalidFiles];

      // Additional validation for size and count limits
      for (const file of batchValidation.validFiles) {
        const error = validateFile(file);
        if (error) {
          rejectedFiles.push({
            isValid: false,
            error,
            fileName: file.name
          });
          continue;
        }

        // Verify image integrity (additional security check)
        const isValidImage = await ImageProcessor.verifyImageIntegrity(file);
        if (!isValidImage) {
          rejectedFiles.push({
            isValid: false,
            error: 'File appears to be corrupted or is not a valid image',
            fileName: file.name
          });
          continue;
        }

        const previewUrl = URL.createObjectURL(file);
        // Track the URL for cleanup
        blobUrlsRef.current.add(previewUrl);

        const imageFile: ImageFile = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview: previewUrl,
          progress: 0,
          status: 'uploading',
        };

        newImages.push(imageFile);
      }

      // Update validation errors state
      if (rejectedFiles.length > 0) {
        setValidationErrors(rejectedFiles);
        onValidationError?.(rejectedFiles);

        // Add summary to errors
        const rejectedCount = rejectedFiles.length;
        const acceptedCount = newImages.length;
        if (rejectedCount > 0) {
          newErrors.push(`${rejectedCount} file(s) rejected. ${acceptedCount} file(s) accepted.`);
        }
      } else {
        setValidationErrors([]);
      }

      if (newErrors.length > 0) {
        setErrors((prev) => [...prev, ...newErrors]);
      }

      if (newImages.length > 0) {
        const updatedImages = [...images, ...newImages];
        setImages(updatedImages);
        onImagesChange?.(updatedImages);

        // Simulate upload progress
        newImages.forEach((imageFile) => {
          simulateUpload(imageFile);
        });
      }
    },
    [images, maxSize, maxFiles, onImagesChange, onValidationError],
  );

  const simulateUpload = (imageFile: ImageFile) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);

        setImages((prev) => {
          const updated = prev.map((img) =>
            img.id === imageFile.id ? { ...img, progress: 100, status: 'completed' as const } : img,
          );
          onImagesChange?.(updated);
          if (updated.every((img) => img.status === 'completed')) {
            onUploadComplete?.(updated);
          }
          return updated;
        });
      } else {
        setImages((prev) => {
          const updated = prev.map((img) => (img.id === imageFile.id ? { ...img, progress } : img));
          onImagesChange?.(updated);
          return updated;
        });
      }
    }, 100);
  };

  const removeImage = useCallback((id: string) => {
    // Remove uploaded image
    setImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image) {
        try { URL.revokeObjectURL(image.preview); } catch (e) { /* ignore */ }
        blobUrlsRef.current.delete(image.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        // Filter out directories and non-files
        const validFiles = Array.from(files).filter(file => {
          // Check if it's actually a file (not a directory)
          return file.size > 0 || file.type !== '';
        });

        if (validFiles.length > 0) {
          addImages(validFiles);
        } else {
          setErrors(prev => [...prev, 'Please drop image files, not folders.']);
        }
      }
    },
    [addImages],
  );

  const openFileDialog = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = accept;
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        addImages(target.files);
      }
    };
    input.click();
  }, [accept, addImages]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('w-full max-w-4xl', className)}>
      {/* Image Grid - Moved to top */}
      <div className="mb-4">
        {/* Uploaded images grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {images.map((imageFile, index) => (
              <div
                key={imageFile.id}
                className="relative group rounded overflow-hidden bg-neutral-800 border border-neutral-700"
              >
                <img
                  src={imageFile.preview}
                  className="h-[100px] w-full object-cover"
                  alt={`Product view ${index + 1}`}
                />

                {/* Remove Button Overlay */}
                <button
                  onClick={() => removeImage(imageFile.id)}
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded bg-neutral-900/80 text-neutral-400 hover:text-white hover:bg-neutral-800"
                  title="Remove image"
                >
                  <XIcon className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Area */}
      <div
        className={cn(
          "relative border border-dashed rounded-lg p-6 cursor-pointer",
          isDragging
            ? "border-emerald-600 bg-emerald-600/10"
            : "border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/50"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className={cn(
            "p-3 rounded-full",
            isDragging ? "bg-emerald-600/20 text-emerald-500" : "bg-neutral-800 text-neutral-400"
          )}>
            <CloudUpload className="h-6 w-6" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-white">
              {isDragging ? "Drop images here" : "Drag & drop images here"}
            </p>
            <p className="text-xs text-neutral-500">
              or click to select files (PNG, JPG, WebP)
            </p>
          </div>

          <div className="flex gap-2 text-[10px] text-neutral-600">
            <span>Max {formatBytes(maxSize)}</span>
            <span>•</span>
            <span>Up to {maxFiles} files</span>
          </div>
        </div>
      </div>

      {/* Upload Progress Cards */}
      {images.length > 0 && (
        <div className="mt-4 space-y-2">
          {images.map((imageFile) => (
            <div key={imageFile.id} className="flex items-center gap-3 p-2 rounded bg-neutral-800 border border-neutral-700">
              <div className="flex items-center justify-center size-8 rounded bg-neutral-700 shrink-0">
                <ImageIcon className="size-4 text-neutral-400" />
              </div>
              <div className="flex flex-col gap-1 w-full min-w-0">
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-white font-medium truncate">{imageFile.file.name}</span>
                    <span className="text-[10px] text-neutral-500 shrink-0">
                      {formatBytes(imageFile.file.size)}
                    </span>
                    {imageFile.status === 'uploading' && (
                      <span className="text-[10px] text-neutral-500 shrink-0">{Math.round(imageFile.progress)}%</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(imageFile.id);
                    }}
                    className="p-1 text-neutral-500 hover:text-white shrink-0"
                  >
                    <CircleX className="size-3.5" />
                  </button>
                </div>

                <Progress
                  value={imageFile.progress}
                  className={cn('h-1', '[&>div]:bg-emerald-600')}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Validation Error Messages */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive" className="mt-4 bg-red-950/30 border-red-900/30 text-red-400">
          <AlertIcon>
            <AlertCircle className="h-3.5 w-3.5" />
          </AlertIcon>
          <AlertContent>
            <AlertTitle className="text-xs font-medium">File Validation Errors</AlertTitle>
            <AlertDescription>
              <div className="space-y-1 mt-1">
                <p className="text-[10px] text-red-400/80">
                  {validationErrors.length} file(s) rejected:
                </p>
                <ul className="text-[10px] text-red-400/70 space-y-0.5 ml-2 list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>
                      <span className="text-red-400">{error.fileName}:</span> {error.error}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </AlertContent>
        </Alert>
      )}

      {/* General Error Messages */}
      {errors.length > 0 && (
        <Alert variant="destructive" className="mt-4 bg-red-950/30 border-red-900/30 text-red-400">
          <AlertIcon>
            <TriangleAlert className="h-3.5 w-3.5" />
          </AlertIcon>
          <AlertContent>
            <AlertTitle className="text-xs font-medium">File upload error(s)</AlertTitle>
            <AlertDescription className="text-[10px] text-red-400/80 mt-1">
              {errors.map((error, index) => (
                <p key={index} className="last:mb-0">
                  {error}
                </p>
              ))}
            </AlertDescription>
          </AlertContent>
        </Alert>
      )}
    </div>
  );
});

ImageUpload.displayName = 'ImageUpload';

export default ImageUpload;
