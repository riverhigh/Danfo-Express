import React, { useState } from 'react';
import { GameState, PhoneMessage, HouseInfo, InventoryItem } from '../types/game';
import { CHOWDECK_MENU, HOUSE_TIERS } from '../game/config';
import { soundEngine } from '../audio/soundEngine';
import { 
  X, 
  ArrowLeft, 
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
  CookingPot
} from 'lucide-react';

interface PhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  addFeedMessage: (msg: string) => void;
  onStartShift?: () => void;
}

type PhoneApp = 'HOME' | 'JOBS' | 'MESSAGES' | 'BANK' | 'CHOWDECK' | 'HOUSING' | 'BOUTIQUE' | 'RIDE' | 'GUIDE';

export const PhoneModal: React.FC<PhoneModalProps> = ({
  isOpen,
  onClose,
  gameState,
  setGameState,
  addFeedMessage,
  onStartShift,
}) => {
  const [activeApp, setActiveApp] = useState<PhoneApp>('HOME');
  const [selectedMessage, setSelectedMessage] = useState<PhoneMessage | null>(null);

  if (!isOpen) return null;

  // Settle Bill via Bank App
  const handlePayBill = (type: 'RENT' | 'NEPA' | 'LEVY', cost: number) => {
    if (gameState.walletNaira < cost) {
      addFeedMessage(`⚠️ Insufficient funds! You need ₦${cost.toLocaleString()} to settle this bill.`);
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

      return {
        ...prev,
        walletNaira: prev.walletNaira - cost,
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

        {/* Phone Close Button */}
        <button
          onClick={onClose}
          className="absolute top-12 right-6 z-40 bg-stone-900/90 hover:bg-stone-800 text-stone-200 px-3 py-1 rounded-full text-xs font-bold border border-stone-700 flex items-center gap-1 shadow-md transition-transform active:scale-95"
        >
          <X className="w-3 h-3" />
          <span>Close</span>
        </button>

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

              {/* Main Apps Grid (Matching Screenshot) */}
              <div className="grid grid-cols-4 gap-y-5 gap-x-3 my-auto pt-4">
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
                {/* Account Balance Card */}
                <div className="p-4 bg-gradient-to-br from-indigo-900 via-purple-900 to-stone-900 rounded-2xl border border-purple-500/30 text-white shadow-xl space-y-2">
                  <div className="text-[10px] uppercase font-mono text-purple-300 tracking-wider">
                    Driver Cash & Account Balance
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-400 tabular-nums">
                    ₦{gameState.walletNaira.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono flex items-center justify-between">
                    <span>Account: 0148924018</span>
                    <span className="text-amber-400">Street Tier 1</span>
                  </div>
                </div>

                {/* Settle Bills Quick Actions */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Bills & Taxes
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
