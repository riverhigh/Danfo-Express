import React, { useState, useEffect } from 'react';
import {
  Home,
  Sofa,
  Map as MapIcon,
  Smartphone,
  Volume2,
  VolumeX,
  Plus,
  Gift,
  Gem,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Bus,
  Check,
  Lock,
  Sparkles,
} from 'lucide-react';
import { GameState } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

export interface HomeUpgradeState {
  roomTier: 1 | 2 | 3; // 1 = Small Starter Room, 2 = Self-Contain (2 Rooms), 3 = Full Luxury Flat (4 Rooms like reference image)
  ownedFurniture: string[];
  needs: {
    hunger: number;   // 🍛
    energy: number;   // ⚡
    fun: number;      // 🎉
    social: number;   // 💬
    hygiene: number;  // 🫧
    toilet: number;   // 🚽
  };
  dailyRewardClaimed: boolean;
  gemsFound: number;
}

interface FurnitureItem {
  id: string;
  name: string;
  price: number;
  category: 'STARTER' | 'LIVING' | 'KITCHEN_BATH' | 'LUXURY';
  minTier: 1 | 2 | 3;
  needBoost: keyof HomeUpgradeState['needs'];
  boostLabel: string;
  description: string;
}

export const HOME_FURNITURE_CATALOG: FurnitureItem[] = [
  {
    id: 'bed_mattress',
    name: 'Purple Foam Bed & Frame',
    price: 0,
    category: 'STARTER',
    minTier: 1,
    needBoost: 'energy',
    boostLabel: '+100% Energy (Sleep)',
    description: 'Included in your small starter room. Tap bed to sleep and restore stamina.',
  },
  {
    id: 'study_desk',
    name: 'Wooden Desk & Pink Chair',
    price: 450,
    category: 'STARTER',
    minTier: 1,
    needBoost: 'social',
    boostLabel: '+35% Social & Focus',
    description: 'Compact desk with laptop for checking Lagos route manifests.',
  },
  {
    id: 'ring_light',
    name: 'Creator Ring Light Stand',
    price: 350,
    category: 'STARTER',
    minTier: 1,
    needBoost: 'fun',
    boostLabel: '+30% Fun & Street Cred',
    description: 'Bright LED tripod ring light in your bedroom.',
  },
  {
    id: 'red_sofa_rug',
    name: 'Red Velvet Sofa & Orange Rug',
    price: 850,
    category: 'LIVING',
    minTier: 1,
    needBoost: 'energy',
    boostLabel: '+45% Rest & Comfort',
    description: 'Plush crimson two-seater couch with circular orange center rug.',
  },
  {
    id: 'tv_console',
    name: 'Wide Flat-Screen TV & Shelf',
    price: 1200,
    category: 'LIVING',
    minTier: 1,
    needBoost: 'fun',
    boostLabel: '+60% Fun (Watch Super Eagles)',
    description: 'Flat-screen television on oak media cabinet with side bookshelf.',
  },
  {
    id: 'bathroom_set',
    name: 'Tiled Shower & White Bathtub',
    price: 1500,
    category: 'KITCHEN_BATH',
    minTier: 2,
    needBoost: 'hygiene',
    boostLabel: '+100% Hygiene & Toilet',
    description: 'Glass corner shower stall, porcelain bathtub, and sink.',
  },
  {
    id: 'dining_kitchen',
    name: 'Round Dining Table, Fridge & Microwave',
    price: 1800,
    category: 'KITCHEN_BATH',
    minTier: 2,
    needBoost: 'hunger',
    boostLabel: '+100% Hunger (Hot Jollof)',
    description: 'Full kitchen counter with fridge, microwave, and 3-chair round dining set.',
  },
  {
    id: 'pool_table',
    name: 'Championship Green Snooker Table',
    price: 2800,
    category: 'LUXURY',
    minTier: 3,
    needBoost: 'fun',
    boostLabel: '+100% Fun & Morale',
    description: 'Full-size green felt billiards table with cues in the back lounge.',
  },
  {
    id: 'house_cat',
    name: 'Lagos House Cat ("Milo")',
    price: 600,
    category: 'LIVING',
    minTier: 1,
    needBoost: 'social',
    boostLabel: '+50% Happiness',
    description: 'Friendly pet cat hanging out on the checkered floor.',
  },
];

export const ROOM_TIERS = [
  {
    tier: 1 as const,
    name: 'Small Single Room (Starter)',
    subtitle: 'Face-Me-I-Face-You Compact Room',
    price: 0,
    dimensionsLabel: '1 Compact Cutaway Room',
    description: 'Every Lagos Danfo driver starts humble! A cozy single room with checkered floor, window blinds, and your bed.',
  },
  {
    tier: 2 as const,
    name: 'Self-Contain Suite',
    price: 3500,
    subtitle: 'Bedroom + Tiled Bathroom + Kitchenette',
    dimensionsLabel: '3 Cutaway Zones',
    description: 'Unlocks the tiled bathroom with shower & bathtub plus the bright kitchen and dining room!',
  },
  {
    tier: 3 as const,
    name: 'Full 4-Room Executive Flat',
    price: 8500,
    subtitle: 'Bedroom + Living Lounge + Kitchen + Bath + Snooker Room',
    dimensionsLabel: 'Full Multi-Room Cutaway Mansion',
    description: 'The ultimate Lagos boss apartment! Full open-plan living lounge, bedroom studio, dining kitchen, bath & billiards room.',
  },
];

interface PlayerHome2DProps {
  gameState: GameState;
  onUpdateWalletAndCred: (walletDelta: number, credDelta?: number, staminaSet?: number) => void;
  onGoToDrive: () => void;
  onOpenPhone: () => void;
  onBackToMenu: () => void;
}

