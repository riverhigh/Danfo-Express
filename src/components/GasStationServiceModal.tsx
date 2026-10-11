import React, { useState } from 'react';
import { Fuel, X, Droplets, CheckCircle2, AlertCircle, Coins, ChevronRight } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface GasStationServiceModalProps {
  station: {
    id: string;
    name: string;
    brand: string;
    pricePerLiter?: number;
  };
  currentFuel: number; // 0 - 100%
  walletNaira: number;
  isOpen: boolean;
  onClose: () => void;
  onRefuelSuccess: (litersAdded: number, costNaira: number) => void;
}

export const GasStationServiceModal: React.FC<GasStationServiceModalProps> = ({
  station,
  currentFuel,
  walletNaira,
  isOpen,
  onClose,
  onRefuelSuccess,
}) => {
  const pricePerLiter = station.pricePerLiter || 500;
  const maxTankCapacityLiters = 50;
  const currentLitersInTank = (currentFuel / 100) * maxTankCapacityLiters;
  const maxLitersCanAdd = Math.max(0, maxTankCapacityLiters - currentLitersInTank);

  const defaultFillLiters = Math.min(20, Math.ceil(maxLitersCanAdd));
  const [selectedLiters, setSelectedLiters] = useState<number>(defaultFillLiters);
  const [isDispensing, setIsDispensing] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [completedStats, setCompletedStats] = useState<{ liters: number; cost: number } | null>(null);

  if (!isOpen) return null;

  const totalCost = Math.round(selectedLiters * pricePerLiter);
  const canAfford = walletNaira >= totalCost;
  const isTankAlreadyFull = currentFuel >= 99.5;

  const handleDispense = () => {
    if (selectedLiters <= 0 || !canAfford || isTankAlreadyFull || isDispensing) return;

    setIsDispensing(true);
    soundEngine.playCoin();

    setTimeout(() => {
      soundEngine.playCoin();
      setIsDispensing(false);
      setIsCompleted(true);
      setCompletedStats({ liters: selectedLiters, cost: totalCost });
      onRefuelSuccess(selectedLiters, totalCost);
    }, 1200);
  };

  const handlePreset = (liters: number) => {
    setSelectedLiters(Math.min(Math.round(maxLitersCanAdd), liters));
  };

  const brandColor =
    station.brand === 'TOTAL'
      ? 'border-rose-500 text-rose-400 bg-rose-500/10'
      : station.brand === 'CONOIL'
      ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
      : 'border-sky-500 text-sky-400 bg-sky-500/10';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md pointer-events-auto">
      <div className="relative w-full max-w-md bg-stone-950 border-2 border-amber-500/80 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] flex flex-col text-stone-100 font-sans animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl shadow-inner">
              ⛽
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black font-['Bungee'] text-amber-400 truncate max-w-[220px]">
                  {station.name}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${brandColor} font-black`}>
                  {station.brand} OFFICIAL BAY
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  ₦{pricePerLiter}/Liter
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800/80 hover:bg-stone-700 active:scale-95 text-stone-300 flex items-center justify-center border border-stone-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Attendant Speech Bubble */}
        <div className="my-3 p-3 bg-stone-900/90 border border-stone-800 rounded-xl flex items-start gap-3">
          <span className="text-2xl shrink-0">👨🏾‍💼</span>
          <div className="text-xs">
            <span className="font-bold text-amber-300 font-mono">Aminu (Pump Attendant):</span>
            <p className="text-stone-300 text-[11px] mt-0.5 leading-snug">
              {isCompleted
                ? '“Oga, fuel don flow well into your tank! Receipt dey with you. Safe trip on expressway!”'
                : isTankAlreadyFull
                ? '“Ah oga driver! Your tank dey brim full already (100%)! No need to waste Naira!”'
                : '“Welcome oga driver! Good thing you park enter pump apron. How many liters make I pump for you today?”'}
            </p>
          </div>
        </div>

        {/* Live Diesel Tank Gauge */}
        <div className="p-3 bg-stone-900/60 border border-stone-800/80 rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="text-stone-400 flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-amber-400" />
              CURRENT DIESEL LEVEL
            </span>
            <span className={currentFuel < 25 ? 'text-rose-400 font-black' : 'text-emerald-400 font-black'}>
              {currentFuel.toFixed(0)}% ({currentLitersInTank.toFixed(1)} / {maxTankCapacityLiters}L)
            </span>
          </div>
          <div className="w-full h-3.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                currentFuel < 25
                  ? 'bg-rose-500'
                  : currentFuel < 60
                  ? 'bg-amber-400'
                  : 'bg-gradient-to-r from-amber-400 to-emerald-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(4, currentFuel))}%` }}
            />
          </div>
        </div>

        {!isCompleted ? (
          <>
            {/* Quick Liters Selector */}
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="text-[10px] font-mono text-stone-400 font-bold uppercase tracking-wider">
                Select Refueling Amount:
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={maxLitersCanAdd < 5}
                  onClick={() => handlePreset(10)}
                  className={`py-2 px-1 rounded-xl border text-center font-mono font-black transition text-xs ${
                    selectedLiters === 10
                      ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md'
                      : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-amber-400/50'
                  }`}
                >
                  <div>10 Liters</div>
                  <div className="text-[9px] opacity-80 font-normal">₦5,000</div>
                </button>

                <button
                  type="button"
                  disabled={maxLitersCanAdd < 15}
                  onClick={() => handlePreset(20)}
                  className={`py-2 px-1 rounded-xl border text-center font-mono font-black transition text-xs ${
                    selectedLiters === 20
                      ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md'
                      : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-amber-400/50'
                  }`}
                >
                  <div>20 Liters</div>
                  <div className="text-[9px] opacity-80 font-normal">₦10,000</div>
                </button>

                <button
                  type="button"
                  disabled={maxLitersCanAdd <= 0.5}
                  onClick={() => handlePreset(Math.ceil(maxLitersCanAdd))}
                  className={`py-2 px-1 rounded-xl border text-center font-mono font-black transition text-xs ${
                    selectedLiters === Math.ceil(maxLitersCanAdd) && selectedLiters > 0
                      ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md'
                      : 'bg-stone-900 border-stone-700 text-stone-300 hover:border-amber-400/50'
                  }`}
                >
                  <div>Full Tank</div>
                  <div className="text-[9px] opacity-80 font-normal">
                    {Math.ceil(maxLitersCanAdd)}L (₦{(Math.ceil(maxLitersCanAdd) * pricePerLiter).toLocaleString()})
                  </div>
                </button>
              </div>

              {/* Slider for custom liters */}
              <div className="mt-2 flex items-center gap-3 bg-stone-900/80 p-2.5 rounded-xl border border-stone-800">
                <span className="text-[10px] font-mono text-stone-400 shrink-0">Custom:</span>
                <input
                  type="range"
                  min="1"
                  max={Math.max(1, Math.ceil(maxLitersCanAdd))}
                  value={selectedLiters}
                  onChange={(e) => setSelectedLiters(Number(e.target.value))}
                  disabled={maxLitersCanAdd <= 0.5}
                  className="w-full accent-amber-400 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-mono font-black text-amber-300 shrink-0 tabular-nums">
                  {selectedLiters} L
                </span>
              </div>
            </div>

            {/* Cost & Wallet Breakdown */}
            <div className="mt-3 p-3 bg-stone-900/90 border border-stone-800 rounded-xl flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-[10px] text-stone-400 block">TOTAL TO PAY</span>
                <span className="text-base font-black text-amber-400 tabular-nums">
                  ₦{totalCost.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-stone-400 block">YOUR WALLET CASH</span>
                <span
                  className={`text-sm font-black tabular-nums ${
                    canAfford ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  ₦{walletNaira.toLocaleString()}
                </span>
              </div>
            </div>

            {!canAfford && (
              <div className="mt-2 text-[10px] font-mono text-rose-400 flex items-center gap-1.5 bg-rose-950/40 border border-rose-800/60 p-2 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Insufficient cash in wallet! Need ₦{(totalCost - walletNaira).toLocaleString()} more.</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleDispense}
                disabled={!canAfford || selectedLiters <= 0 || isTankAlreadyFull || isDispensing}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 font-black text-xs font-['Bungee'] rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
              >
                {isDispensing ? (
                  <>
                    <Fuel className="w-4 h-4 animate-spin text-stone-950" />
                    <span>PUMPING DIESEL...</span>
                  </>
                ) : isTankAlreadyFull ? (
                  <span>TANK ALREADY FULL</span>
                ) : (
                  <>
                    <Fuel className="w-4 h-4" />
                    <span>PAY ₦{totalCost.toLocaleString()} & PUMP FUEL</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          /* Completed View */
          <div className="mt-4 flex flex-col gap-3">
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/60 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-black text-emerald-300 font-['Bungee']">
                  REFUELING COMPLETE!
                </div>
                <div className="text-[11px] font-mono text-stone-300 mt-0.5">
                  Added +{completedStats?.liters}L of diesel for ₦{completedStats?.cost.toLocaleString()}.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 font-black text-xs font-['Bungee'] rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
            >
              <span>WALK BACK TO DANFO BUS</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
