import React, { useState, useEffect, useCallback } from 'react';
import { useGameSave } from './hooks/useGameSave';
import {
  GameState,
  ShiftTimeOfDay,
  Passenger,
  ShiftResultData,
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
import { CharacterCreation } from './components/CharacterCreation';
import { AjoApp, KoloSystem } from './components/SavingsSystems';
import { SplashLoadingScreen } from './components/SplashLoadingScreen';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { PlayerHome2D } from './components/PlayerHome2D';
import { NigerianBankAndPosModal, BankingModalMode } from './components/NigerianBankAndPosModal';
import {
  Trophy,
  Volume2,
  VolumeX,
  Users,
  ArrowRight,
  RotateCcw,
  Award,
  Check,
  MapPin,
  X,
  Smartphone,
  Package,
  Home,
  Download,
  Wrench,
  Navigation,
  Building2,
  CreditCard,
  Wallet,
  Settings,
  Radio,
  Globe,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

type MainMenuSection = 'SINGLE_PLAYER' | 'MULTIPLAYER' | 'SETTINGS';
type SinglePlayerSubView = 'SHIFT_DISPATCH' | 'MISSIONS' | 'GARAGE';

export default function App() {
  const { saveData, updateSave, wipeSave } = useGameSave();
  const walletNaira = saveData.walletNaira;
  const bankBalanceNaira = saveData.bankBalanceNaira ?? 250000;
  const streetCred = saveData.streetCred;
  const selectedBusId = saveData.selectedBusId;
  const selectedSlogan = saveData.selectedSlogan;

  const setWalletNaira = (val: number | ((prev: number) => number)) =>
    updateSave({ walletNaira: typeof val === 'function' ? val(walletNaira) : val });
  const setBankBalanceNaira = (val: number | ((prev: number) => number)) =>
    updateSave({ bankBalanceNaira: typeof val === 'function' ? val(bankBalanceNaira) : val });
  const setStreetCred = (val: number | ((prev: number) => number)) =>
    updateSave({ streetCred: typeof val === 'function' ? val(streetCred) : val });
  const setSelectedSlogan = (val: string) => updateSave({ selectedSlogan: val });

  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [showPwaModal, setShowPwaModal] = useState<boolean>(false);
  const [selectedShiftId, setSelectedShiftId] = useState<ShiftTimeOfDay>('MORNING_RUSH');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Clean 3-tab menu: SINGLE PLAYER | MULTIPLAYER | SETTINGS
  const [mainMenuTab, setMainMenuTab] = useState<MainMenuSection>('SINGLE_PLAYER');
  const [singlePlayerSubView, setSinglePlayerSubView] = useState<SinglePlayerSubView>('SHIFT_DISPATCH');

  // Multiplayer Lobby States
  const [mpMode, setMpMode] = useState<'EXPRESS_RACE' | 'TURF_WAR' | 'CONVOY_CRUISE'>('EXPRESS_RACE');
  const [selectedLobbyId, setSelectedLobbyId] = useState<string>('lobby-oshodi-1');
  const [mpRoomCode, setMpRoomCode] = useState<string>('EKO-409');
  const [mpChatLog, setMpChatLog] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'Tunde_Ikeja', text: 'Oya who dey ready for Oshodi to CMS express run?', time: '11:54' },
    { sender: 'Rasaki_Yellow', text: 'No overtake me for Maryland Underbridge o!', time: '11:55' },
    { sender: 'Sabo_Express', text: 'My Danfo engine don warm. Make we move!', time: '11:56' },
  ]);

  const [selectedMissionId, setSelectedMissionId] = useState<string>(MISSIONS_CATALOG[0].id);
  const [isConductorModalOpen, setIsConductorModalOpen] = useState<boolean>(false);
  const [isPhoneOpen, setIsPhoneOpen] = useState<boolean>(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState<boolean>(false);
  const [isMapOpen, setIsMapOpen] = useState<boolean>(false);
  const [isKoloOpen, setIsKoloOpen] = useState<boolean>(false);
  const [isAjoOpen, setIsAjoOpen] = useState<boolean>(false);
  const [isHome2DOpen, setIsHome2DOpen] = useState<boolean>(false);

  // POS Kiosk (max ₦100k) & Nigerian Bank Hall (>₦100k Queue) Modal
  const [isBankModalOpen, setIsBankModalOpen] = useState<boolean>(false);
  const [bankModalMode, setBankModalMode] = useState<BankingModalMode>('POS_KIOSK');

  const [showCharacterCreation, setShowCharacterCreation] = useState<boolean>(
    !saveData.playerName || saveData.playerName === 'Driver'
  );
  const [driverNameInput, setDriverNameInput] = useState<string>(saveData.playerName || 'Captain');

  // Active driving feed
  const [actionFeed, setActionFeed] = useState<string[]>([
    '🚌 Parked at Oshodi Motor Park (0/14 seats). Drive out the gate to Mangoro / Cement (150m) to load your first passengers!',
  ]);

  const addFeedMessage = useCallback((msg: string) => {
    setActionFeed((prev) => [msg, ...prev.slice(0, 4)]);
  }, []);

  const openPosOrBank = useCallback((mode: BankingModalMode) => {
    setBankModalMode(mode);
    setIsBankModalOpen(true);
  }, []);

  // Commuters boarding directly from the Ikeja Central Motor Park Departure Terminal (Bay 02)
  const createInitialPassengers = (): Passenger[] => [
    {
      id: 'p-motorpark-1',
      name: 'Brother Emeka',
      archetype: 'CORPORATE',
      archetypeLabel: '💼 Office Worker',
      destination: 'CMS Marina Terminal',
      destinationUid: 'junc-cms',
      fare: 250,
      seatsTaken: 1,
      paid: true,
      patience: 90,
      maxPatience: 100,
      hasBigBill: false,
      changeNeeded: 0,
      seatedAt: 0,
      satisfaction: 'HAPPY',
    },
    {
      id: 'p-motorpark-2',
      name: 'Mama Nkechi',
      archetype: 'MARKET_WOMAN',
      archetypeLabel: '🧺 Market Woman',
      destination: 'Oshodi Interchange',
      destinationUid: 'junc-oshodi',
      fare: 300,
      seatsTaken: 1,
      paid: true,
      patience: 95,
      maxPatience: 100,
      hasBigBill: false,
      changeNeeded: 0,
      seatedAt: 1,
      satisfaction: 'HAPPY',
    },
    {
      id: 'p-motorpark-3',
      name: 'Tunde Campus',
      archetype: 'STUDENT',
      archetypeLabel: '🎒 Student',
      destination: 'Yaba Tech / Sabo',
      destinationUid: 'junc-yaba',
      fare: 150,
      seatsTaken: 1,
      paid: true,
      patience: 90,
      maxPatience: 100,
      hasBigBill: false,
      changeNeeded: 0,
      seatedAt: 2,
      satisfaction: 'HAPPY',
    },
    {
      id: 'p-motorpark-4',
      name: 'Sister Blessing',
      archetype: 'PREACHER',
      archetypeLabel: '🤰 VIP Mama',
      destination: 'Maryland Mall',
      destinationUid: 'junc-maryland',
      fare: 250,
      seatsTaken: 1,
      paid: true,
      patience: 88,
      maxPatience: 100,
      hasBigBill: false,
      changeNeeded: 0,
      seatedAt: 3,
      satisfaction: 'HAPPY',
    },
    {
      id: 'p-motorpark-5',
      name: 'Alhaji Rasheed',
      archetype: 'CORPORATE',
      archetypeLabel: '💼 Corporate Banker',
      destination: 'CMS Marina Terminal',
      destinationUid: 'junc-cms',
      fare: 350,
      seatsTaken: 1,
      paid: true,
      patience: 85,
      maxPatience: 100,
      hasBigBill: false,
      changeNeeded: 0,
      seatedAt: 4,
      satisfaction: 'HAPPY',
    },
    {
      id: 'p-motorpark-6',
      name: 'Chinedu Alaba',
      archetype: 'STUDENT',
      archetypeLabel: '🎒 Computer Village Boy',
      destination: 'Ikeja Along',
      destinationUid: 'junc-ikeja',
      fare: 200,
      seatsTaken: 1,
      paid: true,
      patience: 95,
      maxPatience: 100,
      hasBigBill: false,
      changeNeeded: 0,
      seatedAt: 5,
      satisfaction: 'HAPPY',
    },
  ];

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
      bankBalanceNaira: saveData.bankBalanceNaira ?? 250000,
      streetCred: saveData.streetCred,
      boostCanisters: saveData.boostCanisters ?? 3,
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
      targetDistanceMeters: 3800,
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

  // Keep gameState wallet & bank in sync with saveData
  useEffect(() => {
    setGameState((prev) => ({
      ...prev,
      walletNaira: saveData.walletNaira,
      bankBalanceNaira: saveData.bankBalanceNaira ?? 250000,
    }));
  }, [saveData.walletNaira, saveData.bankBalanceNaira]);

  // Audio toggle
  const toggleAudio = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  // Update both Wallet and Bank balances from POS or Bank Hall Teller
  const handleUpdateWalletAndBank = useCallback(
    (newWallet: number, newBank: number, logMessage: string) => {
      updateSave({
        walletNaira: newWallet,
        bankBalanceNaira: newBank,
        bankInitialized: true,
      });
      setGameState((prev) => ({
        ...prev,
        walletNaira: newWallet,
        bankBalanceNaira: newBank,
      }));
      addFeedMessage(logMessage);
    },
    [updateSave, addFeedMessage]
  );

  // Start 3D Mission
  const handleStartMission = (mission: MissionGoal) => {
    const baseBus = BUS_PRESETS[selectedBusId] || BUS_PRESETS['RUSTIC_VAN'];
    const bus: typeof baseBus = JSON.parse(JSON.stringify(baseBus));
    bus.slogan = selectedSlogan;
    bus.upgrades = { ...gameState.bus.upgrades };
    bus.passengers = createInitialPassengers();
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

    addFeedMessage(
      `🎯 MISSION STARTED: ${mission.title}! Boarded ${bus.passengers.length} commuters at Ikeja Central Motor Park — take off for ${mission.location}!`
    );
    soundEngine.playHorn(bus.upgrades.musicalHorn);
  };

  // Start General Career Shift or Multiplayer Convoy Run
  const handleStartShift = (isMultiplayerConvoy: boolean = false) => {
    const shift = SHIFT_CONFIGS[selectedShiftId];
    const baseBus = BUS_PRESETS[selectedBusId] || BUS_PRESETS['RUSTIC_VAN'];
    const bus: typeof baseBus = JSON.parse(JSON.stringify(baseBus));
    bus.slogan = selectedSlogan;
    bus.upgrades = { ...gameState.bus.upgrades };
    bus.passengers = createInitialPassengers();
    const junctions = JSON.parse(JSON.stringify(DEFAULT_JUNCTIONS));

    setGameState((prev) => ({
      ...prev,
      screen: 'SHIFT_ACTIVE',
      activeShift: isMultiplayerConvoy
        ? {
            ...shift,
            title: `MP Convoy (${mpRoomCode}) • ${shift.title}`,
            baseTrafficDensity: 0.85,
          }
        : shift,
      shiftTimeRemaining: shift.durationSeconds,
      shiftClockDisplay: shift.startTime,
      bus: bus,
      conductor: {
        ...prev.conductor,
        collectedCash: 0,
      },
      distanceTraveledMeters: 0,
      targetDistanceMeters: 3800,
      junctions: junctions,
      activeJunctionIndex: 0,
      activeDelivery: null,
      availableDelivery: null,
      activeCabinEvent: null,
      lastShiftResult: null,
    }));

    addFeedMessage(
      isMultiplayerConvoy
        ? `🌐 MULTIPLAYER CONVOY LIVE (Room ${mpRoomCode}): Race rival Danfos from Ikeja Along ➔ Maryland ➔ Oshodi ➔ CMS!`
        : `🚌 SHIFT STARTED: ${shift.title}! Bus is empty (0/${bus.capacity}) — drive to Mangoro / Cement (150m) ➔ Ikeja Along (280m) ➔ Maryland ➔ Oshodi ➔ CMS!`
    );
    soundEngine.playHorn(bus.upgrades.musicalHorn);
  };

  // Finish Shift / Mission (Fares go to Wallet Cash; can deposit to Bank at POS or Bank Hall)
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

  // Purchase Upgrade (Pays from Wallet Cash)
  const handlePurchaseUpgrade = (upgradeId: keyof BusUpgrades, cost: number) => {
    if (walletNaira < cost) {
      addFeedMessage(
        `⚠️ Insufficient Wallet Cash! Need ₦${cost.toLocaleString()} in your wallet. Withdraw cash from POS or Bank!`
      );
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
      addFeedMessage(`⚠️ Need ₦${profile.dailyFee.toLocaleString()} cash in Wallet to hire ${profile.name}!`);
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
          gameState={{
            ...gameState,
            walletNaira: saveData.walletNaira,
            bankBalanceNaira: saveData.bankBalanceNaira ?? 250000,
            streetCred: saveData.streetCred,
          }}
          onUpdateWalletAndCred={(walletDelta, credDelta = 0, staminaSet) => {
            const currentWallet = saveData.walletNaira;
            const currentCred = saveData.streetCred;
            const nextWallet = Math.max(0, currentWallet + walletDelta);
            const nextCred = Math.max(0, currentCred + credDelta);
            updateSave({ walletNaira: nextWallet, streetCred: nextCred });
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
              handleStartShift(false);
            }
          }}
          onOpenPhone={() => setIsPhoneOpen(true)}
          onOpenPosOrBank={openPosOrBank}
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
          onOpenPosOrBank={openPosOrBank}
          onStartShift={() => {
            setIsPhoneOpen(false);
            setIsHome2DOpen(false);
            handleStartShift(false);
          }}
        />
        <NigerianBankAndPosModal
          isOpen={isBankModalOpen}
          initialMode={bankModalMode}
          onClose={() => setIsBankModalOpen(false)}
          walletNaira={walletNaira}
          bankBalanceNaira={bankBalanceNaira}
          playerName={saveData.playerName || 'Captain'}
          onUpdateBalances={handleUpdateWalletAndBank}
        />
      </>
    );
  }

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] fixed inset-0 bg-stone-950 text-stone-100 flex flex-col overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* TOP DANFO HAZARD STRIPE ACCENT (Only in Menu/Results) */}
      {gameState.screen !== 'SHIFT_ACTIVE' && (
        <div
          className="w-full h-1.5 shrink-0"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #facc15 0px, #facc15 16px, #0c0a09 16px, #0c0a09 32px)',
          }}
        />
      )}

      {/* CLEAN 3-ZONE HEADER BAR (NO DEALERSHIP CLUTTER) */}
      <header
        className={`h-16 border-b px-4 sm:px-6 flex items-center justify-between gap-4 z-50 shrink-0 transition-colors ${
          gameState.screen === 'SHIFT_ACTIVE'
            ? 'hidden'
            : 'bg-stone-900/95 border-stone-800 backdrop-blur-md shadow-xl'
        }`}
      >
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-amber-400 rounded-xl border-2 border-stone-950 flex items-center justify-center font-black font-['Bungee'] text-stone-950 text-lg shadow-md">
            🚌
          </div>
          <div>
            <h1 className="font-black text-base sm:text-lg tracking-wide text-amber-400 font-['Bungee'] leading-none whitespace-nowrap">
              DANFO EXPRESS
            </h1>
            <div className="text-[11px] font-mono text-stone-400 mt-0.5">
              {saveData.playerName || 'Captain'} · {streetCred} Cred
            </div>
          </div>
        </div>

        {/* Zone 2: Clean 3-Mode Navigation (SINGLE PLAYER | MULTIPLAYER | SETTINGS) */}
        <nav className="flex items-center gap-1.5 bg-stone-950 p-1.5 rounded-2xl border border-stone-800">
          <button
            onClick={() => setMainMenuTab('SINGLE_PLAYER')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              mainMenuTab === 'SINGLE_PLAYER'
                ? 'bg-amber-400 text-stone-950 font-black shadow'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Single Player
          </button>
          <button
            onClick={() => setMainMenuTab('MULTIPLAYER')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              mainMenuTab === 'MULTIPLAYER'
                ? 'bg-amber-400 text-stone-950 font-black shadow'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Multiplayer
          </button>
          <button
            onClick={() => setMainMenuTab('SETTINGS')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              mainMenuTab === 'SETTINGS'
                ? 'bg-amber-400 text-stone-950 font-black shadow'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Settings
          </button>
        </nav>

        {/* Zone 3: Distinct Wallet Cash vs Bank Account Balance & Audio */}
        <div className="flex items-center gap-2 font-mono shrink-0">
          {/* Wallet Cash Button (Opens POS Kiosk) */}
          <button
            onClick={() => openPosOrBank('POS_KIOSK')}
            className="px-3 py-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 border border-emerald-500/40 text-left transition-colors cursor-pointer"
            title="Cash in Wallet — Click to use POS Agent (Withdraw/Deposit up to ₦100,000)"
          >
            <span className="text-[9px] text-stone-400 block leading-none">WALLET CASH</span>
            <span className="text-xs font-black text-emerald-400 tabular-nums">
              ₦{walletNaira.toLocaleString()}
            </span>
          </button>

          {/* Bank Account Button (Opens Nigerian Bank Hall Queue) */}
          <button
            onClick={() => openPosOrBank('BANK_HALL')}
            className="px-3 py-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 border border-sky-500/40 text-left transition-colors cursor-pointer"
            title="Bank Account Balance — Click to enter Nigerian Bank Hall (Withdrawals >₦100,000)"
          >
            <span className="text-[9px] text-stone-400 block leading-none">BANK ACCOUNT</span>
            <span className="text-xs font-black text-sky-400 tabular-nums">
              ₦{bankBalanceNaira.toLocaleString()}
            </span>
          </button>

          <button
            onClick={toggleAudio}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
            title="Toggle Audio"
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
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* CLEAN MAIN MENU (SINGLE PLAYER | MULTIPLAYER | SETTINGS)        */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {gameState.screen === 'MENU' && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 max-w-6xl mx-auto w-full space-y-5">
            {/* PWA Install Banner (Only shown when user requests or on mobile) */}
            <PwaInstallBanner forceShow={showPwaModal} onClose={() => setShowPwaModal(false)} />

            {/* ──────────────────────────────────────────────────────────── */}
            {/* 1. SINGLE PLAYER VIEW                                        */}
            {/* ──────────────────────────────────────────────────────────── */}
            {mainMenuTab === 'SINGLE_PLAYER' && (
              <div className="space-y-5">
                {/* Clean Sub-Navigation Strip for Single Player */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900/90 p-2 rounded-2xl border border-stone-800">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSinglePlayerSubView('SHIFT_DISPATCH')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                        singlePlayerSubView === 'SHIFT_DISPATCH'
                          ? 'bg-amber-400 text-stone-950 font-black'
                          : 'text-stone-300 hover:text-white'
                      }`}
                    >
                      Highway Shift
                    </button>
                    <button
                      onClick={() => setSinglePlayerSubView('MISSIONS')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                        singlePlayerSubView === 'MISSIONS'
                          ? 'bg-amber-400 text-stone-950 font-black'
                          : 'text-stone-300 hover:text-white'
                      }`}
                    >
                      Driving Missions
                    </button>
                    <button
                      onClick={() => setSinglePlayerSubView('GARAGE')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                        singlePlayerSubView === 'GARAGE'
                          ? 'bg-amber-400 text-stone-950 font-black'
                          : 'text-stone-300 hover:text-white'
                      }`}
                    >
                      Upgrades &amp; Conductor
                    </button>
                  </div>

                  {/* Quick Life & Banking Actions */}
                  <div className="flex flex-wrap items-center gap-2 font-mono">
                    <button
                      onClick={() => openPosOrBank('POS_KIOSK')}
                      className="px-3 py-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 border border-sky-400/50 text-sky-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>POS Agent (≤₦100k)</span>
                    </button>
                    <button
                      onClick={() => openPosOrBank('BANK_HALL')}
                      className="px-3 py-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 border border-rose-400/50 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Bank Hall (&gt;₦100k)</span>
                    </button>
                    <button
                      onClick={() => setIsHome2DOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>Go Home (2D)</span>
                    </button>
                    <button
                      onClick={() => setIsPhoneOpen(true)}
                      className="relative px-3 py-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                      <span>Phone</span>
                      {unreadCount > 0 && (
                        <span className="text-rose-400 font-black">({unreadCount})</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* SUBVIEW A: HIGHWAY SHIFT DISPATCH */}
                {singlePlayerSubView === 'SHIFT_DISPATCH' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left 7 Cols: Active Bus & Shift Launch */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-mono text-amber-400 font-bold">
                              Oshodi Motor Park · Bay #01 · 20 Real Lagos Bus Stops
                            </div>
                            <h2 className="text-2xl font-black font-['Bungee'] text-white mt-1">
                              {activeBusPreset.name}
                            </h2>
                            <p className="text-xs text-stone-400 mt-0.5">
                              {activeBusPreset.capacity} Seats · {activeBusPreset.maxSpeed} km/h Max Speed · Conductor:{' '}
                              <span className="text-emerald-400 font-semibold">
                                {gameState.conductor.hasConductor ? gameState.conductor.name : 'Solo Driver'}
                              </span>
                            </p>
                          </div>

                          <button
                            onClick={() => setIsConductorModalOpen(true)}
                            className="px-3.5 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 text-emerald-300 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Change Conductor</span>
                          </button>
                        </div>

                        {/* Shift Schedule Selector */}
                        <div className="space-y-2">
                          <div className="text-xs font-mono text-stone-400 font-semibold">
                            Select Shift Schedule (Ikeja ➔ Maryland ➔ Oshodi ➔ Yaba ➔ CMS)
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {(Object.keys(SHIFT_CONFIGS) as ShiftTimeOfDay[]).map((sKey) => {
                              const cfg = SHIFT_CONFIGS[sKey];
                              const isSelected = selectedShiftId === sKey;
                              return (
                                <button
                                  key={sKey}
                                  onClick={() => setSelectedShiftId(sKey)}
                                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                    isSelected
                                      ? 'bg-amber-400/15 border-amber-400 text-white'
                                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-amber-400">
                                      <span>{cfg.startTime}</span>
                                      {cfg.floodRisk && <span className="text-sky-400">Rain</span>}
                                    </div>
                                    <div className="font-bold text-xs text-white mt-1">{cfg.title}</div>
                                    <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">{cfg.subtitle}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Slogan Sticker Picker */}
                        <div className="space-y-1.5">
                          <div className="text-xs font-mono text-stone-400">
                            Rear Window Slogan: <strong className="text-amber-400">"{selectedSlogan}"</strong>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {SLOGANS.map((slogan) => (
                              <button
                                key={slogan}
                                onClick={() => setSelectedSlogan(slogan)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                                  selectedSlogan === slogan
                                    ? 'bg-amber-400 text-stone-950 border-amber-200 font-black'
                                    : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-white'
                                }`}
                              >
                                {slogan}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Primary Launch CTA */}
                        <button
                          onClick={() => handleStartShift(false)}
                          className="w-full py-4 px-6 bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-stone-950 font-black font-['Bungee'] text-base sm:text-lg rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all cursor-pointer"
                        >
                          <span>START ENGINE &amp; DRIVE</span>
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Right 5 Cols: Wallet vs Bank & POS / Bank Branch Access */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* Wallet vs Bank Card */}
                      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-black font-['Bungee'] text-amber-400">
                              WALLET CASH &amp; BANKING
                            </h3>
                            <p className="text-xs text-stone-400 mt-0.5">
                              POS limit is ₦100,000 · Visit the Bank Teller for &gt;₦100,000
                            </p>
                          </div>
                          <button
                            onClick={() => soundEngine.playBankQueueChime('B-044', 2, true)}
                            className="p-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-amber-400 cursor-pointer"
                            title="Hear Nigerian Bank Queue Sound"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 font-mono">
                          <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800">
                            <span className="text-[10px] text-stone-400 block">WALLET (CASH)</span>
                            <span className="text-base font-black text-emerald-400 tabular-nums mt-0.5 block">
                              ₦{walletNaira.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-stone-500">Pocket cash on hand</span>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800">
                            <span className="text-[10px] text-stone-400 block">EKO ZENITH BANK</span>
                            <span className="text-base font-black text-sky-400 tabular-nums mt-0.5 block">
                              ₦{bankBalanceNaira.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-stone-500">Savings account</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <button
                            onClick={() => openPosOrBank('POS_KIOSK')}
                            className="py-3 px-3.5 rounded-2xl bg-stone-950 hover:bg-stone-800 border border-sky-400/50 text-sky-300 font-mono text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>POS Agent (Max ₦100k)</span>
                          </button>

                          <button
                            onClick={() => openPosOrBank('BANK_HALL')}
                            className="py-3 px-3.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-mono text-xs font-black flex items-center justify-center gap-2 shadow cursor-pointer"
                          >
                            <Building2 className="w-4 h-4" />
                            <span>Enter Bank (&gt;₦100k)</span>
                          </button>
                        </div>

                        {/* Traditional Kolo & Ajo Savings */}
                        <div className="pt-2 border-t border-stone-800 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setIsKoloOpen(true)}
                            className="py-2 px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-amber-300 font-mono text-xs font-bold cursor-pointer tabular-nums"
                          >
                            🏺 Kolo: ₦{saveData.koloBalanceNaira.toLocaleString()}
                          </button>
                          <button
                            onClick={() => setIsAjoOpen(true)}
                            className="py-2 px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-purple-300 font-mono text-xs font-bold cursor-pointer tabular-nums"
                          >
                            🤝🏾 Ajo: ₦{saveData.ajoContributionsNaira.toLocaleString()}
                          </button>
                        </div>
                      </div>

                      {/* Route Overview Card */}
                      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-4 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold text-white">
                            20 Real-World Lagos Bus Stops (with UIDs)
                          </div>
                          <div className="text-[11px] text-stone-400">
                            Mangoro ➔ Ikeja ➔ Maryland ➔ Oshodi BRT ➔ Yaba ➔ CMS
                          </div>
                        </div>
                        <button
                          onClick={() => setIsMapOpen(true)}
                          className="px-3 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 text-sky-300 font-mono text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
                        >
                          View Route Map
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBVIEW B: DRIVING MISSIONS */}
                {singlePlayerSubView === 'MISSIONS' && (
                  <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5">
                    <MissionSelector
                      selectedMissionId={selectedMissionId}
                      onSelectMission={(m) => setSelectedMissionId(m.id)}
                      onStartMission={handleStartMission}
                    />
                  </div>
                )}

                {/* SUBVIEW C: GARAGE UPGRADES & CONDUCTORS */}
                {singlePlayerSubView === 'GARAGE' && (
                  <div className="space-y-5">
                    <div className="p-5 bg-stone-900 border border-stone-800 rounded-3xl space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-base text-amber-400">
                            Hire Your Lagos Conductor (Agbero)
                          </h3>
                          <p className="text-xs text-stone-400">
                            Calls out destinations at bus stops and collects passenger fares automatically.
                          </p>
                        </div>
                        <div className="font-mono text-xs text-stone-300 bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800">
                          Active:{' '}
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
                              className={`p-4 rounded-2xl border flex flex-col justify-between ${
                                isCurrent
                                  ? 'bg-amber-400/15 border-amber-400'
                                  : 'bg-stone-950 border-stone-800'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-sm text-amber-400">{c.name}</span>
                                  <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
                                    ₦{c.dailyFee.toLocaleString()}/day
                                  </span>
                                </div>
                                <div className="text-xs text-stone-300 mb-2">"{c.nickname}"</div>
                                <p className="text-xs text-stone-400 mb-3">{c.description}</p>
                              </div>
                              <button
                                onClick={() => handleHireConductor(c.id)}
                                className={`w-full py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                                  isCurrent
                                    ? 'bg-emerald-500 text-stone-950 font-black'
                                    : 'bg-stone-800 hover:bg-amber-400 hover:text-stone-950 text-stone-200'
                                }`}
                              >
                                {isCurrent ? 'On Duty' : `Hire (₦${c.dailyFee.toLocaleString()})`}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {UPGRADE_CATALOG.map((item) => {
                        const isOwned = gameState.bus.upgrades[item.id];
                        const canAfford = walletNaira >= item.costNaira;
                        return (
                          <div
                            key={item.id}
                            className={`p-4 rounded-2xl border flex flex-col justify-between ${
                              isOwned ? 'bg-emerald-950/20 border-emerald-500/50' : 'bg-stone-900 border-stone-800'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-sm text-amber-400">
                                  {item.icon} {item.name}
                                </span>
                                <span className="font-mono text-xs font-bold tabular-nums">
                                  {isOwned ? (
                                    <span className="text-emerald-400">Installed</span>
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
                                  <Check className="w-4 h-4" /> Mounted on 3D Bus
                                </span>
                              ) : (
                                <button
                                  onClick={() => handlePurchaseUpgrade(item.id, item.costNaira)}
                                  disabled={!canAfford}
                                  className={`px-4 py-2 font-bold text-xs rounded-xl cursor-pointer ${
                                    canAfford
                                      ? 'bg-amber-400 hover:bg-amber-300 text-stone-950 font-black'
                                      : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                                  }`}
                                >
                                  Buy &amp; Install (₦{item.costNaira.toLocaleString()})
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ──────────────────────────────────────────────────────────── */}
            {/* 2. MULTIPLAYER VIEW (LAGOS CONVOY & HIGHWAY TURF LOBBY)      */}
            {/* ──────────────────────────────────────────────────────────── */}
            {mainMenuTab === 'MULTIPLAYER' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left 7 Cols: Multiplayer Mode & Active Lagos Rooms */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-xl font-black font-['Bungee'] text-amber-400">
                          LAGOS MULTIPLAYER CONVOY LOBBY
                        </h2>
                        <p className="text-xs text-stone-400 mt-0.5">
                          Compete with rival Danfo drivers for commuters along Ikeja ➔ Oshodi ➔ CMS
                        </p>
                      </div>
                      <div className="font-mono text-xs bg-stone-950 border border-stone-800 px-3 py-1.5 rounded-xl text-emerald-400 font-bold">
                        Room Code: {mpRoomCode}
                      </div>
                    </div>

                    {/* Multiplayer Game Mode Selector */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        {
                          id: 'EXPRESS_RACE' as const,
                          title: 'Oshodi–CMS Sprint',
                          desc: '4 Danfos race from Ikeja Along to CMS Marina.',
                        },
                        {
                          id: 'TURF_WAR' as const,
                          title: 'Passenger Turf War',
                          desc: 'Poach waiting commuters at 20 bus stops before rivals.',
                        },
                        {
                          id: 'CONVOY_CRUISE' as const,
                          title: 'Lagos Convoy Cruise',
                          desc: 'Open highway convoy with side-street shortcuts.',
                        },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setMpMode(m.id)}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                            mpMode === m.id
                              ? 'bg-amber-400/15 border-amber-400 text-white'
                              : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                          }`}
                        >
                          <div className="font-bold text-xs text-amber-400">{m.title}</div>
                          <p className="text-[11px] text-stone-300 mt-1">{m.desc}</p>
                        </button>
                      ))}
                    </div>

                    {/* Active Lagos Highway Lobbies */}
                    <div className="space-y-2">
                      <div className="text-xs font-mono text-stone-400 font-semibold">
                        Select Active Lagos Server Room
                      </div>
                      {[
                        {
                          id: 'lobby-oshodi-1',
                          name: 'Oshodi Underbridge Express #01',
                          route: 'Ikeja Along ➔ Maryland ➔ Oshodi ➔ CMS',
                          players: '3 / 4 Drivers',
                          code: 'EKO-409',
                        },
                        {
                          id: 'lobby-yaba-2',
                          name: 'Yaba / Ojuelegba Rush Hour #02',
                          route: 'Palmgrove ➔ Jibowu ➔ Yaba ➔ Costain',
                          players: '2 / 4 Drivers',
                          code: 'YBA-218',
                        },
                        {
                          id: 'lobby-island-3',
                          name: 'CMS Marina Night Convoy #03',
                          route: 'Obanikoro ➔ Stadium ➔ CMS Terminal',
                          players: '4 / 4 Drivers',
                          code: 'CMS-884',
                        },
                      ].map((room) => (
                        <button
                          key={room.id}
                          onClick={() => {
                            setSelectedLobbyId(room.id);
                            setMpRoomCode(room.code);
                            soundEngine.playHorn(false);
                          }}
                          className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            selectedLobbyId === room.id
                              ? 'bg-stone-950 border-amber-400 text-white'
                              : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs text-white">{room.name}</div>
                            <div className="text-[11px] font-mono text-stone-400 mt-0.5">{room.route}</div>
                          </div>
                          <div className="text-right font-mono">
                            <div className="text-xs font-bold text-emerald-400">{room.players}</div>
                            <div className="text-[10px] text-stone-500">{room.code}</div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Launch Multiplayer Convoy Run */}
                    <button
                      onClick={() => handleStartShift(true)}
                      className="w-full py-4 px-6 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black font-['Bungee'] text-base rounded-2xl shadow-lg flex items-center justify-center gap-3 cursor-pointer"
                    >
                      <Globe className="w-5 h-5" />
                      <span>JOIN ROOM ({mpRoomCode}) &amp; LAUNCH CONVOY</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Right 5 Cols: Motor Park Radio & Quick Pidgin Callouts */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 flex flex-col justify-between space-y-4 h-full">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black font-['Bungee'] text-amber-400 flex items-center gap-2">
                          <Radio className="w-4 h-4 text-emerald-400" />
                          <span>PARK CB RADIO CHAT</span>
                        </h3>
                        <span className="text-[11px] font-mono text-stone-400">Channel 19 · Lagos Mainland</span>
                      </div>

                      <div className="bg-stone-950 border border-stone-800 rounded-2xl p-3.5 space-y-2.5 max-h-[240px] overflow-y-auto font-mono text-xs">
                        {mpChatLog.map((entry, idx) => (
                          <div key={idx} className="border-b border-stone-900 pb-2 last:border-none last:pb-0">
                            <div className="flex justify-between text-[10px] text-stone-500">
                              <span className="font-bold text-amber-400">{entry.sender}</span>
                              <span>{entry.time}</span>
                            </div>
                            <div className="text-stone-200 mt-0.5">{entry.text}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] font-mono text-stone-400">Send Quick Pidgin Radio Callout:</div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          'No dulling! Clear road o!',
                          'Oshodi straight, follow my back!',
                          'LASTMA dey Maryland Underbridge!',
                          'My Danfo full ground, see you at CMS!',
                        ].map((msg) => (
                          <button
                            key={msg}
                            onClick={() => {
                              soundEngine.playDoorSlap();
                              setMpChatLog((prev) => [
                                ...prev,
                                {
                                  sender: saveData.playerName || 'Captain',
                                  text: msg,
                                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                },
                              ]);
                            }}
                            className="p-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-[11px] font-mono text-stone-300 hover:text-amber-300 text-left transition-colors cursor-pointer"
                          >
                            "{msg}"
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────────────────────────────────────────────────── */}
            {/* 3. SETTINGS VIEW (AUDIO, NIGERIAN BANK SOUNDS, PWA, SAVE)   */}
            {/* ──────────────────────────────────────────────────────────── */}
            {mainMenuTab === 'SETTINGS' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left 6 Cols: Audio & Nigerian Bank Soundboard */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-black font-['Bungee'] text-amber-400">
                          AUDIO &amp; NIGERIAN BANK SOUNDS
                        </h2>
                        <p className="text-xs text-stone-400">
                          Configure game sound effects and preview the Nigerian Banking Hall audio synthesizer
                        </p>
                      </div>
                      <button
                        onClick={toggleAudio}
                        className={`px-4 py-2 rounded-xl font-mono text-xs font-black cursor-pointer ${
                          isMuted
                            ? 'bg-rose-500 text-white'
                            : 'bg-emerald-500 text-stone-950'
                        }`}
                      >
                        {isMuted ? 'Audio Muted' : 'Audio Active'}
                      </button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-stone-800">
                      <div className="text-xs font-mono text-stone-400 font-semibold">
                        Preview Nigerian Bank &amp; Street Sound Effects:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          onClick={() => soundEngine.playBankQueueChime('B-044', 2, true)}
                          className="p-3 rounded-2xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-left font-mono text-xs text-amber-300 flex items-center justify-between cursor-pointer"
                        >
                          <span>🔔 Bank Hall Queue Call</span>
                          <Volume2 className="w-4 h-4 shrink-0" />
                        </button>

                        <button
                          onClick={() => soundEngine.playBankCashCounter()}
                          className="p-3 rounded-2xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-left font-mono text-xs text-emerald-300 flex items-center justify-between cursor-pointer"
                        >
                          <span>💵 Naira Counting Machine</span>
                          <Volume2 className="w-4 h-4 shrink-0" />
                        </button>

                        <button
                          onClick={() => soundEngine.playBankDoorMantrap()}
                          className="p-3 rounded-2xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-left font-mono text-xs text-sky-300 flex items-center justify-between cursor-pointer"
                        >
                          <span>🚪 Security Mantrap Door</span>
                          <Volume2 className="w-4 h-4 shrink-0" />
                        </button>

                        <button
                          onClick={() => soundEngine.playBankTellerStamp()}
                          className="p-3 rounded-2xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-left font-mono text-xs text-rose-300 flex items-center justify-between cursor-pointer"
                        >
                          <span>💮 Bank Teller Rubber Stamp</span>
                          <Volume2 className="w-4 h-4 shrink-0" />
                        </button>

                        <button
                          onClick={() => soundEngine.playPosBeep(true)}
                          className="p-3 rounded-2xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-left font-mono text-xs text-stone-200 flex items-center justify-between cursor-pointer"
                        >
                          <span>💳 POS Terminal Approval</span>
                          <Volume2 className="w-4 h-4 shrink-0" />
                        </button>

                        <button
                          onClick={() => soundEngine.playHorn(false)}
                          className="p-3 rounded-2xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-left font-mono text-xs text-amber-400 flex items-center justify-between cursor-pointer"
                        >
                          <span>📯 Danfo Air Horn</span>
                          <Volume2 className="w-4 h-4 shrink-0" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right 6 Cols: Driver Profile, PWA Install & Save Management */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4">
                    <h2 className="text-lg font-black font-['Bungee'] text-amber-400">
                      DRIVER PROFILE &amp; APP SETTINGS
                    </h2>

                    {/* Driver Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-stone-400 block">Driver Callsign / Name:</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={driverNameInput}
                          onChange={(e) => setDriverNameInput(e.target.value)}
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                        />
                        <button
                          onClick={() => {
                            if (driverNameInput.trim()) {
                              updateSave({ playerName: driverNameInput.trim() });
                              soundEngine.playCoin();
                            }
                          }}
                          className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-black text-xs cursor-pointer"
                        >
                          Save Name
                        </button>
                      </div>
                    </div>

                    {/* Install App (Android / iOS) */}
                    <div className="pt-2 border-t border-stone-800 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-white">Install Danfo Express Web App</div>
                        <div className="text-[11px] text-stone-400">
                          Full-screen offline support for Android &amp; iPhone (Share ➔ Add to Home Screen)
                        </div>
                      </div>
                      <button
                        onClick={() => setShowPwaModal(true)}
                        className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-black text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Install App</span>
                      </button>
                    </div>

                    {/* Reset Save Data */}
                    <div className="pt-2 border-t border-stone-800 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-rose-400">Reset Career Save Data</div>
                        <div className="text-[11px] text-stone-400">
                          Resets Wallet to ₦25,000 and Bank Account to ₦250,000
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          wipeSave();
                          window.location.reload();
                        }}
                        className="px-3.5 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Reset Save</span>
                      </button>
                    </div>
                  </div>
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
            onOpenPosOrBank={openPosOrBank}
            actionFeed={actionFeed}
            addFeedMessage={addFeedMessage}
          />
        )}

        {/* SHIFT RESULTS VIEW */}
        {gameState.screen === 'SHIFT_RESULTS' && gameState.lastShiftResult && (
          <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
            <div className="w-full bg-stone-900 border-2 border-amber-400/70 rounded-3xl p-6 shadow-2xl space-y-6">
              <div className="text-center space-y-1">
                <div className="text-amber-400 text-xs font-mono font-bold uppercase">
                  Oshodi — CMS Route Audit
                </div>
                <h2 className="text-2xl md:text-3xl font-black font-['Bungee'] text-white">
                  {gameState.lastShiftResult.terminalReached ? 'ROUTE COMPLETED!' : 'SHIFT ENDED'}
                </h2>
                <p className="text-xs text-stone-400">{gameState.lastShiftResult.shiftTitle} summary:</p>
              </div>

              <div className="space-y-3 bg-stone-950 p-4 rounded-2xl border border-stone-800 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Passenger Fares &amp; Terminal Bonus</span>
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
                  <span className="text-stone-400">Wear &amp; Tear</span>
                  <span className="font-mono font-bold tabular-nums">
                    -₦{gameState.lastShiftResult.fuelAndRepairsCost.toLocaleString()}
                  </span>
                </div>

                <div className="h-px bg-stone-800 my-2" />

                <div className="flex justify-between items-center text-base font-bold">
                  <span className="text-white">Net Cash Added to Wallet</span>
                  <span className="font-mono text-emerald-400 tabular-nums text-lg">
                    ₦{gameState.lastShiftResult.netProfit.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <div className="text-[10px] text-stone-400 uppercase">Wallet Cash</div>
                  <div className="text-base font-mono font-bold text-emerald-400 tabular-nums">
                    ₦{walletNaira.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <div className="text-[10px] text-stone-400 uppercase">Bank Balance</div>
                  <div className="text-base font-mono font-bold text-sky-400 tabular-nums">
                    ₦{bankBalanceNaira.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <div className="text-[10px] text-stone-400 uppercase">Street Cred</div>
                  <div className="text-base font-mono font-bold text-amber-400 tabular-nums">
                    +{gameState.lastShiftResult.streetCredEarned}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => openPosOrBank('POS_KIOSK')}
                  className="flex-1 py-3 bg-sky-500 hover:bg-sky-400 text-stone-950 font-black font-mono rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>POS / BANK DEPOSIT</span>
                </button>
                <button
                  onClick={() => setGameState((prev) => ({ ...prev, screen: 'MENU' }))}
                  className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Main Menu</span>
                </button>
                <button
                  onClick={() => handleStartShift(false)}
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

      {/* NIGERIAN BANK HALL (QUEUE + TELLER >₦100K) & ROADSIDE POS (MAX ₦100K) MODAL */}
      <NigerianBankAndPosModal
        isOpen={isBankModalOpen}
        initialMode={bankModalMode}
        onClose={() => setIsBankModalOpen(false)}
        walletNaira={walletNaira}
        bankBalanceNaira={bankBalanceNaira}
        playerName={saveData.playerName || 'Captain'}
        onUpdateBalances={handleUpdateWalletAndBank}
      />

      {/* DRIVER SMARTPHONE MODAL */}
      <PhoneModal
        isOpen={isPhoneOpen}
        onClose={() => setIsPhoneOpen(false)}
        gameState={gameState}
        setGameState={setGameState}
        addFeedMessage={addFeedMessage}
        onOpenPosOrBank={openPosOrBank}
        onStartShift={() => {
          setIsPhoneOpen(false);
          handleStartShift(false);
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
            setDriverNameInput(name);
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
          if (loc.type === 'MARKET') {
            setIsKoloOpen(true);
          } else if (loc.type === 'GARAGE') {
            setMainMenuTab('SINGLE_PLAYER');
            setSinglePlayerSubView('GARAGE');
          }
          addFeedMessage(`📍 Selected ${loc.name}`);
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
