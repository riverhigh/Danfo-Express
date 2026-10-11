import React, { useState, useEffect, useCallback } from 'react';
import { useGameSave } from './hooks/useGameSave';
import {
  GameState,
  ShiftTimeOfDay,
  Passenger,
  ShiftResultData,
  BusModelId,
  MissionGoal,
  BusUpgrades,
} from './types/game';
import {
  BUS_PRESETS,
  SHIFT_CONFIGS,
  SLOGANS,
  UPGRADE_CATALOG,
  MISSIONS_CATALOG,
  DEFAULT_JUNCTIONS,
  CONDUCTOR_ROSTER,
  DEFAULT_HOUSE,
  DEFAULT_INVENTORY,
  DEFAULT_MESSAGES,
  DEFAULT_GAS_STATIONS,
  DEFAULT_ROADSIDE_SHOPS,
} from './game/config';
import { soundEngine } from './audio/soundEngine';
import { ThreeDrivingSimulator } from './components/ThreeDrivingSimulator';
import { MissionSelector } from './components/MissionSelector';
import { PhoneModal } from './components/PhoneModal';
import { InventoryModal } from './components/InventoryModal';
import { MainMap } from './components/MainMap';
import { Dealership } from './components/Dealership';
import { CharacterCreation } from './components/CharacterCreation';
import { NeedsPanel } from './components/NeedsPanel';
import { AjoApp, KoloSystem } from './components/SavingsSystems';
import { SplashLoadingScreen } from './components/SplashLoadingScreen';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { PlayerHome2D } from './components/PlayerHome2D';
import {
  Trophy,
  Volume2,
  VolumeX,
  Users,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  Award,
  Check,
  MapPin,
  X,
  Smartphone,
  Package,
  Home,
  Car,
  Fuel,
  Gauge,
  Download,
  Lock,
  AlertTriangle,
  Sparkles,
  Wrench,
  Coins,
  Navigation,
} from 'lucide-react';

