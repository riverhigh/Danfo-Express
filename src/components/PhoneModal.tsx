import React, { useState } from 'react';
import { GameState, PhoneMessage, HouseInfo, InventoryItem } from '../types/game';
import { CHOWDECK_MENU, HOUSE_TIERS } from '../game/config';
import { soundEngine } from '../audio/soundEngine';
import { 
  X, 
  ArrowLeft, 
  ChevronLeft,
  Briefcase, 
  MessageSquare, 
  Building2, 
  ShoppingBag, 
  Utensils, 
  HelpCircle, 
  Car, 
  Zap, 
  Wifi, 
  Battery, 
  CheckCircle2, 
  Flame, 
  Home, 
  AlertTriangle,
  Send,
  Plus,
  CookingPot,
  GraduationCap,
  Sun,
  Lock,
  RotateCw,
  ExternalLink,
  Globe,
  Megaphone,
  Heart,
  Share2,
  MessageCircle
} from 'lucide-react';

interface PhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  addFeedMessage: (msg: string) => void;
  onStartShift?: () => void;
  onOpenPosOrBank?: (mode: 'POS_KIOSK' | 'BANK_HALL') => void;
}

type PhoneApp = 
  | 'HOME' 
  | 'JOBS' 
  | 'MESSAGES' 
  | 'BANK' 
  | 'CHOWDECK' 
  | 'HOUSING' 
  | 'BOUTIQUE' 
  | 'RIDE' 
  | 'GUIDE'
  | 'AGS'
  | 'SOLAR_FIRST'
  | 'TUNDAHEADLOT';

