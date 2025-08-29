import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }
      
      // Check for iOS standalone mode
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return;
      }
    };

    checkIfInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show install banner after a delay
      setTimeout(() => {
        setShowInstallBanner(true);
      }, 3000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    } catch (error) {
      console.error('Error during installation:', error);
    }
  };

  const handleDismissBanner = () => {
    setShowInstallBanner(false);
    // Don't show again for this session
    sessionStorage.setItem('installBannerDismissed', 'true');
  };

  // Don't show if already installed or dismissed this session
  if (isInstalled || sessionStorage.getItem('installBannerDismissed')) {
    return null;
  }

  // Install banner
  if (showInstallBanner && deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-card border border-border rounded-lg shadow-lg p-4 max-w-sm mx-auto">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <img src="/app-icon.svg" alt="App Icon" className="h-10 w-10 rounded-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground">
              Install Image Optimizer
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Add to your home screen for quick access and offline use
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleInstallClick}
                className="flex-1"
              >
                Install
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismissBanner}
                className="px-2"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Inline install button (for header or toolbar)
  if (deferredPrompt) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleInstallClick}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Install App
      </Button>
    );
  }

  return null;
}
