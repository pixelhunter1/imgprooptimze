import { useEffect, useState, useCallback } from 'react';
import { 
  checkForUpdates, 
  hasAppUpdated, 
  storeCurrentVersion, 
  shouldCheckForUpdates,
  type UpdateCheckResult 
} from '@/lib/version';

interface UseAutoUpdateOptions {
  checkInterval?: number; // Check interval in milliseconds
  enableAutoCheck?: boolean; // Enable automatic periodic checks
  enableVisibilityCheck?: boolean; // Check when page becomes visible
  enableFocusCheck?: boolean; // Check when window gains focus
}

interface UseAutoUpdateReturn {
  updateInfo: UpdateCheckResult | null;
  isChecking: boolean;
  lastCheck: Date | null;
  checkNow: () => Promise<UpdateCheckResult | null>;
  hasUpdate: boolean;
}

export function useAutoUpdate(options: UseAutoUpdateOptions = {}): UseAutoUpdateReturn {
  const {
    checkInterval = 30 * 60 * 1000, // 30 minutes default
    enableAutoCheck = true,
    enableVisibilityCheck = true,
    enableFocusCheck = true
  } = options;

  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  // Check for updates function
  const checkNow = useCallback(async (): Promise<UpdateCheckResult | null> => {
    if (isChecking) return null;
    
    setIsChecking(true);
    try {
      const result = await checkForUpdates();
      setUpdateInfo(result);
      setLastCheck(new Date());
      return result;
    } catch (error) {
      console.warn('Auto update check failed:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

  // Initial setup and checks
  useEffect(() => {
    // Check if app was updated since last visit
    if (hasAppUpdated()) {
      console.log('App has been updated since last visit');
      storeCurrentVersion();
      // Trigger an update check to see if there are newer versions
      checkNow();
    } else if (shouldCheckForUpdates(checkInterval)) {
      // Perform initial check if enough time has passed
      checkNow();
    }
  }, [checkNow, checkInterval]);

  // Periodic update checks
  useEffect(() => {
    if (!enableAutoCheck) return;

    const interval = setInterval(() => {
      if (shouldCheckForUpdates(checkInterval)) {
        checkNow();
      }
    }, Math.min(checkInterval, 5 * 60 * 1000)); // Check at least every 5 minutes

    return () => clearInterval(interval);
  }, [enableAutoCheck, checkInterval, checkNow]);

  // Check when page becomes visible
  useEffect(() => {
    if (!enableVisibilityCheck) return;

    const handleVisibilityChange = () => {
      if (!document.hidden && shouldCheckForUpdates(checkInterval)) {
        checkNow();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enableVisibilityCheck, checkInterval, checkNow]);

  // Check when window gains focus
  useEffect(() => {
    if (!enableFocusCheck) return;

    const handleFocus = () => {
      if (shouldCheckForUpdates(checkInterval)) {
        checkNow();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [enableFocusCheck, checkInterval, checkNow]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (shouldCheckForUpdates(checkInterval)) {
        checkNow();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [checkInterval, checkNow]);

  return {
    updateInfo,
    isChecking,
    lastCheck,
    checkNow,
    hasUpdate: updateInfo?.updateAvailable || false
  };
}

// Hook for manual update management
export function useUpdateManager() {
  const [isUpdating, setIsUpdating] = useState(false);

  const applyUpdate = useCallback(async () => {
    setIsUpdating(true);
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Reload the page
      window.location.reload();
    } catch (error) {
      console.error('Update failed:', error);
      setIsUpdating(false);
      throw error;
    }
  }, []);

  const skipUpdate = useCallback((version: string) => {
    try {
      localStorage.setItem('update_dismissed', version);
    } catch (error) {
      console.warn('Failed to store dismissed update:', error);
    }
  }, []);

  return {
    isUpdating,
    applyUpdate,
    skipUpdate
  };
}

// Hook for version information
export function useVersionInfo() {
  const [versionInfo, setVersionInfo] = useState(() => {
    try {
      const stored = localStorage.getItem('app_version');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const updateVersionInfo = () => {
      try {
        const stored = localStorage.getItem('app_version');
        setVersionInfo(stored ? JSON.parse(stored) : null);
      } catch {
        setVersionInfo(null);
      }
    };

    // Listen for storage changes
    window.addEventListener('storage', updateVersionInfo);
    return () => window.removeEventListener('storage', updateVersionInfo);
  }, []);

  return versionInfo;
}
