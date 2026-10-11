import React, { useState } from 'react';
import { Wrench, X, Shield, Sparkles, CheckCircle2, AlertCircle, Thermometer, Smile, Volume2, ShieldAlert } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { BusUpgrades } from '../types/game';

interface MechanicServiceModalProps {
  workshop: {
    id: string;
    name: string;
    specialty: string;
  };
  engineHeat: number;
  busComfort: number;
  busCondition?: number;
  upgrades: BusUpgrades;
  walletNaira: number;
  isOpen: boolean;
  onClose: () => void;
  onServiceApplied: (params: {
    newHeat?: number;
    newComfort?: number;
    newCondition?: number;
    newUpgrades?: Partial<BusUpgrades>;
    costNaira: number;
    serviceName: string;
  }) => void;
}

export const MechanicServiceModal: React.FC<MechanicServiceModalProps> = ({
  workshop,
  engineHeat,
  busComfort,
  busCondition = 75,
  upgrades,
  walletNaira,
  isOpen,
  onClose,
  onServiceApplied,
}) => {
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [isServicing, setIsServicing] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleApplyService = (
    name: string,
    cost: number,
    action: () => {
      newHeat?: number;
      newComfort?: number;
      newCondition?: number;
      newUpgrades?: Partial<BusUpgrades>;
    }
  ) => {
    if (walletNaira < cost || isServicing) return;

    setIsServicing(true);
    soundEngine.playCoin();

    setTimeout(() => {
      soundEngine.playCoin();
      const updates = action();
      onServiceApplied({
        ...updates,
        costNaira: cost,
        serviceName: name,
      });
      setIsServicing(false);
      setActiveMessage(`“Sharp! ${name} complete! Your Danfo dey sound sweet like new!”`);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md pointer-events-auto">
      <div className="relative w-full max-w-lg bg-stone-950 border-2 border-sky-400 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] flex flex-col text-stone-100 font-sans animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-2xl shadow-inner">
              🔧
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black font-['Bungee'] text-sky-400 truncate max-w-[240px]">
                {workshop.name}
              </h3>
              <p className="text-[10px] font-mono text-stone-400 truncate max-w-[260px]">
                {workshop.specialty}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800/80 hover:bg-stone-700 active:scale-95 text-stone-300 flex items-center justify-center border border-stone-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mechanic Speech Bubble */}
        <div className="my-3 p-3 bg-stone-900/90 border border-stone-800 rounded-xl flex items-start gap-3">
          <span className="text-2xl shrink-0">👨🏾‍🔧</span>
          <div className="text-xs">
            <span className="font-bold text-sky-300 font-mono">Baba Kazeem (Chief Mechanic):</span>
            <p className="text-stone-300 text-[11px] mt-0.5 leading-snug">
              {activeMessage ||
                '“Oga driver! Good thing you park enter compound. Let me check the radiator, suspension shocks, and engine for you!”'}
            </p>
          </div>
        </div>

        {/* Vehicle Condition Diagnostics */}
        <div className="grid grid-cols-3 gap-2 p-2.5 bg-stone-900/80 border border-stone-800 rounded-xl text-center font-mono">
          <div className="p-1">
            <span className="text-[9px] text-stone-400 block flex items-center justify-center gap-1">
              <Thermometer className="w-3 h-3 text-sky-400" />
              HEAT
            </span>
            <span
              className={`text-sm font-black tabular-nums ${
                engineHeat > 80 ? 'text-rose-400' : engineHeat > 50 ? 'text-amber-400' : 'text-sky-300'
              }`}
            >
              {engineHeat.toFixed(0)}°C
            </span>
            <span className="text-[8px] text-stone-500 block">
              {engineHeat > 80 ? 'DANGER' : 'COOL'}
            </span>
          </div>

          <div className="p-1 border-x border-stone-800">
            <span className="text-[9px] text-stone-400 block flex items-center justify-center gap-1">
              <Smile className="w-3 h-3 text-emerald-400" />
              COMFORT
            </span>
            <span className="text-sm font-black text-emerald-400 tabular-nums">
              {busComfort.toFixed(0)}%
            </span>
            <span className="text-[8px] text-stone-500 block">
              {busComfort < 40 ? 'BUMPY' : 'SMOOTH'}
            </span>
          </div>

          <div className="p-1">
            <span className="text-[9px] text-stone-400 block flex items-center justify-center gap-1">
              <Shield className="w-3 h-3 text-amber-400" />
              WALLET
            </span>
            <span className="text-sm font-black text-amber-400 tabular-nums">
              ₦{walletNaira.toLocaleString()}
            </span>
            <span className="text-[8px] text-stone-500 block">CASH</span>
          </div>
        </div>

        {/* Available Mechanic Services */}
        <div className="mt-3 flex flex-col gap-2">
          <div className="text-[10px] font-mono text-stone-400 font-bold uppercase tracking-wider">
            Available Services & Upgrades:
          </div>

          {/* 1. Radiator & Coolant Flush */}
          <div className="p-3 bg-stone-900/70 border border-stone-800 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center justify-center text-lg shrink-0">
                ❄️
              </div>
              <div>
                <div className="text-xs font-bold text-white">Radiator Flush & Pipe Seal</div>
                <div className="text-[10px] text-stone-400">
                  Cools engine to 15°C, clears airlocks and boiling water
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={walletNaira < 350 || engineHeat <= 20 || isServicing}
              onClick={() =>
                handleApplyService('Radiator Flush', 350, () => ({
                  newHeat: 15,
                }))
              }
              className="py-1.5 px-3 bg-sky-500 hover:bg-sky-400 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-stone-950 font-black text-[10px] font-['Bungee'] rounded-lg shrink-0 shadow transition"
            >
              {engineHeat <= 20 ? 'ALREADY COOL' : '₦350 • FLUSH'}
            </button>
          </div>

          {/* 2. Chassis & Suspension Overhaul */}
          <div className="p-3 bg-stone-900/70 border border-stone-800 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center text-lg shrink-0">
                🛞
              </div>
              <div>
                <div className="text-xs font-bold text-white">Full Suspension & Shocks Tune</div>
                <div className="text-[10px] text-stone-400">
                  Restores Bus Comfort to 100% and fixes wheel alignment
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={walletNaira < 650 || busComfort >= 98 || isServicing}
              onClick={() =>
                handleApplyService('Suspension Overhaul', 650, () => ({
                  newComfort: 100,
                  newCondition: 100,
                }))
              }
              className="py-1.5 px-3 bg-emerald-400 hover:bg-emerald-300 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-stone-950 font-black text-[10px] font-['Bungee'] rounded-lg shrink-0 shadow transition"
            >
              {busComfort >= 98 ? '100% SMOOTH' : '₦650 • OVERHAUL'}
            </button>
          </div>

          {/* 3. Heavy Bull-Bar Installation */}
          <div className="p-3 bg-stone-900/70 border border-stone-800 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center text-lg shrink-0">
                🛡️
              </div>
              <div>
                <div className="text-xs font-bold text-white">Heavy Front Steel Bull-Bar</div>
                <div className="text-[10px] text-stone-400">
                  Protects Danfo front end from highway bumps and agbero impact
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={upgrades.heavyBullBar || walletNaira < 1200 || isServicing}
              onClick={() =>
                handleApplyService('Heavy Steel Bull-Bar', 1200, () => ({
                  newUpgrades: { heavyBullBar: true },
                }))
              }
              className="py-1.5 px-3 bg-amber-400 hover:bg-amber-300 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-stone-950 font-black text-[10px] font-['Bungee'] rounded-lg shrink-0 shadow transition"
            >
              {upgrades.heavyBullBar ? 'INSTALLED' : '₦1,200 • INSTALL'}
            </button>
          </div>

          {/* 4. Dual Radiator High-Flow Fan */}
          <div className="p-3 bg-stone-900/70 border border-stone-800 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center text-lg shrink-0">
                💨
              </div>
              <div>
                <div className="text-xs font-bold text-white">Dual Radiator High-Flow Fan</div>
                <div className="text-[10px] text-stone-400">
                  Doubles continuous cooling speed while driving
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={upgrades.dualRadiatorFan || walletNaira < 1000 || isServicing}
              onClick={() =>
                handleApplyService('Dual Radiator Fan', 1000, () => ({
                  newUpgrades: { dualRadiatorFan: true },
                  newHeat: 15,
                }))
              }
              className="py-1.5 px-3 bg-cyan-400 hover:bg-cyan-300 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-stone-950 font-black text-[10px] font-['Bungee'] rounded-lg shrink-0 shadow transition"
            >
              {upgrades.dualRadiatorFan ? 'INSTALLED' : '₦1,000 • TUNE'}
            </button>
          </div>

          {/* 5. Roof Mega-Speakers */}
          <div className="p-3 bg-stone-900/70 border border-stone-800 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center justify-center text-lg shrink-0">
                🔊
              </div>
              <div>
                <div className="text-xs font-bold text-white">Roof Mega-Speakers Sound Blast</div>
                <div className="text-[10px] text-stone-400">
                  Blasts high-energy Afrobeat to attract more passenger fares
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={upgrades.roofMegaSpeakers || walletNaira < 1500 || isServicing}
              onClick={() =>
                handleApplyService('Roof Mega-Speakers', 1500, () => ({
                  newUpgrades: { roofMegaSpeakers: true },
                }))
              }
              className="py-1.5 px-3 bg-purple-400 hover:bg-purple-300 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-stone-950 font-black text-[10px] font-['Bungee'] rounded-lg shrink-0 shadow transition"
            >
              {upgrades.roofMegaSpeakers ? 'INSTALLED' : '₦1,500 • INSTALL'}
            </button>
          </div>
        </div>

        {/* Footer Walk Back Button */}
        <div className="mt-4 pt-3 border-t border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 font-black text-xs font-['Bungee'] rounded-xl transition shadow flex items-center justify-center gap-2"
          >
            <span>WALK BACK TO DANFO BUS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
