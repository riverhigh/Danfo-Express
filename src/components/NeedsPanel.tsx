import React from 'react';
import { GameState } from '../types/game';
import { Battery, Coffee, Gamepad2, Heart, Users, Droplets } from 'lucide-react';

interface NeedsPanelProps {
  needs: GameState['needs'];
}

export const NeedsPanel: React.FC<NeedsPanelProps> = ({ needs }) => {
  const getNeedColor = (val: number) => {
    if (val > 70) return 'bg-green-500';
    if (val > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getNeedText = (val: number) => {
    if (val > 70) return 'text-green-400';
    if (val > 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const NeedBar = ({ icon, label, val }: { icon: React.ReactNode, label: string, val: number }) => (
    <div className="flex items-center gap-2">
      <div className={`w-5 h-5 flex items-center justify-center ${getNeedText(val)}`}>{icon}</div>
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex justify-between items-center px-0.5">
          <span className="text-[9px] font-bold text-stone-300 uppercase tracking-wider">{label}</span>
          <span className={`text-[9px] font-black ${getNeedText(val)}`}>{Math.round(val)}%</span>
        </div>
        <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden border border-stone-700/50">
          <div className={`h-full ${getNeedColor(val)} transition-all duration-300`} style={{ width: `${val}%` }} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-48 bg-stone-900/80 backdrop-blur-md border border-stone-700 rounded-2xl p-3 shadow-xl space-y-2">
      <h3 className="text-[10px] text-stone-400 font-bold text-center border-b border-stone-800 pb-1 mb-2 font-mono">SIM NEEDS</h3>
      <NeedBar icon={<Coffee className="w-3.5 h-3.5" />} label="Hunger" val={needs.hunger} />
      <NeedBar icon={<Battery className="w-3.5 h-3.5" />} label="Energy" val={needs.energy} />
      <NeedBar icon={<Gamepad2 className="w-3.5 h-3.5" />} label="Fun" val={needs.fun} />
      <NeedBar icon={<Users className="w-3.5 h-3.5" />} label="Social" val={needs.social} />
      <NeedBar icon={<Droplets className="w-3.5 h-3.5" />} label="Hygiene" val={needs.hygiene} />
      <NeedBar icon={<Heart className="w-3.5 h-3.5" />} label="Bladder" val={needs.bladder} />
    </div>
  );
};

// We need an import for Users that wasn't in lucide-react above.
// Actually let's just use emojis if we lack imports, but lucide has 'Users'.
