import { useState, useEffect } from 'react';
import { Sparkles, Zap, Coffee, Rocket, Star, Heart } from 'lucide-react';

interface ProcessingOverlayProps {
  isProcessing: boolean;
  currentImageName: string;
  currentImageProgress: number;
  processedCount: number;
  totalImages: number;
  format: string;
}

// Fun messages to show during processing
const funMessages = {
  avif: [
    { text: "Teaching pixels new compression tricks...", icon: Sparkles },
    { text: "AVIF magic in progress ✨", icon: Star },
    { text: "Squeezing every byte (gently)...", icon: Heart },
    { text: "Making your images lighter than air...", icon: Rocket },
    { text: "Brewing the perfect compression...", icon: Coffee },
    { text: "AVIF: Because WebP was too mainstream", icon: Zap },
    { text: "Converting pixels to pure efficiency...", icon: Sparkles },
    { text: "Your images are on a diet 🥗", icon: Heart },
    { text: "Compressing like there's no tomorrow...", icon: Rocket },
    { text: "Almost there, patience is a virtue...", icon: Star },
  ],
  default: [
    { text: "Optimizing your masterpiece...", icon: Sparkles },
    { text: "Making pixels dance...", icon: Star },
    { text: "Compression in progress...", icon: Zap },
    { text: "Shrinking with style...", icon: Rocket },
    { text: "Almost ready!", icon: Heart },
  ]
};

// Tips to show
const tips = [
  "💡 AVIF offers 30-50% better compression than WebP",
  "💡 Lower quality = smaller file, but watch for artifacts",
  "💡 WebP is great for web compatibility",
  "💡 PNG is lossless - perfect for graphics with text",
  "💡 JPEG is best for photos when size matters",
];

export default function ProcessingOverlay({
  isProcessing,
  currentImageName,
  currentImageProgress,
  processedCount,
  totalImages,
  format,
}: ProcessingOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  // Rotate messages every 2.5 seconds
  useEffect(() => {
    if (!isProcessing) return;

    const messages = format === 'avif' ? funMessages.avif : funMessages.default;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isProcessing, format]);

  // Rotate tips every 4 seconds
  useEffect(() => {
    if (!isProcessing) return;

    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isProcessing]);

  // Reset indices when starting new processing
  useEffect(() => {
    if (isProcessing) {
      setMessageIndex(0);
      setTipIndex(Math.floor(Math.random() * tips.length));
    }
  }, [isProcessing]);

  if (!isProcessing) return null;

  const messages = format === 'avif' ? funMessages.avif : funMessages.default;
  const currentMessage = messages[messageIndex];
  const IconComponent = currentMessage.icon;

  // Calculate total progress based on completed images + current image progress
  // Example: 2 images done, 3rd at 50%, total 5 images = (2*100 + 50) / 5 = 50%
  const currentImageIndex = processedCount; // 0-indexed
  const totalProgress = totalImages > 0
    ? Math.round(((currentImageIndex * 100) + currentImageProgress) / totalImages)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-8 w-full max-w-lg mx-4 shadow-2xl">

        {/* Animated icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
                <IconComponent className="h-8 w-8 text-emerald-400" />
              </div>
            </div>
            {/* Spinning ring */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 animate-spin" />
          </div>
        </div>

        {/* Fun message */}
        <div className="text-center mb-6">
          <p className="text-lg text-white font-medium transition-all duration-300">
            {currentMessage.text}
          </p>
        </div>

        {/* Progress section */}
        <div className="mb-6">
          {/* Progress info */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-neutral-400">
              Image {processedCount + 1} of {totalImages}
            </span>
            <span className="text-emerald-400 font-bold text-xl">
              {totalProgress}%
            </span>
          </div>

          {/* Single progress bar - TOTAL progress */}
          <div className="relative h-3 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${totalProgress}%` }}
            />
            {/* Shimmer effect */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"
              style={{ animationDuration: '2s', animationIterationCount: 'infinite' }}
            />
          </div>
        </div>

        {/* Current file */}
        <div className="bg-neutral-800/50 rounded-lg p-3 mb-4">
          <p className="text-xs text-neutral-500 mb-1">Processing file:</p>
          <p className="text-sm text-white font-mono truncate">
            {currentImageName || 'Preparing...'}
          </p>
        </div>

        {/* Format badge */}
        <div className="flex justify-center mb-4">
          <span className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium rounded-full">
            {format.toUpperCase()} Format
          </span>
        </div>

        {/* Tip */}
        <div className="text-center">
          <p className="text-xs text-neutral-500 transition-all duration-500">
            {tips[tipIndex]}
          </p>
        </div>
      </div>

      {/* Add shimmer animation styles */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
