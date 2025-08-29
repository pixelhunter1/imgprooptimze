import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { X, Download, FileArchive } from 'lucide-react';

interface ZipDownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (zipFilename: string) => Promise<void>;
  fileCount: number;
}

export default function ZipDownloadDialog({
  isOpen,
  onClose,
  onDownload,
  fileCount,
}: ZipDownloadDialogProps) {
  const [zipFilename, setZipFilename] = useState('optimized-images');
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    if (!zipFilename.trim()) return;
    
    setIsDownloading(true);
    setProgress(0);
    
    try {
      await onDownload(zipFilename.trim());
      onClose();
    } catch (error) {
      console.error('ZIP download failed:', error);
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-card border border-border">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FileArchive className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Download All Images</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isDownloading}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Filename Input */}
            <div className="space-y-3">
              <label htmlFor="zip-filename" className="text-sm font-medium">
                Name your ZIP file
              </label>
              <div className="flex gap-2">
                <input
                  id="zip-filename"
                  type="text"
                  value={zipFilename}
                  onChange={(e) => setZipFilename(e.target.value)}
                  disabled={isDownloading}
                  className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="ZIP filename"
                />
                <span className="px-3 py-2 bg-muted text-muted-foreground rounded-md text-sm">
                  .zip
                </span>
              </div>
            </div>

            {/* Progress */}
            {isDownloading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Creating ZIP file...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isDownloading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDownload}
                disabled={isDownloading || !zipFilename.trim()}
                className="flex-1 flex items-center gap-2"
                size="lg"
              >
                <Download className="h-4 w-4" />
                {isDownloading ? 'Creating ZIP...' : `Download ${fileCount} Images`}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