const STORAGE_KEY_HOME = 'danfo_express_home_2d_v1';

export const PlayerHome2D: React.FC<PlayerHome2DProps> = ({
  gameState,
  onUpdateWalletAndCred,
  onGoToDrive,
  onOpenPhone,
  onBackToMenu,
}) => {
  const [homeState, setHomeState] = useState<HomeUpgradeState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HOME);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          roomTier: parsed.roomTier || 1,
          ownedFurniture: parsed.ownedFurniture || ['bed_mattress'],
          needs: parsed.needs || {
            hunger: Math.max(40, gameState.needs?.hunger || 65),
            energy: Math.max(45, gameState.needs?.energy || 70),
            fun: 78,
            social: 82,
            hygiene: 85,
            toilet: 75,
          },
          dailyRewardClaimed: Boolean(parsed.dailyRewardClaimed),
          gemsFound: parsed.gemsFound ?? 2,
        };
      }
    } catch {}
    // Default: Player starts in a SMALL SINGLE ROOM (Tier 1) with basic bed!
    return {
      roomTier: 1,
      ownedFurniture: ['bed_mattress'],
      needs: {
        hunger: 62,
        energy: 65,
        fun: 78,
        social: 82,
        hygiene: 85,
        toilet: 74,
      },
      dailyRewardClaimed: false,
      gemsFound: 2,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HOME, JSON.stringify(homeState));
    } catch {}
  }, [homeState]);

  const [activeBottomTab, setActiveBottomTab] = useState<'HOME' | 'BUY' | 'MAP' | 'PHONE'>('HOME');
  const [cleanScreen, setCleanScreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [roomRotation, setRoomRotation] = useState(0); // Slight isometric angle toggle
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Player character position inside the 2D isometric room (in SVG coordinates 0..800, 0..620)
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 385, y: 385 });
  const [playerActionLabel, setPlayerActionLabel] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const hasItem = (id: string) => homeState.ownedFurniture.includes(id);

  // Compute overall mood label like "Very Happy" in the reference image
  const avgNeed = Math.round(
    (homeState.needs.hunger +
      homeState.needs.energy +
      homeState.needs.fun +
      homeState.needs.social +
      homeState.needs.hygiene +
      homeState.needs.toilet) /
      6
  );
  const moodText =
    avgNeed >= 75 ? 'Very Happy' : avgNeed >= 50 ? 'Doing Okay' : 'Needs Rest';

  // Interact with furniture or needs
  const triggerNeedAction = (
    needKey: keyof HomeUpgradeState['needs'],
    targetX: number,
    targetY: number,
    actionTitle: string
  ) => {
    soundEngine.playCoin();
    setPlayerPos({ x: targetX, y: targetY });
    setPlayerActionLabel(actionTitle);
    setHomeState((prev) => ({
      ...prev,
      needs: {
        ...prev.needs,
        [needKey]: Math.min(100, prev.needs[needKey] + 35),
      },
    }));
    if (needKey === 'energy' || needKey === 'hunger') {
      onUpdateWalletAndCred(0, 0, 100);
    }
    showToast(`${actionTitle} (+35% ${needKey.toUpperCase()})`);
    setTimeout(() => setPlayerActionLabel(null), 2200);
  };

  // Buy room expansion tier
  const handleUpgradeRoomTier = (targetTier: 1 | 2 | 3, price: number, name: string) => {
    if (homeState.roomTier >= targetTier) return;
    if (gameState.walletNaira < price) {
      showToast(`Need ₦${price.toLocaleString()} to unlock ${name}! Drive more trips to earn cash.`);
      return;
    }
    soundEngine.playCoin();
    soundEngine.playHorn(true);
    onUpdateWalletAndCred(-price, 25, 100);
    setHomeState((prev) => ({
      ...prev,
      roomTier: targetTier,
    }));
    showToast(`🏠 UPGRADED HOME: Welcome to your ${name}!`);
  };

  // Buy furniture item
  const handleBuyFurniture = (item: FurnitureItem) => {
    if (hasItem(item.id)) return;
    if (homeState.roomTier < item.minTier) {
      showToast(`Upgrade to Room Tier ${item.minTier} first to fit ${item.name}!`);
      return;
    }
    if (gameState.walletNaira < item.price) {
      showToast(`Need ₦${item.price.toLocaleString()} for ${item.name}!`);
      return;
    }
    soundEngine.playCoin();
    onUpdateWalletAndCred(-item.price, 10);
    setHomeState((prev) => ({
      ...prev,
      ownedFurniture: [...prev.ownedFurniture, item.id],
      needs: {
        ...prev.needs,
        [item.needBoost]: Math.min(100, prev.needs[item.needBoost] + 25),
      },
    }));
    showToast(`🛋️ Placed ${item.name} in your room!`);
  };

  const handleClaimDailyReward = () => {
    if (homeState.dailyRewardClaimed) {
      showToast('Daily reward already claimed today! Come back after your next shift.');
      return;
    }
    soundEngine.playCoin();
    onUpdateWalletAndCred(500, 10);
    setHomeState((prev) => ({ ...prev, dailyRewardClaimed: true }));
    showToast('🎁 Daily Reward Claimed: +₦500 added to wallet!');
  };

  const handleClaimGemBonus = () => {
    soundEngine.playCoin();
    const nextGems = homeState.gemsFound + 1;
    if (nextGems >= 3) {
      onUpdateWalletAndCred(300, 15);
      setHomeState((prev) => ({ ...prev, gemsFound: 0 }));
      showToast('💎 Street Gem Prize Completed: +₦300 Bonus!');
    } else {
      setHomeState((prev) => ({ ...prev, gemsFound: nextGems }));
      showToast(`💎 Found Street Token (${nextGems}/3)! Find ${3 - nextGems} more for ₦300 prize.`);
    }
  };

  // Click on isometric floor to walk character there
  const handleSvgFloorClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const transformed = pt.matrixTransform(ctm.inverse());
    // Clamp within room floor area depending on roomTier
    const minX = homeState.roomTier === 1 ? 260 : 165;
    const maxX = homeState.roomTier === 1 ? 525 : 645;
    const minY = homeState.roomTier === 1 ? 255 : 195;
    const maxY = homeState.roomTier === 1 ? 470 : 495;
    const clampedX = Math.max(minX, Math.min(maxX, Math.round(transformed.x)));
    const clampedY = Math.max(minY, Math.min(maxY, Math.round(transformed.y)));
    setPlayerPos({ x: clampedX, y: clampedY });
  };

  const tierInfo = ROOM_TIERS.find((t) => t.tier === homeState.roomTier) || ROOM_TIERS[0];

  return (
    <div className="relative w-full h-screen overflow-hidden select-none flex flex-col justify-between bg-[#0c1638] text-slate-900 font-sans">
      {/* ═══════ TOP FLOATING WHITE STATUS PILL (Matches Reference Image) ═══════ */}
      <div className="relative z-30 pt-3 px-3 sm:px-6 flex flex-col items-center">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-full px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.45)] flex items-center justify-between gap-2 border border-white/60">
          {/* Time */}
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 shrink-0">
            <span className="text-amber-400 text-base">🌙</span>
            <span>2:43 AM</span>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Mood */}
          <button
            onClick={() => triggerNeedAction('energy', 355, 435, '😴 Resting in Room')}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-600 truncate hover:opacity-80"
            title="Tap to rest & boost mood"
          >
            <span className="text-base">😄</span>
            <span className="truncate">{moodText}</span>
          </button>

          {/* Mute Toggle */}
          <button
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              soundEngine.toggleMute?.();
            }}
            className="p-1 text-slate-500 hover:text-slate-800 transition-colors"
            title="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Wallet Naira + Drive/Earn (+) Button */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-full pl-3 pr-1 py-1">
            <span className="text-xs sm:text-sm font-extrabold text-slate-900 tabular-nums">
              ₦{gameState.walletNaira.toLocaleString()}
            </span>
            <button
              onClick={onGoToDrive}
              className="w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white flex items-center justify-center shadow-md transition-all"
              title="Drive Danfo Bus to Earn More Naira!"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Sub-pills: Room Tier & Drive / Park Menu Shortcuts */}
        {!cleanScreen && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <div className="bg-slate-800/80 backdrop-blur border border-slate-600/60 text-white rounded-full px-3 py-0.5 text-[11px] font-bold flex items-center gap-1.5 shadow">
              <span>🏠 {tierInfo.name}</span>
            </div>
            <button
              onClick={onGoToDrive}
              className="bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 rounded-full px-3 py-0.5 text-[11px] font-black flex items-center gap-1 shadow-md transition-all"
            >
              <Bus className="w-3 h-3" />
              <span>DRIVE DANFO</span>
            </button>
            <button
              onClick={onBackToMenu}
              className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-stone-950 rounded-full px-3 py-0.5 text-[11px] font-black flex items-center gap-1 shadow-md transition-all"
            >
              <span>🚏 MOTOR PARK MENU</span>
            </button>
          </div>
        )}
      </div>

      {/* ═══════ TOP-LEFT FLOATING REWARD CARDS & CLEAN SCREEN BUTTON ═══════ */}
      <div className="absolute top-[92px] left-3 sm:left-6 z-30 flex flex-col items-start gap-2 max-w-[260px]">
        {!cleanScreen && (
          <>
            {/* Daily Reward Card */}
            <button
              onClick={handleClaimDailyReward}
              className="w-full bg-white/95 hover:bg-white active:scale-[0.98] rounded-full px-3.5 py-2 shadow-xl flex items-center gap-3 text-left transition-all"
            >
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-lg shrink-0">
                🎁
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold text-slate-800 truncate">
                  {homeState.dailyRewardClaimed ? 'Daily reward claimed!' : 'Daily reward ready · day 1'}
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full mt-1 overflow-hidden relative">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: homeState.dailyRewardClaimed ? '100%' : '33%' }}
                  />
                </div>
                <div className="text-[10px] font-bold text-blue-600 text-center mt-0.5">
                  {homeState.dailyRewardClaimed ? '3/3 (Claimed ₦500)' : '1/3 · Tap to claim ₦500'}
                </div>
              </div>
            </button>

            {/* Daily Gem / Street Token Card */}
            <button
              onClick={handleClaimGemBonus}
              className="w-full bg-white/95 hover:bg-white active:scale-[0.98] rounded-full px-3.5 py-2 shadow-xl flex items-center gap-3 text-left transition-all"
            >
              <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center text-lg shrink-0">
                💎
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold text-slate-800 truncate">
                  Daily street bonus
                </div>
                <div className="text-[11px] font-semibold text-slate-500 truncate">
                  {homeState.gemsFound}/3 found · next prize ₦300
                </div>
              </div>
            </button>
          </>
        )}

        {/* ^ Clean Screen Toggle Button */}
        <button
          onClick={() => setCleanScreen((v) => !v)}
          className="bg-white/95 hover:bg-white active:scale-95 rounded-full px-3.5 py-1.5 shadow-lg text-xs font-bold text-slate-700 flex items-center gap-1 transition-all"
        >
          {cleanScreen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          <span>{cleanScreen ? 'Show HUD' : 'Clean screen'}</span>
        </button>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-stone-950/95 border-2 border-amber-400 text-amber-300 px-4 py-2 rounded-full text-xs font-bold shadow-2xl animate-bounce">
          {toastMsg}
        </div>
      )}

      {/* ═══════ CENTER 2D ISOMETRIC CUTAWAY HOUSE ON CIRCULAR GREEN PLATFORM ═══════ */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden px-2">
        <div
          className="w-full max-w-[780px] aspect-[4/3] flex items-center justify-center transition-transform duration-500"
          style={{
            transform: `scale(${homeState.roomTier === 1 ? 1.06 : 1.0}) rotate(${roomRotation}deg)`,
          }}
        >
          <svg
            viewBox="0 0 800 620"
            className="w-full h-full drop-shadow-[0_25px_45px_rgba(0,0,0,0.65)] cursor-pointer"
            onClick={handleSvgFloorClick}
          >
            <defs>
              {/* Dark Checkered Floor Pattern */}
              <pattern id="darkCheckered" width="40" height="24" patternUnits="userSpaceOnUse">
                <polygon points="20,0 40,12 20,24 0,12" fill="#231f20" />
                <polygon points="20,0 40,12 20,24 0,12" fill="#181516" transform="translate(20,12)" />
                <polygon points="20,0 40,12 20,24 0,12" fill="#181516" transform="translate(-20,12)" />
              </pattern>

              {/* Light Cream Kitchen Tile Pattern */}
              <pattern id="creamTile" width="36" height="22" patternUnits="userSpaceOnUse">
                <polygon points="18,0 36,11 18,22 0,11" fill="#cbbba8" stroke="#b6a48f" strokeWidth="1" />
              </pattern>

              {/* Grey Bathroom Tile Pattern */}
              <pattern id="bathTile" width="36" height="22" patternUnits="userSpaceOnUse">
                <polygon points="18,0 36,11 18,22 0,11" fill="#9ea3a8" stroke="#888d92" strokeWidth="1" />
              </pattern>

              {/* Warm Wall Sconce Glow */}
              <radialGradient id="sconceGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fde68a" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* 1. OLIVE-GREEN CIRCULAR LAWN PLATFORM (Like IMG_6758.png) */}
            <ellipse cx="400" cy="360" rx="375" ry="235" fill="#4f5b38" />
            <ellipse cx="400" cy="348" rx="370" ry="228" fill="#728054" />
            <ellipse cx="400" cy="344" rx="356" ry="216" fill="#7a885b" />

            {/* ═══════ TIER 1: SMALL SINGLE STARTER ROOM (Default Starting Home!) ═══════ */}
            {homeState.roomTier === 1 && (
              <g>
                {/* Outer Foundation Base Shadow */}
                <polygon
                  points="400,190 590,300 400,490 210,380"
                  fill="#44403c"
                />

                {/* Back-Left Wall (3D Extruded Cutaway) */}
                <polygon
                  points="210,380 400,190 400,98 210,288"
                  fill="#292322"
                  stroke="#57534e"
                  strokeWidth="3"
                />
                {/* Back-Right Wall (3D Extruded Cutaway) */}
                <polygon
                  points="400,190 590,300 590,208 400,98"
                  fill="#1f1b1a"
                  stroke="#57534e"
                  strokeWidth="3"
                />

                {/* Isometric Checkered Room Floor */}
                <polygon
                  points="400,190 590,300 400,485 210,375"
                  fill="url(#darkCheckered)"
                  stroke="#57534e"
                  strokeWidth="4"
                />

                {/* Window with Blinds on Back-Right Wall */}
                <g transform="translate(465, 160)">
                  <polygon points="0,0 70,40 70,90 0,50" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="3" />
                  <line x1="5" y1="12" x2="65" y2="46" stroke="#64748b" strokeWidth="2" />
                  <line x1="5" y1="22" x2="65" y2="56" stroke="#64748b" strokeWidth="2" />
                  <line x1="5" y1="32" x2="65" y2="66" stroke="#64748b" strokeWidth="2" />
                  <line x1="5" y1="42" x2="65" y2="76" stroke="#64748b" strokeWidth="2" />
                </g>

                {/* Glowing Wall Light Sconce */}
                <circle cx="330" cy="200" r="42" fill="url(#sconceGlow)" />
                <circle cx="330" cy="200" r="6" fill="#fef3c7" />

                {/* Starter Bed in Bottom-Left Corner (Interactive: Tap to Sleep) */}
                <g
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerNeedAction('energy', 330, 395, '😴 Sleeping on Foam Bed');
                  }}
                  className="cursor-pointer hover:opacity-95"
                >
                  {/* Wooden Bed Frame */}
                  <polygon points="245,365 325,315 395,360 315,410" fill="#451a03" stroke="#290f02" strokeWidth="2" />
                  {/* Purple Mattress */}
                  <polygon points="252,356 325,310 388,350 315,396" fill="#3b0764" />
                  {/* White Sheet Fold & Pillows */}
                  <polygon points="252,356 285,335 348,375 315,396" fill="#cbd5e1" />
                  <ellipse cx="285" cy="360" rx="14" ry="8" fill="#f8fafc" transform="rotate(-28 285 360)" />
                  {/* Headboard */}
                  <polygon points="245,365 315,410 315,382 245,337" fill="#5c2406" />
                </g>

                {/* Optional Study Desk & Pink Chair (If owned or starter) */}
                {hasItem('study_desk') && (
                  <g
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerNeedAction('social', 410, 395, '💻 Checking Danfo Routes at Desk');
                    }}
                    className="cursor-pointer"
                  >
                    <polygon points="395,385 455,348 485,368 425,405" fill="#a87c56" />
                    <polygon points="395,385 425,405 425,432 395,412" fill="#855f3e" />
                    <polygon points="425,405 485,368 485,395 425,432" fill="#704e32" />
                    {/* Pink Office Chair */}
                    <ellipse cx="415" cy="365" rx="14" ry="10" fill="#be185d" />
                    <rect x="405" y="342" width="18" height="22" rx="5" fill="#db2777" />
                  </g>
                )}

                {/* Optional Ring Light */}
                {hasItem('ring_light') && (
                  <g
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerNeedAction('fun', 370, 325, '📸 Streaming Lagos Driver Vlog');
                    }}
                    className="cursor-pointer"
                  >
                    <line x1="365" y1="295" x2="355" y2="335" stroke="#111" strokeWidth="3" />
                    <line x1="365" y1="295" x2="375" y2="335" stroke="#111" strokeWidth="3" />
                    <line x1="365" y1="295" x2="365" y2="338" stroke="#111" strokeWidth="3" />
                    <ellipse
                      cx="365"
                      cy="282"
                      rx="11"
                      ry="15"
                      fill="none"
                      stroke="#f8fafc"
                      strokeWidth="4"
                    />
                  </g>
                )}

                {/* Optional Red Sofa & Orange Rug in Small Room */}
                {hasItem('red_sofa_rug') && (
                  <g
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerNeedAction('energy', 445, 310, '🛋️ Relaxing on Red Velvet Sofa');
                    }}
                    className="cursor-pointer"
                  >
                    <ellipse cx="475" cy="328" rx="38" ry="24" fill="#c2410c" stroke="#1e293b" strokeWidth="4" />
                    <polygon points="415,280 468,248 492,265 439,297" fill="#7f1d1d" />
                    <polygon points="415,280 468,248 468,225 415,257" fill="#5c1111" />
                  </g>
                )}

                {/* Optional TV Console */}
                {hasItem('tv_console') && (
                  <g
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerNeedAction('fun', 475, 340, '📺 Watching Super Eagles Match');
                    }}
                    className="cursor-pointer"
                  >
                    <polygon points="485,342 548,302 565,314 502,354" fill="#b08968" />
                    <polygon points="498,325 545,295 545,258 498,288" fill="#334155" stroke="#1e293b" strokeWidth="2" />
                  </g>
                )}

                {/* Optional House Cat */}
                {hasItem('house_cat') && (
                  <g
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerNeedAction('social', 395, 315, '🐱 Petting Milo the Cat');
                    }}
                    className="cursor-pointer"
                  >
                    <ellipse cx="400" cy="300" rx="10" ry="6" fill="#a8a29e" />
                    <circle cx="408" cy="295" r="5" fill="#a8a29e" />
                  </g>
                )}

                {/* Small Room Starter Label */}
                <g transform="translate(275, 498)">
                  <rect x="0" y="0" width="250" height="28" rx="14" fill="rgba(15,23,42,0.85)" stroke="#facc15" strokeWidth="1.5" />
                  <text x="125" y="18" textAnchor="middle" fill="#facc15" fontSize="11" fontWeight="bold">
                    STARTER SINGLE ROOM • TAP FLOOR OR BED
                  </text>
                </g>
              </g>
            )}

            {/* ═══════ TIER 2 & TIER 3: MULTI-ROOM ISOMETRIC APARTMENT CUTAWAY (Exact IMG_6758.png Layout!) ═══════ */}
            {homeState.roomTier >= 2 && (
              <g>
                {/* Outer Foundation Base */}
                <polygon points="430,88 755,275 365,545 45,355" fill="#4b4844" />

                {/* 1. Kitchen / Dining Floor (Left Quadrant - Cream Tiles) */}
                <polygon points="45,345 235,220 355,290 165,415" fill="url(#creamTile)" />

                {/* 2. Bathroom Floor (Top-Left Quadrant - Grey Tiles) */}
                <polygon points="235,220 385,122 490,185 340,282" fill="url(#bathTile)" />

                {/* 3. Main Living & Bedroom Floor (Dark Checkered Tiles) */}
                <polygon points="165,415 355,290 490,185 605,250 745,275 365,535" fill="url(#darkCheckered)" />

                {/* Back-Left Exterior Wall */}
                <polygon points="45,345 430,88 430,22 45,278" fill="#262120" stroke="#6b6661" strokeWidth="3" />
                {/* Back-Right Exterior Wall */}
                <polygon points="430,88 745,275 745,208 430,22" fill="#211d1c" stroke="#6b6661" strokeWidth="3" />

                {/* Glowing Wall Sconces */}
                <circle cx="315" cy="128" r="35" fill="url(#sconceGlow)" />
                <circle cx="315" cy="128" r="5" fill="#fef3c7" />
                <circle cx="575" cy="145" r="35" fill="url(#sconceGlow)" />
                <circle cx="575" cy="145" r="5" fill="#fef3c7" />

                {/* Window Blinds Left & Right */}
                <polygon points="155,212 208,176 208,225 155,260" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
                <polygon points="585,142 645,178 645,228 585,192" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />

                {/* ── BATHROOM ZONE (Shower, White Bathtub, Partition Walls) ── */}
                <g
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerNeedAction('hygiene', 330, 215, '🚿 Taking a Fresh Shower');
                  }}
                  className="cursor-pointer"
                >
                  {/* Glass Shower Stall */}
                  <polygon points="245,165 288,138 288,215 245,242" fill="rgba(226,232,240,0.45)" stroke="#e2e8f0" strokeWidth="3" />
                  {/* White Bathtub */}
                  <polygon points="348,228 425,180 452,198 375,246" fill="#e7e5e4" stroke="#d6d3d1" strokeWidth="2" />
                  <ellipse cx="400" cy="212" rx="32" ry="12" fill="#a8a29e" transform="rotate(-30 400 212)" />
                </g>

                {/* ── SNOOKER / POOL ROOM (Top Corner - Tier 3 or Pool Table Owned) ── */}
                {(homeState.roomTier === 3 || hasItem('pool_table')) && (
                  <g
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerNeedAction('fun', 475, 195, '🎱 Playing Snooker in Game Lounge');
                    }}
                    className="cursor-pointer"
                  >
                    <polygon points="435,142 490,108 552,146 498,180" fill="#451a03" />
                    <polygon points="442,142 490,113 544,146 496,175" fill="#065f46" stroke="#047857" strokeWidth="2" />
                    <circle cx="485" cy="142" r="2.5" fill="#facc15" />
                    <circle cx="495" cy="146" r="2.5" fill="#ef4444" />
                    <circle cx="502" cy="140" r="2.5" fill="#ffffff" />
                  </g>
                )}

                {/* Interior Cutaway Partition Walls (Matching Reference Image) */}
                <polygon points="210,235 320,302 320,265 210,198" fill="#1c1917" stroke="#a8a29e" strokeWidth="2" />
                <polygon points="365,272 488,195 488,162 365,238" fill="#292524" stroke="#a8a29e" strokeWidth="2" />
                <polygon points="135,392 295,288 295,252 135,356" fill="#1c1917" stroke="#a8a29e" strokeWidth="2" />
                <polygon points="348,295 458,365 458,332 348,262" fill="#292524" stroke="#a8a29e" strokeWidth="2" />

                {/* ── KITCHEN & ROUND DINING TABLE (Left Quadrant) ── */}
                <g
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerNeedAction('hunger', 175, 330, '🍛 Eating Hot Jollof & Plantain');
                  }}
                  className="cursor-pointer"
                >
                  {/* Kitchen Counter & Microwave */}
                  <polygon points="122,272 162,246 184,260 144,286" fill="#d6c7b2" />
                  <rect x="135" y="232" width="26" height="18" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
                  {/* Round Wooden Dining Table */}
                  <ellipse cx="145" cy="332" rx="28" ry="18" fill="#7c4d2b" stroke="#5c371c" strokeWidth="2" />
                  {/* Dining Chairs */}
                  <rect x="102" y="318" width="12" height="22" rx="2" fill="#5c2d16" />
                  <rect x="176" y="312" width="12" height="22" rx="2" fill="#5c2d16" />
                  <rect x="138" y="352" width="12" height="20" rx="2" fill="#5c2d16" />
                </g>

                {/* ── BEDROOM STUDIO (Bottom Quadrant: Purple Bed, Ring Light, Desk & Pink Chair) ── */}
                <g
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerNeedAction('energy', 315, 445, '😴 Sleeping on Master Bed');
                  }}
                  className="cursor-pointer"
                >
                  {/* Bed Frame & Purple Mattress */}
                  <polygon points="235,455 315,402 382,445 302,498" fill="#451a03" />
                  <polygon points="242,446 315,398 375,436 302,484" fill="#3b0764" />
                  <polygon points="242,446 275,424 338,462 302,484" fill="#cbd5e1" />
                </g>

                {/* Ring Light in Bedroom */}
                <g
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerNeedAction('fun', 365, 380, '📸 Recording Lagos Creator Reel');
                  }}
                  className="cursor-pointer"
                >
                  <line x1="358" y1="342" x2="348" y2="380" stroke="#111" strokeWidth="3" />
                  <line x1="358" y1="342" x2="368" y2="380" stroke="#111" strokeWidth="3" />
                  <ellipse cx="358" cy="330" rx="10" ry="14" fill="none" stroke="#f8fafc" strokeWidth="4" />
                </g>

                {/* Wooden Desk & Pink Chair */}
                <g
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerNeedAction('social', 415, 425, '💻 Managing Danfo Fleet at Desk');
                  }}
                  className="cursor-pointer"
                >
                  <polygon points="390,432 448,395 478,415 420,452" fill="#a87c56" />
                  <polygon points="390,432 420,452 420,478 390,458" fill="#855f3e" />
                  <ellipse cx="405" cy="408" rx="13" ry="9" fill="#be185d" />
                  <rect x="396" y="388" width="16" height="20" rx="4" fill="#db2777" />
                </g>

                {/* ── RIGHT LIVING LOUNGE (Red Sofa, Circular Orange Rug, Wide TV Console & Bookshelf) ── */}
                <g
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerNeedAction('fun', 555, 335, '📺 Relaxing in Living Room Lounge');
                  }}
                  className="cursor-pointer"
                >
                  {/* Circular Orange & Dark Ring Rug */}
                  <ellipse cx="622" cy="355" rx="46" ry="28" fill="#c2410c" stroke="#1e293b" strokeWidth="5" />
                  <ellipse cx="622" cy="355" rx="30" ry="18" fill="#ea580c" />

                  {/* Red Velvet Sofa */}
                  <polygon points="525,305 592,262 620,282 552,325" fill="#7f1d1d" />
                  <polygon points="525,305 592,262 592,235 525,278" fill="#5c1111" />
                  <polygon points="525,305 552,325 552,342 525,322" fill="#450a0a" />

                  {/* TV Console & Wide Flat-Screen TV */}
                  <polygon points="628,382 715,326 738,342 652,398" fill="#b08968" />
                  <polygon points="645,362 708,320 708,278 645,320" fill="#475569" stroke="#1e293b" strokeWidth="2" />

                  {/* Wooden Bookshelf on Far Right */}
                  <polygon points="728,325 765,300 765,245 728,270" fill="#a87c56" stroke="#785538" strokeWidth="2" />
                </g>

                {/* Pet Cat in Center Hall */}
                <ellipse cx="412" cy="296" rx="10" ry="6" fill="#a8a29e" />
                <circle cx="420" cy="291" r="5" fill="#a8a29e" />
              </g>
            )}

            {/* ═══════ 3D-STYLED PLAYER CHARACTER STANDING INSIDE THE CUTAWAY ROOM ═══════ */}
            <g
              transform={`translate(${playerPos.x}, ${playerPos.y})`}
              className="transition-all duration-300 ease-out"
            >
              {/* Floor Foot Shadow */}
              <ellipse cx="0" cy="4" rx="16" ry="8" fill="rgba(0,0,0,0.55)" />
              {/* Legs / Trousers */}
              <rect x="-7" y="-26" width="6" height="28" rx="2" fill="#0f172a" />
              <rect x="1" y="-26" width="6" height="28" rx="2" fill="#0f172a" />
              {/* White & Dark Vest Torso (Like Avatar in IMG_6758.png) */}
              <rect x="-10" y="-56" width="20" height="32" rx="4" fill="#f8fafc" />
              <rect x="-10" y="-56" width="6" height="30" rx="2" fill="#1e293b" />
              <rect x="4" y="-56" width="6" height="30" rx="2" fill="#1e293b" />
              {/* Arms */}
              <rect x="-15" y="-54" width="5" height="24" rx="2.5" fill="#451a03" />
              <rect x="10" y="-54" width="5" height="24" rx="2.5" fill="#451a03" />
              {/* Head & Dreadlocks/Hair */}
              <circle cx="0" cy="-68" r="11" fill="#451a03" />
              <path d="M -11 -70 Q 0 -84 11 -70 L 12 -58 L -12 -58 Z" fill="#09090b" />
              {/* Golden Crown / Cap Accent */}
              <polygon points="-7,-79 -3,-85 0,-80 3,-85 7,-79" fill="#facc15" />

              {/* Floating Action Bubble when interacting */}
              {playerActionLabel && (
                <g transform="translate(0, -98)">
                  <rect x="-85" y="-22" width="170" height="24" rx="12" fill="#111827" stroke="#facc15" strokeWidth="1.5" />
                  <text x="0" y="-6" textAnchor="middle" fill="#facc15" fontSize="10" fontWeight="bold">
                    {playerActionLabel}
                  </text>
                </g>
              )}
            </g>
          </svg>
        </div>
      </div>

      {/* ═══════ BUY FURNITURE & ROOM EXPANSION DRAWER (When "Buy" Tab is Active) ═══════ */}
      {activeBottomTab === 'BUY' && (
        <div className="fixed inset-x-0 bottom-[88px] z-40 px-3 sm:px-6 flex justify-center animate-in slide-in-from-bottom-5 duration-200">
          <div className="w-full max-w-2xl bg-slate-900/95 backdrop-blur-xl border-2 border-amber-400 rounded-3xl p-4 text-white shadow-[0_20px_50px_rgba(0,0,0,0.85)] max-h-[56vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-amber-400 flex items-center gap-2">
                  <Sofa className="w-4 h-4" />
                  <span>EXPAND APARTMENT & BUY FURNITURE</span>
                </h3>
                <p className="text-[11px] text-slate-300">
                  You started in a Small Single Room. Upgrade your room size or buy furniture with your Danfo fares!
                </p>
              </div>
              <button
                onClick={() => setActiveBottomTab('HOME')}
                className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
              >
                Close
              </button>
            </div>

            {/* Room Size Expansion Tiers */}
            <div className="mb-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold mb-2">
                1. Apartment Size Progression (Current: Tier {homeState.roomTier}/3)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {ROOM_TIERS.map((rt) => {
                  const isOwned = homeState.roomTier >= rt.tier;
                  const isCurrent = homeState.roomTier === rt.tier;
                  return (
                    <div
                      key={rt.tier}
                      className={`rounded-2xl p-3 border flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-amber-400/15 border-amber-400'
                          : isOwned
                          ? 'bg-emerald-950/30 border-emerald-500/40'
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-extrabold text-white">{rt.name}</span>
                          {isOwned && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </div>
                        <div className="text-[10px] text-amber-300 font-semibold mt-0.5">{rt.subtitle}</div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">{rt.description}</p>
                      </div>
                      <div className="mt-2.5">
                        {isOwned ? (
                          <button
                            onClick={() => setHomeState((prev) => ({ ...prev, roomTier: rt.tier }))}
                            className={`w-full py-1.5 rounded-xl text-[10px] font-black ${
                              isCurrent
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                          >
                            {isCurrent ? 'ACTIVE LAYOUT' : 'SWITCH TO THIS VIEW'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpgradeRoomTier(rt.tier, rt.price, rt.name)}
                            className="w-full py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-[11px] shadow"
                          >
                            UNLOCK • ₦{rt.price.toLocaleString()}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Furniture Catalog */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold mb-2">
                2. Room Furniture & Appliances
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {HOME_FURNITURE_CATALOG.map((item) => {
                  const owned = hasItem(item.id);
                  const lockedTier = homeState.roomTier < item.minTier;
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl p-2.5 bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{item.name}</div>
                        <div className="text-[10px] text-emerald-400 font-semibold">{item.boostLabel}</div>
                        <div className="text-[10px] text-slate-400 truncate">{item.description}</div>
                      </div>
                      {owned ? (
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-[10px] font-bold shrink-0">
                          Owned
                        </span>
                      ) : lockedTier ? (
                        <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center gap-1 shrink-0">
                          <Lock className="w-3 h-3" /> Tier {item.minTier}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBuyFurniture(item)}
                          className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs shrink-0"
                        >
                          ₦{item.price.toLocaleString()}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ BOTTOM AVATAR + 6-NEED PILL + WHITE NAVIGATION BAR (Exact Reference Image Layout) ═══════ */}
      <div className="relative z-30 pb-3 px-3 sm:px-6 flex flex-col items-center gap-2.5">
        {/* Row Above Nav: Avatar Circle + 6-Need Status Pill + Room Rotate Button */}
        <div className="w-full max-w-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Avatar Circle with Green Ring */}
            <button
              onClick={() => triggerNeedAction('social', 385, 385, '😎 Feeling Fresh!')}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-200 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-emerald-400"
              title="Driver Profile"
            >
              <div className="w-full h-full bg-gradient-to-b from-emerald-300 to-emerald-500 flex flex-col items-center justify-end pt-2">
                <div className="w-6 h-6 rounded-full bg-[#451a03] border-t-4 border-stone-950" />
                <div className="w-10 h-6 rounded-t-lg bg-white border-x-4 border-stone-900 mt-0.5" />
              </div>
            </button>

            {/* 6-Need Status Pill (🍛 Hunger, ⚡ Energy, 🎉 Fun, 💬 Social, 🫧 Hygiene, 🚽 Toilet) */}
            <div className="bg-white/95 backdrop-blur-md rounded-full px-4 py-2 shadow-xl grid grid-cols-3 gap-x-3 gap-y-1.5 border border-white/60">
              {/* Hunger */}
              <button
                onClick={() => triggerNeedAction('hunger', 340, 360, '🍛 Eating Jollof Rice')}
                className="flex items-center gap-1"
                title="Eat Meal (+Hunger)"
              >
                <span className="text-xs">🍛</span>
                <div className="w-7 sm:w-9 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${homeState.needs.hunger < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${homeState.needs.hunger}%` }}
                  />
                </div>
              </button>

              {/* Energy */}
              <button
                onClick={() => triggerNeedAction('energy', 315, 395, '😴 Power Nap on Bed')}
                className="flex items-center gap-1"
                title="Sleep on Bed (+Energy)"
              >
                <span className="text-xs">⚡</span>
                <div className="w-7 sm:w-9 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${homeState.needs.energy < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${homeState.needs.energy}%` }}
                  />
                </div>
              </button>

              {/* Fun */}
              <button
                onClick={() => triggerNeedAction('fun', 440, 345, '🎉 Chilling to Afrobeats')}
                className="flex items-center gap-1"
                title="Relax (+Fun)"
              >
                <span className="text-xs">🎉</span>
                <div className="w-7 sm:w-9 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${homeState.needs.fun}%` }}
                  />
                </div>
              </button>

              {/* Social */}
              <button
                onClick={() => triggerNeedAction('social', 395, 375, '💬 Chatting with Neighbors')}
                className="flex items-center gap-1"
                title="Socialize (+Social)"
              >
                <span className="text-xs">💬</span>
                <div className="w-7 sm:w-9 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${homeState.needs.social}%` }}
                  />
                </div>
              </button>

              {/* Hygiene */}
              <button
                onClick={() => triggerNeedAction('hygiene', 330, 260, '🫧 Freshening Up')}
                className="flex items-center gap-1"
                title="Wash Up (+Hygiene)"
              >
                <span className="text-xs">🫧</span>
                <div className="w-7 sm:w-9 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${homeState.needs.hygiene}%` }}
                  />
                </div>
              </button>

              {/* Toilet */}
              <button
                onClick={() => triggerNeedAction('toilet', 345, 250, '🚽 Using Restroom')}
                className="flex items-center gap-1"
                title="Restroom (+Comfort)"
              >
                <span className="text-xs">🚽</span>
                <div className="w-7 sm:w-9 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${homeState.needs.toilet}%` }}
                  />
                </div>
              </button>
            </div>
          </div>

          {/* Right Circular Orbit / Angle Reset Button */}
          <button
            onClick={() => setRoomRotation((r) => (r === 0 ? -6 : r === -6 ? 6 : 0))}
            className="w-11 h-11 rounded-full bg-white/95 hover:bg-white active:scale-95 shadow-xl flex items-center justify-center text-slate-800 shrink-0"
            title="Rotate Room Perspective"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom White Rounded Navigation Pill Bar (Home | Buy | Map | Phone) */}
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-[28px] p-1.5 shadow-[0_12px_35px_rgba(0,0,0,0.5)] grid grid-cols-4 gap-1 border border-white/80">
          <button
            onClick={() => setActiveBottomTab('HOME')}
            className={`py-2 rounded-[22px] flex flex-col items-center justify-center gap-0.5 transition-all ${
              activeBottomTab === 'HOME'
                ? 'bg-[#111827] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Home className="w-4 h-4" />
            <span className="text-[11px] font-bold">Home</span>
          </button>

          <button
            onClick={() => setActiveBottomTab((prev) => (prev === 'BUY' ? 'HOME' : 'BUY'))}
            className={`py-2 rounded-[22px] flex flex-col items-center justify-center gap-0.5 transition-all ${
              activeBottomTab === 'BUY'
                ? 'bg-[#111827] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sofa className="w-4 h-4" />
            <span className="text-[11px] font-bold">Buy</span>
          </button>

          <button
            onClick={onGoToDrive}
            className="py-2 rounded-[22px] flex flex-col items-center justify-center gap-0.5 text-slate-600 hover:text-slate-900 hover:bg-amber-100/60 transition-all"
          >
            <MapIcon className="w-4 h-4" />
            <span className="text-[11px] font-bold">Map / Drive</span>
          </button>

          <button
            onClick={onOpenPhone}
            className="py-2 rounded-[22px] flex flex-col items-center justify-center gap-0.5 text-slate-600 hover:text-slate-900 transition-all"
          >
            <Smartphone className="w-4 h-4" />
            <span className="text-[11px] font-bold">Phone</span>
          </button>
        </div>
      </div>
    </div>
  );
};
