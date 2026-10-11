import React, { useEffect, useState } from 'react';
import { Download, Share, PlusSquare, Smartphone, X, CheckCircle2, Sparkles } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaInstallBannerProps {
  forceShow?: boolean;
  onClose?: () => void;
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({ forceShow = false, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'ANDROID' | 'IOS'>(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) return 'IOS';
    }
    return 'ANDROID';
  });
  const [androidTipOpen, setAndroidTipOpen] = useState<boolean>(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleAndroidInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setAndroidTipOpen((prev) => !prev);
    }
  };

  if (isInstalled && !forceShow) return null;
  if (dismissed && !forceShow) return null;

  return (
    <div className="relative w-full bg-gradient-to-r from-stone-900 via-stone-900/95 to-stone-900 border-2 border-amber-400 rounded-2xl p-3.5 sm:p-4 shadow-[0_10px_30px_rgba(0,0,0,0.75)] overflow-hidden">
      {/* Top Yellow-Black Accent Bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #facc15 0px, #facc15 12px, #0c0a09 12px, #0c0a09 24px)',
        }}
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
        {/* Left: Why It's Important to Install */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black font-['Bungee'] text-lg shrink-0 shadow-md border-2 border-stone-950">
            📲
          </div>
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-400 text-stone-950 font-mono font-black text-[10px] uppercase">
                IMPORTANT FOR DRIVERS
              </span>
              <span className="text-xs sm:text-sm font-black font-['Bungee'] text-amber-400 tracking-wide">
                INSTALL DANFO EXPRESS APP (PWA)
              </span>
            </div>
            <p className="text-xs text-stone-300 leading-snug">
              Installing unlocks <strong className="text-white">Full-Screen Landscape Cockpit View</strong> (removes browser address bars),{' '}
              <strong className="text-emerald-400">60 FPS Zero-Lag Steering</strong>, and <strong className="text-amber-300">Offline Lagos 3D Models</strong>!
            </p>
          </div>
        </div>

        {/* Right: Platform Switcher & Dismiss */}
        <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
          <button
            onClick={() => setActiveGuideTab('ANDROID')}
            className={`px-3 py-1.5 rounded-xl font-mono font-black text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
              activeGuideTab === 'ANDROID'
                ? 'bg-emerald-400 text-stone-950 border-emerald-200 shadow-md'
                : 'bg-stone-950 text-stone-300 border-stone-700 hover:border-stone-500'
            }`}
          >
            <span>🤖 ANDROID</span>
          </button>
          <button
            onClick={() => setActiveGuideTab('IOS')}
            className={`px-3 py-1.5 rounded-xl font-mono font-black text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
              activeGuideTab === 'IOS'
                ? 'bg-amber-400 text-stone-950 border-amber-200 shadow-md'
                : 'bg-stone-950 text-stone-300 border-stone-700 hover:border-stone-500'
            }`}
          >
            <span>🍏 iPHONE / iOS</span>
          </button>
          <button
            onClick={() => {
              setDismissed(true);
              onClose?.();
            }}
            className="p-1.5 rounded-lg bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 cursor-pointer"
            title="Hide Install Banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Platform-Specific Instructions Box */}
      <div className="mt-3 pt-2.5 border-t border-stone-800/90 grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {/* Android Box */}
        <div
          className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
            activeGuideTab === 'ANDROID'
              ? 'bg-stone-950 border-emerald-400/80 ring-1 ring-emerald-400/30'
              : 'bg-stone-950/60 border-stone-800 opacity-85'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🤖</span>
              <div>
                <div className="text-xs font-black text-emerald-400 font-mono uppercase">
                  ANDROID PHONES & TABLETS (CHROME)
                </div>
                <div className="text-[11px] text-stone-300">
                  Essential for full-screen landscape steering without browser bars.
                </div>
              </div>
            </div>
            <button
              onClick={handleAndroidInstallClick}
              className="px-3.5 py-2 bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-stone-950 font-black font-['Bungee'] text-[11px] rounded-xl shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>INSTALL APP</span>
            </button>
          </div>

          {(androidTipOpen || !deferredPrompt) && (
            <div className="text-[11px] font-mono text-stone-300 bg-stone-900/90 px-2.5 py-1.5 rounded-lg border border-stone-800 flex flex-wrap items-center gap-1.5">
              <span className="text-emerald-400 font-bold">How to Install on Android:</span>
              <span>1. Tap Chrome Menu</span>
              <span className="px-1.5 py-0.5 bg-stone-800 rounded text-amber-300 font-bold">⋮</span>
              <span>→ 2. Tap</span>
              <span className="px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-400/40 rounded text-emerald-300 font-bold">
                Install app / Add to Home screen
              </span>
            </div>
          )}
        </div>

        {/* iPhone / iOS Box */}
        <div
          className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
            activeGuideTab === 'IOS'
              ? 'bg-stone-950 border-amber-400/90 ring-1 ring-amber-400/30'
              : 'bg-stone-950/60 border-stone-800 opacity-85'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🍏</span>
            <div>
              <div className="text-xs font-black text-amber-400 font-mono uppercase">
                iPHONE & iPAD USERS (SAFARI)
              </div>
              <div className="text-[11px] text-stone-300">
                iOS requires 2 quick taps in Safari to install to your Home Screen:
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-stone-200 bg-stone-900/90 px-2.5 py-1.5 rounded-lg border border-stone-800 flex flex-wrap items-center gap-1.5">
            <span>1. Tap</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-sky-500/20 border border-sky-400/50 rounded text-sky-300 font-bold">
              <Share className="w-3 h-3" /> Share
            </span>
            <span>in Safari bar → 2. Tap</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-400/20 border border-amber-400/50 rounded text-amber-300 font-bold">
              <PlusSquare className="w-3 h-3" /> Add to Home Screen
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
