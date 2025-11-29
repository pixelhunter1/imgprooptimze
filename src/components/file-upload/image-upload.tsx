'use client';

import { useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

  // Expose reset function via ref
  useImperativeHandle(ref, () => ({
    resetUpload: () => {
      // Clear all images and revoke object URLs
      images.forEach(image => {
        URL.revokeObjectURL(image.preview);
      });
      setImages([]);
      setErrors([]);
      setValidationErrors([]);
      setIsDragging(false);
    }
  }), [images]);

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

        const imageFile: ImageFile = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview: URL.createObjectURL(file),
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
        URL.revokeObjectURL(image.preview);
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
      <div className="mb-6">
        {/* Uploaded images grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-2.5">
            {images.map((imageFile, index) => (
              <Card
                key={imageFile.id}
                className="flex items-center justify-center rounded-md bg-accent/50 shadow-none shrink-0 relative group"
              >
                <img
                  src={imageFile.preview}
                  className="h-[120px] w-full object-cover rounded-md"
                  alt={`Product view ${index + 1}`}
                />

                {/* Remove Button Overlay */}
                <Button
                  onClick={() => removeImage(imageFile.id)}
                  variant="outline"
                  size="sm"
                  mode="icon"
                  className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 rounded-full"
                >
                  <XIcon className="size-3.5" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Area */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 ease-in-out cursor-pointer overflow-hidden group",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.02] shadow-lg"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="flex flex-col items-center justify-center text-center space-y-4 relative z-10">
          <div className={cn(
            "p-4 rounded-full transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
            isDragging ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
          )}>
            <CloudUpload className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">
              {isDragging ? "Drop images here" : "Drag & drop images here"}
            </p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              or click to select files (PNG, JPG, WebP)
            </p>
          </div>

          <div className="flex gap-2 text-xs text-muted-foreground/60">
            <span>Max {formatBytes(maxSize)}</span>
            <span>•</span>
            <span>Up to {maxFiles} files</span>
          </div>
        </div>
      </div>

      {/* Upload Progress Cards */}
      {images.length > 0 && (
        <div className="mt-6 space-y-3">
          {images.map((imageFile) => (
            <Card key={imageFile.id} className="shadow-none rounded-md">
              <CardContent className="flex items-center gap-2 p-3">
                <div className="flex items-center justify-center size-[32px] rounded-md border border-border shrink-0">
                  <ImageIcon className="size-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex items-center justify-between gap-2.5 -mt-2 w-full">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-foreground font-medium leading-none">{imageFile.file.name}</span>
                      <span className="text-xs text-muted-foreground font-normal leading-none">
                        {formatBytes(imageFile.file.size)}
                      </span>
                      {imageFile.status === 'uploading' && (
                        <p className="text-xs text-muted-foreground">Uploading... {Math.round(imageFile.progress)}%</p>
                      )}
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(imageFile.id);
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <CircleX className="size-3.5" />
                    </Button>
                  </div>

                  <Progress
                    value={imageFile.progress}
                    className={cn('h-1 transition-all duration-300', '[&>div]:bg-primary')}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Validation Error Messages */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive" className="mt-5 bg-destructive/5 border-destructive/20 text-destructive">
          <AlertIcon>
            <AlertCircle className="h-4 w-4" />
          </AlertIcon>
          <AlertContent>
            <AlertTitle className="text-sm font-semibold">File Validation Errors</AlertTitle>
            <AlertDescription>
              <div className="space-y-2 mt-1">
                <p className="text-sm font-medium">
                  {validationErrors.length} file(s) rejected:
                </p>
                <ul className="text-sm space-y-1 ml-2 list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>
                      <span className="font-medium">{error.fileName}:</span> {error.error}
                    </li>
                  ))}
                </ul>
                <p className="text-xs mt-2 opacity-80">
                  Only PNG, WebP, and JPEG/JPG images are allowed.
                </p>
              </div>
            </AlertDescription>
          </AlertContent>
        </Alert>
      )}

      {/* General Error Messages */}
      {errors.length > 0 && (
        <Alert variant="destructive" className="mt-5 bg-destructive/5 border-destructive/20 text-destructive">
          <AlertIcon>
            <TriangleAlert className="h-4 w-4" />
          </AlertIcon>
          <AlertContent>
            <AlertTitle className="text-sm font-semibold">File upload error(s)</AlertTitle>
            <AlertDescription className="text-sm mt-1">
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
