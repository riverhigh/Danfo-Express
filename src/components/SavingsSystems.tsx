import React, { useState } from 'react';
import { PiggyBank, Hammer, X, ArrowDown, ArrowUp, AlertTriangle, Check } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

// ─── AJO SYSTEM ──────────────────────────────────────────────────────────────
// Weekly group savings where members take turns collecting the full pot.

interface AjoProps {
  walletNaira: number;
  ajoBalanceNaira: number;
  onContribute: (amount: number) => void;
  onCollect: (amount: number) => void;
}

export const AjoApp: React.FC<AjoProps> = ({ walletNaira, ajoBalanceNaira, onContribute, onCollect }) => {
  const [step, setStep] = useState<'HOME' | 'CONTRIBUTE' | 'COLLECT'>('HOME');
  const [amount, setAmount] = useState('');
  const AJO_WEEKLY_TARGET = 50000;
  const progress = Math.min(100, (ajoBalanceNaira / AJO_WEEKLY_TARGET) * 100);
  const week = Math.ceil((ajoBalanceNaira / AJO_WEEKLY_TARGET) * 4);
  const isCollectWeek = ajoBalanceNaira >= AJO_WEEKLY_TARGET;

  return (
    <div className="p-3 space-y-4">
      {/* Ajo Progress Card */}
      <div className="bg-gradient-to-br from-purple-950 to-stone-950 border border-purple-500/30 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👩🏾‍🤝‍👨🏾</span>
          <div>
            <div className="font-black text-purple-300 text-sm font-['Bungee']">AJO CIRCLE</div>
            <div className="text-[10px] text-stone-400">Mushin Drivers Savings Club · Week {week}/4</div>
          </div>
          {isCollectWeek && (
            <span className="ml-auto text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg border border-emerald-400/30 animate-pulse">
              YOUR TURN!
            </span>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-stone-400 font-mono">
            <span>Pot: ₦{ajoBalanceNaira.toLocaleString()}</span>
            <span>Target: ₦{AJO_WEEKLY_TARGET.toLocaleString()}</span>
          </div>
          <div className="h-2.5 bg-stone-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-purple-300 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Actions */}
      {step === 'HOME' && (
        <div className="space-y-2">
          <button
            onClick={() => setStep('CONTRIBUTE')}
            className="w-full p-3.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-xl flex items-center gap-3 transition-all"
          >
            <ArrowUp className="w-5 h-5 text-purple-400 shrink-0" />
            <div className="text-left">
              <div className="text-sm font-bold text-white">Contribute to Ajo Pot</div>
              <div className="text-[10px] text-stone-400">Add money weekly to the shared savings circle</div>
            </div>
          </button>
          {isCollectWeek && (
            <button
              onClick={() => setStep('COLLECT')}
              className="w-full p-3.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 rounded-xl flex items-center gap-3 transition-all animate-in fade-in"
            >
              <ArrowDown className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="text-left">
                <div className="text-sm font-bold text-white">Collect Ajo Pot 💰</div>
                <div className="text-[10px] text-emerald-400">It's your week! Collect ₦{ajoBalanceNaira.toLocaleString()}</div>
              </div>
            </button>
          )}
          <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl text-[10px] text-stone-400 leading-relaxed">
            <strong className="text-stone-300">How Ajo works:</strong> Everyone in the circle contributes weekly. Each member takes turns collecting the full pot. Discipline is everything — you must contribute before you can collect.
          </div>
        </div>
      )}

      {step === 'CONTRIBUTE' && (
        <div className="space-y-3 animate-in fade-in">
          <div className="text-xs font-bold text-stone-300">Amount to contribute:</div>
          <div className="grid grid-cols-3 gap-2">
            {[5000, 10000, 25000].map(amt => (
              <button key={amt} onClick={() => setAmount(String(amt))}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${amount === String(amt) ? 'bg-purple-400 text-stone-950 border-purple-400' : 'bg-stone-900 text-stone-300 border-stone-700'}`}>
                ₦{amt.toLocaleString()}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Custom amount..."
            className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400"
          />
          <div className="flex gap-2">
            <button onClick={() => setStep('HOME')} className="flex-1 py-2 bg-stone-800 text-stone-300 rounded-xl text-xs font-bold">Cancel</button>
            <button
              onClick={() => {
                const n = parseInt(amount);
                if (!n || n <= 0 || n > walletNaira) return;
                soundEngine.playCoin();
                onContribute(n);
                setAmount('');
                setStep('HOME');
              }}
              disabled={!amount || parseInt(amount) <= 0 || parseInt(amount) > walletNaira}
              className="flex-1 py-2 bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 rounded-xl text-xs font-bold"
            >
              CONTRIBUTE
            </button>
          </div>
        </div>
      )}

      {step === 'COLLECT' && isCollectWeek && (
        <div className="space-y-3 animate-in fade-in">
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-center space-y-2">
            <div className="text-3xl">💰</div>
            <div className="font-black text-emerald-400 text-lg">₦{ajoBalanceNaira.toLocaleString()}</div>
            <div className="text-xs text-stone-300">Ready to collect from your Ajo circle!</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep('HOME')} className="flex-1 py-2 bg-stone-800 text-stone-300 rounded-xl text-xs font-bold">Go Back</button>
            <button
              onClick={() => {
                soundEngine.playUpgradeChime();
                onCollect(ajoBalanceNaira);
                setStep('HOME');
              }}
              className="flex-1 py-2 bg-emerald-400 text-stone-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
            >
              <Check className="w-4 h-4" /> COLLECT NOW
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


// ─── KOLO SYSTEM ─────────────────────────────────────────────────────────────
// Physical clay piggy-bank. Buy from market store. Drop coins in it. 
// Break it to get money out — but it's permanently destroyed once broken.

interface KoloProps {
  walletNaira: number;
  hasKolo: boolean;
  koloBalanceNaira: number;
  onBuyKolo: () => void;
  onDeposit: (amount: number) => void;
  onBreakKolo: () => void;
}

export const KoloSystem: React.FC<KoloProps> = ({
  walletNaira, hasKolo, koloBalanceNaira, onBuyKolo, onDeposit, onBreakKolo
}) => {
  const [depositAmount, setDepositAmount] = useState('');
  const [confirmBreak, setConfirmBreak] = useState(false);

  const KOLO_PRICE = 500;

  if (!hasKolo) {
    return (
      <div className="p-4 flex flex-col items-center gap-4 text-center">
        <span className="text-6xl">🏺</span>
        <div>
          <h3 className="font-black text-amber-400 font-['Bungee'] text-sm">Buy a Kolo Pot</h3>
          <p className="text-stone-400 text-xs mt-1 leading-relaxed">
            A traditional clay savings pot. Drop your spare change in daily. The catch? Once you break it to take the money out, it's gone forever. You'll need to buy a new one.
          </p>
        </div>
        <button
          onClick={() => {
            if (walletNaira < KOLO_PRICE) return;
            soundEngine.playCoin();
            onBuyKolo();
          }}
          disabled={walletNaira < KOLO_PRICE}
          className="w-full py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-stone-950 font-black text-sm rounded-xl font-['Bungee']"
        >
          BUY KOLO POT — ₦{KOLO_PRICE.toLocaleString()}
        </button>
        {walletNaira < KOLO_PRICE && <p className="text-rose-400 text-[11px]">Need ₦{(KOLO_PRICE - walletNaira).toLocaleString()} more</p>}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Kolo Display */}
      <div className="flex flex-col items-center gap-2 py-3">
        <span className="text-6xl drop-shadow-lg">{koloBalanceNaira > 0 ? '🏺' : '🫙'}</span>
        <div className="text-center">
          <div className="font-black text-amber-400 font-['Bungee'] text-xl">₦{koloBalanceNaira.toLocaleString()}</div>
          <div className="text-[11px] text-stone-400">Saved in your clay pot</div>
        </div>
        {/* Visual coins inside */}
        {koloBalanceNaira > 0 && (
          <div className="flex gap-1 text-sm">
            {Array.from({ length: Math.min(8, Math.ceil(koloBalanceNaira / 1000)) }).map((_, i) => (
              <span key={i} className="animate-in fade-in" style={{ animationDelay: `${i * 50}ms` }}>🪙</span>
            ))}
          </div>
        )}
      </div>

      {/* Deposit */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-stone-300">Drop coins in your Kolo:</div>
        <div className="grid grid-cols-4 gap-1.5">
          {[500, 1000, 2000, 5000].map(amt => (
            <button key={amt} onClick={() => setDepositAmount(String(amt))}
              className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${depositAmount === String(amt) ? 'bg-amber-400 text-stone-950 border-amber-400' : 'bg-stone-900 text-stone-300 border-stone-700'}`}>
              ₦{(amt/1000).toFixed(amt<1000?0:0)}k
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            value={depositAmount}
            onChange={e => setDepositAmount(e.target.value)}
            placeholder="Amount..."
            className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
          />
          <button
            onClick={() => {
              const n = parseInt(depositAmount);
              if (!n || n <= 0 || n > walletNaira) return;
              soundEngine.playCoin();
              onDeposit(n);
              setDepositAmount('');
            }}
            disabled={!depositAmount || parseInt(depositAmount) <= 0 || parseInt(depositAmount) > walletNaira}
            className="px-4 py-2 bg-amber-400 disabled:opacity-50 text-stone-950 rounded-xl text-xs font-bold"
          >
            DROP IN
          </button>
        </div>
      </div>

      {/* Break Kolo Section */}
      <div className="border-t border-stone-800 pt-3 space-y-2">
        {!confirmBreak ? (
          <button
            onClick={() => setConfirmBreak(true)}
            disabled={koloBalanceNaira === 0}
            className="w-full p-3 bg-rose-950/40 hover:bg-rose-900/40 disabled:opacity-40 border border-rose-500/40 rounded-xl flex items-center gap-3 transition-all"
          >
            <Hammer className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="text-left">
              <div className="text-sm font-bold text-rose-300">Break the Kolo 🔨</div>
              <div className="text-[10px] text-stone-400">Permanently destroy it to collect ₦{koloBalanceNaira.toLocaleString()}</div>
            </div>
          </button>
        ) : (
          <div className="p-3 bg-rose-950 border border-rose-500 rounded-xl space-y-3 animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-200 leading-relaxed">
                <strong>This is permanent!</strong> Once you smash this clay pot, it's destroyed. You'll get your ₦{koloBalanceNaira.toLocaleString()} back but you'll need to buy a brand new kolo at the market.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmBreak(false)} className="py-2 bg-stone-800 text-stone-300 rounded-xl text-xs font-bold">Keep Saving</button>
              <button
                onClick={() => {
                  soundEngine.playCrash();
                  onBreakKolo();
                  setConfirmBreak(false);
                }}
                className="py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
              >
                <Hammer className="w-3.5 h-3.5" /> SMASH IT!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
