import React, { useState } from 'react';
import { Sparkles, X, Check, Paintbrush, Sliders, Volume2, ShieldCheck } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { SLOGANS } from '../game/config';

interface CustomCarShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSlogan: string;
  onSelectSlogan: (slogan: string) => void;
  walletNaira: number;
  onDeductCash?: (amount: number) => void;
  addFeedMessage?: (msg: string) => void;
}

const BODY_THEMES = [
  { id: 'LAGOS_YELLOW', name: 'Original Yellow & Black Stripe', colorHex: '#facc15', cost: 0 },
  { id: 'EKO_AMBER', name: 'Warm Amber Commercial', colorHex: '#f59e0b', cost: 1500 },
  { id: 'METRO_GOLD', name: 'Oshodi Gold Metallic', colorHex: '#eab308', cost: 2500 },
  { id: 'NIGHT_VIP', name: 'Island VIP Midnight Trim', colorHex: '#d97706', cost: 3500 },
];

const CUSTOM_HORN_TUNES = [
  { id: 'STANDARD', name: 'Standard Danfo Air Horn', desc: 'Classic piercing horn to clear okadas', cost: 0 },
  { id: 'DOUBLE_TAP', name: 'Agbero Double Blast', desc: 'Rapid 2-tone alert for stubborn yellow buses', cost: 800 },
  { id: 'MELODY_EKO', name: 'Afrobeat Brass Fanfare', desc: 'Catchy melodic tone that excites passengers', cost: 2000 },
];

