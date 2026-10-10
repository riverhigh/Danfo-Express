import React, { useState, useEffect, useCallback } from 'react';
import { useGameSave } from './hooks/useGameSave';
import { 
  GameState, 
  ScreenState, 
  ShiftTimeOfDay, 
  Passenger, 
  CabinEvent, 
  ShiftResultData,
  BusModelId,
  MissionGoal,
  BusUpgrades
} from './types/game';
import { 
  BUS_PRESETS, 
  SHIFT_CONFIGS, 
  DESTINATIONS, 
  PASSENGER_NAMES, 
  SLOGANS, 
  UPGRADE_CATALOG,
  MISSIONS_CATALOG,
  DEFAULT_JUNCTIONS,
  CONDUCTOR_ROSTER,
  DEFAULT_HOUSE,
  DEFAULT_INVENTORY,
  DEFAULT_MESSAGES,
  DEFAULT_GAS_STATIONS,
  DEFAULT_ROADSIDE_SHOPS
} from './game/config';
import { soundEngine } from './audio/soundEngine';
import { ThreeDrivingSimulator } from './components/ThreeDrivingSimulator';
import { MissionSelector } from './components/MissionSelector';
import { PhoneModal } from './components/PhoneModal';
import { InventoryModal } from './components/InventoryModal';
import { MainMap, MapLocation } from './components/MainMap';
import { Dealership, VEHICLES } from './components/Dealership';
import { CharacterCreation } from './components/CharacterCreation';
import { NeedsPanel } from './components/NeedsPanel';
import { AjoApp, KoloSystem } from './components/SavingsSystems';
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
  UserCheck,
  UserPlus,
  Smartphone,
  Package,
  Home
} from 'lucide-react';

