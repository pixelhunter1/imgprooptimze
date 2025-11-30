import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-lg">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileArchive className="h-4 w-4 text-emerald-500" />
              <h2 className="text-sm font-medium text-white">Download All Images</h2>
            </div>
            <button
              onClick={onClose}
              disabled={isDownloading}
              className="p-1 text-neutral-500 hover:text-white rounded hover:bg-neutral-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Filename Input */}
            <div className="space-y-2">
              <label htmlFor="zip-filename" className="text-xs text-neutral-400">
                Name your ZIP file
              </label>
              <div className="flex gap-2">
                <input
                  id="zip-filename"
                  type="text"
                  value={zipFilename}
                  onChange={(e) => setZipFilename(e.target.value)}
                  disabled={isDownloading}
                  className="flex-1 px-3 py-2 text-sm rounded bg-neutral-800 text-white border-none focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  placeholder="ZIP filename"
                />
                <span className="px-3 py-2 bg-neutral-800 text-neutral-500 rounded text-sm">
                  .zip
                </span>
              </div>
            </div>

            {/* Progress */}
            {isDownloading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Creating ZIP file...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full h-1 [&>div]:bg-emerald-600" />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-neutral-800">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isDownloading}
                className="flex-1"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDownload}
                disabled={isDownloading || !zipFilename.trim()}
                className="flex-1"
                size="sm"
              >
                <Download className="h-3.5 w-3.5" />
                {isDownloading ? 'Creating...' : `Download ${fileCount}`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
