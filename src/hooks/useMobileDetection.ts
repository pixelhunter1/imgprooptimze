import { useState, useEffect } from 'react';

interface MobileDetectionResult {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  screenSize: 'small' | 'medium' | 'large';
}

export function useMobileDetection(): MobileDetectionResult {
  const [detection, setDetection] = useState<MobileDetectionResult>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    deviceType: 'desktop',
    screenSize: 'large'
  });

  useEffect(() => {
    const detectDevice = () => {
      // User Agent detection
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTabletUA = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
      
      // Screen size detection
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // Touch capability detection
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Orientation detection
      const isLandscape = screenWidth > screenHeight;
      
      // Combined mobile detection
      const isMobileScreen = screenWidth < 768; // Less than tablet size
      const isTabletScreen = screenWidth >= 768 && screenWidth < 1024;
      const isDesktopScreen = screenWidth >= 1024;
      
      // Final determination
      let isMobile = false;
      let isTablet = false;
      let isDesktop = false;
      let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
      let screenSize: 'small' | 'medium' | 'large' = 'large';
      
      if (isMobileUA || (isMobileScreen && isTouchDevice)) {
        isMobile = true;
        deviceType = 'mobile';
        screenSize = 'small';
      } else if (isTabletUA || (isTabletScreen && isTouchDevice)) {
        isTablet = true;
        deviceType = 'tablet';
        screenSize = 'medium';
      } else {
        isDesktop = true;
        deviceType = 'desktop';
        screenSize = isDesktopScreen ? 'large' : 'medium';
      }
      
      // Special cases
      // iPad Pro in desktop mode should be treated as tablet
      if (userAgent.includes('ipad') || (userAgent.includes('mac') && isTouchDevice)) {
        isDesktop = false;
        isTablet = true;
        isMobile = false;
        deviceType = 'tablet';
      }
      
      // Small desktop screens should still be desktop
      if (!isTouchDevice && screenWidth >= 1024) {
        isMobile = false;
        isTablet = false;
        isDesktop = true;
        deviceType = 'desktop';
      }

      setDetection({
        isMobile,
        isTablet,
        isDesktop,
        deviceType,
        screenSize
      });
    };

    // Initial detection
    detectDevice();

    // Listen for resize events
    const handleResize = () => {
      detectDevice();
    };

    // Listen for orientation changes
    const handleOrientationChange = () => {
      // Delay to allow screen dimensions to update
      setTimeout(detectDevice, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return detection;
}

// Utility function for quick mobile check
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isMobileScreen = window.innerWidth < 768;
  
  return isMobileUA || (isMobileScreen && isTouchDevice);
}

// Utility function for tablet check
export function isTabletDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isTabletUA = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isTabletScreen = window.innerWidth >= 768 && window.innerWidth < 1024;
  
  return isTabletUA || (isTabletScreen && isTouchDevice);
}