export default function App() {
  const { saveData, updateSave } = useGameSave();
  const walletNaira = saveData.walletNaira;
  const streetCred = saveData.streetCred;
  const selectedBusId = saveData.selectedBusId;
  const selectedSlogan = saveData.selectedSlogan;

  const setWalletNaira = (val: number | ((prev: number) => number)) =>
    updateSave({ walletNaira: typeof val === 'function' ? val(walletNaira) : val });
  const setStreetCred = (val: number | ((prev: number) => number)) =>
    updateSave({ streetCred: typeof val === 'function' ? val(streetCred) : val });
  const setSelectedBusId = (val: BusModelId) => updateSave({ selectedBusId: val });
  const setSelectedSlogan = (val: string) => updateSave({ selectedSlogan: val });

  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [showPwaModal, setShowPwaModal] = useState<boolean>(false);
  const [selectedShiftId, setSelectedShiftId] = useState<ShiftTimeOfDay>('MORNING_RUSH');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [menuTab, setMenuTab] = useState<'CAREER_SHIFT' | 'MISSIONS' | 'GARAGE_WORKSHOP' | 'HOUSING'>('CAREER_SHIFT');
  const [selectedMissionId, setSelectedMissionId] = useState<string>(MISSIONS_CATALOG[0].id);
  const [isConductorModalOpen, setIsConductorModalOpen] = useState<boolean>(false);
  const [isPhoneOpen, setIsPhoneOpen] = useState<boolean>(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState<boolean>(false);
  const [isMapOpen, setIsMapOpen] = useState<boolean>(false);
  const [isDealershipOpen, setIsDealershipOpen] = useState<boolean>(false);
  const [isKoloOpen, setIsKoloOpen] = useState<boolean>(false);
  const [isAjoOpen, setIsAjoOpen] = useState<boolean>(false);
  const [isHome2DOpen, setIsHome2DOpen] = useState<boolean>(false);
  const [showCharacterCreation, setShowCharacterCreation] = useState<boolean>(
    !saveData.playerName || saveData.playerName === 'Driver'
  );
  const [gameTime] = useState(new Date('2026-10-09T07:30:00'));

  // Active driving feed
  const [actionFeed, setActionFeed] = useState<string[]>([
    '🚌 Parked at Oshodi Motor Park (0/14 seats). Drive out the gate to Ikeja Along (160m) to load your first passengers!',
  ]);

  const addFeedMessage = useCallback((msg: string) => {
    setActionFeed((prev) => [msg, ...prev.slice(0, 4)]);
  }, []);

  // Bus ALWAYS starts empty (0 passengers, ₦0 collected cash) so player loads from the first bus stop!
  const createInitialPassengers = (): Passenger[] => [];

  const [gameState, setGameState] = useState<GameState>(() => {
    const shift = SHIFT_CONFIGS.MORNING_RUSH;
    const bus = JSON.parse(JSON.stringify(BUS_PRESETS[saveData.selectedBusId] || BUS_PRESETS.RUSTIC_VAN));
    bus.slogan = saveData.selectedSlogan || 'No King as God';
    bus.id = saveData.selectedBusId || 'RUSTIC_VAN';
    bus.passengers = createInitialPassengers();
    const junctions = JSON.parse(JSON.stringify(DEFAULT_JUNCTIONS));

    return {
      screen: 'MENU',
      activeShift: shift,
      shiftTimeRemaining: shift.durationSeconds,
      shiftClockDisplay: shift.startTime,
      bus: bus,
      conductor: {
        hasConductor: true,
        id: 'rasaki',
        name: 'Rasaki Catch-It',
        nickname: 'Agbero Pro',
        energy: 100,
        callingLocation: false,
        hangingOutDoor: false,
        currentAction: 'IDLE',
        collectedCash: 0,
      },
      walletNaira: saveData.walletNaira,
      bankBalanceNaira: saveData.bankBalanceNaira,
      streetCred: saveData.streetCred,
      needs: saveData.needs || {
        hunger: 100,
        energy: 100,
        fun: 100,
        social: 100,
        hygiene: 100,
        bladder: 100,
      },
      hustleMeter: 40,
      comboMultiplier: 1,
      comboStreak: 0,
      distanceTraveledMeters: 0,
      targetDistanceMeters: 3500,
      junctions: junctions,
      activeJunctionIndex: 0,
      activeDelivery: null,
      availableDelivery: null,
      house: DEFAULT_HOUSE,
      inventory: DEFAULT_INVENTORY,
      messages: DEFAULT_MESSAGES,
      nepaBillDue: 4500,
      rentDue: 8000,
      gasStations: DEFAULT_GAS_STATIONS,
      roadsideShops: DEFAULT_ROADSIDE_SHOPS,
      isGasStationBayActive: false,
      activeShopId: null,
      activeCabinEvent: null,
      lastShiftResult: null,
      totalShiftsCompleted: 0,
      isPaused: false,
    };
  });

  // Audio toggle
  const toggleAudio = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  // Start 3D Mission (Bus starts empty with 0 passengers)
  const handleStartMission = (mission: MissionGoal) => {
    const baseBus = BUS_PRESETS[selectedBusId] || BUS_PRESETS['RUSTIC_VAN'];
    const bus: typeof baseBus = JSON.parse(JSON.stringify(baseBus));
    bus.slogan = selectedSlogan;
    bus.upgrades = { ...gameState.bus.upgrades };
    bus.passengers = [];
    const junctions = JSON.parse(JSON.stringify(DEFAULT_JUNCTIONS));

    setGameState((prev) => ({
      ...prev,
      screen: 'SHIFT_ACTIVE',
      activeShift: {
        id: 'MORNING_RUSH',
        title: mission.title,
        subtitle: mission.location,
        startTime: '07:30 AM',
        endTime: '08:30 AM',
        durationSeconds: mission.timeLimitSec,
        baseTrafficDensity: 0.7,
        potholeFrequency: 0.5,
        floodRisk: false,
        policePresence: 0.4,
        passengerMultiplier: 1.0,
        unionLevy: 300,
      },
      shiftTimeRemaining: mission.timeLimitSec,
      shiftClockDisplay: '07:30 AM',
      bus: bus,
      conductor: {
        ...prev.conductor,
        collectedCash: 0,
      },
      distanceTraveledMeters: 0,
      targetDistanceMeters: mission.targetDistanceMeters,
      junctions: junctions,
      activeJunctionIndex: 0,
      activeDelivery: null,
      availableDelivery: null,
      activeCabinEvent: null,
      lastShiftResult: null,
    }));

    addFeedMessage(`🎯 MISSION STARTED: ${mission.title}! Bus is empty (0/${bus.capacity}) — stop at Ikeja Along (160m) to load commuters.`);
    soundEngine.playHorn(bus.upgrades.musicalHorn);
  };

  // Start General Career Shift (Bus starts empty with 0 passengers)
  const handleStartShift = () => {
    const shift = SHIFT_CONFIGS[selectedShiftId];
    const baseBus = BUS_PRESETS[selectedBusId] || BUS_PRESETS['RUSTIC_VAN'];
    const bus: typeof baseBus = JSON.parse(JSON.stringify(baseBus));
    bus.slogan = selectedSlogan;
    bus.upgrades = { ...gameState.bus.upgrades };
    bus.passengers = [];
    const junctions = JSON.parse(JSON.stringify(DEFAULT_JUNCTIONS));

    setGameState((prev) => ({
      ...prev,
      screen: 'SHIFT_ACTIVE',
      activeShift: shift,
      shiftTimeRemaining: shift.durationSeconds,
      shiftClockDisplay: shift.startTime,
      bus: bus,
      conductor: {
        ...prev.conductor,
        collectedCash: 0,
      },
      distanceTraveledMeters: 0,
      targetDistanceMeters: 3500,
      junctions: junctions,
      activeJunctionIndex: 0,
      activeDelivery: null,
      availableDelivery: null,
      activeCabinEvent: null,
      lastShiftResult: null,
    }));

    addFeedMessage(`🚌 SHIFT STARTED: ${shift.title}! Bus is empty (0/${bus.capacity}) — drive out of Oshodi Park to Ikeja Along (160m) to load passengers!`);
    soundEngine.playHorn(bus.upgrades.musicalHorn);
  };

  // Finish Shift / Mission (Balanced realistic Lagos Danfo payout)
  const handleFinishShift = useCallback(
    (terminalReached: boolean = true) => {
      soundEngine.stopEngine();

      setGameState((prev) => {
        const completionBonus = terminalReached ? 1200 : 0;
        const unionLevy = terminalReached ? 400 : 200;
        const repairCost = Math.floor((100 - prev.bus.durability) * 15);
        const netBonus = Math.max(0, completionBonus - unionLevy - repairCost);
        const totalFares = prev.conductor.collectedCash + completionBonus;
        const earnedCred = Math.floor(totalFares / 150) + (terminalReached ? 35 : 10);
        const stopsCleared = prev.junctions.filter((j) => j.stopReached).length;

        const result: ShiftResultData = {
          shiftId: prev.activeShift.id,
          shiftTitle: prev.activeShift.title,
          totalFaresCollected: totalFares,
          passengersDelivered: stopsCleared * 4,
          passengersLost: 0,
          unionLevyPaid: unionLevy,
          fuelAndRepairsCost: repairCost,
          bribesSettled: 0,
          netProfit: prev.conductor.collectedCash + netBonus,
          maxCombo: Math.max(prev.comboMultiplier, 2),
          hustleScore: Math.floor(prev.hustleMeter * 15 + prev.distanceTraveledMeters / 10),
          streetCredEarned: earnedCred,
          terminalReached: terminalReached,
        };

        const finalWallet = prev.walletNaira + netBonus;
        const finalCred = prev.streetCred + earnedCred;
        updateSave({
          walletNaira: finalWallet,
          streetCred: finalCred,
        });

        return {
          ...prev,
          walletNaira: finalWallet,
          streetCred: finalCred,
          screen: 'SHIFT_RESULTS',
          lastShiftResult: result,
          totalShiftsCompleted: prev.totalShiftsCompleted + 1,
        };
      });
    },
    [updateSave]
  );

  // Purchase Upgrade
  const handlePurchaseUpgrade = (upgradeId: keyof BusUpgrades, cost: number) => {
    if (walletNaira < cost) {
      addFeedMessage(`⚠️ Insufficient funds! Need ₦${cost.toLocaleString()} for this upgrade.`);
      return;
    }
    setWalletNaira((w: number) => w - cost);
    soundEngine.playUpgradeChime();

    setGameState((prev) => ({
      ...prev,
      walletNaira: prev.walletNaira - cost,
      bus: {
        ...prev.bus,
        upgrades: { ...prev.bus.upgrades, [upgradeId]: true },
      },
    }));
    addFeedMessage(`🔧 3D UPGRADE FITTED: ${upgradeId} installed on the Danfo!`);
  };

  // Hire Conductor
  const handleHireConductor = (conductorId: string | null) => {
    if (!conductorId) {
      setGameState((prev) => ({
        ...prev,
        conductor: {
          ...prev.conductor,
          hasConductor: false,
          name: 'Solo Driver',
          nickname: 'Owner-Driver',
        },
      }));
      addFeedMessage('🚗 SOLO DRIVER MODE: No conductor. Open the door and collect fares (Key C) yourself!');
      setIsConductorModalOpen(false);
      return;
    }

    const profile = CONDUCTOR_ROSTER.find((c) => c.id === conductorId);
    if (!profile) return;

    if (walletNaira < profile.dailyFee) {
      addFeedMessage(`⚠️ Need ₦${profile.dailyFee.toLocaleString()} daily fee to hire ${profile.name}!`);
      return;
    }

    setWalletNaira((w: number) => w - profile.dailyFee);
    soundEngine.playDoorSlap();

    setGameState((prev) => ({
      ...prev,
      walletNaira: prev.walletNaira - profile.dailyFee,
      conductor: {
        ...prev.conductor,
        hasConductor: true,
        id: profile.id,
        name: profile.name,
        nickname: profile.nickname,
      },
    }));

    addFeedMessage(`🧑🏾‍🦱 HIRED: ${profile.name} (${profile.nickname}) is on duty at the passenger door!`);
    setIsConductorModalOpen(false);
  };

  const handleConductorAction = useCallback(
    (action: 'CALLING' | 'COLLECTING' | 'SLAPPING_VAN' | 'SETTLING' | 'GIVE_CHANGE') => {
      if (action === 'CALLING') {
        soundEngine.playDoorSlap();
        addFeedMessage('Conductor: "OSHODI / IKEJA / YABA / CMS DIRECT! ENTER WITH YOUR CHANGE O!"');
      } else if (action === 'SLAPPING_VAN') {
        soundEngine.playDoorSlap();
        addFeedMessage('Conductor slaps van side: "GBAM-GBAM! Oya oya move!"');
      } else if (action === 'COLLECTING') {
        soundEngine.playCoin();
        addFeedMessage('Conductor collected cash fares from onboard passengers!');
      } else if (action === 'GIVE_CHANGE') {
        soundEngine.playCoin();
        addFeedMessage('🪙 CHANGE BALANCED: Conductor gave passenger crisp change!');
      }
    },
    [addFeedMessage]
  );

  const unreadCount = gameState.messages?.filter((m) => m.unread).length || 0;
  const activeBusPreset = BUS_PRESETS[selectedBusId] || BUS_PRESETS['RUSTIC_VAN'];
  const activeShiftConfig = SHIFT_CONFIGS[selectedShiftId];

  // Drain Needs globally every 5 seconds while driving
  useEffect(() => {
    if (gameState.screen !== 'SHIFT_ACTIVE') return;
    const interval = setInterval(() => {
      setGameState((prev) => {
        const n = prev.needs;
        return {
          ...prev,
          needs: {
            hunger: Math.max(0, n.hunger - 0.5),
            energy: Math.max(0, n.energy - 0.3),
            fun: Math.max(0, n.fun - 0.4),
            social: Math.max(0, n.social - 0.2),
            hygiene: Math.max(0, n.hygiene - 0.1),
            bladder: Math.max(0, n.bladder - 0.6),
          },
        };
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [gameState.screen]);

  if (showSplash) {
    return <SplashLoadingScreen onFinishLoading={() => setShowSplash(false)} />;
  }

  if (isHome2DOpen) {
    return (
      <>
        <PlayerHome2D
          gameState={{ ...gameState, walletNaira, streetCred }}
          onUpdateWalletAndCred={(walletDelta, credDelta = 0, staminaSet) => {
            const nextWallet = Math.max(0, walletNaira + walletDelta);
            const nextCred = Math.max(0, streetCred + credDelta);
            setWalletNaira(nextWallet);
            setStreetCred(nextCred);
            setGameState((prev) => ({
              ...prev,
              walletNaira: nextWallet,
              streetCred: nextCred,
              needs: staminaSet
                ? { ...prev.needs, energy: staminaSet, hunger: Math.max(prev.needs.hunger, 85) }
                : prev.needs,
            }));
          }}
          onGoToDrive={() => {
            setIsHome2DOpen(false);
            if (gameState.screen !== 'SHIFT_ACTIVE') {
              handleStartShift();
            }
          }}
          onOpenPhone={() => setIsPhoneOpen(true)}
          onBackToMenu={() => {
            setIsHome2DOpen(false);
            setGameState((prev) => ({ ...prev, screen: 'MENU' }));
          }}
        />
        <PhoneModal
          isOpen={isPhoneOpen}
          onClose={() => setIsPhoneOpen(false)}
          gameState={gameState}
          setGameState={setGameState}
          addFeedMessage={addFeedMessage}
          onStartShift={() => {
            setIsPhoneOpen(false);
            setIsHome2DOpen(false);
            handleStartShift();
          }}
        />
      </>
    );
  }

  return (
    <div className="w-screen h-screen bg-stone-950 text-stone-100 flex flex-col overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* TOP DANFO HAZARD STRIPE ACCENT (Only in Menu/Results) */}
      {gameState.screen !== 'SHIFT_ACTIVE' && (
        <div
          className="w-full h-1.5 shrink-0"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #facc15 0px, #facc15 16px, #0c0a09 16px, #0c0a09 32px)',
          }}
        />
      )}

      {/* HEADER NAV / MOTOR PARK COMMAND BAR */}
      <header
        className={`h-14 border-b px-3 sm:px-5 flex items-center justify-between z-50 shrink-0 transition-colors ${
          gameState.screen === 'SHIFT_ACTIVE'
            ? 'hidden'
            : 'bg-stone-900/95 border-stone-800 backdrop-blur-md shadow-xl'
        }`}
      >
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 bg-amber-400 rounded-xl border-2 border-stone-950 flex items-center justify-center font-black font-['Bungee'] text-stone-950 text-lg shadow-md">
            🚌
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-sm sm:text-base tracking-wide text-amber-400 font-['Bungee'] leading-none">
                DANFO EXPRESS 3D
              </h1>
              <span className="hidden md:inline-block px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/40 text-[9px] font-mono font-bold text-amber-300">
                OSHODI MOTOR PARK HQ
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-stone-400">
              <span className="text-stone-200 font-bold">🧑🏾‍✈️ {saveData.playerName || 'Captain'}</span>
              <span>•</span>
              <span className="text-amber-300">
                {gameTime.toLocaleDateString('en-US', { weekday: 'short' })} {activeShiftConfig.startTime}
              </span>
            </div>
          </div>
        </div>

        {/* Global Wallet, PWA Install, Dealership, Phone, Inventory, Map & Sound */}
        <div className="flex items-center gap-1.5 sm:gap-2 font-mono">
          <button
            onClick={() => setIsHome2DOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-[10px] sm:text-xs font-black flex items-center gap-1 shadow-md transition-transform active:scale-95 cursor-pointer"
            title="Go Home to Your 2D Room"
          >
            <Home className="w-3.5 h-3.5" />
            <span>GO HOME</span>
          </button>

          <button
            onClick={() => setShowPwaModal((v) => !v)}
            className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-[10px] sm:text-xs font-black flex items-center gap-1 shadow-md transition-transform active:scale-95 cursor-pointer"
            title="Install App on Android or iPhone"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">INSTALL APP</span>
          </button>

          <button
            onClick={() => setIsDealershipOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-amber-400/50 text-xs font-bold text-amber-300 flex items-center gap-1.5 transition-colors shadow cursor-pointer"
            title="Ladipo Vehicle Dealership"
          >
            <Car className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">DEALERSHIP</span>
          </button>

          <button
            onClick={() => setIsPhoneOpen(true)}
            className="relative px-2.5 py-1.5 rounded-xl bg-indigo-950/90 border border-indigo-500/50 hover:bg-indigo-900 text-xs font-bold text-indigo-300 flex items-center gap-1.5 transition-colors shadow cursor-pointer"
            title="Open Driver Smartphone"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden md:inline">PHONE</span>
            {unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsInventoryOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-bold text-amber-300 flex items-center gap-1.5 transition-colors shadow cursor-pointer"
            title="Open Driver Inventory"
          >
            <Package className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">BAG</span>
          </button>

          <button
            onClick={() => setIsMapOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-bold text-sky-300 flex items-center gap-1.5 transition-colors shadow cursor-pointer"
            title="Open Lagos City Map"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">MAP</span>
          </button>

          <div className="flex items-center gap-1 bg-stone-950 px-2.5 py-1.5 rounded-xl border border-emerald-500/40 text-xs font-black text-emerald-400">
            <span>₦</span>
            <span className="tabular-nums">{walletNaira.toLocaleString()}</span>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-stone-950 px-2.5 py-1.5 rounded-xl border border-amber-500/30 text-xs font-bold text-amber-400">
            <Award className="w-3.5 h-3.5" />
            <span className="tabular-nums">{streetCred}</span>
          </div>

          <button
            onClick={toggleAudio}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
            title="Toggle Engine & Street Audio"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main
        className={`relative overflow-hidden flex flex-col ${
          gameState.screen === 'SHIFT_ACTIVE' ? 'absolute inset-0 w-full h-full' : 'flex-1'
        }`}
      >
        {/* ═══════ REDESIGNED OSHODI MOTOR PARK MAIN MENU ═══════ */}
        {gameState.screen === 'MENU' && (
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 max-w-6xl mx-auto w-full space-y-4">
            {/* 1. Prominent PWA Install Banner (Android + iPhone/iOS Share -> Add to Home Screen) */}
            <PwaInstallBanner forceShow={showPwaModal} onClose={() => setShowPwaModal(false)} />

            {/* 2. Motor Park Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-900/90 p-1.5 rounded-2xl border border-stone-800">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setMenuTab('CAREER_SHIFT')}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs font-mono transition-all flex items-center gap-2 cursor-pointer ${
                    menuTab === 'CAREER_SHIFT'
                      ? 'bg-amber-400 text-stone-950 shadow-md font-black'
                      : 'bg-stone-950/60 text-stone-300 hover:text-white'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>OSHODI PARK DISPATCH</span>
                </button>

                <button
                  onClick={() => setMenuTab('MISSIONS')}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs font-mono transition-all flex items-center gap-2 cursor-pointer ${
                    menuTab === 'MISSIONS'
                      ? 'bg-amber-400 text-stone-950 shadow-md font-black'
                      : 'bg-stone-950/60 text-stone-300 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>DRIVING MISSIONS</span>
                </button>

                <button
                  onClick={() => setMenuTab('GARAGE_WORKSHOP')}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs font-mono transition-all flex items-center gap-2 cursor-pointer ${
                    menuTab === 'GARAGE_WORKSHOP'
                      ? 'bg-amber-400 text-stone-950 shadow-md font-black'
                      : 'bg-stone-950/60 text-stone-300 hover:text-white'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>GARAGE & CONDUCTORS</span>
                </button>

                <button
                  onClick={() => setMenuTab('HOUSING')}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs font-mono transition-all flex items-center gap-2 cursor-pointer ${
                    menuTab === 'HOUSING'
                      ? 'bg-amber-400 text-stone-950 shadow-md font-black'
                      : 'bg-stone-950/60 text-stone-300 hover:text-white'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>MUSHIN COMPOUND & SAVINGS</span>
                </button>
              </div>

              <div className="hidden lg:flex items-center gap-2 pr-2 text-[11px] font-mono text-stone-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>10 Bus Stops • Multiple Street Shortcuts • 3rd Mainland Roadblock</span>
              </div>
            </div>

            {/* ═══════ TAB 1: OSHODI PARK DISPATCH (CAREER SHIFT) ═══════ */}
            {menuTab === 'CAREER_SHIFT' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* LEFT COLUMN (7 cols): Active Bus Bay, Shift Selector & Launch CTA */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Active Danfo Vehicle & Slogan Card */}
                  <div className="bg-stone-900 border-2 border-amber-400/70 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 relative overflow-hidden">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-[10px] font-mono font-black text-amber-300 uppercase">
                          <span>🚌 PARKED AT OSHODI BAY #1</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black font-['Bungee'] text-white mt-1">
                          {activeBusPreset.name}
                        </h2>
                        <p className="text-xs font-mono text-emerald-400 font-bold">
                          🪑 Starting Load: 0 / {activeBusPreset.capacity} Passengers (Load at Stop #1: Ikeja Along!)
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsDealershipOpen(true)}
                          className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-amber-400/50 text-amber-300 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Car className="w-3.5 h-3.5" />
                          <span>CHANGE BUS</span>
                        </button>
                        <button
                          onClick={() => setIsConductorModalOpen(true)}
                          className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-emerald-400/50 text-emerald-300 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{gameState.conductor.hasConductor ? gameState.conductor.name.split(' ')[0] : 'SOLO'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Vehicle Specs Bar */}
                    <div className="grid grid-cols-3 gap-2.5 bg-stone-950 p-3 rounded-2xl border border-stone-800 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-stone-400 block">MAX SPEED</span>
                        <span className="font-black text-amber-400">{activeBusPreset.maxSpeed} KM/H</span>
                      </div>
                      <div className="border-x border-stone-800 px-2">
                        <span className="text-[10px] text-stone-400 block">SEAT CAPACITY</span>
                        <span className="font-black text-white">{activeBusPreset.capacity} SEATS</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 block">CONDUCTOR</span>
                        <span className="font-black text-emerald-400 truncate block">
                          {gameState.conductor.hasConductor ? gameState.conductor.name : 'Solo Driver'}
                        </span>
                      </div>
                    </div>

                    {/* Rear Window Slogan Selector */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-stone-400 font-bold uppercase">CUSTOM DANFO SLOGAN STICKER:</span>
                        <span className="text-amber-400 font-black">"{selectedSlogan}"</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {SLOGANS.map((slogan) => (
                          <button
                            key={slogan}
                            onClick={() => setSelectedSlogan(slogan)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                              selectedSlogan === slogan
                                ? 'bg-amber-400 text-stone-950 border-amber-200 font-black'
                                : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-600 hover:text-white'
                            }`}
                          >
                            {slogan}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Shift Time of Day Selector */}
                  <div className="bg-stone-900 border border-stone-800 rounded-3xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-black text-amber-400 uppercase tracking-wider">
                        SELECT LAGOS SHIFT SCHEDULE
                      </span>
                      <span className="text-[11px] font-mono text-stone-400">
                        Balanced Fares: ₦150 – ₦350 per stop
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {(Object.keys(SHIFT_CONFIGS) as ShiftTimeOfDay[]).map((sKey) => {
                        const cfg = SHIFT_CONFIGS[sKey];
                        const isSelected = selectedShiftId === sKey;
                        return (
                          <button
                            key={sKey}
                            onClick={() => setSelectedShiftId(sKey)}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-amber-400/15 border-amber-400 ring-1 ring-amber-400 text-white shadow-lg'
                                : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-amber-400">
                                <span>{cfg.startTime}</span>
                                {cfg.floodRisk && <span className="text-sky-400">🌧️ RAIN</span>}
                              </div>
                              <div className="font-black text-xs text-white mt-0.5">{cfg.title}</div>
                              <p className="text-[10px] text-stone-400 mt-1 line-clamp-2">{cfg.subtitle}</p>
                            </div>
                            <div className="mt-2 pt-1.5 border-t border-stone-800/80 flex items-center justify-between text-[10px] font-mono">
                              <span className="text-emerald-400 font-bold">10 Stops</span>
                              <span className="text-stone-300">3.5 km</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Launch 3D Simulator CTA Button */}
                    <button
                      onClick={handleStartShift}
                      className="w-full py-4 px-6 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:from-amber-300 hover:to-yellow-200 active:scale-[0.99] text-stone-950 font-black font-['Bungee'] text-base sm:text-lg rounded-2xl shadow-[0_10px_30px_rgba(250,204,21,0.3)] border-2 border-stone-950 flex items-center justify-center gap-3 transition-all cursor-pointer"
                    >
                      <span>🚌 START ENGINE & DRIVE OUT OF PARK</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* RIGHT COLUMN (5 cols): 10-Bus-Stop Route Corridor, Intersections & Locked 3rd Mainland Bridge */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-stone-900 border border-stone-800 rounded-3xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black font-['Bungee'] text-amber-400">
                          LAGOS CORRIDOR ROUTE (10 STOPS)
                        </h3>
                        <p className="text-[11px] text-stone-400">
                          Dense urban streets, branching shortcuts & 3rd Mainland roadblock
                        </p>
                      </div>
                      <button
                        onClick={() => setIsMapOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-sky-300 font-mono text-[10px] font-bold border border-stone-700 cursor-pointer"
                      >
                        🗺️ FULL MAP
                      </button>
                    </div>

                    {/*Locked 3rd Mainland Bridge Special Alert Card */}
                    <div className="p-3 rounded-2xl bg-rose-950/40 border-2 border-rose-500/60 flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400 flex items-center justify-center text-lg shrink-0">
                          🚧
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black font-mono text-rose-300">
                              🌉 3RD MAINLAND BRIDGE RAMP (620m)
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[8px] font-mono font-black flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" /> LOCKED
                            </span>
                          </div>
                          <p className="text-[10px] text-stone-300">
                            Federal Works roadblock active at 620m & 1,980m. Stay on Mainland Express!
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Scrollable 10 Bus Stops List */}
                    <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-1">
                      {DEFAULT_JUNCTIONS.map((junc, idx) => (
                        <div
                          key={junc.uid}
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-950 border border-stone-800/90 text-xs font-mono"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="truncate">
                              <div className="font-bold text-stone-100 truncate">{junc.name}</div>
                              <div className="text-[9px] text-stone-400 truncate">
                                {junc.distanceMarkerMeters}m • {junc.side} SIDE • {junc.waitingPassengersCount} waiting
                              </div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-black text-[10px] shrink-0">
                            ₦{junc.averageFare}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Quick Savings & Driver Needs Footer */}
                    <div className="pt-2 border-t border-stone-800 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setIsKoloOpen(true)}
                        className="py-2 px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-amber-400/40 text-amber-300 font-mono font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>🏺 KOLO: ₦{saveData.koloBalanceNaira.toLocaleString()}</span>
                      </button>
                      <button
                        onClick={() => setIsAjoOpen(true)}
                        className="py-2 px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-purple-400/40 text-purple-300 font-mono font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>🤝🏾 AJO: ₦{saveData.ajoContributionsNaira.toLocaleString()}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════ TAB 2: DRIVING MISSIONS ═══════ */}
            {menuTab === 'MISSIONS' && (
              <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5">
                <MissionSelector
                  selectedMissionId={selectedMissionId}
                  onSelectMission={(m) => setSelectedMissionId(m.id)}
                  onStartMission={handleStartMission}
                />
              </div>
            )}

            {/* ═══════ TAB 3: GARAGE & CONDUCTOR ROSTER ═══════ */}
            {menuTab === 'GARAGE_WORKSHOP' && (
              <div className="w-full space-y-6">
                <div className="p-5 bg-stone-900 border border-stone-800 rounded-2xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-base text-amber-400 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-400" />
                        Hire Your Lagos Conductor (Agbero)
                      </div>
                      <p className="text-xs text-stone-400">
                        A conductor calls out destinations at bus stops and collects passenger fares automatically upon boarding.
                      </p>
                    </div>

                    <div className="font-mono text-xs text-stone-300 bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800">
                      Current:{' '}
                      <strong className="text-amber-400">
                        {gameState.conductor.hasConductor ? gameState.conductor.name : 'Solo Driver'}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {CONDUCTOR_ROSTER.map((c) => {
                      const isCurrent = gameState.conductor.hasConductor && gameState.conductor.id === c.id;
                      return (
                        <div
                          key={c.id}
                          className={`p-4 rounded-xl border flex flex-col justify-between ${
                            isCurrent
                              ? 'bg-amber-400/15 border-amber-400 ring-1 ring-amber-400'
                              : 'bg-stone-950 border-stone-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-black text-sm text-amber-400">{c.name}</span>
                              <span className="text-xs font-mono font-bold text-emerald-400">
                                ₦{c.dailyFee.toLocaleString()}/day
                              </span>
                            </div>
                            <div className="text-[11px] font-bold text-stone-300 mb-2">"{c.nickname}"</div>
                            <p className="text-xs text-stone-400 mb-3">{c.description}</p>
                          </div>

                          <button
                            onClick={() => handleHireConductor(c.id)}
                            className={`w-full py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-emerald-500 text-stone-950 font-black cursor-default'
                                : 'bg-stone-800 hover:bg-amber-400 hover:text-stone-950 text-stone-200'
                            }`}
                          >
                            {isCurrent ? 'HIRED & ON DUTY' : `HIRE (₦${c.dailyFee.toLocaleString()})`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mechanical Upgrades */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    Mechanical Danfo Upgrades (Rendered in Full 3D)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {UPGRADE_CATALOG.map((item) => {
                      const isOwned = gameState.bus.upgrades[item.id];
                      const canAfford = walletNaira >= item.costNaira;
                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-xl border flex flex-col justify-between ${
                            isOwned ? 'bg-emerald-950/20 border-emerald-500/50' : 'bg-stone-900 border-stone-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-sm text-amber-400 flex items-center gap-2">
                                <span>{item.icon}</span>
                                {item.name}
                              </span>
                              <span className="font-mono text-xs font-bold">
                                {isOwned ? (
                                  <span className="text-emerald-400">INSTALLED</span>
                                ) : (
                                  `₦${item.costNaira.toLocaleString()}`
                                )}
                              </span>
                            </div>
                            <p className="text-xs text-stone-300 mb-2">{item.description}</p>
                            <div className="text-xs font-semibold text-emerald-400">✓ {item.benefit}</div>
                          </div>

                          <div className="mt-4 pt-2 border-t border-stone-800 flex justify-end">
                            {isOwned ? (
                              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                <Check className="w-4 h-4" /> 3D Mounted
                              </span>
                            ) : (
                              <button
                                onClick={() => handlePurchaseUpgrade(item.id, item.costNaira)}
                                disabled={!canAfford}
                                className={`px-4 py-2 font-bold text-xs rounded-lg cursor-pointer ${
                                  canAfford
                                    ? 'bg-amber-400 hover:bg-amber-300 text-stone-950 font-black'
                                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                                }`}
                              >
                                BUY & INSTALL (₦{item.costNaira.toLocaleString()})
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ═══════ TAB 4: MUSHIN COMPOUND & SAVINGS ═══════ */}
            {menuTab === 'HOUSING' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 p-6 bg-stone-900 border border-stone-800 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-black text-amber-400 font-['Bungee']">{gameState.house.title}</h2>
                      <p className="text-xs text-stone-400">{gameState.house.location}</p>
                    </div>
                    <div className="font-mono text-xs text-emerald-400 bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800">
                      Weekly Rent: ₦{gameState.house.rentCost.toLocaleString()}
                    </div>
                  </div>

                  <p className="text-xs text-stone-300">{gameState.house.description}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl">
                      <span className="text-stone-400 text-[10px] block">POWER STATUS</span>
                      <strong className={gameState.house.nepaActive ? 'text-emerald-400' : 'text-rose-400'}>
                        {gameState.house.nepaActive ? '⚡ NEPA Active' : '❌ NEPA Blackout!'}
                      </strong>
                    </div>

                    <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl">
                      <span className="text-stone-400 text-[10px] block">KITCHEN STOVE</span>
                      <strong className="text-emerald-400">Available (Cook food)</strong>
                    </div>

                    <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl">
                      <span className="text-stone-400 text-[10px] block">COMFORT RATING</span>
                      <strong className="text-amber-400">{gameState.house.comfortRating} / 100</strong>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-3">
                    <button
                      onClick={() => setIsHome2DOpen(true)}
                      className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black font-['Bungee'] text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Home className="w-4 h-4" />
                      <span>🏠 GO HOME (ENTER 2D ROOM)</span>
                    </button>
                    <button
                      onClick={() => setIsPhoneOpen(true)}
                      className="flex-1 py-3 px-4 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black font-mono text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>PAY RENT & NEPA BILLS</span>
                    </button>
                    <button
                      onClick={() => setIsInventoryOpen(true)}
                      className="py-3 px-5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold font-mono text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Package className="w-4 h-4" />
                      <span>INVENTORY</span>
                    </button>
                  </div>
                </div>

                <div className="p-5 bg-stone-900 border border-stone-800 rounded-3xl flex flex-col justify-between gap-4">
                  <NeedsPanel needs={gameState.needs} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3D DRIVING SIMULATOR ACTIVE VIEW (FULL LANDSCAPE COCKPIT) */}
        {gameState.screen === 'SHIFT_ACTIVE' && (
          <ThreeDrivingSimulator
            gameState={gameState}
            setGameState={setGameState}
            onFinishShift={handleFinishShift}
            onConductorAction={handleConductorAction}
            onHireConductor={() => setIsConductorModalOpen(true)}
            onOpenPhone={() => setIsPhoneOpen(true)}
            onOpenInventory={() => setIsInventoryOpen(true)}
            onOpenMap={() => setIsMapOpen(true)}
            onGoHome={() => setIsHome2DOpen(true)}
            onUpdateSave={updateSave}
            actionFeed={actionFeed}
            addFeedMessage={addFeedMessage}
          />
        )}

        {/* SHIFT RESULTS VIEW */}
        {gameState.screen === 'SHIFT_RESULTS' && gameState.lastShiftResult && (
          <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
            <div className="w-full bg-stone-900 border-2 border-amber-400/70 rounded-3xl p-6 shadow-2xl space-y-6">
              <div className="text-center space-y-1">
                <div className="inline-block px-3 py-1 bg-amber-400/15 border border-amber-400/40 text-amber-400 text-xs font-mono font-bold uppercase rounded-full">
                  Oshodi — CMS Route Audit
                </div>
                <h2 className="text-2xl md:text-3xl font-black font-['Bungee'] text-white">
                  {gameState.lastShiftResult.terminalReached ? 'ROUTE COMPLETED!' : 'SHIFT ENDED'}
                </h2>
                <p className="text-xs text-stone-400">
                  {gameState.lastShiftResult.shiftTitle} summary:
                </p>
              </div>

              <div className="space-y-3 bg-stone-950 p-4 rounded-2xl border border-stone-800 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Passenger Fares & Terminal Bonus</span>
                  <span className="font-mono font-bold text-emerald-400 tabular-nums">
                    +₦{gameState.lastShiftResult.totalFaresCollected.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-rose-400">
                  <span className="text-stone-400">Park Union Ticket</span>
                  <span className="font-mono font-bold tabular-nums">
                    -₦{gameState.lastShiftResult.unionLevyPaid.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-rose-400">
                  <span className="text-stone-400">Wear & Tear</span>
                  <span className="font-mono font-bold tabular-nums">
                    -₦{gameState.lastShiftResult.fuelAndRepairsCost.toLocaleString()}
                  </span>
                </div>

                <div className="h-px bg-stone-800 my-2" />

                <div className="flex justify-between items-center text-base font-bold">
                  <span className="text-white">Total Net Shift Earnings</span>
                  <span className="font-mono text-emerald-400 tabular-nums text-lg">
                    ₦{gameState.lastShiftResult.netProfit.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <div className="text-[10px] text-stone-400 uppercase">Street Cred</div>
                  <div className="text-lg font-mono font-bold text-amber-400 tabular-nums">
                    +{gameState.lastShiftResult.streetCredEarned}
                  </div>
                </div>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <div className="text-[10px] text-stone-400 uppercase">Comfort Score</div>
                  <div className="text-lg font-mono font-bold text-emerald-400 tabular-nums">
                    {gameState.bus.comfortMeter}%
                  </div>
                </div>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <div className="text-[10px] text-stone-400 uppercase">Wallet Balance</div>
                  <div className="text-lg font-mono font-bold text-sky-400 tabular-nums">
                    ₦{walletNaira.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setIsHome2DOpen(true)}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black font-['Bungee'] rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>GO HOME (2D ROOM)</span>
                </button>
                <button
                  onClick={() => setGameState((prev) => ({ ...prev, screen: 'MENU' }))}
                  className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Motor Park</span>
                </button>
                <button
                  onClick={handleStartShift}
                  className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black font-['Bungee'] rounded-xl text-sm tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>NEXT SHIFT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* DRIVER SMARTPHONE MODAL */}
      <PhoneModal
        isOpen={isPhoneOpen}
        onClose={() => setIsPhoneOpen(false)}
        gameState={gameState}
        setGameState={setGameState}
        addFeedMessage={addFeedMessage}
        onStartShift={() => {
          setIsPhoneOpen(false);
          handleStartShift();
        }}
      />

      {/* DRIVER INVENTORY MODAL */}
      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        gameState={gameState}
        setGameState={setGameState}
        addFeedMessage={addFeedMessage}
      />

      {/* CONDUCTOR HIRING MODAL */}
      {isConductorModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border-2 border-amber-400/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg text-amber-400 font-['Bungee']">HIRE LAGOS CONDUCTOR</h3>
                <p className="text-xs text-stone-400">
                  A conductor automatically collects fares when passengers board at each bus stop!
                </p>
              </div>
              <button
                onClick={() => setIsConductorModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {CONDUCTOR_ROSTER.map((c) => {
                const isCurrent = gameState.conductor.hasConductor && gameState.conductor.id === c.id;
                return (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      isCurrent ? 'bg-amber-400/10 border-amber-400' : 'bg-stone-950 border-stone-800'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-stone-100 flex items-center gap-2">
                        <span>{c.name}</span>
                        <span className="text-[10px] text-amber-400 font-mono">({c.nickname})</span>
                      </div>
                      <div className="text-[11px] text-stone-400 mt-0.5">{c.description}</div>
                    </div>

                    <button
                      onClick={() => handleHireConductor(c.id)}
                      className={`ml-3 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 font-mono cursor-pointer ${
                        isCurrent
                          ? 'bg-emerald-500 text-stone-950 font-black'
                          : 'bg-amber-400 hover:bg-amber-300 text-stone-950 font-black'
                      }`}
                    >
                      {isCurrent ? 'ACTIVE' : `HIRE ₦${c.dailyFee.toLocaleString()}`}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-stone-800 flex justify-between items-center">
              <button
                onClick={() => handleHireConductor(null)}
                className="text-xs text-stone-400 hover:text-stone-200 underline font-mono cursor-pointer"
              >
                Drive Solo (Collect Fares Yourself with Key C)
              </button>
              <button
                onClick={() => setIsConductorModalOpen(false)}
                className="px-4 py-1.5 bg-stone-800 text-stone-300 text-xs font-bold rounded-lg hover:bg-stone-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHARACTER CREATION - shows on first launch */}
      {showCharacterCreation && (
        <CharacterCreation
          onComplete={(name, gender) => {
            updateSave({ playerName: name, playerGender: gender });
            setShowCharacterCreation(false);
            addFeedMessage(`🎉 Welcome to Lagos, ${name}! Your Danfo is parked at Oshodi.`);
          }}
        />
      )}

      {/* CITY MAP */}
      <MainMap
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        walletNaira={walletNaira}
        onNavigateTo={(loc) => {
          if (loc.type === 'DEALERSHIP') {
            setIsDealershipOpen(true);
          } else if (loc.type === 'MARKET') {
            setIsKoloOpen(true);
          } else if (loc.type === 'GARAGE') {
            setMenuTab('GARAGE_WORKSHOP');
          }
          addFeedMessage(`📍 Selected ${loc.name}`);
        }}
      />

      {/* DEALERSHIP */}
      <Dealership
        isOpen={isDealershipOpen}
        onClose={() => setIsDealershipOpen(false)}
        walletNaira={walletNaira}
        streetCred={streetCred}
        ownedVehicles={saveData.ownedVehicles}
        onPurchase={(vehicle) => {
          updateSave({
            walletNaira: walletNaira - vehicle.price,
            ownedVehicles: [...saveData.ownedVehicles, vehicle.id as BusModelId] as BusModelId[],
            selectedBusId: vehicle.id as BusModelId,
          });
          setSelectedBusId(vehicle.id as BusModelId);
          addFeedMessage(`🚗 PURCHASED: ${vehicle.name} added to your garage!`);
        }}
      />

      {/* KOLO POT */}
      {isKoloOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-end justify-center p-3">
          <div className="w-full max-w-md bg-stone-900 border-2 border-amber-500/50 rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
              <h2 className="font-black text-amber-400 font-['Bungee']">🏺 KOLO SAVINGS POT</h2>
              <button
                onClick={() => setIsKoloOpen(false)}
                className="p-1.5 bg-stone-800 rounded-lg text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <KoloSystem
              walletNaira={walletNaira}
              hasKolo={saveData.hasKolo}
              koloBalanceNaira={saveData.koloBalanceNaira}
              onBuyKolo={() => updateSave({ hasKolo: true, walletNaira: walletNaira - 500 })}
              onDeposit={(amount) =>
                updateSave({ koloBalanceNaira: saveData.koloBalanceNaira + amount, walletNaira: walletNaira - amount })
              }
              onBreakKolo={() => {
                const collected = saveData.koloBalanceNaira;
                updateSave({ hasKolo: false, koloBalanceNaira: 0, walletNaira: walletNaira + collected });
                addFeedMessage(
                  `🔨 KOLO SMASHED! Collected ₦${collected.toLocaleString()}. Buy a new one from the market.`
                );
                setIsKoloOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* AJO SAVINGS */}
      {isAjoOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-end justify-center p-3">
          <div className="w-full max-w-md bg-stone-900 border-2 border-purple-500/50 rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
              <h2 className="font-black text-purple-400 font-['Bungee']">👩🏾‍🤝‍👨🏾 AJO CIRCLE</h2>
              <button
                onClick={() => setIsAjoOpen(false)}
                className="p-1.5 bg-stone-800 rounded-lg text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <AjoApp
              walletNaira={walletNaira}
              ajoBalanceNaira={saveData.ajoContributionsNaira}
              onContribute={(amount) =>
                updateSave({
                  ajoContributionsNaira: saveData.ajoContributionsNaira + amount,
                  walletNaira: walletNaira - amount,
                })
              }
              onCollect={(amount) => {
                updateSave({ ajoContributionsNaira: 0, walletNaira: walletNaira + amount });
                addFeedMessage(`💰 AJO COLLECTED: ₦${amount.toLocaleString()} received from your savings circle!`);
                setIsAjoOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
