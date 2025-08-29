import { useState, useEffect } from 'react';
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { detectBrowser, getBrowserCapabilities, type BrowserInfo } from '@/lib/browserDetection';

interface BrowserCompatibilityAlertProps {
  onDismiss?: () => void;
  className?: string;
}

export default function BrowserCompatibilityAlert({ onDismiss, className }: BrowserCompatibilityAlertProps) {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const browser = detectBrowser();
    setBrowserInfo(browser);
    
    const capabilities = getBrowserCapabilities(browser);
    const shouldShow = capabilities.showCompatibilityWarning && !sessionStorage.getItem('browserAlertDismissed');
    
    setIsVisible(shouldShow);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    sessionStorage.setItem('browserAlertDismissed', 'true');
    onDismiss?.();
  };

  if (!isVisible || isDismissed || !browserInfo) {
    return null;
  }







  return (
    <Alert variant="destructive" className={`border-amber-200 bg-amber-50 ${className}`}>
      <AlertIcon>
        <AlertTriangle className="h-4 w-4 text-amber-600" />
      </AlertIcon>
      <AlertContent>
        <AlertTitle className="flex items-center gap-2 text-amber-800 text-base font-semibold">
          <span>{browserInfo.name} Not Fully Supported</span>
        </AlertTitle>
        <AlertDescription className="text-amber-700 mt-3">
          <div className="space-y-4">
            <p className="text-sm">
              For the best image optimization experience, please use one of these recommended browsers:
            </p>

            <div className="flex flex-wrap gap-2">
              {['Chrome', 'Brave', 'Firefox', 'Edge'].map((browser) => (
                <div key={browser} className="bg-white/60 px-3 py-2 rounded-lg border border-amber-200">
                  <span className="text-sm font-medium text-amber-800">{browser}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-amber-600 bg-white/40 p-2 rounded border border-amber-200">
              <strong>Note:</strong> The app will still work in {browserInfo.name}, but with reduced performance and quality limitations.
            </p>
          </div>
        </AlertDescription>
      </AlertContent>
      <Button
        variant="ghost"
        size="sm"
        mode="icon"
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-amber-600 hover:text-amber-800"
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}

// Hook for browser compatibility
export function useBrowserCompatibility() {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [capabilities, setCapabilities] = useState<ReturnType<typeof getBrowserCapabilities> | null>(null);

  useEffect(() => {
    const browser = detectBrowser();
    const caps = getBrowserCapabilities(browser);
    
    setBrowserInfo(browser);
    setCapabilities(caps);
    
    // Log browser info in development
    if (import.meta.env.DEV) {
      console.group('🌐 Browser Compatibility');
      console.log('Browser:', browser.name, browser.version);
      console.log('Capabilities:', caps);
      console.groupEnd();
    }
  }, []);

  return {
    browserInfo,
    capabilities,
    needsCompatibilityMode: capabilities?.showCompatibilityWarning || false,
    isReady: browserInfo !== null && capabilities !== null
  };
}
