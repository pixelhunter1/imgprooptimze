import { useState } from 'react';
import { Bug, Heart, X, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SUPPORT_CONFIG, EMAIL_TEMPLATES, createEmailUrl } from '@/config/support';
import BugReportModal from './BugReportModal';

interface SupportOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  action: () => void;
  color: string;
  hoverColor: string;
}

export default function FloatingSupport() {
  const [isOpen, setIsOpen] = useState(false);
  const [showBugModal, setShowBugModal] = useState(false);

  const supportOptions: SupportOption[] = [
    ...(SUPPORT_CONFIG.showBugReport ? [{
      id: 'bug-report',
      label: 'Report Bug',
      icon: <Bug className="h-4 w-4" />,
      description: 'Found an issue? Let us know!',
      action: () => {
        console.log('🐛 Bug report button clicked');
        setShowBugModal(true);
        setIsOpen(false);
      },
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600'
    }] : []),

    ...(SUPPORT_CONFIG.showBuyCoffee ? [{
      id: 'donate',
      label: 'Donate',
      icon: <Heart className="h-4 w-4" />,
      description: 'Support the development 💝',
      action: () => {
        window.open(SUPPORT_CONFIG.buyMeCoffeeUrl, '_blank');
      },
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    }] : []),

    ...(SUPPORT_CONFIG.showFeedback ? [{
      id: 'feedback',
      label: 'Send Feedback',
      icon: <Heart className="h-4 w-4" />,
      description: 'Share your thoughts & suggestions',
      action: () => {
        const subject = EMAIL_TEMPLATES.feedback.subject(SUPPORT_CONFIG.appName);
        const body = EMAIL_TEMPLATES.feedback.body(SUPPORT_CONFIG.appName);
        const emailUrl = createEmailUrl(SUPPORT_CONFIG.feedbackEmail, subject, body);
        window.open(emailUrl, '_blank');
      },
      color: 'bg-pink-500',
      hoverColor: 'hover:bg-pink-600'
    }] : [])
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Support Options Menu */}
      {isOpen && (
        <div className="mb-4 space-y-2 animate-in slide-in-from-bottom-2 duration-200">
          {supportOptions.map((option) => (
            <div
              key={option.id}
              className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3 min-w-[280px]"
            >
              <div className={`p-2 rounded-lg ${option.color} text-white flex-shrink-0`}>
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                  {option.label}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                  {option.description}
                </p>
              </div>
              <Button
                size="sm"
                onClick={option.action}
                className={`${option.color} ${option.hoverColor} text-white border-0 h-8 px-3`}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Main Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          h-14 w-14 rounded-full shadow-lg transition-all duration-200 border-0
          ${isOpen 
            ? 'bg-slate-600 hover:bg-slate-700 rotate-45' 
            : 'bg-blue-600 hover:bg-blue-700 hover:scale-110'
          }
          text-white
        `}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>

      {/* Tooltip for closed state */}
      {!isOpen && (
        <div className="absolute bottom-16 right-0 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          Support & Feedback
        </div>
      )}

      {/* Bug Report Modal */}
      <BugReportModal
        isOpen={showBugModal}
        onClose={() => setShowBugModal(false)}
      />
    </div>
  );
}
