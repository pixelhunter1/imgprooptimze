/**
 * Browser Detection and Compatibility Utilities
 * Handles Safari-specific issues and provides fallbacks
 */

export interface BrowserInfo {
  name: string;
  version: string;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
  isBrave: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  supportsWebP: boolean;
  supportsWebWorkers: boolean;
  supportsOffscreenCanvas: boolean;
  hasCompressionIssues: boolean;
}

export interface BrowserCapabilities {
  canUseWebP: boolean;
  canUseWebWorkers: boolean;
  canUseOffscreenCanvas: boolean;
  recommendedFormat: 'webp' | 'jpeg' | 'png';
  maxQualityRecommended: number;
  compressionMethod: 'canvas' | 'library' | 'hybrid';
  showCompatibilityWarning: boolean;
}

/**
 * Detects browser information and capabilities
 */
export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent;
  const vendor = navigator.vendor || '';
  const braveNavigator = navigator as Navigator & { brave?: unknown };
  
  // Browser detection
  const isBrave = /Brave/.test(userAgent) || braveNavigator.brave !== undefined;
  const isSafari = /^((?!chrome|android|brave).)*safari/i.test(userAgent) ||
                   (/Safari/.test(userAgent) && /Apple Computer/.test(vendor) && !isBrave);
  const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(vendor) && !isBrave;
  const isFirefox = /Firefox/.test(userAgent);
  const isEdge = /Edg/.test(userAgent);
  
  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  
  // Version extraction
  let version = 'unknown';
  if (isBrave) {
    const match = userAgent.match(/Chrome\/([0-9.]+)/);
    version = match ? match[1] : 'unknown';
  } else if (isSafari) {
    const match = userAgent.match(/Version\/([0-9._]+)/);
    version = match ? match[1] : 'unknown';
  } else if (isChrome) {
    const match = userAgent.match(/Chrome\/([0-9.]+)/);
    version = match ? match[1] : 'unknown';
  } else if (isFirefox) {
    const match = userAgent.match(/Firefox\/([0-9.]+)/);
    version = match ? match[1] : 'unknown';
  }

  // Feature detection
  const supportsWebP = checkWebPSupport();
  const supportsWebWorkers = typeof Worker !== 'undefined';
  const supportsOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';

  // Safari-specific issues
  const hasCompressionIssues = isSafari || isIOS;

  return {
    name: isBrave ? 'Brave' : isSafari ? 'Safari' : isChrome ? 'Chrome' : isFirefox ? 'Firefox' : isEdge ? 'Edge' : 'Unknown',
    version,
    isSafari,
    isChrome,
    isFirefox,
    isEdge,
    isBrave,
    isMobile,
    isIOS,
    isAndroid,
    supportsWebP,
    supportsWebWorkers,
    supportsOffscreenCanvas,
    hasCompressionIssues
  };
}

/**
 * Checks WebP support using canvas
 */
function checkWebPSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } catch {
    return false;
  }
}


/**
 * Gets browser capabilities and recommendations
 */
export function getBrowserCapabilities(browserInfo?: BrowserInfo): BrowserCapabilities {
  const browser = browserInfo || detectBrowser();
  
  // Safari-specific adjustments
  if (browser.isSafari || browser.isIOS) {
    return {
      canUseWebP: browser.supportsWebP,
      canUseWebWorkers: false, // Disable web workers for Safari due to issues
      canUseOffscreenCanvas: false,
      recommendedFormat: browser.supportsWebP ? 'webp' : 'jpeg',
      maxQualityRecommended: 1.0, // Advisory only; processing should not clamp quality silently
      compressionMethod: 'canvas', // Use canvas-only approach
      showCompatibilityWarning: true
    };
  }

  // Chrome, Brave and modern browsers
  if (browser.isChrome || browser.isBrave || browser.isFirefox || browser.isEdge) {
    return {
      canUseWebP: browser.supportsWebP,
      canUseWebWorkers: browser.supportsWebWorkers,
      canUseOffscreenCanvas: browser.supportsOffscreenCanvas,
      recommendedFormat: 'webp',
      maxQualityRecommended: 1.0,
      compressionMethod: 'hybrid',
      showCompatibilityWarning: false
    };
  }

  // Fallback for unknown browsers
  return {
    canUseWebP: browser.supportsWebP,
    canUseWebWorkers: browser.supportsWebWorkers,
    canUseOffscreenCanvas: false,
    recommendedFormat: 'jpeg',
    maxQualityRecommended: 1.0, // Advisory only; keep user-selected quality intact
    compressionMethod: 'canvas',
    showCompatibilityWarning: true
  };
}

/**
 * Logs browser information for debugging
 */
export function logBrowserInfo(): void {
  const browser = detectBrowser();
  const capabilities = getBrowserCapabilities(browser);
  
  console.group('🌐 Browser Detection');
  console.log('Browser:', browser.name, browser.version);
  console.log('Platform:', browser.isMobile ? 'Mobile' : 'Desktop');
  console.log('WebP Support:', browser.supportsWebP ? '✅' : '❌');
  console.log('Web Workers:', browser.supportsWebWorkers);
  console.log('Compatibility Issues:', browser.hasCompressionIssues);
  console.log('Recommended Format:', capabilities.recommendedFormat.toUpperCase());
  console.log('Compression Method:', capabilities.compressionMethod);
  console.log('---');
  console.log('User Agent:', navigator.userAgent);
  console.groupEnd();
}
