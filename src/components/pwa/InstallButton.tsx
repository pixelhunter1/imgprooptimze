import { useReducer, useEffect } from 'react';
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

type InstallState = {
  deferredPrompt: BeforeInstallPromptEvent | null;
  showBanner: boolean;
  isInstalled: boolean;
};

type InstallAction =
  | { type: 'PROMPT_READY'; prompt: BeforeInstallPromptEvent }
  | { type: 'SHOW_BANNER' }
  | { type: 'INSTALLED' }
  | { type: 'PROMPT_USED' }
  | { type: 'DISMISS_BANNER' };

const initialState: InstallState = {
  deferredPrompt: null,
  showBanner: false,
  isInstalled: false,
};

function installReducer(state: InstallState, action: InstallAction): InstallState {
  switch (action.type) {
    case 'PROMPT_READY':
      return { ...state, deferredPrompt: action.prompt };
    case 'SHOW_BANNER':
      return { ...state, showBanner: true };
    case 'INSTALLED':
      return { ...state, isInstalled: true, showBanner: false, deferredPrompt: null };
    case 'PROMPT_USED':
      return { ...state, deferredPrompt: null, showBanner: false };
    case 'DISMISS_BANNER':
      return { ...state, showBanner: false };
    default:
      return state;
  }
}

export default function InstallButton() {
  const [state, dispatch] = useReducer(installReducer, initialState);

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        dispatch({ type: 'INSTALLED' });
        return;
      }

      // Check for iOS standalone mode
      if ((window.navigator as any).standalone === true) {
        dispatch({ type: 'INSTALLED' });
        return;
      }
    };

    checkIfInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      dispatch({ type: 'PROMPT_READY', prompt: e as BeforeInstallPromptEvent });

      // Show install banner after a delay
      setTimeout(() => {
        dispatch({ type: 'SHOW_BANNER' });
      }, 3000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      dispatch({ type: 'INSTALLED' });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!state.deferredPrompt) return;

    try {
      await state.deferredPrompt.prompt();
      const { outcome } = await state.deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }

      dispatch({ type: 'PROMPT_USED' });
    } catch (error) {
      console.error('Error during installation:', error);
    }
  };

  const handleDismissBanner = () => {
    dispatch({ type: 'DISMISS_BANNER' });
    // Don't show again for this session
    sessionStorage.setItem('installBannerDismissed', 'true');
  };

  // Don't show if already installed or dismissed this session
  if (state.isInstalled || sessionStorage.getItem('installBannerDismissed')) {
    return null;
  }

  // Install banner
  if (state.showBanner && state.deferredPrompt) {
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
                aria-label="Dispensar"
                className="px-2"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Inline install button (for header or toolbar)
  if (state.deferredPrompt) {
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
