import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle } from 'lucide-react';

interface ResetProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ResetProjectDialog({
  isOpen,
  onClose,
  onConfirm,
}: ResetProjectDialogProps) {
  const [isResetting, setIsResetting] = useState(false);

  const handleConfirm = async () => {
    setIsResetting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsResetting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-lg">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <h2 className="text-sm font-medium text-white">Reset Project</h2>
            </div>
            <button
              onClick={onClose}
              disabled={isResetting}
              className="p-1 text-neutral-500 hover:text-white rounded hover:bg-neutral-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <p className="text-xs text-neutral-400">
              Are you sure you want to remove all images and reset the project?
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t border-neutral-800">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isResetting}
                className="flex-1"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={isResetting}
                className="flex-1"
                size="sm"
              >
                {isResetting ? 'Resetting...' : 'Reset Project'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
