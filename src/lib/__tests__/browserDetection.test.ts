import { detectBrowser, getBrowserCapabilities, needsCompatibilityMode } from '../browserDetection';

// Mock navigator for testing
const mockNavigator = (userAgent: string, vendor: string = '') => {
  Object.defineProperty(window, 'navigator', {
    value: {
      userAgent,
      vendor,
    },
    writable: true,
  });
};

// Mock canvas for WebP detection
const mockCanvas = (webpSupported: boolean = true) => {
  const mockToDataURL = jest.fn(() => 
    webpSupported ? 'data:image/webp;base64,test' : 'data:image/png;base64,test'
  );
  
  Object.defineProperty(document, 'createElement', {
    value: jest.fn((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 1,
          height: 1,
          toDataURL: mockToDataURL,
        };
      }
      return {};
    }),
    writable: true,
  });
};

describe('Browser Detection', () => {
  beforeEach(() => {
    mockCanvas(true); // Default to WebP supported
  });

  describe('detectBrowser', () => {
    it('should detect Safari correctly', () => {
      mockNavigator(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
        'Apple Computer, Inc.'
      );
      
      const browser = detectBrowser();
      
      expect(browser.name).toBe('Safari');
      expect(browser.isSafari).toBe(true);
      expect(browser.hasCompressionIssues).toBe(true);
    });

    it('should detect Chrome correctly', () => {
      mockNavigator(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Google Inc.'
      );
      
      const browser = detectBrowser();
      
      expect(browser.name).toBe('Chrome');
      expect(browser.isChrome).toBe(true);
      expect(browser.hasCompressionIssues).toBe(false);
    });

    it('should detect iOS Safari correctly', () => {
      mockNavigator(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1'
      );
      
      const browser = detectBrowser();
      
      expect(browser.isSafari).toBe(true);
      expect(browser.isIOS).toBe(true);
      expect(browser.isMobile).toBe(true);
      expect(browser.hasCompressionIssues).toBe(true);
    });

    it('should detect Firefox correctly', () => {
      mockNavigator(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/120.0'
      );

      const browser = detectBrowser();

      expect(browser.name).toBe('Firefox');
      expect(browser.isFirefox).toBe(true);
      expect(browser.hasCompressionIssues).toBe(false);
    });

    it('should detect Brave correctly', () => {
      mockNavigator(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Mock Brave detection
      Object.defineProperty(navigator, 'brave', {
        value: { isBrave: () => Promise.resolve(true) },
        writable: true,
      });

      const browser = detectBrowser();

      expect(browser.name).toBe('Brave');
      expect(browser.isBrave).toBe(true);
      expect(browser.hasCompressionIssues).toBe(false);
    });
  });

  describe('getBrowserCapabilities', () => {
    it('should return Safari-optimized capabilities', () => {
      mockNavigator(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
        'Apple Computer, Inc.'
      );
      
      const capabilities = getBrowserCapabilities();
      
      expect(capabilities.canUseWebWorkers).toBe(false);
      expect(capabilities.maxQualityRecommended).toBe(0.85);
      expect(capabilities.compressionMethod).toBe('canvas');
      expect(capabilities.showCompatibilityWarning).toBe(true);
    });

    it('should return Chrome-optimized capabilities', () => {
      mockNavigator(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Google Inc.'
      );

      const capabilities = getBrowserCapabilities();

      expect(capabilities.canUseWebWorkers).toBe(true);
      expect(capabilities.maxQualityRecommended).toBe(1.0);
      expect(capabilities.compressionMethod).toBe('hybrid');
      expect(capabilities.showCompatibilityWarning).toBe(false);
    });

    it('should return Brave-optimized capabilities', () => {
      mockNavigator(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Mock Brave detection
      Object.defineProperty(navigator, 'brave', {
        value: { isBrave: () => Promise.resolve(true) },
        writable: true,
      });

      const capabilities = getBrowserCapabilities();

      expect(capabilities.canUseWebWorkers).toBe(true);
      expect(capabilities.maxQualityRecommended).toBe(1.0);
      expect(capabilities.compressionMethod).toBe('hybrid');
      expect(capabilities.showCompatibilityWarning).toBe(false);
    });

    it('should handle WebP support correctly', () => {
      mockCanvas(false); // WebP not supported
      mockNavigator(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1 Safari/605.1.15',
        'Apple Computer, Inc.'
      );
      
      const capabilities = getBrowserCapabilities();
      
      expect(capabilities.canUseWebP).toBe(false);
      expect(capabilities.recommendedFormat).toBe('jpeg');
    });
  });



  describe('needsCompatibilityMode', () => {
    it('should return true for Safari', () => {
      mockNavigator(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
        'Apple Computer, Inc.'
      );
      
      expect(needsCompatibilityMode()).toBe(true);
    });

    it('should return false for Chrome', () => {
      mockNavigator(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Google Inc.'
      );
      
      expect(needsCompatibilityMode()).toBe(false);
    });
  });
});