export const PhoneModal: React.FC<PhoneModalProps> = ({
  isOpen,
  onClose,
  gameState,
  setGameState,
  addFeedMessage,
  onStartShift,
  onOpenPosOrBank,
}) => {
  const [activeApp, setActiveApp] = useState<PhoneApp>('HOME');
  const [selectedMessage, setSelectedMessage] = useState<PhoneMessage | null>(null);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [tundaLiked, setTundaLiked] = useState<Record<string, boolean>>({});
  const [tundaLikesCount, setTundaLikesCount] = useState<Record<string, number>>({
    'post-1': 24820,
    'post-2': 19350,
    'post-3': 38510,
    'post-4': 42100,
    'post-5': 55240,
  });

  if (!isOpen) return null;

  // Settle Bill via Bank App (deducts from Bank Account first, or Wallet if Bank is lower)
  const handlePayBill = (type: 'RENT' | 'NEPA' | 'LEVY', cost: number) => {
    const canPayFromBank = (gameState.bankBalanceNaira || 0) >= cost;
    const canPayFromWallet = gameState.walletNaira >= cost;

    if (!canPayFromBank && !canPayFromWallet) {
      addFeedMessage(`⚠️ Insufficient funds in Bank or Wallet! Need ₦${cost.toLocaleString()} to settle this bill.`);
      return;
    }

    soundEngine.playCoin();
    setGameState((prev) => {
      let updatedHouse = { ...prev.house };
      let updatedRent = prev.rentDue;
      let updatedNepa = prev.nepaBillDue;

      if (type === 'RENT') {
        updatedRent = 0;
      } else if (type === 'NEPA') {
        updatedNepa = 0;
        updatedHouse.nepaActive = true; // Power restored!
      }

      const updatedMsgs = prev.messages.map((m) => {
        if (
          (type === 'RENT' && m.actionRequired === 'PAY_RENT') ||
          (type === 'NEPA' && m.actionRequired === 'PAY_NEPA') ||
          (type === 'LEVY' && m.actionRequired === 'PAY_LEVY')
        ) {
          return { ...m, unread: false, actionRequired: undefined };
        }
        return m;
      });

      const payWithBank = (prev.bankBalanceNaira || 0) >= cost;

      return {
        ...prev,
        bankBalanceNaira: payWithBank ? (prev.bankBalanceNaira || 0) - cost : prev.bankBalanceNaira,
        walletNaira: payWithBank ? prev.walletNaira : prev.walletNaira - cost,
        house: updatedHouse,
        rentDue: updatedRent,
        nepaBillDue: updatedNepa,
        messages: updatedMsgs,
      };
    });

    addFeedMessage(`✅ BANK DEBIT: ₦${cost.toLocaleString()} paid for ${type}! Transaction approved.`);
  };

  // Order Chowdeck Takeout
  const handleOrderFood = (food: typeof CHOWDECK_MENU[0]) => {
    if (gameState.walletNaira < food.price) {
      addFeedMessage(`⚠️ Insufficient funds for ${food.name}!`);
      return;
    }

    soundEngine.playCoin();
    setGameState((prev) => {
      const newMeal: InventoryItem = {
        id: `meal-${Date.now()}`,
        name: food.name,
        category: 'MEAL',
        quantity: 1,
        icon: food.icon,
        description: food.description,
        effect: `+${food.staminaGain} Driver Stamina`,
      };

      return {
        ...prev,
        walletNaira: prev.walletNaira - food.price,
        inventory: [...prev.inventory, newMeal],
        hustleMeter: Math.min(100, prev.hustleMeter + food.staminaGain),
      };
    });

    addFeedMessage(`🛵 CHOWDECK DISPATCH: ${food.name} delivered to driver! Hustle meter boosted.`);
  };

  // Cook Grocery at Home (Mushin House)
  const handleCookMeal = (recipe: string, costIndomie: number, costEggs: number) => {
    const indomieItem = gameState.inventory.find((i) => i.id === 'item-indomie');
    const eggItem = gameState.inventory.find((i) => i.id === 'item-eggs');

    if (!indomieItem || indomieItem.quantity < costIndomie) {
      addFeedMessage('⚠️ You need more Indomie in inventory to cook this meal! Buy from boutique.');
      return;
    }

    soundEngine.playSplash();
    setGameState((prev) => {
      const updatedInv = prev.inventory
        .map((item) => {
          if (item.id === 'item-indomie') return { ...item, quantity: item.quantity - costIndomie };
          if (item.id === 'item-eggs' && eggItem) return { ...item, quantity: Math.max(0, item.quantity - costEggs) };
          return item;
        })
        .filter((item) => item.quantity > 0);

      return {
        ...prev,
        inventory: updatedInv,
        hustleMeter: Math.min(100, prev.hustleMeter + 50),
      };
    });

    addFeedMessage(`🍳 COOKED AT HOME: Fresh ${recipe} prepared on the stove! Driver fully energized.`);
  };

  // Upgrade House Tier
  const handleUpgradeHouse = (tier: typeof HOUSE_TIERS[0]) => {
    const cost = tier.purchaseCost || tier.rentCost;
    if (gameState.walletNaira < cost) {
      addFeedMessage(`⚠️ Need ₦${cost.toLocaleString()} to move to ${tier.title}!`);
      return;
    }

    soundEngine.playUpgradeChime();
    setGameState((prev) => ({
      ...prev,
      walletNaira: prev.walletNaira - cost,
      house: {
        id: tier.id,
        title: tier.title,
        location: tier.location,
        rentCost: tier.rentCost,
        purchaseCost: tier.purchaseCost,
        isOwned: tier.purchaseCost ? true : false,
        hasGenerator: tier.hasGenerator,
        generatorFuelLiters: tier.hasGenerator ? 15 : 0,
        nepaActive: true,
        hasStove: tier.hasStove,
        description: tier.description,
        comfortRating: tier.comfortRating,
      },
    }));

    addFeedMessage(`🎉 NEW HOME UNLOCKED: Moved into ${tier.title} (${tier.location})!`);
  };

  const unreadCount = gameState.messages.filter((m) => m.unread).length;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-150">
      {/* PHONE CONTAINER (Modeled directly after uploaded iOS design with Dynamic Island) */}
      <div className="relative w-[360px] sm:w-[390px] h-[720px] max-h-[94vh] bg-stone-950 border-[6px] border-stone-800 rounded-[48px] shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden ring-2 ring-stone-700/50">
        
        {/* Dynamic Island Pill */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 w-28 h-7 bg-black rounded-full flex items-center justify-between px-2.5 shadow-md">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-stone-400">DanfoOS</span>
          <div className="w-3 h-3 rounded-full bg-stone-900 border border-stone-800" />
        </div>

        {/* Top Status Bar */}
        <div className="h-10 pt-2 px-7 flex items-center justify-between text-xs text-white z-40 shrink-0 font-medium select-none">
          <span className="font-semibold text-[13px] tracking-tight">11:57</span>
          <div className="flex items-center gap-1.5 opacity-90 text-[11px]">
            <span className="font-mono text-[10px]">4G</span>
            <Wifi className="w-3.5 h-3.5" />
            <div className="flex items-center gap-0.5">
              <span className="text-[10px]">19%</span>
              <Battery className="w-4 h-4 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Phone Close Button (Visible on Home Screen; routed apps feature dedicated in-phone navigation bars) */}
        {activeApp !== 'AGS' && activeApp !== 'SOLAR_FIRST' && (
          <button
            onClick={onClose}
            className="absolute top-12 right-6 z-40 bg-stone-900/90 hover:bg-stone-800 text-stone-200 px-3 py-1 rounded-full text-xs font-bold border border-stone-700 flex items-center gap-1 shadow-md transition-transform active:scale-95"
          >
            <X className="w-3 h-3" />
            <span>Close</span>
          </button>
        )}

        {/* ======================================================== */}
        {/* APP VIEW ROUTER OR HOME SCREEN */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-gradient-to-b from-[#2e1065] via-[#1e1b4b] to-[#09090b]">
          
          {/* HOME SCREEN */}
          {activeApp === 'HOME' && (
            <div className="flex-1 flex flex-col justify-between p-6 pt-4 overflow-y-auto">
              {/* Header Big Clock & Date */}
              <div className="pt-2 text-white">
                <h1 className="text-5xl font-extralight tracking-tight font-sans">
                  11:57
                </h1>
                <p className="text-xs text-stone-300 font-medium mt-1">
                  Tuesday, 6 October · Lagos
                </p>
              </div>

              {/* Main Apps Grid (Matching Screenshot + AGS & SolarFirst Web Apps) */}
              <div className="grid grid-cols-4 gap-y-4 gap-x-3 my-auto pt-3">
                {/* 1. Jobs */}
                <button
                  onClick={() => setActiveApp('JOBS')}
                  className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/40">
                    <Briefcase className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-[11px] font-medium text-stone-200">Jobs</span>
                </button>

                {/* 2. Messages */}
                <button
                  onClick={() => setActiveApp('MESSAGES')}
                  className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform relative"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-950/40">
                    <MessageSquare className="w-7 h-7 text-white" />
                  </div>
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-stone-900 shadow">
                      {unreadCount}
                    </span>
                  )}
                  <span className="text-[11px] font-medium text-stone-200">Messages</span>
                </button>

                {/* 3. Housing */}
                <button
                  onClick={() => setActiveApp('HOUSING')}
                  className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg shadow-amber-950/40">
                    <Home className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-[11px] font-medium text-stone-200">Housing</span>
                </button>

                {/* 4. Help & Guide */}
                <button
                  onClick={() => setActiveApp('GUIDE')}
                  className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-950/40">
                    <HelpCircle className="w-7 h-7 text-stone-950" />
                  </div>
                  <span className="text-[11px] font-medium text-stone-200">Guide</span>
                </button>

                {/* 5. AGS (Education & School Portal) */}
                <button
                  onClick={() => {
                    soundEngine.playCoin();
                    addFeedMessage('🎓 AGS: Connecting to https://www.myags.school portal...');
                    setActiveApp('AGS');
                  }}
                  className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-900 to-slate-900 border border-blue-400/50 group-hover:border-blue-300 flex items-center justify-center shadow-lg shadow-indigo-950/60 relative overflow-hidden ring-1 ring-amber-400/30">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                    <GraduationCap className="w-7 h-7 text-amber-300 drop-shadow-md" />
                  </div>
                  <span className="text-[11px] font-semibold text-stone-200">AGS</span>
                </button>

                {/* 6. SolarFirst (Clean Energy & Solar Solutions) */}
                <button
                  onClick={() => {
                    soundEngine.playCoin();
                    addFeedMessage('☀️ SolarFirst: Connecting to https://www.getsolarfirst.com clean energy portal...');
                    setActiveApp('SOLAR_FIRST');
                  }}
                  className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-emerald-600 border border-yellow-300/50 group-hover:border-yellow-200 flex items-center justify-center shadow-lg shadow-amber-950/60 relative overflow-hidden ring-1 ring-emerald-400/30">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    <Sun className="w-7 h-7 text-yellow-100 drop-shadow-md" />
                  </div>
                  <span className="text-[11px] font-semibold text-stone-200 truncate max-w-[72px]">SolarFirst</span>
                </button>

                {/* 7. Tundaheadlot (Lagos Viral Blogger & Breaking News) */}
                <button
                  onClick={() => {
                    soundEngine.playCoin();
                    addFeedMessage('📢 Tundaheadlot: Loading latest Lagos viral news and street gist...');
                    setActiveApp('TUNDAHEADLOT');
                  }}
                  className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group relative"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 via-orange-500 to-amber-500 border border-rose-400/60 group-hover:border-amber-300 flex items-center justify-center shadow-lg shadow-rose-950/60 relative overflow-hidden ring-1 ring-amber-400/40">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
                    <Megaphone className="w-7 h-7 text-white drop-shadow-md" />
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border border-stone-900 animate-ping" />
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border border-stone-900" />
                  </div>
                  <span className="text-[11px] font-semibold text-stone-200 truncate max-w-[76px]">Tundaheadlot</span>
                </button>
              </div>

              {/* Bottom App Dock (Matching Screenshot: Ride, Chowdeck, Bank, Boutique) */}
              <div className="w-full bg-stone-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-3 flex items-center justify-around shadow-2xl mt-4">
                {/* Ride */}
                <button
                  onClick={() => setActiveApp('RIDE')}
                  className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
                    <Car className="w-6 h-6 text-stone-950" />
                  </div>
                  <span className="text-[10px] font-medium text-stone-300">Ride</span>
                </button>

                {/* Chowdeck */}
                <button
                  onClick={() => setActiveApp('CHOWDECK')}
                  className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-md">
                    <Utensils className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-medium text-stone-300">Chowdeck</span>
                </button>

                {/* Bank */}
                <button
                  onClick={() => setActiveApp('BANK')}
                  className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center shadow-md">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-medium text-stone-300">Bank</span>
                </button>

                {/* Boutique */}
                <button
                  onClick={() => setActiveApp('BOUTIQUE')}
                  className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-700 flex items-center justify-center shadow-md">
                    <ShoppingBag className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-medium text-stone-300">Boutique</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* APP 1: MESSAGES (LANDLORD, NEPA, WIFE, CHAIRMAN) */}
          {/* ======================================================== */}
          {activeApp === 'MESSAGES' && (
            <div className="flex-1 bg-stone-950 flex flex-col overflow-hidden">
              <div className="h-12 border-b border-stone-800 px-4 flex items-center gap-3 shrink-0">
                <button onClick={() => { setActiveApp('HOME'); setSelectedMessage(null); }}>
                  <ArrowLeft className="w-5 h-5 text-stone-300" />
                </button>
                <h2 className="font-bold text-sm text-white">Lagos Messages</h2>
              </div>

              {selectedMessage ? (
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
                    <span className="text-2xl">{selectedMessage.avatar}</span>
                    <div>
                      <div className="font-bold text-sm text-white">{selectedMessage.sender}</div>
                      <div className="text-[10px] text-stone-400 font-mono">{selectedMessage.timestamp}</div>
                    </div>
                  </div>

                  <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl text-xs text-stone-200 leading-relaxed">
                    {selectedMessage.fullText}
                  </div>

                  {selectedMessage.actionRequired && selectedMessage.costNaira && (
                    <div className="p-3 bg-amber-400/10 border border-amber-400/40 rounded-xl space-y-2">
                      <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Urgent Payment Required: ₦{selectedMessage.costNaira.toLocaleString()}
                      </div>
                      <button
                        onClick={() => {
                          const action = selectedMessage.actionRequired === 'PAY_RENT' ? 'RENT' : selectedMessage.actionRequired === 'PAY_NEPA' ? 'NEPA' : 'LEVY';
                          handlePayBill(action, selectedMessage.costNaira!);
                          setSelectedMessage(null);
                        }}
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs rounded-lg shadow font-mono"
                      >
                        SETTLE BILL NOW (₦{selectedMessage.costNaira.toLocaleString()})
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-stone-900">
                  {gameState.messages.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMessage(m)}
                      className="w-full p-3.5 text-left flex items-start gap-3 hover:bg-stone-900/60 transition-colors"
                    >
                      <span className="text-2xl shrink-0">{m.avatar}</span>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white truncate">{m.sender}</span>
                          <span className="text-[10px] font-mono text-stone-500 shrink-0">{m.timestamp}</span>
                        </div>
                        <p className="text-xs text-stone-400 truncate mt-0.5">{m.preview}</p>
                      </div>
                      {m.unread && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 self-center" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* APP 2: BANK (KUDA/OPAY STYLE ACCOUNT & BILLS) */}
          {/* ======================================================== */}
          {activeApp === 'BANK' && (
            <div className="flex-1 bg-stone-950 flex flex-col overflow-hidden">
              <div className="h-12 border-b border-stone-800 px-4 flex items-center gap-3 shrink-0">
                <button onClick={() => setActiveApp('HOME')}>
                  <ArrowLeft className="w-5 h-5 text-stone-300" />
                </button>
                <h2 className="font-bold text-sm text-purple-400 font-mono">Eko Trust Mobile Bank</h2>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {/* Bank Balance vs Wallet Cash Cards */}
                <div className="p-4 bg-gradient-to-br from-indigo-900 via-purple-900 to-stone-900 rounded-2xl border border-purple-500/30 text-white shadow-xl space-y-3">
                  <div>
                    <div className="text-[10px] uppercase font-mono text-purple-300 tracking-wider">
                      Eko Zenith Bank Account Balance
                    </div>
                    <div className="text-2xl font-black font-mono text-sky-300 tabular-nums">
                      ₦{(gameState.bankBalanceNaira || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-stone-300">Physical Cash in Wallet:</span>
                    <span className="text-emerald-400 font-black tabular-nums">
                      ₦{gameState.walletNaira.toLocaleString()}
                    </span>
                  </div>
                  {onOpenPosOrBank && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          onClose();
                          onOpenPosOrBank('POS_KIOSK');
                        }}
                        className="py-2 px-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-black text-[10px] rounded-xl shadow cursor-pointer"
                      >
                        💳 POS Kiosk (≤₦100k)
                      </button>
                      <button
                        onClick={() => {
                          onClose();
                          onOpenPosOrBank('BANK_HALL');
                        }}
                        className="py-2 px-2 bg-rose-500 hover:bg-rose-400 text-white font-mono font-black text-[10px] rounded-xl shadow cursor-pointer"
                      >
                        🏦 Bank Hall (&gt;₦100k)
                      </button>
                    </div>
                  )}
                </div>

                {/* Settle Bills Quick Actions */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Bills &amp; Taxes
                  </div>

                  {/* 1. NEPA Electricity Bill */}
                  <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        EKEDC / NEPA Power
                      </div>
                      <div className="text-[10px] text-stone-400">
                        {gameState.house.nepaActive ? 'Power active • Current bill: ₦4,500' : 'DISCONNECTED! Wire cut!'}
                      </div>
                    </div>
                    <button
                      onClick={() => handlePayBill('NEPA', 4500)}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs rounded-lg font-mono"
                    >
                      PAY ₦4,500
                    </button>
                  </div>

                  {/* 2. Landlord House Rent */}
                  <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-emerald-400" />
                        {gameState.house.title} Rent
                      </div>
                      <div className="text-[10px] text-stone-400">
                        Weekly rent due: ₦{gameState.house.rentCost.toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handlePayBill('RENT', gameState.house.rentCost)}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs rounded-lg font-mono"
                    >
                      PAY ₦{gameState.house.rentCost.toLocaleString()}
                    </button>
                  </div>

                  {/* 3. Park Chairman Union Tax */}
                  <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                        Park Chairman Union Levy
                      </div>
                      <div className="text-[10px] text-stone-400">Daily Third Mainland pass: ₦3,500</div>
                    </div>
                    <button
                      onClick={() => handlePayBill('LEVY', 3500)}
                      className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-stone-950 font-black text-xs rounded-lg font-mono"
                    >
                      PAY ₦3,500
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* APP 3: CHOWDECK (LAGOS FOOD TAKEOUT) */}
          {/* ======================================================== */}
          {activeApp === 'CHOWDECK' && (
            <div className="flex-1 bg-stone-950 flex flex-col overflow-hidden">
              <div className="h-12 border-b border-stone-800 px-4 flex items-center gap-3 shrink-0">
                <button onClick={() => setActiveApp('HOME')}>
                  <ArrowLeft className="w-5 h-5 text-stone-300" />
                </button>
                <div>
                  <h2 className="font-bold text-sm text-red-500 font-mono">Chowdeck Lagos</h2>
                  <span className="text-[9px] text-stone-400">Deliver to driver in Danfo</span>
                </div>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {CHOWDECK_MENU.map((food) => (
                  <div
                    key={food.id}
                    className="p-3 bg-stone-900 border border-stone-800 rounded-2xl flex items-center justify-between gap-3 shadow-md"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl shrink-0">{food.icon}</span>
                      <div>
                        <div className="font-bold text-xs text-white">{food.name}</div>
                        <div className="text-[10px] text-stone-400">{food.restaurant}</div>
                        <div className="text-[10px] font-mono text-emerald-400 font-bold mt-0.5">
                          ₦{food.price.toLocaleString()} • +{food.staminaGain} Stamina
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOrderFood(food)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow shrink-0 font-mono"
                    >
                      ORDER
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* APP 4: HOUSING & LIFE SIMULATION ("FACE-ME-I-FACE-YOU") */}
          {/* ======================================================== */}
          {activeApp === 'HOUSING' && (
            <div className="flex-1 bg-stone-950 flex flex-col overflow-hidden">
              <div className="h-12 border-b border-stone-800 px-4 flex items-center gap-3 shrink-0">
                <button onClick={() => setActiveApp('HOME')}>
                  <ArrowLeft className="w-5 h-5 text-stone-300" />
                </button>
                <h2 className="font-bold text-sm text-amber-400">My Lagos Home & Properties</h2>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-4">
                {/* Current Home Card */}
                <div className="p-4 bg-stone-900 border-2 border-amber-400/50 rounded-2xl space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono font-bold text-amber-400">
                        Current Residence
                      </div>
                      <div className="font-black text-sm text-white">{gameState.house.title}</div>
                      <div className="text-[11px] text-stone-400">{gameState.house.location}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-stone-400">Rent</div>
                      <div className="font-mono font-bold text-xs text-emerald-400">
                        ₦{gameState.house.rentCost.toLocaleString()}/wk
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-stone-300 leading-relaxed">{gameState.house.description}</p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                    <div className="p-2 bg-stone-950 rounded-lg border border-stone-800">
                      <span className="text-stone-400 block text-[9px]">ELECTRICITY</span>
                      <strong className={gameState.house.nepaActive ? 'text-emerald-400' : 'text-rose-400'}>
                        {gameState.house.nepaActive ? '⚡ NEPA ON' : '❌ BLACKOUT'}
                      </strong>
                    </div>

                    <div className="p-2 bg-stone-950 rounded-lg border border-stone-800">
                      <span className="text-stone-400 block text-[9px]">GENERATOR</span>
                      <strong className={gameState.house.hasGenerator ? 'text-emerald-400' : 'text-stone-500'}>
                        {gameState.house.hasGenerator ? '🔌 Gen Available' : 'None (Buy Gen)'}
                      </strong>
                    </div>
                  </div>

                  {/* Cook at Home Action */}
                  <div className="pt-2 border-t border-stone-800">
                    <div className="text-xs font-bold text-stone-300 mb-1.5 flex items-center gap-1.5">
                      <CookingPot className="w-3.5 h-3.5 text-amber-400" />
                      Cook in Kitchen (Uses Inventory Groceries)
                    </div>
                    <button
                      onClick={() => handleCookMeal('Indomie Noodles & Fried Eggs', 2, 2)}
                      className="w-full py-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 font-black text-xs rounded-xl shadow font-mono"
                    >
                      🍳 COOK NOODLES & EGGS (+50 Stamina)
                    </button>
                  </div>
                </div>

                {/* Upgrade House Catalog */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Upgrade to Better Houses
                  </div>
                  {HOUSE_TIERS.filter((t) => t.id !== gameState.house.id).map((tier) => (
                    <div
                      key={tier.id}
                      className="p-3 bg-stone-900 border border-stone-800 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-400">{tier.title}</span>
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          ₦{(tier.purchaseCost || tier.rentCost).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400">{tier.description}</p>
                      <button
                        onClick={() => handleUpgradeHouse(tier)}
                        className="w-full py-1.5 bg-stone-800 hover:bg-amber-400 hover:text-stone-950 text-stone-200 font-bold text-xs rounded-lg transition-colors font-mono"
                      >
                        MOVE INTO {tier.title.split(' ')[0]}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* APP 5: BOUTIQUE & GROCERIES */}
          {/* ======================================================== */}
          {activeApp === 'BOUTIQUE' && (
            <div className="flex-1 bg-stone-950 flex flex-col overflow-hidden">
              <div className="h-12 border-b border-stone-800 px-4 flex items-center gap-3 shrink-0">
                <button onClick={() => setActiveApp('HOME')}>
                  <ArrowLeft className="w-5 h-5 text-stone-300" />
                </button>
                <h2 className="font-bold text-sm text-pink-400">Lagos Supermarket & Boutique</h2>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
                {[
                  { id: 'indomie-b', name: 'Carton of Indomie Noodles', price: 7500, icon: '🍜', category: 'GROCERY' as const },
                  { id: 'eggs-b', name: 'Crate of Eggs (30 pcs)', price: 3800, icon: '🥚', category: 'GROCERY' as const },
                  { id: 'yam-b', name: 'Tuber of Abuja Yam', price: 2500, icon: '🍠', category: 'GROCERY' as const },
                  { id: 'gen-b', name: 'Tiger Portable Generator', price: 38000, icon: '⚡', category: 'GEAR' as const },
                  { id: 'coolant-b', name: 'Radiator Coolant Sachet', price: 1500, icon: '❄️', category: 'SPARE_PART' as const },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-stone-900 border border-stone-800 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <div className="font-bold text-xs text-white">{item.name}</div>
                        <div className="text-[10px] font-mono text-emerald-400 font-bold">
                          ₦{item.price.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (gameState.walletNaira < item.price) {
                          addFeedMessage('⚠️ Insufficient funds!');
                          return;
                        }
                        soundEngine.playCoin();
                        setGameState((prev) => ({
                          ...prev,
                          walletNaira: prev.walletNaira - item.price,
                          inventory: [
                            ...prev.inventory,
                            {
                              id: `item-${Date.now()}`,
                              name: item.name,
                              category: item.category,
                              quantity: 1,
                              icon: item.icon,
                              description: 'Purchased from boutique.',
                            },
                          ],
                        }));
                        addFeedMessage(`🛍️ BOUGHT: ${item.name} added to inventory!`);
                      }}
                      className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-black text-xs rounded-lg font-mono shadow"
                    >
                      BUY
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* APP 6: JOBS & SHIFTS */}
          {/* ======================================================== */}
          {activeApp === 'JOBS' && (
            <div className="flex-1 bg-stone-950 flex flex-col overflow-hidden">
              <div className="h-12 border-b border-stone-800 px-4 flex items-center gap-3 shrink-0">
                <button onClick={() => setActiveApp('HOME')}>
                  <ArrowLeft className="w-5 h-5 text-stone-300" />
                </button>
                <h2 className="font-bold text-sm text-teal-400">Lagos Dispatch Jobs</h2>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                <div className="p-3.5 bg-stone-900 border border-stone-800 rounded-xl space-y-2">
                  <div className="font-bold text-xs text-white">Third Mainland Rush Hour Express</div>
                  <p className="text-[11px] text-stone-400">
                    Drive the morning/evening commuter rush from Ikeja Along all the way to CMS Marina. Pick passengers at all junctions.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      if (onStartShift) onStartShift();
                    }}
                    className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs rounded-lg font-['Bungee']"
                  >
                    START RUSH SHIFT NOW
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* APP 7: RIDE & TOWING */}
          {/* ======================================================== */}
          {activeApp === 'RIDE' && (
            <div className="flex-1 bg-stone-950 flex flex-col overflow-hidden">
              <div className="h-12 border-b border-stone-800 px-4 flex items-center gap-3 shrink-0">
                <button onClick={() => setActiveApp('HOME')}>
                  <ArrowLeft className="w-5 h-5 text-stone-300" />
                </button>
                <h2 className="font-bold text-sm text-amber-400">Lagos Roadside Dispatch</h2>
              </div>

              <div className="flex-1 p-4 space-y-4 text-xs text-stone-300">
                <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl space-y-2">
                  <div className="font-bold text-white flex items-center gap-2">
                    <Car className="w-4 h-4 text-amber-400" />
                    Emergency Towing & Fuel Drop
                  </div>
                  <p className="text-[11px] text-stone-400">
                    Stuck in Third Mainland traffic or ran out of diesel? Dispatch a local mechanic van.
                  </p>
                  <button
                    onClick={() => {
                      if (gameState.walletNaira < 3000) {
                        addFeedMessage('⚠️ Need ₦3,000 for emergency tow dispatch!');
                        return;
                      }
                      soundEngine.playHorn();
                      setGameState((prev) => ({
                        ...prev,
                        walletNaira: prev.walletNaira - 3000,
                        bus: {
                          ...prev.bus,
                          fuelPercent: 100,
                          heat: 30,
                        },
                      }));
                      addFeedMessage('🛟 DISPATCH ARRIVED: 10L diesel poured & engine cooled!');
                    }}
                    className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-lg font-mono"
                  >
                    DISPATCH EMERGENCY (₦3,000)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* APP 8: GUIDE */}
          {/* ======================================================== */}
          {activeApp === 'GUIDE' && (
            <div className="flex-1 bg-stone-950 flex flex-col overflow-hidden">
              <div className="h-12 border-b border-stone-800 px-4 flex items-center gap-3 shrink-0">
                <button onClick={() => setActiveApp('HOME')}>
                  <ArrowLeft className="w-5 h-5 text-stone-300" />
                </button>
                <h2 className="font-bold text-sm text-yellow-400">Driver Survival Guide</h2>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs text-stone-300 leading-relaxed">
                <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl">
                  <strong className="text-amber-400 block mb-1">1. Driving Controls:</strong>
                  Use the rotary steering wheel on the left or keyboard [A/D]. Tap GAS to accelerate and BRAKE to stop.
                </div>
                <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl">
                  <strong className="text-amber-400 block mb-1">2. Bus Stop Pickups:</strong>
                  Stop at the yellow curb markers at each junction and click [DOOR OPEN] to board commuters!
                </div>
                <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl">
                  <strong className="text-amber-400 block mb-1">3. Life & Housing:</strong>
                  You start in a Mushin "Face-Me-I-Face-You" room. Pay your rent and NEPA bills on time or get padlocked! Save up to buy a Lekki Duplex!
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* APP 9 & 10: WEB-VIEW ROUTED APPS (AGS & SOLARFIRST) */}
          {/* ======================================================== */}
          {/* ======================================================== */}
          {/* APP 9 & 10: WEB-VIEW ROUTED APPS (AGS & SOLARFIRST) */}
          {/* ======================================================== */}
          {(activeApp === 'AGS' || activeApp === 'SOLAR_FIRST') && (() => {
            const isAgs = activeApp === 'AGS';
            const realDomain = isAgs ? 'myags.school' : 'getsolarfirst.com';
            const targetUrl = isAgs ? 'https://www.myags.school' : 'https://getsolarfirst.com';
            const proxiedUrl = `/api/proxy-site?url=${encodeURIComponent(targetUrl)}`;

            return (
              <div className="flex-1 bg-stone-950 flex flex-col overflow-hidden">
                {/* IN-PHONE NAVIGATION BAR */}
                <div className="h-12 border-b border-stone-800 bg-stone-900/95 backdrop-blur px-3 flex items-center justify-between gap-2 shrink-0 z-30">
                  {/* Back Arrow '<' to return to the phone's app home screen */}
                  <button
                    onClick={() => setActiveApp('HOME')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 border border-stone-700 text-xs font-bold transition-all shadow-sm shrink-0"
                    title="Return to Phone Home Screen"
                    aria-label="Back to home screen"
                  >
                    <ChevronLeft className="w-4 h-4 text-amber-400 -mr-0.5" />
                    <span className="font-mono text-sm leading-none font-black text-amber-400">&lt;</span>
                    <span className="text-[11px] text-stone-300 ml-0.5">Home</span>
                  </button>

                  {/* In-Phone Browser Address & Routing Display */}
                  <div className="flex-1 min-w-0 bg-stone-950/90 border border-stone-800 rounded-xl px-2.5 py-1 flex items-center justify-between gap-1 shadow-inner">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="text-[11px] font-mono text-stone-200 truncate font-semibold">
                        {realDomain}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                        LIVE
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => setIframeKey((k) => k + 1)}
                        className="p-1 text-stone-400 hover:text-white rounded transition-colors"
                        title="Reload Page"
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                      <a
                        href={targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-stone-400 hover:text-amber-400 rounded transition-colors"
                        title="Open in new window"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Global 'X Close' button to exit phone completely */}
                  <button
                    onClick={onClose}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 active:scale-95 text-rose-200 border border-rose-800/70 text-xs font-bold transition-all shadow-sm shrink-0"
                    title="Exit Phone Completely"
                    aria-label="Close phone"
                  >
                    <X className="w-3.5 h-3.5 text-rose-300" />
                    <span className="text-[11px]">Close</span>
                  </button>
                </div>

                {/* Embedded Iframe View Container (Using Local Proxy to Strip X-Frame-Options) */}
                <div className="flex-1 relative flex flex-col bg-stone-900 overflow-hidden">
                  <iframe
                    key={iframeKey}
                    src={proxiedUrl}
                    title={isAgs ? 'AGS School Portal' : 'SolarFirst Clean Energy'}
                    className="w-full flex-1 border-0 bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                    allow="fullscreen; autoplay; clipboard-write; encrypted-media"
                  />

                  {/* In-Phone View Status Ribbon */}
                  <div className="h-7 bg-stone-950 border-t border-stone-800 px-3 flex items-center justify-between text-[10px] text-stone-400 shrink-0 select-none">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="truncate">
                        {isAgs ? '🎓 All Good Schools (AGS) Official Portal' : '☀️ SolarFirst Clean Energy & Inverters'}
                      </span>
                    </div>
                    <a
                      href={targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 shrink-0 font-medium font-mono"
                    >
                      <span>Direct Web</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ======================================================== */}
          {/* TUNDAHEADLOT (LAGOS STREET BLOGGER & BREAKING GIST APP)  */}
          {/* ======================================================== */}
          {activeApp === 'TUNDAHEADLOT' && (
            <div className="flex-1 flex flex-col bg-stone-950 text-white overflow-hidden">
              {/* Blogger Top App Header */}
              <div className="bg-stone-900 border-b border-stone-800 p-3 pt-2 flex items-center justify-between shrink-0 shadow-md">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveApp('HOME')}
                    className="p-1 rounded-full hover:bg-stone-800 text-stone-300 hover:text-white"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-red-600 flex items-center justify-center text-sm font-black border border-amber-300">
                      TH
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-['Bungee'] text-xs text-amber-400 tracking-wide">TUNDAHEADLOT</span>
                        <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-bold">✓</span>
                      </div>
                      <p className="text-[9px] text-stone-400 font-mono">@tundaheadlot • 5.4M Followers</p>
                    </div>
                  </div>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[9px] font-mono text-rose-300 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  LIVE GIST
                </div>
              </div>

              {/* Blogger Bio Banner */}
              <div className="bg-gradient-to-r from-stone-900 via-amber-950/40 to-stone-900 px-3 py-1.5 border-b border-stone-800 text-[9.5px] text-stone-300 flex items-center justify-between shrink-0">
                <span>🔥 King of Lagos Street Gist • Followed by Davido, Burna Boy, MC Oluomo</span>
                <span className="text-amber-400 font-mono text-[9px] font-bold">#1 BLOG IN 9JA</span>
              </div>

              {/* Feed Posts List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {[
                  {
                    id: 'post-1',
                    category: '🚨 CRIME & TRAFFIC',
                    categoryColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
                    time: '12m ago • Victoria Island / Eko Hotel',
                    title: 'Danfo driver hits pedestrian crossing Eko Hotel roundabout - LASTMA on scene!',
                    content: 'WAAAHALA PRO MAX! A Danfo driver with slogan "NO KING AS GOD" allegedly lost brake while speeding and brushed a pedestrian crossing the Eko Hotel roundabout! LASTMA heavy-duty tow truck has arrived with sirens blaring, and the bus is currently being towed straight to the Joint Police & LASTMA Enforcement Command compound on the expressway! Driver is arguing that pedestrian was pressing phone while crossing.',
                    badge: 'BREAKING',
                    comments: [
                      { user: '@eko_sharp_guy', text: 'Pedestrian sef go dey press TikTok for road! But Danfo drivers no dey get brake at all!' },
                      { user: '@lastma_watcher', text: 'They don tow the bus to Zone 2 compound! Driver go pay heavy fine!' },
                    ]
                  },
                  {
                    id: 'post-2',
                    category: '🚔 TASK FORCE RAID',
                    categoryColor: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
                    time: '45m ago • Expressway Corridor',
                    title: 'Joint Police & LASTMA Command impounds 14 commercial vehicles for picking outside extended bus stops!',
                    content: 'The newly commissioned Joint Police & LASTMA Enforcement Command compound (Zone 2) along the expressway has launched a massive 24/7 clampdown! Officers wearing their authentic cream and wine uniforms impounded 14 Danfo buses and 3 private cars for one-way driving and blocking road curbs outside the extended 22-meter bus stops! Motorists can only bail impounded vehicles at the station counter for ₦15,000 fine.',
                    badge: 'HOT GIST',
                    comments: [
                      { user: '@danfo_pilot_01', text: 'Those LASTMA officers in wine trousers don come again o! Make nobody pass one-way!' },
                      { user: '@mama_titilayo', text: 'Good for them! Some drivers dey pack for middle of road dey load passenger!' }
                    ]
                  },
                  {
                    id: 'post-3',
                    category: '🚏 STREET DRAMA',
                    categoryColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
                    time: '2h ago • Oshodi Bus Stop',
                    title: 'Agbero union fight scatters Oshodi bus stop over ₦100 ticket; 3 Keke tricycles blocked!',
                    content: 'Commuters were stranded for over 40 minutes at Oshodi bus stop after agbero ticket boys engaged in a heated brawl over unpaid ₦100 loading levies! Agitated crowd spilled into the main expressway blocking traffic, while 3 Keke Napep tricycles were stuck at the curb. Conductor reportedly collected fare from 12 passengers and ran into the market!',
                    badge: 'VIRAL',
                    comments: [
                      { user: '@oshodi_lord', text: 'Everyday na normal routine for Oshodi! Conductor run with money is a classic!' }
                    ]
                  },
                  {
                    id: 'post-4',
                    category: '⛽ FUEL WATCH',
                    categoryColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
                    time: '4h ago • Maryland / Ikeja Along',
                    title: 'Petrol pump price reaches ₦950/Litre; Danfo drivers announce new minimum fare of ₦800!',
                    content: 'Fuel queues have stretched from Mobil filling station down to Maryland junction as pump price climbed to ₦950 per litre. Lagos Danfo drivers union Chairman has announced that transport fare from Ikeja Along to CMS is now ₦800 flat. "No enter our bus if you get ₦1,000 note without change!"',
                    badge: 'TRENDING',
                    comments: [
                      { user: '@poor_commuter', text: 'My salary don finish for transport fare! God abeg save us!' }
                    ]
                  },
                  {
                    id: 'post-5',
                    category: '🔥 COMEDY',
                    categoryColor: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
                    time: '6h ago • Ojuelegba Bridge',
                    title: 'Passenger jumps down from moving Danfo because conductor refused to return ₦200 change!',
                    content: 'A hilarious video is trending showing a passenger jumping out of a moving Danfo bus at Ojuelegba bridge after shouting "Conductor, give me my change!" for 5 kilometers. The conductor threw a ₦200 note onto the road and the passenger picked it up while dusting his trousers!',
                    badge: 'MEME',
                    comments: [
                      { user: '@funny_lagosian', text: 'Lagos no be place for the weak! He collect his complete ₦200!' }
                    ]
                  }
                ].map((post) => {
                  const isLiked = !!tundaLiked[post.id];
                  const likes = tundaLikesCount[post.id] || 25000;

                  return (
                    <div key={post.id} className="bg-stone-900/90 border border-stone-800 rounded-2xl p-3 shadow-lg flex flex-col gap-2">
                      {/* Post Header */}
                      <div className="flex items-center justify-between text-[9px] font-mono">
                        <span className={`px-2 py-0.5 rounded-full border text-[8.5px] font-black uppercase ${post.categoryColor}`}>
                          {post.category}
                        </span>
                        <span className="text-stone-400">{post.time}</span>
                      </div>

                      {/* Title */}
                      <h3 className="text-xs font-bold text-amber-300 leading-snug">
                        {post.title}
                      </h3>

                      {/* Content */}
                      <p className="text-[10px] text-stone-300 leading-relaxed">
                        {post.content}
                      </p>

                      {/* Comment Preview */}
                      <div className="bg-stone-950/80 rounded-xl p-2 border border-stone-800/80 space-y-1">
                        <div className="text-[8.5px] font-mono text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <MessageCircle className="w-2.5 h-2.5 text-stone-400" />
                          Top Lagos Comments:
                        </div>
                        {post.comments.map((c, ci) => (
                          <div key={ci} className="text-[9px] text-stone-300">
                            <span className="font-bold text-amber-400">{c.user}: </span>
                            <span>{c.text}</span>
                          </div>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-stone-800/80 text-[10px] font-mono">
                        <button
                          onClick={() => {
                            soundEngine.playCoin();
                            setTundaLiked((prev) => ({ ...prev, [post.id]: !prev[post.id] }));
                            setTundaLikesCount((prev) => ({
                              ...prev,
                              [post.id]: (prev[post.id] || 25000) + (isLiked ? -1 : 1),
                            }));
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
                            isLiked
                              ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                              : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-3 h-3 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                          <span className="tabular-nums font-bold">{likes.toLocaleString()}</span>
                        </button>

                        <button
                          onClick={() => {
                            soundEngine.playHorn(false);
                            addFeedMessage(`📢 TUNDAHEADLOT SHARED: "${post.title}"`);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 active:scale-95 text-[9px] font-bold"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Share Gossip</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Bottom iOS Home Indicator Bar */}
        <div className="h-6 bg-black flex items-center justify-center shrink-0">
          <button
            onClick={() => setActiveApp('HOME')}
            className="w-32 h-1 bg-stone-400 rounded-full hover:bg-white transition-colors"
          />
        </div>
      </div>
    </div>
  );
};
