import { Zap } from 'lucide-react';

export default function Hero() {
    return (
        <div className="relative py-12 sm:py-16 lg:py-20 flex flex-col items-center text-center overflow-hidden">
            {/* Background Glow Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] -z-10 opacity-50 pointer-events-none" />

            <div className="space-y-6 max-w-3xl px-4 relative z-10">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium animate-fade-in">
                    <Zap className="w-4 h-4" />
                    <span>Professional Image Optimization</span>
                </div>

                {/* Title */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground">
                    Optimize Images without <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
                        Losing Quality
                    </span>
                </h1>

                {/* Description */}
                <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    Compress JPEG, PNG, and WebP images locally in your browser.
                    Privacy-focused, no server uploads, and lightning fast.
                </p>
            </div>
        </div>
    );
}
