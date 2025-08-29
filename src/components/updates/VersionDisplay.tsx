import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Info } from 'lucide-react';
import { getCurrentVersion, getVersionString, checkForUpdates } from '@/lib/version';

interface VersionDisplayProps {
  showDetails?: boolean;
  showUpdateButton?: boolean;
  className?: string;
}

export default function VersionDisplay({ 
  showDetails = false, 
  showUpdateButton = false,
  className 
}: VersionDisplayProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<string>('');
  
  const version = getCurrentVersion();
  const versionString = getVersionString();

  const handleCheckUpdate = async () => {
    setIsChecking(true);
    try {
      const result = await checkForUpdates();
      setLastCheck(new Date().toLocaleTimeString());
      
      if (result.updateAvailable) {
        alert(`Update available! Current: v${result.currentVersion}, Latest: v${result.latestVersion}`);
      } else {
        alert('You are running the latest version!');
      }
    } catch (error) {
      console.error('Update check failed:', error);
      alert('Failed to check for updates. Please try again later.');
    } finally {
      setIsChecking(false);
    }
  };

  if (showDetails) {
    return (
      <div className={`text-xs text-muted-foreground space-y-1 ${className}`}>
        <div className="flex items-center gap-2">
          <Info className="h-3 w-3" />
          <span className="font-medium">Version Information</span>
        </div>
        <div className="pl-5 space-y-1">
          <div>Version: {version.version}</div>
          <div>Build: {version.buildHash.substring(0, 8)}</div>
          <div>Built: {new Date(parseInt(version.buildTimestamp)).toLocaleString()}</div>
          {lastCheck && <div>Last checked: {lastCheck}</div>}
        </div>
        {showUpdateButton && (
          <div className="pl-5 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCheckUpdate}
              disabled={isChecking}
              className="h-6 px-2 text-xs"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Check for Updates
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`text-xs text-muted-foreground ${className}`}>
      {versionString}
      {showUpdateButton && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCheckUpdate}
          disabled={isChecking}
          className="h-4 px-1 ml-2 text-xs"
        >
          {isChecking ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  );
}
