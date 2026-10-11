import React, { useEffect, useState } from 'react';
import { Bus, ShieldAlert, Sparkles, ArrowRight, Volume2 } from 'lucide-react';

interface SplashLoadingScreenProps {
  onFinishLoading: () => void;
}

const LOADING_TIPS = [
  'Building Oshodi Motor Park, Mainland High-Rises & Bustling Street Plazas...',
  'Syncing 10 Bus Stops: Ikeja Along → Allen → Maryland → Oshodi → Yaba → CMS...',
  'Erecting 3rd Mainland Bridge Gantry Banner & Federal Works Roadblock...',
  'Warming up VW T3 Danfo Diesel Engine, Side Mirrors & Sliding Door Track...',
  'Ready at Oshodi Park! Remember: Bus starts empty — pick up commuters at Stop #1!',
];

export const SplashLoadingScreen: React.FC<SplashLoadingScreenProps> = ({ onFinishLoading }) => {
  const [progress, setProgress] = useState<number>(0);
  const [tipIndex, setTipIndex] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(100, prev + 4);
        const idx = Math.min(LOADING_TIPS.length - 1, Math.floor((next / 100) * LOADING_TIPS.length));
        setTipIndex(idx);
        return next;
      });
    }, 85);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => {
        onFinishLoading();
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [progress, onFinishLoading]);

  return (
    <div className="fixed inset-0 z-[100] bg-stone-950 text-stone-100 flex flex-col justify-between overflow-hidden select-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Iconic Danfo Yellow & Black Diagonal Hazard Stripe */}
      <div
        className="w-full h-4 shrink-0 border-b-2 border-amber-400"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #facc15 0px, #facc15 20px, #0c0a09 20px, #0c0a09 40px)',
        }}
      />

      {/* Ambient Lagos Golden Hour Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[320px] bg-amber-400/15 blur-[110px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/3 w-[380px] h-[240px] bg-emerald-500/10 blur-[100px] rounded-full" />
      </div>

      {/* Center Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6 max-w-2xl mx-auto w-full text-center space-y-5">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/50 text-amber-300 text-[11px] font-mono font-bold tracking-wider uppercase shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>LAGOS 3D COMMERCIAL BUS SIMULATOR</span>
        </div>

        {/* Game Title */}
        <div className="space-y-1">
          <h1 className="text-4xl sm:text-6xl font-black font-['Bungee'] tracking-wider text-amber-400 drop-shadow-[0_4px_20px_rgba(250,204,21,0.35)]">
            DANFO EXPRESS
          </h1>
          <div className="inline-block bg-stone-900 border-2 border-stone-700 px-4 py-1 rounded-lg">
            <span className="text-xs sm:text-sm font-mono font-black tracking-widest text-emerald-400 uppercase">
              OSHODI • IKEJA • YABA • CMS • 3RD MAINLAND CORRIDOR
            </span>
          </div>
        </div>

        {/* Illustrated 3D-Style Lagos Yellow Danfo Bus Showcase */}
        <div className="relative w-full max-w-md bg-stone-900/90 border-2 border-amber-400/70 rounded-3xl p-5 shadow-[0_16px_50px_rgba(0,0,0,0.85)] overflow-hidden">
          {/* City Skyline Silhouette Behind Bus */}
          <div className="flex items-end justify-center gap-1.5 h-20 opacity-35 mb-1 px-2">
            {[42, 68, 54, 80, 62, 48, 76, 58, 70, 50, 65, 44].map((h, idx) => (
              <div
                key={idx}
                className="flex-1 bg-stone-700 rounded-t border-t border-x border-amber-400/30 flex flex-col justify-evenly items-center py-1"
                style={{ height: `${h}%` }}
              >
                <div className="w-1.5 h-1 bg-amber-300/60" />
                <div className="w-1.5 h-1 bg-amber-300/60" />
              </div>
            ))}
          </div>

          {/* Animated VW T3 Danfo Bus Graphic */}
          <div className="relative mx-auto w-64 sm:w-72 h-28 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 rounded-2xl border-2 border-stone-950 shadow-2xl flex flex-col justify-between p-2">
            {/* Roof Carrier Rack */}
            <div className="absolute -top-3.5 left-6 right-6 h-3 bg-stone-800 border border-stone-600 rounded-t-md flex items-center justify-around px-2">
              <div className="w-6 h-2 bg-rose-600 rounded-xs" />
              <div className="w-7 h-2 bg-sky-600 rounded-xs" />
              <div className="w-6 h-2 bg-emerald-600 rounded-xs" />
            </div>

            {/* Destination Top Banner */}
            <div className="bg-stone-950 text-amber-400 text-[8px] font-mono font-black tracking-widest py-0.5 px-2 rounded text-center border border-amber-400/40">
              OSHODI ➔ IKEJA ➔ YABA ➔ CMS • NO KING AS GOD
            </div>

            {/* Windows Row */}
            <div className="grid grid-cols-5 gap-1.5 h-9 px-1">
              <div className="bg-stone-900 rounded border border-stone-700 flex items-center justify-center text-[9px]">
                🧑🏾‍✈️
              </div>
              <div className="bg-stone-900/95 rounded border border-stone-700 flex items-center justify-center text-[8px] text-amber-300 font-mono">
                DOOR
              </div>
              <div className="bg-stone-900 rounded border border-stone-700" />
              <div className="bg-stone-900 rounded border border-stone-700" />
              <div className="bg-stone-900 rounded border border-stone-700 flex items-center justify-center text-[9px]">
                📢
              </div>
            </div>

            {/* Dual Iconic Black Danfo Stripes */}
            <div className="space-y-1 my-0.5">
              <div className="w-full h-2 bg-stone-950 rounded-xs flex items-center justify-between px-2">
                <span className="text-[7px] font-mono text-amber-400 font-black">LAGOS STATE COMMERCIAL</span>
                <span className="text-[7px] font-mono text-emerald-400 font-black">LSR-404-DF</span>
              </div>
              <div className="w-full h-1.5 bg-stone-950 rounded-xs" />
            </div>

            {/* Headlight & Taillight Glows */}
            <div className=" -right-1.5 bottom-3 absolute w-2.5 h-4 bg-amber-100 rounded-r shadow-[0_0_15px_#fef08a]" />
            <div className="-left-1.5 bottom-3 absolute w-2 h-4 bg-rose-500 rounded-l shadow-[0_0_12px_#f43f5e]" />

            {/* Wheels */}
            <div className="absolute -bottom-3.5 left-7 w-8 h-8 rounded-full bg-stone-950 border-2 border-stone-600 flex items-center justify-center animate-spin">
              <div className="w-3.5 h-3.5 rounded-full bg-stone-300 border border-stone-800" />
            </div>
            <div className="absolute -bottom-3.5 right-7 w-8 h-8 rounded-full bg-stone-950 border-2 border-stone-600 flex items-center justify-center animate-spin">
              <div className="w-3.5 h-3.5 rounded-full bg-stone-300 border border-stone-800" />
            </div>
          </div>

          {/* Road Asphalt Line under Bus */}
          <div className="mt-4 h-2 w-full bg-stone-800 rounded-full overflow-hidden flex items-center justify-around">
            <div className="w-8 h-0.5 bg-amber-400" />
            <div className="w-8 h-0.5 bg-amber-400" />
            <div className="w-8 h-0.5 bg-amber-400" />
            <div className="w-8 h-0.5 bg-amber-400" />
          </div>
        </div>

        {/* Progress Bar & Dynamic Street Loading Tip */}
        <div className="w-full max-w-md space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-amber-400 font-bold truncate pr-2">{LOADING_TIPS[tipIndex]}</span>
            <span className="text-emerald-400 font-black shrink-0">{progress}%</span>
          </div>
          <div className="w-full h-3.5 bg-stone-900 border-2 border-stone-700 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Skip / Enter Button */}
        <button
          onClick={onFinishLoading}
          className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 font-black font-['Bungee'] text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-400/20 flex items-center gap-2 transition-all cursor-pointer"
        >
          <span>{progress >= 100 ? 'ENTER OSHODI MOTOR PARK' : 'SKIP TO MOTOR PARK MENU'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Iconic Danfo Yellow & Black Diagonal Hazard Stripe */}
      <div
        className="w-full h-4 shrink-0 border-t-2 border-amber-400"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #facc15 0px, #facc15 20px, #0c0a09 20px, #0c0a09 40px)',
        }}
      />
    </div>
  );
};