export const CustomCarShopModal: React.FC<CustomCarShopModalProps> = ({
  isOpen,
  onClose,
  currentSlogan,
  onSelectSlogan,
  walletNaira,
  onDeductCash,
  addFeedMessage,
}) => {
  const [selectedSlogan, setSelectedSlogan] = useState<string>(currentSlogan || 'No King as God');
  const [customInputSlogan, setCustomInputSlogan] = useState<string>('');
  const [selectedTheme, setSelectedTheme] = useState<string>('LAGOS_YELLOW');
  const [selectedHorn, setSelectedHorn] = useState<string>('STANDARD');
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplySlogan = (slogan: string, cost: number = 0) => {
    if (cost > 0 && walletNaira < cost) {
      setStatusFeedback('Oga! Insufficient cash in wallet for custom slogan branding!');
      return;
    }
    if (cost > 0 && onDeductCash) {
      onDeductCash(cost);
    }
    setSelectedSlogan(slogan);
    onSelectSlogan(slogan);
    soundEngine.playCoin();
    soundEngine.playHorn(false);
    setStatusFeedback(`“E sweet well well! Mounted: '${slogan}' on Danfo rear windshield!”`);
    if (addFeedMessage) {
      addFeedMessage(`🎨 CUSTOM DANFO: Rear glass slogan updated to "${slogan}"!`);
    }
  };

  const handleSaveCustomTypedSlogan = () => {
    const trimmed = customInputSlogan.trim();
    if (!trimmed) return;
    const cost = 1200; // ₦1,200 signwriter fee
    if (walletNaira < cost) {
      setStatusFeedback('Signwriter fee is ₦1,200. Insufficient cash in wallet!');
      return;
    }
    handleApplySlogan(trimmed, cost);
    setCustomInputSlogan('');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md pointer-events-auto">
      <div className="relative w-full max-w-lg bg-stone-950 border-2 border-amber-400 rounded-3xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col text-stone-100 font-sans animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-2xl shadow-inner">
              🎨
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black font-['Bungee'] text-amber-400 tracking-wide">
                ALABA CUSTOM DANFO &amp; SIGNWRITER
              </h3>
              <p className="text-[10px] font-mono text-stone-400">
                Rear Windshield Slogans • Signwriting • Decals • Horns
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-900 hover:bg-stone-800 active:scale-95 text-stone-400 hover:text-white flex items-center justify-center border border-stone-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Master Craftsman Dialogue */}
        <div className="my-3 p-3 bg-stone-900/90 border border-amber-400/30 rounded-2xl flex items-start gap-3">
          <span className="text-2xl shrink-0">👨🏾‍🎨</span>
          <div className="text-xs">
            <span className="font-bold text-amber-300 font-mono">Bro Shola (Master Danfo Signwriter):</span>
            <p className="text-stone-300 text-[11px] mt-0.5 leading-snug">
              {statusFeedback ||
                '“Welcome to my custom yard oga! Pick any iconic Lagos slogan for your rear window, or write your own custom slogan! \'No Condition Is Permanent\', \'No King as God\', anything you like!”'}
            </p>
          </div>
        </div>

        {/* Live Rear Windshield Preview */}
        <div className="p-3 bg-stone-900/70 border border-stone-800 rounded-2xl space-y-2">
          <div className="text-[10px] font-mono text-stone-400 font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Rear Window Preview:</span>
            <span className="text-emerald-400 font-mono">Active on 3D Danfo</span>
          </div>

          <div className="relative w-full h-24 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 border-2 border-stone-700 rounded-xl overflow-hidden flex flex-col items-center justify-center p-2 shadow-inner">
            {/* Danfo Yellow Roof & Black Stripe Accent */}
            <div className="absolute top-0 inset-x-0 h-3 bg-amber-400 border-b border-stone-900 flex items-center justify-center">
              <div className="w-24 h-1 bg-black rounded-full" />
            </div>

            {/* Rear Glass Sticker */}
            <div className="mt-2 px-4 py-1.5 rounded-lg bg-black/85 border-2 border-amber-400/80 shadow-2xl flex flex-col items-center max-w-[90%]">
              <span className="font-black text-xs sm:text-sm font-['Bungee'] text-amber-300 tracking-wider text-center truncate max-w-full">
                "{selectedSlogan.toUpperCase()}"
              </span>
              <span className="text-[8px] font-mono text-stone-400">LAGOS COMMERCIAL CARRIER</span>
            </div>

            {/* Danfo Yellow Tailgate Lip */}
            <div className="absolute bottom-0 inset-x-0 h-2 bg-amber-400 border-t border-black" />
          </div>
        </div>

        {/* Choose Iconic Slogan */}
        <div className="mt-3 space-y-2">
          <div className="text-[10px] font-mono text-stone-400 font-bold uppercase tracking-wider">
            Iconic Lagos Rear Window Slogans (Click to Apply Free):
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SLOGANS.map((slogan) => {
              const isCurrent = selectedSlogan === slogan;
              return (
                <button
                  key={slogan}
                  type="button"
                  onClick={() => handleApplySlogan(slogan, 0)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-400/20 border-amber-400 text-white shadow'
                      : 'bg-stone-900/70 border-stone-800 text-stone-300 hover:border-stone-700 hover:text-white'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-xs truncate">"{slogan}"</div>
                    <div className="text-[9px] font-mono text-stone-400">
                      {isCurrent ? 'Mounted on Danfo' : 'Signwriter Stock'}
                    </div>
                  </div>
                  {isCurrent ? (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-stone-950 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-amber-400 font-bold shrink-0">APPLY</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Signwriter Typed Input */}
        <div className="mt-4 p-3 bg-stone-900/80 border border-stone-800 rounded-2xl space-y-2">
          <div className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
            Write Your Own Custom Slogan (₦1,200 Signwriter Fee):
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={28}
              placeholder="e.g. ONLY GOD KNOWS TOMORROW"
              value={customInputSlogan}
              onChange={(e) => setCustomInputSlogan(e.target.value)}
              className="flex-1 px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="button"
              disabled={!customInputSlogan.trim()}
              onClick={handleSaveCustomTypedSlogan}
              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-stone-950 font-black font-['Bungee'] text-[10px] rounded-xl shrink-0 cursor-pointer shadow active:scale-95"
            >
              PAINT (₦1,200)
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 font-black text-xs font-['Bungee'] rounded-xl transition shadow flex items-center justify-center gap-2"
          >
            <span>DRIVE BACK TO ROAD</span>
          </button>
        </div>
      </div>
    </div>
  );
};
