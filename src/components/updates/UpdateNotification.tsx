import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, X, Download, AlertCircle } from 'lucide-react';
import {
  applyUpdate,
  dismissUpdate,
  getCurrentVersion
} from '@/lib/version';
import { useAutoUpdate } from '@/hooks/useAutoUpdate';

interface UpdateNotificationProps {
  checkInterval?: number; // Check interval in milliseconds
  className?: string;
}

export default function UpdateNotification({
  checkInterval = 30 * 60 * 1000, // 30 minutes default
  className
}: UpdateNotificationProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Use the auto-update hook
  const { updateInfo, hasUpdate } = useAutoUpdate({
    checkInterval,
    enableAutoCheck: true,
    enableVisibilityCheck: true,
    enableFocusCheck: true
  });

  // Show notification when update is available and should prompt
  useState(() => {
    if (updateInfo?.shouldPrompt && hasUpdate) {
      setIsVisible(true);
    }
  });

  // Handle update application
  const handleUpdate = async () => {
    if (!updateInfo) return;
    
    setIsUpdating(true);
    try {
      await applyUpdate();
      // Page will reload, so this won't execute
    } catch (error) {
      console.error('Update failed:', error);
      setIsUpdating(false);
      alert('Update failed. Please refresh the page manually.');
    }
  };

  // Handle update dismissal
  const handleDismiss = () => {
    if (updateInfo && !updateInfo.isForced) {
      dismissUpdate(updateInfo.latestVersion);
      setIsVisible(false);
    }
  };

  // Don't show if no update or not visible
  if (!updateInfo?.updateAvailable || !isVisible) {
    return null;
  }

  const currentVersion = getCurrentVersion();
  const isForced = updateInfo.isForced;

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm ${className}`}>
      <Card className="bg-card border border-border shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isForced ? 'bg-destructive/10' : 'bg-primary/10'
              }`}>
                {isForced ? (
                  <AlertCircle className={`h-5 w-5 ${isForced ? 'text-destructive' : 'text-primary'}`} />
                ) : (
                  <Download className="h-5 w-5 text-primary" />
                )}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-1">
                {isForced ? 'Critical Update Available' : 'Update Available'}
              </h3>
              
              <p className="text-xs text-muted-foreground mb-3">
                {isForced ? (
                  'A critical update is required to continue using the app.'
                ) : (
                  'A new version of the app is available with improvements and bug fixes.'
                )}
              </p>
              
              <div className="text-xs text-muted-foreground mb-3">
                <div>Current: v{currentVersion.version}</div>
                <div>Latest: v{updateInfo.latestVersion}</div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="flex-1 flex items-center gap-1"
                  variant={isForced ? 'destructive' : 'primary'}
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3" />
                      Update Now
                    </>
                  )}
                </Button>
                
                {!isForced && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDismiss}
                    disabled={isUpdating}
                    className="px-2"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for manual update checking
export function useUpdateChecker() {
  const { updateInfo, isChecking, checkNow } = useAutoUpdate({
    enableAutoCheck: false // Disable auto-checking for manual hook
  });

  const performUpdate = async () => {
    try {
      await applyUpdate();
    } catch (error) {
      console.error('Update failed:', error);
      throw error;
    }
  };

  return {
    isChecking,
    updateInfo,
    checkForUpdates: checkNow,
    applyUpdate: performUpdate
  };
}
