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
  supportsAVIF: boolean;
  supportsWebWorkers: boolean;
  supportsOffscreenCanvas: boolean;
  hasCompressionIssues: boolean;
}

export interface BrowserCapabilities {
  canUseWebP: boolean;
  canUseAVIF: boolean;
  canUseWebWorkers: boolean;
  canUseOffscreenCanvas: boolean;
  recommendedFormat: 'webp' | 'jpeg' | 'png' | 'avif';
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
  
  // Browser detection
  const isBrave = /Brave/.test(userAgent) || (navigator as any).brave !== undefined;
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
  const supportsAVIF = checkAVIFSupport();
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
    supportsAVIF,
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
 * Checks AVIF ENCODING support via Canvas API
 * This is different from DECODING - many browsers can show AVIF but cannot create AVIF
 */
function checkAVIFSupport(): boolean {
  // WARNING: Chrome/Edge/Firefox support AVIF DECODING (viewing) since:
  // - Chrome 85+, Edge 85+, Firefox 93+, Safari 16+
  //
  // BUT Canvas API ENCODING support is LIMITED:
  // - Chrome: NO native Canvas AVIF encoding (as of Chrome 131)
  // - Firefox: NO native Canvas AVIF encoding
  // - Safari: NO native Canvas AVIF encoding
  //
  // Canvas.toBlob('image/avif') will SILENTLY FAIL and return PNG instead!
  // This causes files to be LARGER, not smaller.
  //
  // SOLUTION: We need a WASM library like @squoosh/lib for real AVIF encoding
  // For now, we DISABLE AVIF to prevent issues

  console.warn('🚫 AVIF encoding via Canvas API is NOT reliably supported in any browser');
  console.warn('📦 To enable AVIF, we need to add @squoosh/lib or similar WASM encoder');

  return false; // Disabled until we add proper AVIF encoding library
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
      canUseAVIF: browser.supportsAVIF,
      canUseWebWorkers: false, // Disable web workers for Safari due to issues
      canUseOffscreenCanvas: false,
      recommendedFormat: browser.supportsAVIF ? 'avif' : browser.supportsWebP ? 'webp' : 'jpeg',
      maxQualityRecommended: 0.85, // Lower quality for Safari to avoid issues
      compressionMethod: 'canvas', // Use canvas-only approach
      showCompatibilityWarning: true
    };
  }

  // Chrome, Brave and modern browsers
  if (browser.isChrome || browser.isBrave || browser.isFirefox || browser.isEdge) {
    return {
      canUseWebP: browser.supportsWebP,
      canUseAVIF: browser.supportsAVIF,
      canUseWebWorkers: browser.supportsWebWorkers,
      canUseOffscreenCanvas: browser.supportsOffscreenCanvas,
      recommendedFormat: browser.supportsAVIF ? 'avif' : 'webp',
      maxQualityRecommended: 1.0,
      compressionMethod: 'hybrid',
      showCompatibilityWarning: false
    };
  }

  // Fallback for unknown browsers
  return {
    canUseWebP: browser.supportsWebP,
    canUseAVIF: browser.supportsAVIF,
    canUseWebWorkers: browser.supportsWebWorkers,
    canUseOffscreenCanvas: false,
    recommendedFormat: 'jpeg',
    maxQualityRecommended: 0.9,
    compressionMethod: 'canvas',
    showCompatibilityWarning: true
  };
}

/**
 * Gets Safari-specific optimization options
 */
export function getSafariOptimizedOptions(originalOptions: any): any {
  const capabilities = getBrowserCapabilities();
  
  if (!capabilities.showCompatibilityWarning) {
    return originalOptions;
  }
  
  return {
    ...originalOptions,
    quality: Math.min(originalOptions.quality, capabilities.maxQualityRecommended),
    format: capabilities.canUseWebP ? originalOptions.format : 'jpeg',
    useWebWorker: capabilities.canUseWebWorkers,
    maxWidthOrHeight: Math.min(originalOptions.maxWidthOrHeight || 1920, 1920), // Limit size for Safari
  };
}

/**
 * Checks if current browser needs special handling
 */
export function needsCompatibilityMode(): boolean {
  const browser = detectBrowser();
  return browser.hasCompressionIssues;
}

/**
 * Gets user-friendly browser compatibility message
 */
export function getCompatibilityMessage(browserInfo?: BrowserInfo): string | null {
  const browser = browserInfo || detectBrowser();
  
  if (browser.isSafari || browser.isIOS) {
    if (!browser.supportsWebP) {
      return 'Safari detected: WebP format not supported. Using JPEG format for better compatibility.';
    }
    return 'Safari detected: Using optimized settings for better performance and compatibility.';
  }
  
  return null;
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
  console.log('AVIF Support:', browser.supportsAVIF ? '✅ (AVAILABLE)' : '❌ (NOT SUPPORTED)');
  console.log('Web Workers:', browser.supportsWebWorkers);
  console.log('Compatibility Issues:', browser.hasCompressionIssues);
  console.log('Recommended Format:', capabilities.recommendedFormat.toUpperCase());
  console.log('Compression Method:', capabilities.compressionMethod);
  console.log('---');
  console.log('User Agent:', navigator.userAgent);
  console.groupEnd();
}
