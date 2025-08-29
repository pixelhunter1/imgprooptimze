import { useState } from 'react';
import { Bug, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { submitBugReport, type BugReportData } from '@/services/emailService';
import { SUPPORT_CONFIG, getBrowserInfo } from '@/config/support';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const [formData, setFormData] = useState({
    userEmail: '',
    bugDescription: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    additionalInfo: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const browserInfo = getBrowserInfo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.userEmail.trim()) {
      alert('Please provide your email address.');
      return;
    }

    if (!formData.bugDescription.trim()) {
      alert('Please describe the issue you found.');
      return;
    }

    setIsLoading(true);

    try {
      const bugReportData: BugReportData = {
        user_email: formData.userEmail,
        subject: `[BUG REPORT] ${SUPPORT_CONFIG.appName}`,
        message: `
BUG DESCRIPTION:
${formData.bugDescription}

STEPS TO REPRODUCE:
${formData.stepsToReproduce || 'Not specified'}

EXPECTED BEHAVIOR:
${formData.expectedBehavior || 'Not specified'}

ADDITIONAL INFORMATION:
${formData.additionalInfo || 'None'}
        `.trim(),
        browser_info: browserInfo.userAgent,
        screen_size: browserInfo.screenSize,
        device_type: browserInfo.deviceType,
        timestamp: new Date().toLocaleString('pt-PT'),
        app_version: SUPPORT_CONFIG.version,
      };

      const result = await submitBugReport(bugReportData);
      
      if (result.success) {
        if (result.method === 'emailjs') {
          alert('✅ Bug report sent successfully! Thank you for your feedback.');
        } else {
          alert('📧 Email client opened. Please send the email to complete the report.');
        }
        onClose();
        // Reset form
        setFormData({
          userEmail: '',
          bugDescription: '',
          stepsToReproduce: '',
          expectedBehavior: '',
          additionalInfo: ''
        });
      } else {
        alert('❌ Error sending bug report. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error in bug report:', error);
      alert('❌ Error sending bug report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <Bug className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Report Bug
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* User Email (Required) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Your email *
            </label>
            <input
              type="email"
              value={formData.userEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, userEmail: e.target.value }))}
              placeholder="your@email.com (for reply)"
              required
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Bug Description (Required) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Problem description *
            </label>
            <textarea
              value={formData.bugDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, bugDescription: e.target.value }))}
              placeholder="Describe the issue you found..."
              required
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-vertical"
            />
          </div>

          {/* Steps to Reproduce */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Steps to reproduce
            </label>
            <textarea
              value={formData.stepsToReproduce}
              onChange={(e) => setFormData(prev => ({ ...prev, stepsToReproduce: e.target.value }))}
              placeholder="1. First I did this...&#10;2. Then I clicked on...&#10;3. And then this happened..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-vertical"
            />
          </div>

          {/* Expected Behavior */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Expected behavior
            </label>
            <textarea
              value={formData.expectedBehavior}
              onChange={(e) => setFormData(prev => ({ ...prev, expectedBehavior: e.target.value }))}
              placeholder="What should have happened..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-vertical"
            />
          </div>

          {/* Additional Info */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Additional information
            </label>
            <textarea
              value={formData.additionalInfo}
              onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
              placeholder="Any other relevant information..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-vertical"
            />
          </div>

          {/* Technical Info Preview */}
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Technical information (included automatically):
            </h4>
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <div>Browser: {browserInfo.userAgent.substring(0, 60)}...</div>
              <div>Resolution: {browserInfo.screenSize}</div>
              <div>Device: {browserInfo.deviceType}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.bugDescription.trim() || !formData.userEmail.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Bug Report
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
