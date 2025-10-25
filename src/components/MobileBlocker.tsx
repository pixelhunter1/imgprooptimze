import { Monitor } from 'lucide-react';

export default function MobileBlocker() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <Monitor className="h-20 w-20 text-primary" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-foreground">
          Desktop Only
        </h1>

        {/* Message */}
        <p className="text-muted-foreground leading-relaxed">
          Please access this app from a desktop or laptop computer.
        </p>
      </div>
    </div>
  );
}
