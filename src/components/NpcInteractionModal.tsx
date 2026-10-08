import React, { useState } from 'react';
import { LagosNpc } from '../game/npcData';
import { soundEngine } from '../audio/soundEngine';
import { 
  X, 
  MessageSquare, 
  Coins, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  Luggage,
  Wrench,
  ThumbsUp
} from 'lucide-react';

interface NpcInteractionModalProps {
  npc: LagosNpc;
  isOpen: boolean;
  onClose: () => void;
  walletNaira: number;
  onSettleOrBuy: (cost: number, reward: LagosNpc['reward'], message: string) => void;
  onOpenBoot?: () => void;
}

export const NpcInteractionModal: React.FC<NpcInteractionModalProps> = ({
  npc,
  isOpen,
  onClose,
  walletNaira,
  onSettleOrBuy,
  onOpenBoot,
}) => {
  const [currentStep, setCurrentStep] = useState<'INITIAL' | 'HAGGLED' | 'RESOLVED'>('INITIAL');
  const [resolvedMsg, setResolvedMsg] = useState<string>('');
  const [hagglePrice, setHagglePrice] = useState<number>(npc.haggleMinNaira || (npc.settleCostNaira ? Math.round(npc.settleCostNaira * 0.7) : 500));

  if (!isOpen) return null;

  const cost = npc.settleCostNaira || 1000;

  const handlePayFull = () => {
    if (walletNaira < cost) {
      alert(`⚠️ Not enough cash! You need ₦${cost.toLocaleString()}.`);
      return;
    }
    soundEngine.playCoin();
    const msg = `🤝 Deal closed with ${npc.name}! Paid ₦${cost.toLocaleString()} in full. Street respect earned!`;
    setResolvedMsg(msg);
    setCurrentStep('RESOLVED');
    onSettleOrBuy(cost, { ...npc.reward, streetCred: (npc.reward.streetCred || 10) + 15 }, msg);
    if (onOpenBoot && (npc.category === 'MARKET_WOMAN' || npc.category === 'COMMUTER')) {
      onOpenBoot();
    }
  };

  const handleHaggle = () => {
    soundEngine.playCoin();
    setCurrentStep('HAGGLED');
  };

  const handleAcceptHaggle = () => {
    if (walletNaira < hagglePrice) {
      alert(`⚠️ Not enough cash! You need ₦${hagglePrice.toLocaleString()}.`);
      return;
    }
    soundEngine.playCoin();
    const msg = `⚡ Sharp Haggle! ${npc.name} accepted ₦${hagglePrice.toLocaleString()}! Business settled.`;
    setResolvedMsg(msg);
    setCurrentStep('RESOLVED');
    onSettleOrBuy(hagglePrice, npc.reward, msg);
    if (onOpenBoot && (npc.category === 'MARKET_WOMAN' || npc.category === 'COMMUTER')) {
      onOpenBoot();
    }
  };

  const handleBluffUnion = () => {
    soundEngine.playCoin();
    const bluffFee = Math.round((npc.haggleMinNaira || 500) * 0.5);
    const msg = `🗣️ Street Diplomacy: You shouted "Chairman Rasaki na my blood brother!" ${npc.name} saluted and waved you forward for just ₦${bluffFee.toLocaleString()}!`;
    setResolvedMsg(msg);
    setCurrentStep('RESOLVED');
    onSettleOrBuy(bluffFee, { ...npc.reward, streetCred: 35 }, msg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-stone-900 border-2 border-amber-500/80 rounded-2xl p-5 shadow-2xl flex flex-col text-stone-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 bg-amber-500/20 border border-amber-400/40 rounded-xl shadow-inner">
              {npc.avatar}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black font-['Bungee'] text-amber-400">
                  {npc.name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-300">
                  {npc.profession}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-mono flex items-center gap-1">
                📍 {npc.locationHint}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NPC Bio */}
        <div className="text-xs text-stone-400 italic mt-2.5 bg-stone-950/60 p-2.5 rounded-xl border border-stone-800">
          "{npc.description}"
        </div>

        {/* Dialogue Bubble */}
        <div className="my-3 p-3.5 bg-gradient-to-r from-amber-950/40 to-stone-950 border border-amber-500/30 rounded-xl relative">
          <div className="flex items-start gap-2.5">
            <MessageSquare className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm font-semibold text-amber-200 leading-relaxed">
              {currentStep === 'INITIAL' && `"${npc.greeting}"`}
              {currentStep === 'HAGGLED' && `"${npc.dialogueLines[1] || 'Haba driver, make we balance am!'}"`}
              {currentStep === 'RESOLVED' && `"${npc.dialogueLines[2] || 'A dupe o! Safe journey!'}"`}
            </div>
          </div>
        </div>

        {/* Action Panel */}
        {currentStep === 'INITIAL' && (
          <div className="space-y-2 mt-1">
            <div className="text-[11px] font-mono font-bold text-stone-400 uppercase tracking-wide">
              Choose your interaction:
            </div>

            {/* Option 1: Pay/Accept Full */}
            <button
              onClick={handlePayFull}
              className="w-full p-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/60 rounded-xl flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-200">
                  {npc.category === 'AREA_BOY' ? 'Pay Full Union Settlement' : npc.category === 'POLICE_LASTMA' ? 'Pay Full Official Clearance' : 'Pay Full Asking Price & Deal'}
                </span>
              </div>
              <span className="text-xs font-mono font-black text-emerald-400">
                ₦{cost.toLocaleString()}
              </span>
            </button>

            {/* Option 2: Haggle / Negotiate */}
            <button
              onClick={handleHaggle}
              className="w-full p-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/60 rounded-xl flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-200">
                  Haggle Hard! ("Oga bring price down, we be brothers!")
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400">
                Counter ₦{hagglePrice.toLocaleString()}
              </span>
            </button>

            {/* Option 3: Street Brotherhood / Bluff */}
            <button
              onClick={handleBluffUnion}
              className="w-full p-2.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/60 rounded-xl flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-purple-200">
                  Street Clout: Claim Chairman Rasaki Connection
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-purple-400">
                Token ~₦{Math.round((npc.haggleMinNaira || 500) * 0.5).toLocaleString()}
              </span>
            </button>
          </div>
        )}

        {currentStep === 'HAGGLED' && (
          <div className="space-y-3 mt-1 animate-in fade-in">
            <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs">
              <div className="text-amber-400 font-bold mb-1">
                Counter-Offer: ₦{hagglePrice.toLocaleString()}
              </div>
              <div className="text-stone-300">
                {npc.name} shook their head, chuckled, and said: "You wise well well! Oya pay make we close deal!"
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAcceptHaggle}
                className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs font-['Bungee'] rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                CONFIRM ₦{hagglePrice.toLocaleString()}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold rounded-xl"
              >
                WALK AWAY
              </button>
            </div>
          </div>
        )}

        {currentStep === 'RESOLVED' && (
          <div className="space-y-3 mt-1 animate-in zoom-in-95">
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-xl text-xs text-emerald-200">
              {resolvedMsg}
            </div>
            {onOpenBoot && (npc.category === 'MARKET_WOMAN' || npc.category === 'COMMUTER') && (
              <div className="flex items-center gap-2 p-2 bg-amber-500/20 border border-amber-400/40 rounded-xl text-[11px] text-amber-300">
                <Luggage className="w-4 h-4 text-amber-400" />
                <span>🧳 Boot opened! Heavy luggage & yam sacks loaded in the back!</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-black text-xs font-['Bungee'] rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <ThumbsUp className="w-4 h-4" />
              BACK TO HIGHWAY
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