export default function App() {
  // Global persistent player stats
    const { saveData, updateSave } = useGameSave();
  const walletNaira = saveData.walletNaira;
  const streetCred = saveData.streetCred;
  const selectedBusId = saveData.selectedBusId;
  const selectedSlogan = saveData.selectedSlogan;
  const setWalletNaira = (val: number | ((prev: number) => number)) => updateSave({ walletNaira: typeof val === 'function' ? val(walletNaira) : val });
  const setStreetCred = (val: number | ((prev: number) => number)) => updateSave({ streetCred: typeof val === 'function' ? val(streetCred) : val });
  const setSelectedBusId = (val: BusModelId) => updateSave({ selectedBusId: val });
  const setSelectedSlogan = (val: string) => updateSave({ selectedSlogan: val });
  const [selectedShiftId, setSelectedShiftId] = useState<ShiftTimeOfDay>('MORNING_RUSH');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [menuTab, setMenuTab] = useState<'CAREER_SHIFT' | 'GARAGE_WORKSHOP' | 'HOUSING'>('CAREER_SHIFT');
  const [selectedMissionId, setSelectedMissionId] = useState<string>(MISSIONS_CATALOG[0].id);
  const [isConductorModalOpen, setIsConductorModalOpen] = useState<boolean>(false);
  const [isPhoneOpen, setIsPhoneOpen] = useState<boolean>(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState<boolean>(false);
  const [isMapOpen, setIsMapOpen] = useState<boolean>(false);
  const [isDealershipOpen, setIsDealershipOpen] = useState<boolean>(false);
  const [isKoloOpen, setIsKoloOpen] = useState<boolean>(false);
  const [isAjoOpen, setIsAjoOpen] = useState<boolean>(false);
  const [showCharacterCreation, setShowCharacterCreation] = useState<boolean>(!saveData.playerName || saveData.playerName === 'Driver');
  const [gameTime, setGameTime] = useState(new Date('2026-10-09T08:00:00'));


  // Active driving feed
  const [actionFeed, setActionFeed] = useState<string[]>([
    'Welcome to 3D Danfo Simulator. Controls ready in landscape view.',
  ]);

  const addFeedMessage = useCallback((msg: string) => {
    setActionFeed((prev) => [msg, ...prev.slice(0, 4)]);
  }, []);

  // Core Game State
  const [gameState, setGameState] = useState<GameState>(() => {
    const shift = SHIFT_CONFIGS.MORNING_RUSH;
    const bus = JSON.parse(JSON.stringify(BUS_PRESETS.RUSTIC_VAN));
    bus.slogan = saveData.selectedSlogan || 'No King as God';
      bus.id = saveData.selectedBusId || 'RUSTIC_VAN';
    const junctions = JSON.parse(JSON.stringify(DEFAULT_JUNCTIONS));

    setGameTime(d => new Date(d.getTime() + 15 * 60000)); // 15 mins per tick
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
        collectedCash: 1200,
      },
      walletNaira: saveData.walletNaira,
      bankBalanceNaira: saveData.bankBalanceNaira,
      streetCred: saveData.streetCred,
      needs: saveData.needs || { hunger: 100, energy: 100, fun: 100, social: 100, hygiene: 100, bladder: 100 },
      hustleMeter: 40,
      comboMultiplier: 1,
      comboStreak: 0,
      distanceTraveledMeters: 0,
      targetDistanceMeters: 3000,
      junctions: junctions,
      activeJunctionIndex: 0,
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

  // Start 3D Mission
  const handleStartMission = (mission: MissionGoal) => {
    const baseBus = BUS_PRESETS[selectedBusId] || BUS_PRESETS['RUSTIC_VAN'];
    const bus: typeof baseBus = JSON.parse(JSON.stringify(baseBus));
    bus.slogan = selectedSlogan;
    bus.upgrades = { ...gameState.bus.upgrades };
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
        passengerMultiplier: 1.5,
        unionLevy: 2000,
      },
      shiftTimeRemaining: mission.timeLimitSec,
      shiftClockDisplay: '07:30 AM',
      bus: bus,
      distanceTraveledMeters: 0,
      targetDistanceMeters: mission.targetDistanceMeters,
      junctions: junctions,
      activeJunctionIndex: 0,
      activeCabinEvent: null,
      lastShiftResult: null,
    }));

    addFeedMessage(`3D MISSION STARTED: ${mission.title}! Maintain comfort, pick commuters at bus stops.`);
    soundEngine.playHorn(bus.upgrades.musicalHorn);
  };

  // Start General Career Shift
  const handleStartShift = () => {
    const shift = SHIFT_CONFIGS[selectedShiftId];
    const baseBus = BUS_PRESETS[selectedBusId] || BUS_PRESETS['RUSTIC_VAN'];
    const bus: typeof baseBus = JSON.parse(JSON.stringify(baseBus));
    bus.slogan = selectedSlogan;
    bus.upgrades = { ...gameState.bus.upgrades };
    const junctions = JSON.parse(JSON.stringify(DEFAULT_JUNCTIONS));

    setGameState((prev) => ({
      ...prev,
      screen: 'SHIFT_ACTIVE',
      activeShift: shift,
      shiftTimeRemaining: shift.durationSeconds,
      shiftClockDisplay: shift.startTime,
      bus: bus,
      distanceTraveledMeters: 0,
      targetDistanceMeters: 15000,
      junctions: junctions,
      activeJunctionIndex: 0,
      activeCabinEvent: null,
      lastShiftResult: null,
    }));

    addFeedMessage(`SHIFT LAUNCH: ${shift.title}! Drive with steering wheel, fuel up at gas stations.`);
    soundEngine.playHorn(bus.upgrades.musicalHorn);
  };

  // Finish Shift / Mission
  const handleFinishShift = useCallback((terminalReached: boolean = true) => {
    soundEngine.stopEngine();

    setGameState((prev) => {
      const grossFares = prev.conductor.collectedCash + (terminalReached ? 8000 : 2000);
      const unionLevy = prev.activeShift.unionLevy;
      const repairCost = Math.floor((100 - prev.bus.durability) * 50);
      const netProfit = Math.max(0, grossFares - unionLevy - repairCost);
      const earnedCred = Math.floor(netProfit / 100) + (terminalReached ? 60 : 20);

      const result: ShiftResultData = {
        shiftId: prev.activeShift.id,
        shiftTitle: prev.activeShift.title,
        totalFaresCollected: grossFares,
        passengersDelivered: 12,
        passengersLost: 0,
        unionLevyPaid: unionLevy,
        fuelAndRepairsCost: repairCost,
        bribesSettled: 500,
        netProfit: netProfit,
        maxCombo: Math.max(prev.comboMultiplier, 3),
        hustleScore: Math.floor(prev.hustleMeter * 30 + prev.distanceTraveledMeters / 10),
        streetCredEarned: earnedCred,
        terminalReached: terminalReached,
      };

      return {
        ...prev,
        walletNaira: prev.walletNaira + netProfit,
        streetCred: prev.streetCred + earnedCred,
        screen: 'SHIFT_RESULTS',
        lastShiftResult: result,
        totalShiftsCompleted: prev.totalShiftsCompleted + 1,
      };
    });

    setWalletNaira((w: number) => w + 8000);
  }, []);

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
      addFeedMessage('🚗 SOLO DRIVER MODE: No conductor. Step down or use manual door lever at bus stops!');
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

  const handleConductorAction = useCallback((action: 'CALLING' | 'COLLECTING' | 'SLAPPING_VAN' | 'SETTLING' | 'GIVE_CHANGE') => {
    if (action === 'CALLING') {
      soundEngine.playDoorSlap();
      addFeedMessage('Conductor: "OSHODI / CMS DIRECT! ENTER WITH YOUR ₦500 CHANGE!"');
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
  }, [addFeedMessage]);

  const unreadCount = gameState.messages?.filter((m) => m.unread).length || 0;

  // Drain Needs globally every 5 seconds
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
          }
        };
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [gameState.screen]);

  return (
    <div className="w-screen h-screen bg-stone-950 text-stone-100 flex flex-col overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* HEADER NAV / STATUS BAR */}
      <header className={`h-12 border-b px-4 flex items-center justify-between z-50 shrink-0 transition-colors ${gameState.screen === 'SHIFT_ACTIVE' ? 'hidden' : 'bg-stone-900/90 border-stone-800'}`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center font-black font-['Bungee'] text-stone-950 text-base shadow-md">
              D
            </div>
            <div>
              <h1 className="font-black text-sm tracking-wide text-amber-400 font-['Bungee'] leading-none">
                DANFO EXPRESS
              </h1>
              <div className="text-[10px] font-mono font-bold text-amber-200 mt-0.5 bg-stone-900/50 px-1.5 py-0.5 rounded border border-stone-700 w-max">
                {gameTime.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })} • {gameTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </div>
              <span className="text-[9px] font-mono font-bold text-stone-400 tracking-wider">
                LAGOS 3D SIMULATOR
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 ml-4 px-2 py-0.5 rounded-full bg-stone-800/80 border border-stone-700/60 text-xs font-mono font-bold text-stone-300">
            <span>BUS:</span>
            <span className="text-amber-400 font-semibold">{(BUS_PRESETS[selectedBusId] || BUS_PRESETS['RUSTIC_VAN']).name}</span>
          </div>
        </div>

        {/* Global Wallet, Cred, Phone, Inventory & Sound */}
        <div className="flex items-center gap-2 sm:gap-3 font-mono">
          <button
            onClick={() => setIsPhoneOpen(true)}
            className="relative px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/50 hover:bg-indigo-900 text-xs font-bold text-indigo-300 flex items-center gap-1.5 transition-colors shadow"
            title="Open Driver Smartphone"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PHONE</span>
            {unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsInventoryOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-bold text-amber-300 flex items-center gap-1.5 transition-colors shadow"
            title="Open Driver Inventory"
          >
            <Package className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">INVENTORY</span>
          </button>

          <button
            onClick={() => setIsMapOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-bold text-sky-300 flex items-center gap-1.5 transition-colors shadow"
            title="Open Lagos City Map"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">MAP</span>
          </button>

          <div className="flex items-center gap-1.5 bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800 text-xs font-bold text-emerald-400">
            <span>₦</span>
            <span className="tabular-nums">{walletNaira.toLocaleString()}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800 text-xs font-bold text-amber-400">
            <Award className="w-3.5 h-3.5" />
            <span className="tabular-nums">{streetCred} XP</span>
          </div>

          <button
            onClick={toggleAudio}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
            title="Toggle Engine & Street Audio"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className={`relative overflow-hidden flex flex-col ${gameState.screen === 'SHIFT_ACTIVE' ? 'absolute inset-0 w-full h-full' : 'flex-1'}`}>
        {gameState.screen === 'MENU' && (<div className="absolute right-4 top-4 z-40 hidden lg:block"><NeedsPanel needs={gameState.needs} /></div>)}
        {/* MENU STATE */}
        {gameState.screen === 'MENU' && (
          <div className="flex-1 overflow-y-auto px-4 py-6 max-w-5xl mx-auto w-full space-y-6">
            {/* Top Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setMenuTab('CAREER_SHIFT')}
                  className={`px-4 py-2 rounded-xl font-bold text-xs font-mono transition-colors flex items-center gap-2 ${
                    menuTab === 'CAREER_SHIFT'
                      ? 'bg-amber-400 text-stone-950 shadow-md font-black'
                      : 'bg-stone-900 text-stone-400 hover:text-white'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>CAREER</span>
                </button>

                <button
                  onClick={() => setMenuTab('GARAGE_WORKSHOP')}
                  className={`px-4 py-2 rounded-xl font-bold text-xs font-mono transition-colors flex items-center gap-2 ${
                    menuTab === 'GARAGE_WORKSHOP'
                      ? 'bg-amber-400 text-stone-950 shadow-md font-black'
                      : 'bg-stone-900 text-stone-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>GARAGE & CONDUCTORS</span>
                </button>

                <button
                  onClick={() => setMenuTab('HOUSING')}
                  className={`px-4 py-2 rounded-xl font-bold text-xs font-mono transition-colors flex items-center gap-2 ${
                    menuTab === 'HOUSING'
                      ? 'bg-amber-400 text-stone-950 shadow-md font-black'
                      : 'bg-stone-900 text-stone-400 hover:text-white'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>FACE-ME-I-FACE-YOU HOME</span>
                </button>
              </div>

              <div className="text-xs font-mono text-stone-400 hidden sm:block">
                Lagos First-Person Cockpit Simulator
              </div>
            </div>

            {/* TAB 1: CAREER RUSH SHIFTS */}
            {menuTab === 'CAREER_SHIFT' && (
              <div className="w-full flex flex-col items-center justify-center space-y-6 py-12 bg-stone-900/50 border border-stone-800 rounded-3xl">
                <div className="text-center space-y-2">
                  <h3 className="text-amber-400 font-bold font-['Bungee'] text-2xl">SAVE SLOT 1/3</h3>
                  <p className="text-stone-300">Level: Lagos Hustler • Balance: ₦{walletNaira.toLocaleString()}</p>
                </div>
                <button
                  onClick={() => handleStartShift()}
                  className="px-10 py-5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black font-['Bungee'] text-xl rounded-2xl shadow-xl shadow-amber-400/20 flex items-center gap-3 transition-transform active:scale-95"
                >
                  <MapPin className="w-6 h-6" />
                  CONTINUE CAREER
                </button>
              </div>
            )}

            {/* TAB 3: GARAGE & CONDUCTOR ROSTER */}
            {menuTab === 'GARAGE_WORKSHOP' && (
              <div className="w-full space-y-6">
                <div className="p-5 bg-stone-900 border border-stone-800 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-base text-amber-400 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-400" />
                        Hire Your Lagos Conductor (Agbero)
                      </div>
                      <p className="text-xs text-stone-400">
                        A conductor manages the passenger sliding door, calls destinations, and collects fares automatically.
                      </p>
                    </div>

                    <div className="font-mono text-xs text-stone-300 bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800">
                      Current: <strong className="text-amber-400">{gameState.conductor.hasConductor ? gameState.conductor.name : 'Solo Driver'}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {CONDUCTOR_ROSTER.map((c) => {
                      const isCurrent = gameState.conductor.hasConductor && gameState.conductor.id === c.id;
                      return (
                        <div
                          key={c.id}
                          className={`p-4 rounded-xl border flex flex-col justify-between ${
                            isCurrent ? 'bg-amber-400/15 border-amber-400 ring-1 ring-amber-400' : 'bg-stone-950 border-stone-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-black text-sm text-amber-400">{c.name}</span>
                              <span className="text-xs font-mono font-bold text-emerald-400">₦{c.dailyFee.toLocaleString()}/day</span>
                            </div>
                            <div className="text-[11px] font-bold text-stone-300 mb-2">"{c.nickname}"</div>
                            <p className="text-xs text-stone-400 mb-3">{c.description}</p>
                          </div>

                          <button
                            onClick={() => handleHireConductor(c.id)}
                            className={`w-full py-2 rounded-lg font-bold text-xs transition-colors ${
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
                                {isOwned ? <span className="text-emerald-400">INSTALLED</span> : `₦${item.costNaira.toLocaleString()}`}
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
                                className={`px-4 py-2 font-bold text-xs rounded-lg ${
                                  canAfford ? 'bg-amber-400 hover:bg-amber-300 text-stone-950 font-black' : 'bg-stone-800 text-stone-500 cursor-not-allowed'
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

            {/* TAB 4: FACE-ME-I-SLAP-YOU HOME */}
            {menuTab === 'HOUSING' && (
              <div className="w-full space-y-6">
                <div className="p-6 bg-stone-900 border border-stone-800 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-black text-amber-400 font-['Bungee']">
                        {gameState.house.title}
                      </h2>
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

                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={() => setIsPhoneOpen(true)}
                      className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black font-mono text-xs rounded-xl shadow-lg flex items-center justify-center gap-2"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>OPEN PHONE TO PAY RENT & NEPA BILLS</span>
                    </button>
                    <button
                      onClick={() => setIsInventoryOpen(true)}
                      className="py-3 px-5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold font-mono text-xs rounded-xl flex items-center justify-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      <span>INVENTORY</span>
                    </button>
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
            actionFeed={actionFeed}
            addFeedMessage={addFeedMessage}
          />
        )}

        {/* SHIFT RESULTS VIEW */}
        {gameState.screen === 'SHIFT_RESULTS' && gameState.lastShiftResult && (
          <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
            <div className="w-full bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="text-center space-y-1">
                <div className="inline-block px-3 py-1 bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-mono font-bold uppercase rounded">
                  Mission Complete & Park Audit
                </div>
                <h2 className="text-2xl md:text-3xl font-black font-['Bungee'] text-white">
                  {gameState.lastShiftResult.terminalReached ? 'CHALLENGE CLEARED!' : 'SHIFT COMPLETED'}
                </h2>
                <p className="text-xs text-stone-400">
                  {gameState.lastShiftResult.shiftTitle} report complete. Earnings banked to driver wallet:
                </p>
              </div>

              <div className="space-y-3 bg-stone-950 p-4 rounded-xl border border-stone-800 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">Mission Reward & Fares</span>
                  <span className="font-mono font-bold text-emerald-400 tabular-nums">
                    +₦{gameState.lastShiftResult.totalFaresCollected.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-rose-400">
                  <span className="text-stone-400">Union Levy</span>
                  <span className="font-mono font-bold tabular-nums">
                    -₦{gameState.lastShiftResult.unionLevyPaid.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-rose-400">
                  <span className="text-stone-400">Suspension & Wear</span>
                  <span className="font-mono font-bold tabular-nums">
                    -₦{gameState.lastShiftResult.fuelAndRepairsCost.toLocaleString()}
                  </span>
                </div>

                <div className="h-px bg-stone-800 my-2" />

                <div className="flex justify-between items-center text-base font-bold">
                  <span className="text-white">Net Deposited into Wallet</span>
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
                  <div className="text-[10px] text-stone-400 uppercase">Status</div>
                  <div className="text-lg font-mono font-bold text-sky-400 tabular-nums">
                    PASS
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setGameState((prev) => ({ ...prev, screen: 'MENU' }))}
                  className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Return to Menu</span>
                </button>
                <button
                  onClick={() => setGameState((prev) => ({ ...prev, screen: 'MENU' }))}
                  className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black font-['Bungee'] rounded-xl text-sm tracking-wider transition-colors flex items-center justify-center gap-2"
                >
                  <span>NEXT MISSION</span>
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
                <h3 className="font-black text-lg text-amber-400 font-['Bungee']">
                  HIRE LAGOS CONDUCTOR
                </h3>
                <p className="text-xs text-stone-400">
                  A conductor automatically manages passenger boarding at each junction!
                </p>
              </div>
              <button
                onClick={() => setIsConductorModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
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
                      className={`ml-3 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 font-mono ${
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
                className="text-xs text-stone-400 hover:text-stone-200 underline font-mono"
              >
                Drive Solo (Operate Door Yourself)
              </button>
              <button
                onClick={() => setIsConductorModalOpen(false)}
                className="px-4 py-1.5 bg-stone-800 text-stone-300 text-xs font-bold rounded-lg hover:bg-stone-700"
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
            addFeedMessage(`🎉 Welcome to Lagos, ${name}! Your hustle begins now!`);
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
          addFeedMessage(`📍 Arrived at ${loc.name}`);
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
          addFeedMessage(`🚗 PURCHASED: ${vehicle.name} added to your garage!`);
        }}
      />

      {/* KOLO POT */}
      {isKoloOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-end justify-center p-3">
          <div className="w-full max-w-md bg-stone-900 border-2 border-amber-500/50 rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
              <h2 className="font-black text-amber-400 font-['Bungee']">🏺 KOLO SAVINGS POT</h2>
              <button onClick={() => setIsKoloOpen(false)} className="p-1.5 bg-stone-800 rounded-lg text-stone-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <KoloSystem
              walletNaira={walletNaira}
              hasKolo={saveData.hasKolo}
              koloBalanceNaira={saveData.koloBalanceNaira}
              onBuyKolo={() => updateSave({ hasKolo: true, walletNaira: walletNaira - 500 })}
              onDeposit={(amount) => updateSave({ koloBalanceNaira: saveData.koloBalanceNaira + amount, walletNaira: walletNaira - amount })}
              onBreakKolo={() => {
                const collected = saveData.koloBalanceNaira;
                updateSave({ hasKolo: false, koloBalanceNaira: 0, walletNaira: walletNaira + collected });
                addFeedMessage(`🔨 KOLO SMASHED! Collected ₦${collected.toLocaleString()}. Buy a new one from the market.`);
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
              <button onClick={() => setIsAjoOpen(false)} className="p-1.5 bg-stone-800 rounded-lg text-stone-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <AjoApp
              walletNaira={walletNaira}
              ajoBalanceNaira={saveData.ajoContributionsNaira}
              onContribute={(amount) => updateSave({ ajoContributionsNaira: saveData.ajoContributionsNaira + amount, walletNaira: walletNaira - amount })}
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
