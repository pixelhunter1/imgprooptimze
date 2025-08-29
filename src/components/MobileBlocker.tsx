import { Monitor, Smartphone, AlertCircle } from 'lucide-react';

export default function MobileBlocker() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Monitor className="h-16 w-16 text-blue-600 dark:text-blue-400" />
            <div className="absolute -bottom-2 -right-2 bg-red-500 rounded-full p-1">
              <Smartphone className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
          Desktop Required
        </h1>

        {/* Description */}
        <div className="space-y-4 text-slate-600 dark:text-slate-300">
          <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 mb-4">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Not available on mobile devices</span>
          </div>

          <p className="text-sm leading-relaxed">
            This image optimization app requires a
            <strong className="text-slate-900 dark:text-slate-100"> desktop or laptop computer</strong>.
          </p>

          <p className="text-sm leading-relaxed">
            Please access from a computer for the best experience.
          </p>
        </div>

        {/* Features that require desktop */}
        <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Desktop features:
          </h3>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 text-left">
            <li>• Batch image processing</li>
            <li>• Drag & drop files</li>
            <li>• ZIP downloads</li>
            <li>• Optimized interface</li>
          </ul>
        </div>

        {/* Browser recommendation */}
        <div className="mt-6 text-xs text-slate-500 dark:text-slate-400">
          <p>Recommended: Chrome, Firefox, Safari, or Edge</p>
          <p>on desktop or laptop</p>
        </div>

        {/* Debug Info */}
        <div className="mt-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-xs text-yellow-800 dark:text-yellow-200 font-mono">
            Debug: {navigator.userAgent.substring(0, 50)}...
          </p>
          <p className="text-xs text-yellow-800 dark:text-yellow-200 font-mono">
            Screen: {window.innerWidth}x{window.innerHeight}
          </p>
          <p className="text-xs text-yellow-800 dark:text-yellow-200 font-mono">
            Touch: {('ontouchstart' in window) ? 'Yes' : 'No'}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-600">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Image Pro Optimizer - Desktop Version
          </p>
        </div>
      </div>
    </div>
  );
}
