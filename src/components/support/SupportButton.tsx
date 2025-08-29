import { useState } from 'react';
import { Coffee, Bug, Heart } from 'lucide-react';

export default function SupportButton() {
  const [isHovered, setIsHovered] = useState(false);

  const handleBugReport = () => {
    const subject = encodeURIComponent('Bug Report - Image Optimizer');
    const body = encodeURIComponent(`
Bug Description:
[Describe the issue]

Steps to Reproduce:
1. 
2. 
3. 

Browser: ${navigator.userAgent}
Screen: ${window.innerWidth}x${window.innerHeight}
    `);
    window.open(`mailto:bugs@imageoptimizer.app?subject=${subject}&body=${body}`, '_blank');
  };

  const handleBuyCoffee = () => {
    window.open('https://buymeacoffee.com/imageoptimizer', '_blank');
  };

  const handleFeedback = () => {
    const subject = encodeURIComponent('Feedback - Image Optimizer');
    const body = encodeURIComponent(`
Feedback:
[Your thoughts and suggestions]

What works well:
[What you like]

Improvements:
[What could be better]
    `);
    window.open(`mailto:feedback@imageoptimizer.app?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div 
      className="fixed bottom-4 right-4 z-40"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Expanded Options */}
      {isHovered && (
        <div className="absolute bottom-16 right-0 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-2 min-w-[200px] animate-in slide-in-from-bottom-2 duration-200">
          <div className="space-y-1">
            <button
              onClick={handleBuyCoffee}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-md transition-colors"
            >
              <Coffee className="h-4 w-4 text-amber-600" />
              <span>Buy me a coffee ☕</span>
            </button>
            
            <button
              onClick={handleBugReport}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            >
              <Bug className="h-4 w-4 text-red-600" />
              <span>Report a bug</span>
            </button>
            
            <button
              onClick={handleFeedback}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-md transition-colors"
            >
              <Heart className="h-4 w-4 text-pink-600" />
              <span>Send feedback</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Button */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-3 shadow-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105">
        <Heart className="h-5 w-5 text-slate-600 dark:text-slate-400" />
      </div>
    </div>
  );
}
