/**
 * Version Management System
 * Handles app versioning, update detection, and cache invalidation
 */

// Version information injected at build time
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
export const BUILD_TIMESTAMP = import.meta.env.VITE_BUILD_TIMESTAMP || Date.now().toString();
export const BUILD_HASH = import.meta.env.VITE_BUILD_HASH || 'dev';

// Version storage keys
const VERSION_STORAGE_KEY = 'app_version';
const LAST_CHECK_STORAGE_KEY = 'last_version_check';
const UPDATE_DISMISSED_STORAGE_KEY = 'update_dismissed';

export interface VersionInfo {
  version: string;
  buildTimestamp: string;
  buildHash: string;
  lastCheck?: number;
  updateAvailable?: boolean;
  dismissedVersion?: string;
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  shouldPrompt: boolean;
  isForced: boolean;
}

/**
 * Gets the current app version information
 */
export function getCurrentVersion(): VersionInfo {
  return {
    version: APP_VERSION,
    buildTimestamp: BUILD_TIMESTAMP,
    buildHash: BUILD_HASH,
    lastCheck: getLastVersionCheck(),
    dismissedVersion: getDismissedVersion(),
  };
}

/**
 * Gets the stored version from localStorage
 */
export function getStoredVersion(): VersionInfo | null {
  try {
    const stored = localStorage.getItem(VERSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Stores the current version information
 */
export function storeCurrentVersion(): void {
  try {
    const versionInfo = getCurrentVersion();
    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(versionInfo));
  } catch (error) {
    console.warn('Failed to store version info:', error);
  }
}

/**
 * Checks if the app has been updated since last visit
 */
export function hasAppUpdated(): boolean {
  const stored = getStoredVersion();
  const current = getCurrentVersion();
  
  if (!stored) {
    // First time visit
    storeCurrentVersion();
    return false;
  }
  
  // Check if version, build timestamp, or build hash changed
  return (
    stored.version !== current.version ||
    stored.buildTimestamp !== current.buildTimestamp ||
    stored.buildHash !== current.buildHash
  );
}

/**
 * Checks for updates by fetching version info from server
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const current = getCurrentVersion();
  
  try {
    // Try to fetch the version info from the server
    const response = await fetch('/version.json?' + Date.now(), {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch version info');
    }
    
    const serverVersion: VersionInfo = await response.json();
    
    // Update last check timestamp
    setLastVersionCheck(Date.now());
    
    const updateAvailable = (
      serverVersion.version !== current.version ||
      serverVersion.buildTimestamp !== current.buildTimestamp ||
      serverVersion.buildHash !== current.buildHash
    );
    
    const dismissedVersion = getDismissedVersion();
    const shouldPrompt = updateAvailable && dismissedVersion !== serverVersion.version;
    
    // Check if this is a forced update (major version change)
    const isForced = isForceUpdate(current.version, serverVersion.version);
    
    return {
      updateAvailable,
      currentVersion: current.version,
      latestVersion: serverVersion.version,
      shouldPrompt: shouldPrompt || isForced,
      isForced
    };
    
  } catch (error) {
    console.warn('Failed to check for updates:', error);
    
    // Fallback: check if local version changed (for development)
    const updateAvailable = hasAppUpdated();
    
    return {
      updateAvailable,
      currentVersion: current.version,
      latestVersion: current.version,
      shouldPrompt: updateAvailable,
      isForced: false
    };
  }
}

/**
 * Determines if an update should be forced (major version change)
 */
function isForceUpdate(currentVersion: string, latestVersion: string): boolean {
  try {
    const currentMajor = parseInt(currentVersion.split('.')[0]);
    const latestMajor = parseInt(latestVersion.split('.')[0]);
    return latestMajor > currentMajor;
  } catch {
    return false;
  }
}

/**
 * Gets the last version check timestamp
 */
function getLastVersionCheck(): number | undefined {
  try {
    const stored = localStorage.getItem(LAST_CHECK_STORAGE_KEY);
    return stored ? parseInt(stored) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Sets the last version check timestamp
 */
function setLastVersionCheck(timestamp: number): void {
  try {
    localStorage.setItem(LAST_CHECK_STORAGE_KEY, timestamp.toString());
  } catch (error) {
    console.warn('Failed to store last check timestamp:', error);
  }
}

/**
 * Gets the dismissed version
 */
function getDismissedVersion(): string | undefined {
  try {
    return localStorage.getItem(UPDATE_DISMISSED_STORAGE_KEY) || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Marks a version as dismissed
 */
export function dismissUpdate(version: string): void {
  try {
    localStorage.setItem(UPDATE_DISMISSED_STORAGE_KEY, version);
  } catch (error) {
    console.warn('Failed to store dismissed version:', error);
  }
}

/**
 * Clears the dismissed version (forces update prompt)
 */
export function clearDismissedUpdate(): void {
  try {
    localStorage.removeItem(UPDATE_DISMISSED_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear dismissed version:', error);
  }
}

/**
 * Applies the update by reloading the page and clearing caches
 */
export async function applyUpdate(): Promise<void> {
  try {
    // Clear dismissed updates
    clearDismissedUpdate();
    
    // Update stored version to current
    storeCurrentVersion();
    
    // Clear all caches if service worker is available
    if ('serviceWorker' in navigator && 'caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }
    
    // Force service worker to update
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        
        // If there's a waiting service worker, activate it
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    }
    
    // Reload the page to get the latest version
    window.location.reload();
    
  } catch (error) {
    console.error('Failed to apply update:', error);
    // Fallback: simple reload
    window.location.reload();
  }
}

/**
 * Checks if enough time has passed since last update check
 */
export function shouldCheckForUpdates(intervalMs: number = 30 * 60 * 1000): boolean {
  const lastCheck = getLastVersionCheck();
  if (!lastCheck) return true;
  
  return Date.now() - lastCheck > intervalMs;
}

/**
 * Gets a human-readable version string
 */
export function getVersionString(): string {
  const current = getCurrentVersion();
  return `v${current.version}`;
}
