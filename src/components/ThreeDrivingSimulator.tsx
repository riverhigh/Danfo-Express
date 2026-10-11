import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ThreeDrivingEngine } from '../game/three/ThreeDrivingEngine';
import { StreetNavigationTelemetry } from '../game/three/RoadManager';
import { GameState, CameraViewMode, GearPosition, DoorState, JunctionStop, GasStationBay, RoadsideShop, Passenger, PassengerArchetype, DeliveryJob } from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { MiniMap } from './MiniMap';
import { LAGOS_NPCS, LagosNpc } from '../game/npcData';
import { NpcInteractionModal } from './NpcInteractionModal';
import { PASSENGER_NAMES, SAMPLE_DELIVERY_JOBS } from '../game/config';
import { 
  Fuel, 
  Power, 
  DoorOpen, 
  DoorClosed, 
  Smartphone, 
  Package, 
  Users, 
  MapPin, 
  Footprints, 
  Car, 
  AlertTriangle,
  UserCheck,
  UserPlus,
  Coins,
  Store,
  Gauge,
  Luggage,
  LogOut,
  Radio,
  Sparkles,
  Wrench,
  Home
} from 'lucide-react';

interface ThreeDrivingSimulatorProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  onFinishShift: (terminalReached?: boolean) => void;
  onConductorAction: (action: 'CALLING' | 'COLLECTING' | 'SLAPPING_VAN' | 'SETTLING' | 'GIVE_CHANGE') => void;
  onHireConductor: () => void;
  onOpenPhone: () => void;
  onOpenInventory: () => void;
  onOpenMap?: () => void;
  onGoHome?: () => void;
  onUpdateSave?: (updates: any) => void;
  onOpenPosOrBank?: (mode: 'POS_KIOSK' | 'BANK_HALL') => void;
  actionFeed: string[];
  addFeedMessage: (msg: string) => void;
}

export const ThreeDrivingSimulator: React.FC<ThreeDrivingSimulatorProps> = ({
  gameState,
  setGameState,
  onFinishShift,
  onConductorAction,
  onHireConductor,
  onOpenPhone,
  onOpenInventory,
  onOpenMap,
  onGoHome,
  onUpdateSave,
  onOpenPosOrBank,
  actionFeed,
  addFeedMessage,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ThreeDrivingEngine | null>(null);
  const leftMirrorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightMirrorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const miniMapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lookRef = useRef({ yaw: 0, pitch: 0, isDragging: false, startX: 0, startY: 0, startYaw: 0, startPitch: 0 });
  const wheelDragRef = useRef({ startPointerAngle: 0, startSteeringAngle: 0 });

  // UI Interactive States
  const [gear, setGear] = useState<GearPosition>('D');
  const [isEngineRunning, setIsEngineRunning] = useState<boolean>(true);
  const [doorState, setDoorState] = useState<DoorState>(gameState.bus.doorState || 'CLOSED');
  const [bootState, setBootState] = useState<'OPEN' | 'CLOSED'>('CLOSED');
  const [isSteppedDown, setIsSteppedDown] = useState<boolean>(false);
  const [walkThirdPerson, setWalkThirdPerson] = useState<boolean>(true);
  const walkThirdPersonRef = useRef<boolean>(true);
  const [turnSignal, setTurnSignal] = useState<'OFF' | 'LEFT' | 'RIGHT'>('OFF');
  const [hazardLights, setHazardLights] = useState<boolean>(false);
  const [wipersActive, setWipersActive] = useState<boolean>(false);
  const [gyroEnabled, setGyroEnabled] = useState<boolean>(false);
  const [wheelVisualAngle, setWheelVisualAngle] = useState<number>(0);
  const [isGasPressed, setIsGasPressed] = useState<boolean>(false);
  const [isBrakePressed, setIsBrakePressed] = useState<boolean>(false);
  const [isBoarding, setIsBoarding] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('FIRST_PERSON');
  const cameraModeRef = useRef<CameraViewMode>('FIRST_PERSON');

  // Zuuks Gas Station Continuous Refueling, Shortcut Bypass, & Danfo Core Loop States
  const [isRefueling, setIsRefueling] = useState<boolean>(false);
  const [refuelLitersPumped, setRefuelLitersPumped] = useState<number>(0);
  const [refuelCostNaira, setRefuelCostNaira] = useState<number>(0);
  const refuelStatsRef = useRef<{ liters: number; cost: number }>({ liters: 0, cost: 0 });
  const [isOnShortcut, setIsOnShortcut] = useState<boolean>(false);
  const wasOnShortcutRef = useRef<boolean>(false);
  const [fareBargainMode, setFareBargainMode] = useState<'STANDARD' | 'SURGE_BARGAIN'>('STANDARD');
  const fareBargainModeRef = useRef<'STANDARD' | 'SURGE_BARGAIN'>('STANDARD');
  const [dramaChallenge, setDramaChallenge] = useState<{
    passengerName: string;
    tapsLeft: number;
    changeAmount: number;
  } | null>(null);
  const [conductorShoutText, setConductorShoutText] = useState<string>('');
  const [isBoosting, setIsBoosting] = useState<boolean>(false);
  const boostTimerRef = useRef<number>(0);

  useEffect(() => {
    fareBargainModeRef.current = fareBargainMode;
  }, [fareBargainMode]);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    walkThirdPersonRef.current = walkThirdPerson;
  }, [walkThirdPerson]);

  // NPC Interaction State
  const [activeNpc, setActiveNpc] = useState<LagosNpc | null>(null);
  const [cashToast, setCashToast] = useState<{ amount: number; text: string; id: number } | null>(null);

  const triggerCashToast = (amount: number, text: string) => {
    setCashToast({ amount, text, id: Date.now() });
    setTimeout(() => {
      setCashToast(null);
    }, 2800);
  };

  // Gas Station, Mechanic Drive-In Compound & Roadside Shop Drive-In States
  const [activeGasStation, setActiveGasStation] = useState<GasStationBay | null>(null);
  const [activeMechanicCompound, setActiveMechanicCompound] = useState<{
    id: string;
    name: string;
    specialty: string;
    compoundZ: number;
  } | null>(null);
  const [activeShop, setActiveShop] = useState<RoadsideShop | null>(null);
  const [walkJoyVisual, setWalkJoyVisual] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const walkJoyRef = useRef<{ x: number; y: number; isDragging: boolean; startX: number; startY: number }>({
    x: 0,
    y: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
  });
  const activeGasStationRef = useRef<GasStationBay | null>(null);
  const activeMechanicCompoundRef = useRef<{
    id: string;
    name: string;
    specialty: string;
    compoundZ: number;
  } | null>(null);
  const [activeBrtStation, setActiveBrtStation] = useState<{
    id: string;
    name: string;
    subtitle: string;
    stationZ: number;
    activeBusCount: number;
  } | null>(null);
  const activeBrtStationRef = useRef<{
    id: string;
    name: string;
    subtitle: string;
    stationZ: number;
    activeBusCount: number;
  } | null>(null);
  const activeShopRef = useRef<RoadsideShop | null>(null);

  // HUD Telemetry
  const [hudSpeed, setHudSpeed] = useState<number>(0);
  const [hudRPM, setHudRPM] = useState<number>(800);
  const [hudHeat, setHudHeat] = useState<number>(gameState.bus.heat);
  const [hudFuel, setHudFuel] = useState<number>(gameState.bus.fuelPercent);
  const [hudComfort, setHudComfort] = useState<number>(gameState.bus.comfortMeter);
  const [currentDist, setCurrentDist] = useState<number>(0);
  const [activeJuncIndex, setActiveJuncIndex] = useState<number>(gameState.activeJunctionIndex || 0);
  const [streetTelemetry, setStreetTelemetry] = useState<StreetNavigationTelemetry | null>(null);

  // Start parked inside the Oshodi Danfo Bus Park (-15.5m lateral offset) when beginning a shift
  const initialLaneOffset = (gameState.distanceTraveledMeters || 0) < 10 ? -15.5 : 0;

  // Mutable Simulation & Physics References
  const simRef = useRef({
    speed: 0,
    heat: gameState.bus.heat,
    fuel: gameState.bus.fuelPercent,
    comfort: gameState.bus.comfortMeter,
    laneOffset: initialLaneOffset,
    headingYaw: 0,
    distanceTraveled: gameState.distanceTraveledMeters || 0,
    targetDistance: gameState.targetDistanceMeters,
    steeringAngle: 0,
    doorState: (gameState.bus.doorState || 'CLOSED') as DoorState,
    isSteppedDown: false,
    activeJunctionIndex: gameState.activeJunctionIndex || 0,
    isBoarding: false,
    finished: false,
    busUpgrades: gameState.bus.upgrades,
    busSlogan: gameState.bus.slogan,
  });

  const inputsRef = useRef({
    gas: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    gear: 'D' as GearPosition,
    isEngineRunning: true,
    turnSignal: 'OFF' as 'OFF' | 'LEFT' | 'RIGHT',
    hazardLights: false,
    wipersActive: false,
    gyroEnabled: false,
    isDraggingWheel: false,
  });

  const wheelCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const wheelElementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    simRef.current.busUpgrades = gameState.bus.upgrades;
    simRef.current.busSlogan = gameState.bus.slogan;
    simRef.current.targetDistance = gameState.targetDistanceMeters || 15000;
    simRef.current.distanceTraveled = gameState.distanceTraveledMeters || 0;
    if ((gameState.distanceTraveledMeters || 0) < 10) {
      simRef.current.laneOffset = -15.5;
    }
    simRef.current.finished = false;
  }, [gameState.bus.upgrades, gameState.bus.slogan, gameState.targetDistanceMeters]);

  useEffect(() => {
    inputsRef.current.gear = gear;
    inputsRef.current.isEngineRunning = isEngineRunning;
    inputsRef.current.turnSignal = turnSignal;
    inputsRef.current.hazardLights = hazardLights;
    inputsRef.current.wipersActive = wipersActive;
    inputsRef.current.gyroEnabled = gyroEnabled;
    simRef.current.doorState = doorState;
    simRef.current.isSteppedDown = isSteppedDown;
  }, [gear, isEngineRunning, turnSignal, hazardLights, wipersActive, gyroEnabled, doorState, isSteppedDown]);

  const passengersCountRef = useRef<number>(gameState.bus.passengers?.length || 0);
  const luggageClaimedStopsRef = useRef<Record<string, boolean>>({});
  const gameStateRef = useRef<GameState>(gameState);
  const bootStateRef = useRef<'OPEN' | 'CLOSED'>(bootState);
  const pendingRefuelCostRef = useRef<number>(0);

  useEffect(() => {
    gameStateRef.current = gameState;
    passengersCountRef.current = gameState.bus.passengers?.length || 0;
  }, [gameState]);

  useEffect(() => {
    bootStateRef.current = bootState;
  }, [bootState]);

  // Initialize Three.js Engine on mount & connect live rear-view mirror + orthographic mini-map canvases
  useEffect(() => {
    if (!mountRef.current) return;
    const engine = new ThreeDrivingEngine(mountRef.current, gameState.bus.id);
    engineRef.current = engine;
    engine.setMirrorCanvases(
      leftMirrorCanvasRef.current,
      rightMirrorCanvasRef.current,
      miniMapCanvasRef.current
    );

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [gameState.bus.id]);

  // Keep mirror & mini-map canvases synced if camera mode or step-down state changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setMirrorCanvases(
        leftMirrorCanvasRef.current,
        rightMirrorCanvasRef.current,
        miniMapCanvasRef.current
      );
    }
  }, [cameraMode, isSteppedDown]);

  const toggleEngine = useCallback(() => {
    const nextState = !inputsRef.current.isEngineRunning;
    setIsEngineRunning(nextState);
    inputsRef.current.isEngineRunning = nextState;
    soundEngine.playEngineIgnition(nextState);
    if (nextState) {
      setIsRefueling(false);
      if (gear === 'N' || gear === 'P' || inputsRef.current.gear === 'N' || inputsRef.current.gear === 'P') {
        setGear('D');
        inputsRef.current.gear = 'D';
      }
      addFeedMessage('🔑 ENGINE ON: Diesel engine rumbles to life! Ready to drive.');
    } else {
      simRef.current.speed = 0;
      addFeedMessage('🛑 ENGINE OFF: Ignition cut. Vehicle locked from moving until engine is restarted.');
    }
  }, [gear, addFeedMessage]);

  // AI Conductor Shouting Destinations Out the Door ("Maryland, next stop Idiroko & Anthony, enter!")
  const triggerConductorShout = useCallback(() => {
    const nextStop = gameState.junctions[simRef.current.activeJunctionIndex];
    const isOnOppositeSide = simRef.current.laneOffset > 1.5;
    const stopName = nextStop ? nextStop.name : 'CMS Marina';
    const followingStopName = nextStop
      ? isOnOppositeSide
        ? nextStop.oppositeNextStopName
        : nextStop.nextStopName
      : 'CMS Marina Waterfront';
    const pidginShouts = [
      `📢 "${stopName}! Next stop: ${followingStopName}! Enter with your change o!"`,
      `📢 "${stopName} straight ➔ ${followingStopName}! Smart people enter fast!"`,
      `📢 "Oya ${stopName} dey go ${followingStopName}! Hold your ₦200 change o!"`,
    ];
    const chosen = pidginShouts[Math.floor(Math.random() * pidginShouts.length)];
    setConductorShoutText(chosen);
    soundEngine.playHorn(false);
    addFeedMessage(`🗣️ CONDUCTOR SHOUTING: ${chosen}`);
    // Boost waiting commuters at upcoming stop when conductor shouts!
    setGameState((prev) => {
      const updated = prev.junctions.map((j, idx) =>
        idx === simRef.current.activeJunctionIndex && !j.cleared
          ? { ...j, waitingPassengersCount: Math.min(14, j.waitingPassengersCount + 2) }
          : j
      );
      return { ...prev, junctions: updated };
    });
    setTimeout(() => {
      setConductorShoutText('');
    }, 4200);
  }, [gameState.junctions, addFeedMessage, setGameState]);

  // Overtake / Boost Move with Funny Pidgin Quotes
  const triggerOvertakeBoost = useCallback(() => {
    if (!inputsRef.current.isEngineRunning) {
      addFeedMessage('🔑 Turn ON Engine (E / K) before using Overtake Boost!');
      return;
    }
    if (simRef.current.fuel < 5) {
      addFeedMessage('⛽ Fuel too low for Overtake Boost!');
      return;
    }
    boostTimerRef.current = 3.5;
    setIsBoosting(true);
    soundEngine.playHorn(true);
    const pidginBoostQuotes = [
      '⚡ OVERTAKE BOOST: "Comot for road! Danfo wan fly!" 🚌💨',
      '⚡ OVERTAKE BOOST: "No Condition Is Permanent! Hold your seat o!" 🔥',
      '⚡ OVERTAKE BOOST: "Clear road for Lagos King! Waka fast!" 🚀',
    ];
    addFeedMessage(pidginBoostQuotes[Math.floor(Math.random() * pidginBoostQuotes.length)]);
  }, [addFeedMessage]);

  const toggleDoor = () => {
    const nextDoor: DoorState = doorState === 'CLOSED' ? 'OPEN' : 'CLOSED';
    setDoorState(nextDoor); simRef.current.doorState = nextDoor;
    soundEngine.playDoorSlide(nextDoor === 'OPEN');
    if (nextDoor === 'OPEN') {
      addFeedMessage('🚪 PASSENGER DOOR OPENED: Sliding door rolled back for commuters!');
      if (simRef.current.speed > 15) {
        addFeedMessage('⚠️ WARNING: Close door before driving at high speed!');
      }
    } else {
      addFeedMessage('🚪 PASSENGER DOOR CLOSED: Latched securely! (CH-KLUNK)');
    }
  };

  // Strict camera mode switcher (Works both while Driving and in On-Foot Walk Mode!)
  const cycleCameraMode = useCallback(() => {
    if (simRef.current.isSteppedDown) {
      const nextWalk3P = !walkThirdPersonRef.current;
      walkThirdPersonRef.current = nextWalk3P;
      setWalkThirdPerson(nextWalk3P);
      addFeedMessage(
        nextWalk3P
          ? '📷 WALK CAMERA: 3rd-Person On-Foot View (Driver + Danfo Bus)'
          : '📷 WALK CAMERA: 1st-Person Eye View'
      );
      return;
    }

    const prev = cameraModeRef.current;
    let next: CameraViewMode = 'FIRST_PERSON';
    if (prev === 'FIRST_PERSON') next = 'THIRD_PERSON';
    else if (prev === 'THIRD_PERSON') next = 'TOP_DOWN';
    else if (prev === 'TOP_DOWN') next = 'ORBIT';
    else next = 'FIRST_PERSON';

    cameraModeRef.current = next;
    setCameraMode(next);

    // Reset look yaw/pitch so camera transitions cleanly without carry-over angles
    lookRef.current.yaw = 0;
    lookRef.current.pitch = 0;

    const labels: Record<string, string> = {
      FIRST_PERSON: '🎥 1ST PERSON (DR. DRIVING BUS DASH)',
      THIRD_PERSON: '🚗 3RD PERSON (CHASE CAM)',
      TOP_DOWN: '🦅 TOP-DOWN (BIRD EYE)',
      ORBIT: '🔄 360 FREE ORBIT',
    };
    addFeedMessage(`📷 CAMERA VIEW: ${labels[next] || next}`);
  }, [addFeedMessage]);

  const toggleStepDown = useCallback(() => {
    if (!simRef.current.isSteppedDown && simRef.current.speed > 14) {
      addFeedMessage('⚠️ Slow down before stepping out of the Danfo bus!');
      return;
    }
    const nextStep = !simRef.current.isSteppedDown;
    simRef.current.isSteppedDown = nextStep;
    setIsSteppedDown(nextStep);
    soundEngine.playDoorOpenClose();
    if (nextStep) {
      // Bring bus to a complete parked stop so it stays right beside the player
      simRef.current.speed = 0;
      setHudSpeed(0);
      inputsRef.current.gas = false;
      inputsRef.current.brake = false;
      inputsRef.current.steerLeft = false;
      inputsRef.current.steerRight = false;
      setIsGasPressed(false);
      setIsBrakePressed(false);
      walkJoyRef.current.x = 0;
      walkJoyRef.current.y = 0;
      setWalkJoyVisual({ x: 0, y: 0 });
      walkThirdPersonRef.current = true;
      setWalkThirdPerson(true);

      if (simRef.current.doorState === 'CLOSED') {
        setDoorState('OPEN');
        simRef.current.doorState = 'OPEN';
        soundEngine.playDoorSlide(true);
      }
      // Reset walk look angles so camera frames the 3D Driver Character and yellow Danfo bus directly!
      lookRef.current.yaw = 0;
      lookRef.current.pitch = -0.04;

      const currentDist = simRef.current.distanceTraveled;
      const nearJunction = gameState.junctions.find(
        (j) => Math.abs(j.distanceMarkerMeters - currentDist) <= 18
      );
      const nearGas = (gameState.gasStations || []).find(
        (g) => Math.abs(g.distanceMarkerMeters - currentDist) <= 22
      );
      const nearShop = (gameState.roadsideShops || []).find(
        (s) => Math.abs(s.distanceMarkerMeters - currentDist) <= 22
      );

      if (nearJunction) {
        addFeedMessage(`🚪 STEPPED OUT AT ${nearJunction.name.toUpperCase()}: Commuters waiting at the stop!`);
        const relevantNpc = LAGOS_NPCS.find(n => n.category === 'COMMUTER' || n.category === 'MARKET_WOMAN' || n.category === 'AREA_BOY') || LAGOS_NPCS[0];
        setActiveNpc(relevantNpc);
      } else if (nearGas) {
        addFeedMessage(`🚪 STEPPED OUT AT ${nearGas.name.toUpperCase()}: Fuel attendant ready!`);
        const gasNpc = LAGOS_NPCS.find(n => n.category === 'MECHANIC') || LAGOS_NPCS[2];
        setActiveNpc(gasNpc);
      } else if (nearShop) {
        addFeedMessage(`🚪 STEPPED OUT AT ${nearShop.name.toUpperCase()}: Roadside shop keeper!`);
        const shopNpc = LAGOS_NPCS.find(n => n.category === 'STREET_HAWKER' || n.category === 'MARKET_WOMAN') || LAGOS_NPCS[1];
        setActiveNpc(shopNpc);
      } else {
        setActiveNpc(null);
        addFeedMessage('🚶 ON FOOT: Walking outside your Danfo bus! Use WASD or the Walk Pad to move around.');
      }
    } else {
      // RE-ENTERING DRIVER SEAT: automatically ready to start & drive!
      setActiveNpc(null);
      walkJoyRef.current.x = 0;
      walkJoyRef.current.y = 0;
      setWalkJoyVisual({ x: 0, y: 0 });
      setDoorState('CLOSED');
      simRef.current.doorState = 'CLOSED';
      soundEngine.playDoorSlide(false);
      setIsEngineRunning(true);
      inputsRef.current.isEngineRunning = true;
      setGear('D');
      inputsRef.current.gear = 'D';
      inputsRef.current.gas = false;
      inputsRef.current.brake = false;
      lookRef.current.yaw = 0;
      lookRef.current.pitch = 0;
      addFeedMessage('🚌 BACK IN DRIVER SEAT: Engine running, in D gear, ready to accelerate!');
    }
  }, [gameState.junctions, gameState.gasStations, gameState.roadsideShops, addFeedMessage]);

  // Walk Mode Virtual Analog Joystick Handlers (Uses pad center so tapping arrows OR dragging works!)
  const updateWalkJoystickFromClient = (clientX: number, clientY: number, centerX: number, centerY: number) => {
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRadius = 38;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) {
      walkJoyRef.current.x = 0;
      walkJoyRef.current.y = 0;
      setWalkJoyVisual({ x: 0, y: 0 });
      return;
    }
    const clampedDist = Math.min(maxRadius, Math.max(16, dist));
    const angle = Math.atan2(dy, dx);
    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    walkJoyRef.current.x = clampedX / maxRadius;
    walkJoyRef.current.y = clampedY / maxRadius;
    setWalkJoyVisual({ x: clampedX, y: clampedY });
  };

  const handleWalkJoyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    walkJoyRef.current.isDragging = true;
    walkJoyRef.current.startX = cx;
    walkJoyRef.current.startY = cy;
    updateWalkJoystickFromClient(e.clientX, e.clientY, cx, cy);
  };

  const handleWalkJoyPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!walkJoyRef.current.isDragging) return;
    e.stopPropagation();
    updateWalkJoystickFromClient(e.clientX, e.clientY, walkJoyRef.current.startX, walkJoyRef.current.startY);
  };

  const handleWalkJoyPointerUp = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (e) {
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    }
    walkJoyRef.current.isDragging = false;
    walkJoyRef.current.x = 0;
    walkJoyRef.current.y = 0;
    setWalkJoyVisual({ x: 0, y: 0 });
  };

  // Rear Boot (Luggage Trunk) Door Toggle — Opens outwards!
  const toggleBoot = () => {
    const nextBoot = bootState === 'CLOSED' ? 'OPEN' : 'CLOSED';
    setBootState(nextBoot);
    soundEngine.playBootDoorSound(nextBoot === 'OPEN');
    if (nextBoot === 'OPEN') {
      const currentDist = simRef.current.distanceTraveled;
      const nearJ = gameState.junctions.find((j) => Math.abs(j.distanceMarkerMeters - currentDist) <= 28);
      if (nearJ && !luggageClaimedStopsRef.current[nearJ.uid] && (gameState.bus.passengers?.length || 0) > 0) {
        luggageClaimedStopsRef.current[nearJ.uid] = true;
        const luggageFee = 100;
        soundEngine.playCoin();
        triggerCashToast(luggageFee, `+₦${luggageFee} Market Load Fee!`);
        setGameState((prev) => {
          const nextWallet = prev.walletNaira + luggageFee;
          onUpdateSave?.({ walletNaira: nextWallet });
          return {
            ...prev,
            walletNaira: nextWallet,
            conductor: {
              ...prev.conductor,
              collectedCash: prev.conductor.collectedCash + luggageFee,
            },
          };
        });
        addFeedMessage(`🧳 BOOT SWUNG OUTWARDS: Loaded passenger market bags at ${nearJ.name} (+₦${luggageFee} luggage fee).`);
      } else {
        addFeedMessage('🧳 BOOT OPENED OUTWARDS: Rear trunk lid swung open!');
      }
    } else {
      addFeedMessage('🧳 BOOT CLOSED: Rear trunk lid latched shut securely! (KPA-CHUCK)');
    }
  };

  // Conductor Mode Fares & Change (No free money inflation — checks actual passengers on board!)
  const handleCollectFares = () => {
    const currentPassengers = gameState.bus.passengers || [];
    if (currentPassengers.length === 0) {
      addFeedMessage('🚌 BUS IS EMPTY (0/14): Drive to a bus stop and open the sliding door (O) to load passengers first!');
      return;
    }
    const unpaidPassengers = currentPassengers.filter((p) => !p.paid);
    if (unpaidPassengers.length === 0) {
      addFeedMessage(`✅ ALL FARES PAID: All ${currentPassengers.length}/${gameState.bus.capacity || 14} passengers on board have paid their fares!`);
      return;
    }
    const fareAmt = unpaidPassengers.reduce((sum, p) => sum + p.fare, 0);
    soundEngine.playCoin();
    triggerCashToast(fareAmt, `+₦${fareAmt.toLocaleString()} Fares Collected!`);
    setGameState((prev) => {
      const nextWallet = prev.walletNaira + fareAmt;
      onUpdateSave?.({ walletNaira: nextWallet });
      return {
        ...prev,
        walletNaira: nextWallet,
        bus: {
          ...prev.bus,
          passengers: (prev.bus.passengers || []).map((p) => ({ ...p, paid: true })),
        },
        conductor: {
          ...prev.conductor,
          collectedCash: prev.conductor.collectedCash + fareAmt,
        },
      };
    });
    addFeedMessage(`💵 CONDUCTOR COLLECTED: ₦${fareAmt.toLocaleString()} from ${unpaidPassengers.length} passenger(s)!`);
  };

  const handleGiveChange = () => {
    soundEngine.playCoin();
    addFeedMessage(`🪙 CHANGE BALANCED: "Conductor gave passenger ₦200 crisp change!"`);
  };

  // Gas Station Drive-In Fill Up
  const handleFillGas = (full: boolean = true) => {
    const litersNeeded = full ? Math.round((100 - simRef.current.fuel) * 0.7) : 15;
    const pricePerLiter = activeGasStation?.fuelPricePerLiter || 950;
    const totalCost = litersNeeded * pricePerLiter;

    if (gameState.walletNaira < totalCost) {
      addFeedMessage(`⚠️ Need ₦${totalCost.toLocaleString()} to fill ${litersNeeded}L diesel!`);
      return;
    }

    soundEngine.playCoin();
    soundEngine.playSplash();
    simRef.current.fuel = full ? 100 : Math.min(100, simRef.current.fuel + 35);
    setHudFuel(simRef.current.fuel);

    setGameState((prev) => {
      const nextWallet = prev.walletNaira - totalCost;
      onUpdateSave?.({ walletNaira: nextWallet });
      return {
        ...prev,
        walletNaira: nextWallet,
        bus: {
          ...prev.bus,
          fuelPercent: simRef.current.fuel,
        },
      };
    });

    addFeedMessage(`⛽ PUMP DISPENSED: +${litersNeeded}L diesel filled! Paid ₦${totalCost.toLocaleString()}. Tank is full!`);
    setActiveGasStation(null);
  };

  // Roadside Shop Purchase
  const handleBuyShopItem = (item: { id: string; name: string; price: number; icon: string; description: string; category: any }) => {
    if (gameState.walletNaira < item.price) {
      addFeedMessage(`⚠️ Need ₦${item.price.toLocaleString()} to purchase ${item.name}!`);
      return;
    }
    soundEngine.playCoin();
    setGameState((prev) => {
      const existing = prev.inventory.find((i) => i.id === item.id);
      let updatedInv;
      if (existing) {
        updatedInv = prev.inventory.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        updatedInv = [...prev.inventory, {
          id: item.id,
          name: item.name,
          category: item.category,
          quantity: 1,
          icon: item.icon,
          description: item.description,
          effect: item.category === 'MEAL' ? '+40 Stamina' : item.category === 'GROCERY' ? 'Cook at home' : 'Vehicle part',
        }];
      }
      const nextWallet = prev.walletNaira - item.price;
      onUpdateSave?.({ walletNaira: nextWallet });
      return {
        ...prev,
        walletNaira: nextWallet,
        inventory: updatedInv,
      };
    });
    addFeedMessage(`🛍️ BOUGHT ${item.name}: ₦${item.price.toLocaleString()} paid! Stashed in Inventory.`);
  };

  const handleHorn = useCallback(() => {
    const isMusical = gameState.bus.upgrades.musicalHorn;
    soundEngine.playHorn(isMusical);
    addFeedMessage(isMusical ? '🎶 3-TONE FANFARE: Pon-Pon-Pon!' : '📯 HORN: PON-PON!');
  }, [gameState.bus.upgrades.musicalHorn, addFeedMessage]);

  const toggleHazards = () => {
    const next = !hazardLights;
    setHazardLights(next);
    addFeedMessage(next ? '🚨 HAZARDS ON: Dual blinkers flashing' : 'Hazards off');
  };

  const triggerTurnSignal = (dir: 'LEFT' | 'RIGHT') => {
    setTurnSignal((prev) => (prev === dir ? 'OFF' : dir));
  };

  const toggleWipers = () => {
    const next = !wipersActive;
    setWipersActive(next);
    addFeedMessage(next ? '🌧️ WIPERS ON: Windshield cleared' : 'Wipers off');
  };

  // Gyroscope tilt
  useEffect(() => {
    if (!gyroEnabled || isSteppedDown) return;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null) {
        const clampedGamma = Math.max(-45, Math.min(45, e.gamma));
        const wheelEquivalent = (clampedGamma / 45) * 115;
        simRef.current.steeringAngle = wheelEquivalent;
        setWheelVisualAngle(wheelEquivalent);
      }
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [gyroEnabled, isSteppedDown]);

  const handleWheelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gyroEnabled || isSteppedDown) return;
    inputsRef.current.isDraggingWheel = true;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}

    const el = e.currentTarget as HTMLDivElement;
    if (el) {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      wheelCenterRef.current = { x: cx, y: cy };
      const ptrAngle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
      wheelDragRef.current = {
        startPointerAngle: ptrAngle,
        startSteeringAngle: simRef.current.steeringAngle,
      };
    }
  };

  const handleWheelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!inputsRef.current.isDraggingWheel || gyroEnabled || isSteppedDown) return;
    const dx = e.clientX - wheelCenterRef.current.x;
    const dy = e.clientY - wheelCenterRef.current.y;
    const ptrAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
    let deltaAngle = ptrAngle - wheelDragRef.current.startPointerAngle;
    while (deltaAngle > 180) deltaAngle -= 360;
    while (deltaAngle < -180) deltaAngle += 360;
    const clamped = Math.max(-90, Math.min(90, wheelDragRef.current.startSteeringAngle + deltaAngle));
    simRef.current.steeringAngle = clamped;
    if (wheelElementRef.current) {
      wheelElementRef.current.style.transform = `rotate(${clamped.toFixed(1)}deg)`;
    }
  };

  const handleWheelPointerUp = () => {
    inputsRef.current.isDraggingWheel = false;
  };

  // Keyboard controls (Supports Driving Mode, Zuuks Engine Toggle 'E'/'K', Overtake Boost 'Shift', and Walk Mode 'F')
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Key 'E' toggles Engine when inside a Gas Station Zone or when Engine is OFF; otherwise toggles Walk Mode (or 'F' always toggles Walk Mode)
      if (e.key === 'e' || e.key === 'E') {
        if (activeGasStationRef.current || (!inputsRef.current.isEngineRunning && !simRef.current.isSteppedDown)) {
          toggleEngine();
        } else {
          toggleStepDown();
        }
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        toggleStepDown();
        return;
      }

      // ON-FOOT WALKING KEYBOARD CONTROLS (WASD / Arrow Keys)
      if (simRef.current.isSteppedDown) {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          walkJoyRef.current.y = -1;
          setWalkJoyVisual((v) => ({ ...v, y: -28 }));
        }
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          walkJoyRef.current.y = 1;
          setWalkJoyVisual((v) => ({ ...v, y: 28 }));
        }
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          walkJoyRef.current.x = -1;
          setWalkJoyVisual((v) => ({ ...v, x: -28 }));
        }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          walkJoyRef.current.x = 1;
          setWalkJoyVisual((v) => ({ ...v, x: 28 }));
        }
        if (e.key === 'v' || e.key === 'V') cycleCameraMode();
        if (e.key === 'o' || e.key === 'O') toggleDoor();
        if (e.key === 'b' || e.key === 'B') toggleBoot();
        if (e.key === 'p' || e.key === 'P') onOpenPhone();
        if (e.key === 'i' || e.key === 'I') onOpenInventory();
        return;
      }

      // Toggle / Start Engine Ignition (Key K or X)
      if (e.key === 'k' || e.key === 'K' || e.key === 'x' || e.key === 'X') {
        toggleEngine();
        return;
      }

      // Overtake / Boost Move (Shift Key)
      if (e.key === 'Shift') {
        triggerOvertakeBoost();
        return;
      }

      // ZUUKS ENGINE-OFF LOCKOUT: Prevent moving or auto-starting when pressing gas or shifting gears while Engine is OFF!
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if (!inputsRef.current.isEngineRunning) {
          inputsRef.current.gas = false;
          setIsGasPressed(false);
          addFeedMessage('🔑 ENGINE IS OFF! Press Engine Toggle (E or K) to turn on the engine before driving!');
          return;
        }
        if (inputsRef.current.gear === 'R' && simRef.current.speed < 2) {
          setGear('D');
          inputsRef.current.gear = 'D';
        } else if (inputsRef.current.gear === 'N' || inputsRef.current.gear === 'P') {
          setGear('D');
          inputsRef.current.gear = 'D';
        }
        inputsRef.current.gas = true;
        setIsGasPressed(true);
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        if (!inputsRef.current.isEngineRunning) {
          inputsRef.current.brake = true;
          setIsBrakePressed(true);
          addFeedMessage('🔑 ENGINE IS OFF! Turn on the engine (E or K) before reversing.');
          return;
        }
        if (inputsRef.current.gear === 'D' && simRef.current.speed < 2) {
          setGear('R');
          inputsRef.current.gear = 'R';
          inputsRef.current.gas = true;
          setIsGasPressed(true);
          inputsRef.current.brake = false;
          setIsBrakePressed(false);
        } else if (inputsRef.current.gear === 'R') {
          inputsRef.current.gas = true;
          setIsGasPressed(true);
          inputsRef.current.brake = false;
          setIsBrakePressed(false);
        } else {
          inputsRef.current.brake = true;
          setIsBrakePressed(true);
          soundEngine.playAirBrakeHiss();
        }
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        inputsRef.current.steerLeft = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        inputsRef.current.steerRight = true;
      }
      if (e.key === 'g' || e.key === 'G') {
        if (!inputsRef.current.isEngineRunning) {
          addFeedMessage('🔑 Engine is OFF! Start the engine (E / K) to engage gear and move.');
        }
        setGear((prev) => (prev === 'D' ? 'R' : prev === 'R' ? 'N' : 'D'));
      }
      if (e.key === 'r' || e.key === 'R') {
        setGear('R');
        inputsRef.current.gear = 'R';
        soundEngine.playReverseGearEngaged();
        soundEngine.playReverseBeep();
        addFeedMessage('🔄 REVERSE ENGAGED: Smooth mechanical gear whine active.');
      }
      if (e.key === 'n' || e.key === 'N') {
        setGear('N');
        inputsRef.current.gear = 'N';
      }
      if (e.key === ' ' || e.key === 'h' || e.key === 'H') handleHorn();
      if (e.key === 'o' || e.key === 'O') toggleDoor();
      if (e.key === 'b' || e.key === 'B') toggleBoot();
      if (e.key === 'p' || e.key === 'P') onOpenPhone();
      if (e.key === 'i' || e.key === 'I') onOpenInventory();
      if (e.key === 'q' || e.key === 'Q') {
        triggerConductorShout();
        onConductorAction('CALLING');
      }
      if (e.key === 'c' || e.key === 'C') handleCollectFares();
      if (e.key === 'v' || e.key === 'V') cycleCameraMode();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        inputsRef.current.gas = false;
        setIsGasPressed(false);
        if (walkJoyRef.current.y < 0) {
          walkJoyRef.current.y = 0;
          setWalkJoyVisual((v) => ({ ...v, y: 0 }));
        }
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        inputsRef.current.brake = false;
        setIsBrakePressed(false);
        if (inputsRef.current.gear === 'R') {
          inputsRef.current.gas = false;
          setIsGasPressed(false);
        }
        if (walkJoyRef.current.y > 0) {
          walkJoyRef.current.y = 0;
          setWalkJoyVisual((v) => ({ ...v, y: 0 }));
        }
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        inputsRef.current.steerLeft = false;
        if (walkJoyRef.current.x < 0) {
          walkJoyRef.current.x = 0;
          setWalkJoyVisual((v) => ({ ...v, x: 0 }));
        }
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        inputsRef.current.steerRight = false;
        if (walkJoyRef.current.x > 0) {
          walkJoyRef.current.x = 0;
          setWalkJoyVisual((v) => ({ ...v, x: 0 }));
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleHorn, onConductorAction, onOpenPhone, onOpenInventory, cycleCameraMode, toggleEngine, toggleDoor, toggleBoot, toggleStepDown, handleCollectFares]);

  // Main 60 FPS RequestAnimationFrame Physics Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let telemetryAcc = 0;
    let boardingTimer = 0;
    let waybillTimer = 0;
    let reverseBeepTimer = 0;

    const loop = (currTime: number) => {
      const dt = Math.min((currTime - lastTime) / 1000, 0.1);
      lastTime = currTime;
      telemetryAcc += dt;

      const sim = simRef.current;
      const inp = inputsRef.current;

      // 1. Progressive Damped Steering Wheel Input & Snappy Self-Centering Spring (Zero 60FPS React Re-render Stutter!)
      if (inp.steerLeft) {
        sim.steeringAngle = Math.max(-90, sim.steeringAngle - 310 * dt);
      } else if (inp.steerRight) {
        sim.steeringAngle = Math.min(90, sim.steeringAngle + 310 * dt);
      } else if (!inp.isDraggingWheel && !inp.gyroEnabled) {
        sim.steeringAngle = sim.steeringAngle * Math.pow(0.002, dt);
        if (Math.abs(sim.steeringAngle) < 0.35) sim.steeringAngle = 0;
      }
      // Update Steering Wheel DOM directly at 60 FPS without triggering full React component re-renders
      if (wheelElementRef.current) {
        wheelElementRef.current.style.transform = `rotate(${sim.steeringAngle.toFixed(1)}deg)`;
      }
      const steerFactor = sim.steeringAngle / 90;

      // 2. Acceleration, Overtake Boost & Strict Engine-Off Lockout Physics (Gas & Brake isolated so they never fight!)
      if (boostTimerRef.current > 0) {
        boostTimerRef.current = Math.max(0, boostTimerRef.current - dt);
        if (boostTimerRef.current === 0) {
          setIsBoosting(false);
        }
      }
      const boostAddSpeed = boostTimerRef.current > 0 ? 25 : 0;
      const boostAccelMult = boostTimerRef.current > 0 ? 1.65 : 1.0;

      if (!inp.isEngineRunning || sim.isSteppedDown) {
        // STRICT ZUUKS ENGINE-OFF LOCKOUT: Bus cannot move while Engine is OFF!
        sim.speed = Math.max(0, sim.speed - 45 * dt);
        if (sim.speed < 0.4) sim.speed = 0;
      } else {
        if (inp.brake) {
          // Braking always takes immediate priority without fighting gas
          sim.speed = Math.max(0, sim.speed - 68 * dt);
          if (sim.speed < 0.3) sim.speed = 0;
          sim.comfort = Math.max(20, sim.comfort - 8 * dt);
        } else if (inp.gear === 'D') {
          if (inp.gas || boostTimerRef.current > 0) {
            sim.speed = Math.min(85 + boostAddSpeed, sim.speed + 21 * boostAccelMult * dt);
            sim.heat = Math.min(100, sim.heat + (boostTimerRef.current > 0 ? 5.2 : 3.0) * dt);
            sim.fuel = Math.max(0, sim.fuel - (boostTimerRef.current > 0 ? 0.06 : 0.03) * dt);
          } else {
            sim.speed = Math.max(0, sim.speed - 9 * dt);
          }
        } else if (inp.gear === 'R') {
          if (inp.gas) {
            sim.speed = Math.min(25, sim.speed + 16 * dt);
            sim.fuel = Math.max(0, sim.fuel - 0.04 * dt);
          } else {
            sim.speed = Math.max(0, sim.speed - 18 * dt);
          }
        } else if (inp.gear === 'L') {
          if (inp.gas) {
            sim.speed = Math.min(45, sim.speed + 28 * dt);
            sim.heat = Math.min(100, sim.heat + 5.0 * dt);
          } else {
            sim.speed = Math.max(0, sim.speed - 16 * dt);
          }
        } else if (inp.gear === 'N') {
          sim.speed = Math.max(0, sim.speed - 10 * dt);
        } else if (inp.gear === 'P') {
          sim.speed = 0;
        }
      }

      // Radiator cooling
      const fanMult = sim.busUpgrades.dualRadiatorFan ? 1.6 : 1.0;
      if (sim.speed < 8) {
        if (inp.isEngineRunning) sim.heat = Math.min(100, sim.heat + 1.8 * dt);
      } else {
        sim.heat = Math.max(10, sim.heat - 4.5 * fanMult * dt);
      }

      // Tight, Precise Driving Turning Kinematics + Lateral Velocity Dampening
      if (sim.isSteppedDown) {
        sim.speed = 0;
      } else if (sim.speed > 0.05) {
        const speedMps = (sim.speed * 1000) / 3600;
        const isReversing = inp.gear === 'R';

        if (Math.abs(steerFactor) > 0.015) {
          // Snappy cornering bite proportional to steering input (steer right turns right in forward and guides rear in reverse)
          const targetHeadingYaw = steerFactor * 0.44 * (isReversing ? -0.65 : 1.0);
          sim.headingYaw += (targetHeadingYaw - sim.headingYaw) * Math.min(1.0, 14.5 * dt);
        } else {
          // Centered steering: cancel out lateral heading drift immediately
          sim.headingYaw *= Math.pow(0.0005, dt);
          if (Math.abs(sim.headingYaw) < 0.002) sim.headingYaw = 0;
        }
        sim.headingYaw = Math.max(-0.46, Math.min(0.46, sim.headingYaw));

        if (isReversing) {
          // In reverse: turning wheel right smoothly steers the vehicle to the right (+X) without inversion
          const reverseLatSpeed = steerFactor * 3.6 * Math.min(1.0, sim.speed / 14);
          sim.laneOffset += reverseLatSpeed * dt;
        } else {
          sim.laneOffset += Math.sin(sim.headingYaw) * speedMps * dt;
        }
        const allowedBounds = engineRef.current
          ? engineRef.current.getAllowedRoadBounds(sim.distanceTraveled)
          : { minX: sim.distanceTraveled < 48 ? -26.5 : -8.8, maxX: 8.8 };

        if (sim.laneOffset <= allowedBounds.minX) {
          sim.laneOffset = allowedBounds.minX;
          if (sim.headingYaw < 0) sim.headingYaw = 0;
        } else if (sim.laneOffset >= allowedBounds.maxX) {
          sim.laneOffset = allowedBounds.maxX;
          if (sim.headingYaw > 0) sim.headingYaw = 0;
        }

        // Check if driving on a 90-degree Branching Shortcut Bypass Lane (+35% route progress!)
        const currentlyOnShortcut = engineRef.current ? engineRef.current.isOnShortcutBranch() : false;
        if (currentlyOnShortcut !== wasOnShortcutRef.current) {
          wasOnShortcutRef.current = currentlyOnShortcut;
          setIsOnShortcut(currentlyOnShortcut);
          if (currentlyOnShortcut) {
            soundEngine.playHorn(false);
            addFeedMessage('🛣️ SHORTCUT BYPASS ENTERED: Cutting through side street! (+35% Route Progress & Zero Highway Traffic!)');
          } else {
            soundEngine.playCoin();
            triggerCashToast(350, '+₦350 Shortcut Time-Saver Bonus!');
            addFeedMessage('↩ REJOINED MAIN EXPRESSWAY: +₦350 Shortcut Time-Saver Bonus earned!');
          }
        }

        const shortcutMult = currentlyOnShortcut ? 1.35 : 1.0;
        const forwardDeltaM = Math.cos(sim.headingYaw) * speedMps * shortcutMult * dt;
        if (inp.gear === 'R') {
          sim.distanceTraveled = Math.max(0, sim.distanceTraveled - forwardDeltaM);
        } else {
          sim.distanceTraveled += forwardDeltaM;
        }
      }

      // 3. ZUUKS-STYLE GAS STATION LOGIC (THREE.Box3 Zone Intersection + Velocity === 0 + isEngineOn === false)
      const currentGameState = gameStateRef.current;
      const boxGasZone = engineRef.current ? engineRef.current.getIntersectingGasStationZone() : null;
      const gasBays = currentGameState.gasStations || [];
      const matchedGasBay = boxGasZone
        ? gasBays.find((g) => g.id === boxGasZone.id) || {
            id: boxGasZone.id,
            name: boxGasZone.name,
            brand: boxGasZone.brand,
            distanceMarkerMeters: boxGasZone.stationZ,
            fuelPricePerLiter: 500,
            isInBay: true,
          }
        : gasBays.find(
            (g) =>
              Math.abs(g.distanceMarkerMeters - sim.distanceTraveled) < 19 &&
              Math.abs(sim.laneOffset) > 4.2
          ) || null;

      if (matchedGasBay) {
        if (!activeGasStationRef.current || activeGasStationRef.current.id !== matchedGasBay.id) {
          activeGasStationRef.current = matchedGasBay;
          setActiveGasStation(matchedGasBay);
          refuelStatsRef.current = { liters: 0, cost: 0 };
          pendingRefuelCostRef.current = 0;
          setRefuelLitersPumped(0);
          setRefuelCostNaira(0);
        }

        // ZUUKS INTERSECTION RULE:
        // 1. Bus is inside Gas Station Zone AND velocity is completely 0 (speed < 0.5)
        // 2. Check if isEngineRunning === false
        // 3. Slowly increment state.fuel while deducting state.money at ₦500 per Liter!
        if (sim.speed < 0.5 && !inp.isEngineRunning) {
          setIsRefueling((prev) => (prev ? prev : true));
          if (sim.fuel < 100) {
            const litersDelta = 3.2 * dt; // 3.2 Liters per second smooth pumping
            const costDelta = litersDelta * 500; // ₦500 per Liter
            const fuelPercentDelta = litersDelta * 2.0; // 50L tank = 100%
            sim.fuel = Math.min(100, sim.fuel + fuelPercentDelta);
            refuelStatsRef.current.liters += litersDelta;
            refuelStatsRef.current.cost += costDelta;
            pendingRefuelCostRef.current += costDelta;

            if (Math.random() < 0.12) {
              soundEngine.playCoin();
            }
          }
        } else {
          setIsRefueling((prev) => (prev ? false : prev));
        }
      } else {
        if (activeGasStationRef.current) {
          activeGasStationRef.current = null;
          setActiveGasStation(null);
          setIsRefueling(false);
        }
      }

      // 3B. MECHANIC DRIVE-IN COMPOUND DETECTION (THREE.Box3 Zone Intersection)
      const boxMechZone = engineRef.current ? engineRef.current.getIntersectingMechanicCompoundZone() : null;
      if (boxMechZone) {
        if (!activeMechanicCompoundRef.current || activeMechanicCompoundRef.current.id !== boxMechZone.id) {
          activeMechanicCompoundRef.current = boxMechZone;
          setActiveMechanicCompound(boxMechZone);
          soundEngine.playHorn(false);
          addFeedMessage(`🔧 ENTERED ${boxMechZone.name.toUpperCase()}: Pull onto the blue ramp & stop for repairs or upgrades!`);
        }
      } else if (activeMechanicCompoundRef.current) {
        activeMechanicCompoundRef.current = null;
        setActiveMechanicCompound(null);
      }

      // 3C. OSHODI NPC BRT STATION DETECTION (THREE.Box3 Zone Intersection)
      const boxBrtZone = engineRef.current ? engineRef.current.getIntersectingOshodiBRTStation() : null;
      if (boxBrtZone) {
        if (!activeBrtStationRef.current || activeBrtStationRef.current.id !== boxBrtZone.id) {
          activeBrtStationRef.current = boxBrtZone;
          setActiveBrtStation(boxBrtZone);
          addFeedMessage(`🚌 ${boxBrtZone.name}: ${boxBrtZone.activeBusCount} Blue Long BRT Buses active in terminal bays!`);
        }
      } else if (activeBrtStationRef.current) {
        activeBrtStationRef.current = null;
        setActiveBrtStation(null);
      }

      // 4. Roadside Shop Detection (Pulling up near shop curb)
      const shops = currentGameState.roadsideShops || [];
      const nearShop = shops.find((s) => Math.abs(s.distanceMarkerMeters - sim.distanceTraveled) < 18 && Math.abs(sim.laneOffset) > 2.5);
      if (nearShop && sim.speed < 6) {
        if (!activeShopRef.current) { activeShopRef.current = nearShop; setActiveShop(nearShop); }
      } else if (activeShopRef.current && (!nearShop || sim.speed >= 6)) {
        activeShopRef.current = null;
        setActiveShop(null);
      }

      // Reverse Safety Beep & Mechanical Engine Sound (Clean 1.25s cadence, stops high forward revs)
      if (inp.gear === 'R' && inp.isEngineRunning && !sim.isSteppedDown) {
        reverseBeepTimer += dt;
        if (reverseBeepTimer >= 1.25) {
          reverseBeepTimer = 0;
          soundEngine.playReverseBeep();
        }
      } else {
        reverseBeepTimer = 0;
      }

      // Continuous dynamic engine audio loop: forward revs in D/L, smooth mechanical whine in R, resting idle in N/P
      if (inp.isEngineRunning && !sim.isSteppedDown) {
        soundEngine.updateEngine(sim.speed, inp.gear);
      }

      // NPC honk when player is blocking their lane
      if (Math.random() < 0.0015) {
        const hornMessages = [
          '📢 "Driver move na! You dey block road!" 🚗💨',
          '🚕 "Oga park well! Area boys go vex!" 😤',
          '📯 "PAMPAMPAM! Werey driver!" 🤦',
          '🚌 "Driver! Comot for my lane abeg!" 🙏',
          '😡 "You go pay for this traffic!" 💸',
        ];
        addFeedMessage(hornMessages[Math.floor(Math.random() * hornMessages.length)]);
        soundEngine.playHorn(false);
      }

      // Periodic NPC Waybill Delivery Offer
      waybillTimer += dt;
      if (waybillTimer >= 32 && !currentGameState.activeDelivery && !currentGameState.availableDelivery && sim.distanceTraveled > 100) {
        waybillTimer = 0;
        const downstreamJobs = SAMPLE_DELIVERY_JOBS.filter(
          (j) => j.destinationMarkerMeters > sim.distanceTraveled + 250
        );
        if (downstreamJobs.length > 0) {
          const randomJob = downstreamJobs[Math.floor(Math.random() * downstreamJobs.length)];
          setGameState((prev) => {
            if (prev.activeDelivery || prev.availableDelivery) return prev;
            return {
              ...prev,
              availableDelivery: { ...randomJob, accepted: false, completed: false },
            };
          });
          soundEngine.playHorn(false);
          addFeedMessage(`📦 WAYBILL CALL: ${randomJob.senderName} (${randomJob.senderRole}) needs parcel delivered to ${randomJob.destinationName}! (₦${randomJob.rewardNaira.toLocaleString()})`);
        }
      }

      // 5. Junction Bus Stop Detection, AI Conductor Shouting & 5 Passenger Archetypes Boarding/Alighting
      const juncs = currentGameState.junctions || [];
      const nearJunc = juncs.find((j) => Math.abs(j.distanceMarkerMeters - sim.distanceTraveled) <= 55);

      const upcomingIdx = juncs.findIndex((j) => j.distanceMarkerMeters > sim.distanceTraveled - 16);
      if (upcomingIdx !== -1 && upcomingIdx !== sim.activeJunctionIndex) {
        sim.activeJunctionIndex = upcomingIdx;
      }

      if (nearJunc) {
        const distToJunc = nearJunc.distanceMarkerMeters - sim.distanceTraveled;
        const isAtStop = Math.abs(distToJunc) <= 28 && sim.speed < 16;

        // Check if this stop has an active Waybill Delivery destination!
        if (isAtStop && (sim.doorState === 'OPEN' || bootStateRef.current === 'OPEN') && currentGameState.activeDelivery) {
          const delJob = currentGameState.activeDelivery;
          const isDeliveryMatch =
            delJob.destinationJunctionUid === nearJunc.uid ||
            delJob.destinationName.toLowerCase().includes(nearJunc.name.toLowerCase());
          if (isDeliveryMatch) {
            soundEngine.playCoin();
            soundEngine.playHorn(true);
            triggerCashToast(delJob.rewardNaira, `+₦${delJob.rewardNaira.toLocaleString()} Waybill Delivered!`);
            addFeedMessage(`🎉 WAYBILL DELIVERED: ${delJob.itemName} handed over safely at ${nearJunc.name}! (+₦${delJob.rewardNaira.toLocaleString()} Cash Reward!)`);
            setGameState((prev) => {
              const nextWallet = prev.walletNaira + delJob.rewardNaira;
              const nextCred = prev.streetCred + 30;
              onUpdateSave?.({ walletNaira: nextWallet, streetCred: nextCred });
              return {
                ...prev,
                walletNaira: nextWallet,
                streetCred: nextCred,
                activeDelivery: null,
              };
            });
          }
        }

        // Faster boarding when AI Conductor is hired!
        const boardingInterval = currentGameState.conductor.hasConductor ? 0.38 : 0.58;

        if (isAtStop && sim.doorState === 'OPEN' && !nearJunc.cleared) {
          boardingTimer += dt;
          sim.isBoarding = true;

          if (boardingTimer >= boardingInterval) {
            boardingTimer = 0;

            setTimeout(() => {
              setGameState((prev) => {
                const updatedJuncs = [...prev.junctions];
                const activeJ = updatedJuncs.find((j) => j.uid === nearJunc.uid);
                if (!activeJ || activeJ.cleared) return prev;

                let currentPassengers = [...(prev.bus.passengers || [])];
                let cashCollected = 0;
                let alightedCount = 0;

                // 1. NPC ALIGHTING: Commuters drop off at their destination stop (Base fare already paid on boarding; only fast/smooth tips awarded here!)
                const remainingPassengers: Passenger[] = [];
                for (const p of currentPassengers) {
                  const isDropOffHere =
                    (p.destinationUid && p.destinationUid === activeJ.uid) ||
                    (p.destination && p.destination === activeJ.destinationTag) ||
                    (p.destination && activeJ.name.toLowerCase().includes(p.destination.toLowerCase()));

                  if (isDropOffHere) {
                    alightedCount++;
                    let tipBonus = 0;
                    if (p.archetype === 'CORPORATE' && p.patience >= 55) {
                      tipBonus = 50; // Realistic fast drop tip
                      addFeedMessage(`💼 FAST DROP TIP: Office Worker ${p.name} tipped +₦50 for arriving on time!`);
                    } else if (p.archetype === 'PREACHER' && sim.comfort >= 70) {
                      tipBonus = 100; // Realistic smooth ride bonus
                      addFeedMessage(`🤰 SMOOTH RIDE BONUS: VIP Mama ${p.name} tipped +₦100 for a smooth ride!`);
                    }
                    cashCollected += tipBonus;
                    addFeedMessage(
                      tipBonus > 0
                        ? `🚶 ALIGHTED: ${p.name} dropped at ${activeJ.name}! (+₦${tipBonus} tip)`
                        : `🚶 ALIGHTED: ${p.name} dropped off at ${activeJ.name}.`
                    );
                  } else {
                    remainingPassengers.push(p);
                  }
                }

                if (alightedCount > 0) {
                  soundEngine.playDoorSlide(true);
                }

                // 2. NPC BOARDING: 1 Passenger = 1 Seat (100% Accurate Counter 0/14 -> 14/14) & Realistic Lagos Danfo Fares!
                const busCapacity = prev.bus.capacity || 14;
                const seatsUsed = remainingPassengers.length;
                let remainingWaiting = activeJ.waitingPassengersCount;

                if (seatsUsed < busCapacity && remainingWaiting > 0) {
                  const currIndexInList = updatedJuncs.findIndex((j) => j.uid === activeJ.uid);
                  const downstreamStops = updatedJuncs.slice(currIndexInList + 1);
                  const targetStop = downstreamStops.length > 0
                    ? downstreamStops[Math.floor(Math.random() * Math.min(3, downstreamStops.length))]
                    : updatedJuncs[updatedJuncs.length - 1];

                  const archetypes: PassengerArchetype[] = ['CORPORATE', 'MARKET_WOMAN', 'STUDENT', 'AGBERO_TOUT', 'PREACHER'];
                  const chosenArch = archetypes[Math.floor(Math.random() * archetypes.length)];
                  const randomName = PASSENGER_NAMES[Math.floor(Math.random() * PASSENGER_NAMES.length)];
                  // Standard realistic bus stop fare (₦150 - ₦350), no inflated double-charging
                  const stopBaseFare = activeJ.averageFare || 200;
                  const bargainMult = fareBargainModeRef.current === 'SURGE_BARGAIN' ? 1.2 : 1.0;

                  let fareToCharge = Math.round((stopBaseFare * bargainMult) / 10) * 10;
                  const seatsTaken = 1;
                  let archLabel = 'Commuter';

                  if (chosenArch === 'CORPORATE') {
                    archLabel = '💼 Office Worker';
                    fareToCharge = Math.round((stopBaseFare * 1.1 * bargainMult) / 10) * 10;
                  } else if (chosenArch === 'MARKET_WOMAN') {
                    archLabel = '🧺 Market Woman';
                    fareToCharge = Math.round((stopBaseFare * 1.25 * bargainMult) / 10) * 10;
                  } else if (chosenArch === 'STUDENT') {
                    archLabel = '🎒 Student';
                    fareToCharge = Math.max(100, Math.round((stopBaseFare * 0.75 * bargainMult) / 10) * 10);
                  } else if (chosenArch === 'AGBERO_TOUT') {
                    archLabel = '🗣️ Drama Passenger';
                    fareToCharge = Math.round((stopBaseFare * bargainMult) / 10) * 10;
                    setDramaChallenge({
                      passengerName: randomName,
                      tapsLeft: 3,
                      changeAmount: 50,
                    });
                  } else if (chosenArch === 'PREACHER') {
                    archLabel = '🤰 VIP Mama';
                    fareToCharge = Math.round((stopBaseFare * 1.15 * bargainMult) / 10) * 10;
                  }

                  const newPassenger: Passenger = {
                    id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    name: randomName,
                    archetype: chosenArch,
                    archetypeLabel: archLabel,
                    destination: targetStop.destinationTag,
                    destinationUid: targetStop.uid,
                    fare: fareToCharge,
                    seatsTaken: 1,
                    paid: true,
                    patience: chosenArch === 'CORPORATE' ? 80 : 100,
                    maxPatience: 100,
                    hasBigBill: chosenArch === 'AGBERO_TOUT',
                    changeNeeded: chosenArch === 'AGBERO_TOUT' ? 50 : 0,
                    seatedAt: remainingPassengers.length,
                    satisfaction: 'HAPPY',
                  };

                  remainingPassengers.push(newPassenger);
                  remainingWaiting = Math.max(0, remainingWaiting - 1);
                  cashCollected += fareToCharge;
                  soundEngine.playPassengerBoarding();
                  soundEngine.playCoin();
                  addFeedMessage(
                    `🎟️ [${remainingPassengers.length}/${busCapacity}] ${archLabel} ${newPassenger.name} boarded → ${targetStop.name} (+₦${fareToCharge})`
                  );
                }

                const newSeatsUsed = remainingPassengers.length;
                activeJ.waitingPassengersCount = remainingWaiting;
                const isCleared = remainingWaiting === 0 || newSeatsUsed >= busCapacity;
                activeJ.cleared = isCleared;
                activeJ.stopReached = true;

                const nextWallet = prev.walletNaira + cashCollected;
                const nextCred = prev.streetCred + alightedCount * 4 + (isCleared ? 10 : 0);
                if (cashCollected > 0 || alightedCount > 0) {
                  onUpdateSave?.({ walletNaira: nextWallet, streetCred: nextCred });
                  if (cashCollected > 0) {
                    triggerCashToast(cashCollected, `+₦${cashCollected.toLocaleString()} Fare Paid`);
                  }
                }

                return {
                  ...prev,
                  bus: {
                    ...prev.bus,
                    passengers: remainingPassengers,
                  },
                  conductor: {
                    ...prev.conductor,
                    collectedCash: prev.conductor.collectedCash + cashCollected,
                  },
                  walletNaira: nextWallet,
                  streetCred: nextCred,
                  junctions: updatedJuncs,
                };
              });
            }, 0);
          }
        } else {
          sim.isBoarding = false;
        }
      } else {
        sim.isBoarding = false;
      }

      // Terminal reached
      if (sim.targetDistance && sim.targetDistance > 100 && sim.distanceTraveled >= sim.targetDistance && !sim.finished) {
        sim.finished = true;
        setTimeout(() => {
          onFinishShift(true);
        }, 0);
      }

      // 5. Update 3D Three.js Engine (Only decay look yaw in 3rd-person driving, NEVER in Walk Mode!)
      if (!sim.isSteppedDown && cameraModeRef.current === 'THIRD_PERSON' && !lookRef.current.isDragging) {
        const decay = Math.max(0, 1 - dt * 5.0);
        lookRef.current.yaw *= decay;
        lookRef.current.pitch *= decay;
      }

      if (engineRef.current) {
        try {
          engineRef.current.update(
            {
              speedKmH: sim.speed,
              steeringWheelAngleDeg: sim.steeringAngle,
              laneOffsetMeters: sim.laneOffset,
              headingYaw: sim.headingYaw,
              walkThirdPerson: walkThirdPersonRef.current,
              gear: inp.gear,
              isBraking: inp.brake,
              cameraMode: cameraModeRef.current,
              cameraLookYaw: lookRef.current.yaw,
              cameraLookPitch: lookRef.current.pitch,
              turnSignal: inp.turnSignal,
              hazardLights: inp.hazardLights,
              wipersActive: inp.wipersActive,
              isEngineRunning: inp.isEngineRunning,
              upgrades: sim.busUpgrades,
              slogan: sim.busSlogan,
              roadDistanceTraveled: sim.distanceTraveled,
              fuelPercent: Math.round(sim.fuel),
              throttle: inp.gas ? 1.0 : 0.0,
              doorState: sim.doorState,
              bootState: bootStateRef.current,
              hasConductor: currentGameState.conductor.hasConductor,
              isSteppedDown: sim.isSteppedDown,
              junctions: currentGameState.junctions || [],
              activeJunctionIndex: sim.activeJunctionIndex,
              isBoardingPassengers: sim.isBoarding,
              activeDelivery: currentGameState.activeDelivery,
              walkMoveX: walkJoyRef.current.x,
              walkMoveZ: walkJoyRef.current.y,
              passengerCount: passengersCountRef.current,
            },
            dt
          );

          const phys = engineRef.current.getPhysicsChassis();
          if (phys && !isNaN(phys.position.x) && !isNaN(phys.position.z)) {
            sim.laneOffset = phys.position.x;
            sim.distanceTraveled = Math.max(0, phys.position.z);
          }

          const collisionMsg = engineRef.current.consumeCollisionMessage();
          if (collisionMsg) {
            sim.speed = Math.max(0, sim.speed * 0.72);
            sim.comfort = Math.max(10, sim.comfort - 8);
            addFeedMessage(collisionMsg);
          }
        } catch (err) {
          console.error('3D Engine update error:', err);
        }
      }

      // 6. Decoupled UI Telemetry at 10 Hz
      if (telemetryAcc >= 0.1) {
        telemetryAcc = 0;
        setHudSpeed(Math.round(sim.speed));
        const calcRPM = inp.isEngineRunning ? Math.round(800 + (sim.speed / 85) * 3500) : 0;
        setHudRPM(calcRPM);
        setHudHeat(Math.round(sim.heat));
        setHudFuel(Math.round(sim.fuel));
        setHudComfort(Math.round(sim.comfort));
        setCurrentDist(sim.distanceTraveled);
        setActiveJuncIndex(sim.activeJunctionIndex);
        setIsBoarding(sim.isBoarding);
        setWheelVisualAngle(sim.steeringAngle);
        if (engineRef.current) {
          setStreetTelemetry(engineRef.current.getStreetNavigationTelemetry());
        }
        if (activeGasStationRef.current) {
          setRefuelLitersPumped(Number(refuelStatsRef.current.liters.toFixed(1)));
          setRefuelCostNaira(Math.round(refuelStatsRef.current.cost));
          if (pendingRefuelCostRef.current >= 1) {
            const costToDeduct = Math.round(pendingRefuelCostRef.current);
            pendingRefuelCostRef.current -= costToDeduct;
            setGameState((prev) => {
              const nextWallet = Math.max(0, prev.walletNaira - costToDeduct);
              onUpdateSave?.({ walletNaira: nextWallet });
              return {
                ...prev,
                walletNaira: nextWallet,
                bus: {
                  ...prev.bus,
                  fuelPercent: Math.round(sim.fuel),
                },
              };
            });
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [onFinishShift, setGameState, addFeedMessage]);

  const currentJunction = gameState.junctions[activeJuncIndex];
  const distToJunc = currentJunction ? Math.round(currentJunction.distanceMarkerMeters - currentDist) : 0;
  const isAtCurrentJunction = Math.abs(distToJunc) <= 14;
  const unreadMessagesCount = gameState.messages?.filter((m) => m.unread).length || 0;


  // ── Retractable panel states ──────────────────────────────────────
  const [showTopHUD, setShowTopHUD] = React.useState(true);
  const [isDashHidden, setIsDashHidden] = React.useState(false);
  const [showLeftPanel, setShowLeftPanel] = React.useState(true);
  const [showRightPanel, setShowRightPanel] = React.useState(true);

  return (
    <div className="relative w-[100vw] h-[100vh] bg-stone-950 overflow-hidden select-none pointer-events-none" style={{ position: "relative", width: "100vw", height: "100vh" }}>
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        onPointerDown={(e) => {
          lookRef.current.isDragging = true;
          lookRef.current.startX = e.clientX;
          lookRef.current.startY = e.clientY;
          lookRef.current.startYaw = lookRef.current.yaw;
          lookRef.current.startPitch = lookRef.current.pitch;
        }}
        onPointerMove={(e) => {
          if (!lookRef.current.isDragging) return;
          const dx = e.clientX - lookRef.current.startX;
          const dy = e.clientY - lookRef.current.startY;

          if (isSteppedDown) {
            lookRef.current.yaw = lookRef.current.startYaw - dx * 0.005;
            lookRef.current.pitch = Math.max(-0.6, Math.min(0.6, lookRef.current.startPitch - dy * 0.004));
          } else if (cameraMode === 'FIRST_PERSON') {
            lookRef.current.yaw = Math.max(-0.75, Math.min(0.75, lookRef.current.startYaw + dx * 0.003));
            lookRef.current.pitch = Math.max(-0.35, Math.min(0.25, lookRef.current.startPitch - dy * 0.003));
          } else if (cameraMode === 'THIRD_PERSON') {
            lookRef.current.yaw = Math.max(-1.1, Math.min(1.1, lookRef.current.startYaw + dx * 0.004));
            lookRef.current.pitch = Math.max(-0.35, Math.min(0.35, lookRef.current.startPitch - dy * 0.003));
          } else if (cameraMode === 'ORBIT') {
            lookRef.current.yaw = lookRef.current.startYaw + dx * 0.006;
            lookRef.current.pitch = Math.max(-0.6, Math.min(0.6, lookRef.current.startPitch - dy * 0.005));
          }
        }}
        onPointerUp={() => { lookRef.current.isDragging = false; }}
        onPointerCancel={() => { lookRef.current.isDragging = false; }}
        className="absolute inset-0 w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing touch-none"
      />

      {/* ═══════ CLEAN, UNCLUTTERED TOP BAR ═══════ */}
      <div className={`absolute top-0 left-0 right-0 z-40 pointer-events-auto transition-transform duration-300 ${showTopHUD ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center justify-between h-9 bg-stone-950/92 backdrop-blur-md border-b border-stone-800 shadow-lg px-2.5 gap-2">
          {/* Left: Brand & Route Progress */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-['Bungee'] text-amber-400 tracking-wide hidden sm:inline">DANFO EXPRESS</span>
            <span className="text-[10px] font-mono text-stone-300 tabular-nums">
              {Math.round(currentDist)}m / {gameState.targetDistanceMeters}m
            </span>
          </div>

          {/* Center: Consolidated Essential Telemetry (Speed, Gear, Fuel, Passengers, Finances) */}
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="text-amber-300 font-black tabular-nums">{hudSpeed} KM/H</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-black ${
                gear === 'R'
                  ? 'bg-rose-600 text-white shadow ring-1 ring-rose-300 animate-pulse'
                  : 'bg-stone-800 text-stone-200'
              }`}
            >
              {gear}
            </span>
            {gear === 'R' && (
              <span className="bg-emerald-950/90 border border-emerald-400 text-emerald-300 px-1.5 py-0.5 rounded text-[8px] font-mono font-black shrink-0">
                [✓ Fixed] R-Gear Sound
              </span>
            )}
            <span className="text-stone-700 hidden sm:inline">·</span>
            <span className="text-stone-400 hidden md:inline tabular-nums">⛽{hudFuel}%</span>
            <span className="text-stone-700 hidden sm:inline">·</span>
            <button
              onClick={() => onOpenPosOrBank?.('POS_KIOSK')}
              className="flex items-center gap-1 text-emerald-400 font-black tabular-nums hover:text-emerald-300 cursor-pointer"
              title="Wallet Cash (Click for POS Agent ≤₦100k)"
            >
              <Coins className="w-3 h-3" />
              <span>₦{gameState.walletNaira.toLocaleString()}</span>
            </button>
            <span className="text-stone-700">·</span>
            <button
              onClick={() => onOpenPosOrBank?.('BANK_HALL')}
              className="hidden lg:flex items-center gap-1 text-sky-400 font-black tabular-nums hover:text-sky-300 cursor-pointer"
              title="Bank Balance (Click for Bank Hall >₦100k)"
            >
              <span>🏦 ₦{(gameState.bankBalanceNaira || 0).toLocaleString()}</span>
            </button>
            <span className="text-stone-700 hidden sm:inline">·</span>
            <span className="text-amber-300 font-black tabular-nums">
              👥 {gameState.bus.passengers?.length || 0}/{gameState.bus.capacity || 14}
            </span>
          </div>

          {/* Right: Compact Controls (Dashboard Mode Toggle, Camera, Walk, Engine, Boost, Home, Exit) */}
          <div className="flex items-center gap-1 shrink-0">
            {!isSteppedDown && cameraMode === 'FIRST_PERSON' && (
              <button
                onClick={() => setIsDashHidden((v) => !v)}
                title="Toggle Dashboard Mode (Collapses bottom dash for unobstructed mobile view)"
                className={`px-2 py-1 rounded border font-mono font-black text-[9px] transition-all ${
                  isDashHidden
                    ? 'bg-amber-400 border-amber-200 text-stone-950'
                    : 'bg-stone-900 border-stone-700 text-stone-300 hover:text-white'
                }`}
              >
                {isDashHidden ? '🎛️ DASH' : '👁️ CLEAN'}
              </button>
            )}
            <button
              onClick={cycleCameraMode}
              title="Switch Camera View (Key V)"
              className="px-2 py-1 rounded border border-sky-500/60 bg-sky-950/80 text-sky-300 hover:text-white font-mono font-black text-[9px]"
            >
              {isSteppedDown ? (walkThirdPerson ? '🎥 3RD' : '👁️ 1ST') : cameraMode === 'FIRST_PERSON' ? '🎥 1ST' : cameraMode === 'THIRD_PERSON' ? '🚗 3RD' : '🦅 CAM'}
            </button>
            <button
              onClick={toggleStepDown}
              title="Walk Mode / Step Out (Key E or F)"
              className={`px-2 py-1 rounded border font-mono font-black text-[9px] ${
                isSteppedDown
                  ? 'bg-amber-400 border-amber-200 text-stone-950'
                  : 'bg-stone-900 border-amber-400/60 text-amber-300 hover:text-white'
              }`}
            >
              {isSteppedDown ? '🚌 IN BUS' : '🚶 WALK'}
            </button>
            <button
              onClick={toggleEngine}
              title="Toggle Engine Ignition ON/OFF (Key K)"
              className={`px-2 py-1 rounded border font-mono font-black text-[9px] flex items-center gap-1 transition-all ${
                isEngineRunning
                  ? 'bg-emerald-950/90 border-emerald-500/70 text-emerald-300'
                  : 'bg-rose-600 border-rose-300 text-white animate-pulse'
              }`}
            >
              <Power className="w-3 h-3" />
              <span className="hidden sm:inline">{isEngineRunning ? 'ENG: ON' : 'ENG: OFF'}</span>
            </button>
            <button
              onClick={triggerOvertakeBoost}
              title="Overtake Boost (Shift)"
              className={`px-2 py-1 rounded border font-mono font-black text-[9px] hidden md:inline-block ${
                isBoosting
                  ? 'bg-amber-400 text-stone-950 border-amber-200'
                  : 'bg-stone-900 border-amber-500/60 text-amber-300'
              }`}
            >
              ⚡ BOOST
            </button>
            {onGoHome && (
              <button
                onClick={onGoHome}
                className="px-2 py-1 rounded border border-emerald-400/70 bg-emerald-950/80 hover:bg-emerald-400 hover:text-stone-950 text-emerald-300 font-mono font-black text-[9px] flex items-center gap-1 transition-all"
                title="Go Home (3D Apartment Interior)"
              >
                <Home className="w-3 h-3" />
                <span className="hidden sm:inline">HOME</span>
              </button>
            )}
            <button
              onClick={onOpenPhone}
              className="p-1.5 rounded border border-stone-700 bg-stone-900 text-stone-300 hover:text-white"
              title="Open Driver Phone (P)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onFinishShift(false)}
              className="p-1.5 rounded border border-stone-700 bg-stone-900 text-stone-400 hover:text-rose-400"
              title="End Shift"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      {/* Top toggle tab */}
      <div className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-auto transition-all duration-300" style={{ top: showTopHUD ? 36 : 0 }}>
        <button onClick={() => setShowTopHUD(v => !v)}
          className="w-10 h-4 bg-stone-900/90 border border-stone-700/60 rounded-b-lg flex items-center justify-center text-stone-400 hover:text-white text-[8px]">
          {showTopHUD ? '▲' : '▼'}
        </button>
      </div>

      {/* ═══════ DYNAMIC BANNERS ═══════ */}
      {/* 📦 Active Waybill Delivery HUD Pill */}
      {gameState.activeDelivery && (
        <div className="absolute top-12 left-4 z-40 bg-stone-950/90 border border-emerald-400/60 rounded-xl px-3 py-1.5 shadow-xl flex items-center gap-2.5 pointer-events-auto backdrop-blur-sm">
          <span className="text-base">{gameState.activeDelivery.itemIcon || '📦'}</span>
          <div>
            <div className="text-[8px] font-mono uppercase text-emerald-400 font-black">ACTIVE WAYBILL DISPATCH</div>
            <div className="text-[10px] font-bold text-white leading-tight">
              {gameState.activeDelivery.itemName} ➔ <span className="text-amber-300">{gameState.activeDelivery.destinationName}</span>
            </div>
          </div>
          <div className="text-right pl-2 border-l border-stone-800">
            <div className="text-[10px] font-mono font-black text-emerald-300">₦{gameState.activeDelivery.rewardNaira.toLocaleString()}</div>
            <div className="text-[8px] font-mono text-stone-400">
              {Math.max(0, Math.round(gameState.activeDelivery.destinationMarkerMeters - currentDist))}m away
            </div>
          </div>
        </div>
      )}

      {/* 📦 NPC Waybill Offer Dialog */}
      {gameState.availableDelivery && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-stone-950/95 border-2 border-emerald-400 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2 pointer-events-auto max-w-sm w-[90vw] backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{gameState.availableDelivery.itemIcon || '📦'}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-mono font-black text-emerald-400 uppercase">
                WAYBILL DELIVERY REQUEST • {gameState.availableDelivery.senderRole}
              </div>
              <div className="text-xs font-bold text-white truncate">{gameState.availableDelivery.senderName}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-black text-emerald-400">
                +₦{gameState.availableDelivery.rewardNaira.toLocaleString()}
              </div>
              <div className="text-[8px] font-mono text-stone-400">Cash on Delivery</div>
            </div>
          </div>
          <p className="text-[10px] text-stone-300 leading-snug">
            "{gameState.availableDelivery.description}"
          </p>
          <div className="flex items-center justify-between text-[9px] font-mono text-amber-300 bg-stone-900/80 px-2 py-1 rounded-lg border border-stone-800">
            <span>📍 Destination: <strong>{gameState.availableDelivery.destinationName}</strong></span>
            <span>🎯 {Math.max(0, Math.round(gameState.availableDelivery.destinationMarkerMeters - currentDist))}m down expressway</span>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                const job = gameState.availableDelivery!;
                soundEngine.playCoin();
                setGameState((prev) => ({
                  ...prev,
                  activeDelivery: { ...job, accepted: true },
                  availableDelivery: null,
                }));
                addFeedMessage(`📦 WAYBILL ACCEPTED: Loaded ${job.itemName}! Deliver to ${job.destinationName} for ₦${job.rewardNaira.toLocaleString()}.`);
              }}
              className="flex-1 py-1.5 bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-stone-950 font-black text-[10px] font-['Bungee'] rounded-xl transition-all shadow-md text-center"
            >
              ACCEPT & LOAD (₦{gameState.availableDelivery.rewardNaira.toLocaleString()})
            </button>
            <button
              onClick={() => {
                setGameState((prev) => ({ ...prev, availableDelivery: null }));
                addFeedMessage('Waybill declined.');
              }}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 font-bold text-[10px] rounded-xl transition-all"
            >
              DECLINE
            </button>
          </div>
        </div>
      )}

      {/* ⛽ ZUUKS-STYLE GAS STATION LOGIC & 2D HTML REFUELING SCREEN */}
      {activeGasStation && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-[92vw] max-w-md">
          {hudSpeed > 0 ? (
            <div className="bg-stone-950/95 border-2 border-amber-400 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Fuel className="w-5 h-5 text-amber-400 animate-bounce shrink-0" />
                <div>
                  <div className="text-[10px] font-mono font-black text-amber-400">
                    ⛽ ENTERING {activeGasStation.name.toUpperCase()}
                  </div>
                  <div className="text-[11px] text-stone-200 font-semibold">
                    Brake to a complete stop (0 km/h) beside the pump to refuel!
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-black text-amber-300">{hudSpeed} km/h</span>
            </div>
          ) : isEngineRunning ? (
            /* STEP 1: Stopped inside Gas Station Zone, but Engine is still ON */
            <div className="bg-stone-950/95 border-2 border-rose-500 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Power className="w-6 h-6 text-rose-400 animate-pulse shrink-0" />
                <div>
                  <div className="text-[10px] font-mono font-black text-rose-400">
                    ⛽ ALIGNED AT PUMP • {activeGasStation.name.toUpperCase()}
                  </div>
                  <div className="text-xs text-white font-bold">
                    Turn OFF your engine (Key E or K) to begin refueling!
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono">
                    Zuuks Safety Rule: Pump will not dispense while engine is running.
                  </div>
                </div>
              </div>
              <button
                onClick={toggleEngine}
                className="px-3.5 py-2 bg-rose-500 hover:bg-rose-400 active:scale-95 text-white font-black text-[10px] font-['Bungee'] rounded-xl shadow-lg shrink-0"
              >
                🔑 CUT ENGINE (E)
              </button>
            </div>
          ) : (
            /* STEP 2: Engine is OFF & Velocity is 0 -> 2D HTML ZUUKS REFUELING SCREEN ('Refueling... ₦500 per Liter') */
            <div className="bg-stone-950/98 border-2 border-emerald-400 rounded-2xl p-4 shadow-[0_12px_36px_rgba(0,0,0,0.95)] flex flex-col gap-2.5 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <div className="flex items-center gap-2">
                  <Fuel className="w-5 h-5 text-emerald-400 animate-pulse" />
                  <div>
                    <div className="text-xs font-black font-['Bungee'] text-emerald-400 tracking-wide">
                      {hudFuel >= 100 ? '✅ TANK FULL (100%)' : '⛽ REFUELING... ₦500 PER LITER'}
                    </div>
                    <div className="text-[10px] font-mono text-stone-400">
                      {activeGasStation.name} • Engine OFF • Automatic Pump Active
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-mono font-black text-emerald-300">
                  ₦500 / L
                </span>
              </div>

              {/* Live Digital Pump Readout */}
              <div className="grid grid-cols-3 gap-2 bg-stone-900/90 border border-stone-800 rounded-xl p-2 text-center font-mono">
                <div>
                  <div className="text-[8px] text-stone-400">LITERS PUMPED</div>
                  <div className="text-sm font-black text-white tabular-nums">{refuelLitersPumped.toFixed(1)} L</div>
                </div>
                <div className="border-x border-stone-800">
                  <div className="text-[8px] text-stone-400">TOTAL COST</div>
                  <div className="text-sm font-black text-amber-400 tabular-nums">₦{refuelCostNaira.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[8px] text-stone-400">WALLET BALANCE</div>
                  <div className="text-sm font-black text-emerald-400 tabular-nums">₦{gameState.walletNaira.toLocaleString()}</div>
                </div>
              </div>

              {/* Tank Level Progress Bar */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-mono font-bold">
                  <span className="text-stone-300">DIESEL TANK LEVEL</span>
                  <span className="text-emerald-400 font-black">{hudFuel}%</span>
                </div>
                <div className="w-full h-3 bg-stone-900 rounded-full overflow-hidden border border-stone-700">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-150"
                    style={{ width: `${hudFuel}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[9px] font-mono text-stone-400">
                  Start engine (Key E or K) when ready to depart
                </span>
                <button
                  onClick={toggleEngine}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 font-black text-[10px] font-['Bungee'] rounded-xl shadow-lg flex items-center gap-1.5"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>START ENGINE & DRIVE (E)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 🔧 MECHANIC DRIVE-IN COMPOUND WORKSHOP HUD */}
      {activeMechanicCompound && !activeGasStation && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-[94vw] max-w-md bg-stone-950/95 border-2 border-sky-400 rounded-2xl p-3.5 shadow-[0_14px_40px_rgba(0,0,0,0.95)] backdrop-blur-md flex flex-col gap-2.5">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-sky-400 animate-bounce shrink-0" />
              <div>
                <div className="text-xs font-black font-['Bungee'] text-sky-400 tracking-wide">
                  🔧 {activeMechanicCompound.name}
                </div>
                <div className="text-[10px] font-mono text-stone-400">
                  {activeMechanicCompound.specialty}
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-[9px] font-mono font-black text-sky-300">
              DRIVE-IN BAY
            </span>
          </div>

          {/* Live Vehicle Condition Row */}
          <div className="grid grid-cols-3 gap-2 bg-stone-900/90 border border-stone-800 rounded-xl p-2 text-center font-mono text-[10px]">
            <div>
              <div className="text-[8px] text-stone-400">ENGINE HEAT</div>
              <div className="font-black text-sky-300">{hudHeat}°C</div>
            </div>
            <div className="border-x border-stone-800">
              <div className="text-[8px] text-stone-400">BUS COMFORT</div>
              <div className="font-black text-emerald-400">{hudComfort}%</div>
            </div>
            <div>
              <div className="text-[8px] text-stone-400">WALLET</div>
              <div className="font-black text-amber-400">₦{gameState.walletNaira.toLocaleString()}</div>
            </div>
          </div>

          {/* Instant Overhaul & Drive-In Upgrades */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                if (gameState.walletNaira < 400) {
                  addFeedMessage('⚠️ Need ₦400 for Full Engine & Body Overhaul!');
                  return;
                }
                soundEngine.playCoin();
                simRef.current.heat = 15;
                simRef.current.comfort = 100;
                setHudHeat(15);
                setHudComfort(100);
                setGameState((prev) => {
                  const nextWallet = prev.walletNaira - 400;
                  onUpdateSave?.({ walletNaira: nextWallet });
                  return {
                    ...prev,
                    walletNaira: nextWallet,
                    bus: {
                      ...prev.bus,
                      condition: 100,
                      heat: 15,
                      comfortMeter: 100,
                    },
                  };
                });
                addFeedMessage('🔧 MECHANIC OVERHAUL COMPLETE: Engine cooled to 15°C & suspension restored to 100%!');
              }}
              className="py-2 px-2.5 bg-sky-400 hover:bg-sky-300 active:scale-95 text-stone-950 font-black text-[10px] font-['Bungee'] rounded-xl shadow flex items-center justify-center gap-1"
            >
              <span>🔧 FULL SERVICE (₦400)</span>
            </button>

            <button
              onClick={() => {
                const hasFan = gameState.bus.upgrades.dualRadiatorFan;
                const cost = hasFan ? 0 : 500;
                if (!hasFan && gameState.walletNaira < cost) {
                  addFeedMessage('⚠️ Need ₦500 to install Dual Radiator Fan + Bull-Bar!');
                  return;
                }
                soundEngine.playCoin();
                setGameState((prev) => {
                  const nextWallet = prev.walletNaira - cost;
                  const nextUpgrades = {
                    ...prev.bus.upgrades,
                    dualRadiatorFan: true,
                    heavyBullBar: !prev.bus.upgrades.heavyBullBar,
                  };
                  simRef.current.busUpgrades = nextUpgrades;
                  onUpdateSave?.({ walletNaira: nextWallet, busUpgrades: nextUpgrades });
                  return {
                    ...prev,
                    walletNaira: nextWallet,
                    bus: {
                      ...prev.bus,
                      upgrades: nextUpgrades,
                    },
                  };
                });
                addFeedMessage('🛡️ MECHANIC COMPOUND: Toggled Front Steel Bull-Bar & tuned Dual Radiator Fan!');
              }}
              className="py-2 px-2.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 font-black text-[10px] font-['Bungee'] rounded-xl shadow flex items-center justify-center gap-1"
            >
              <span>🛡️ BULL-BAR / FAN ({gameState.bus.upgrades.dualRadiatorFan ? 'INSTALLED' : '₦500'})</span>
            </button>
          </div>

          {onGoHome && (
            <button
              onClick={onGoHome}
              className="w-full py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-emerald-300 rounded-xl font-mono font-black text-[10px] flex items-center justify-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              <span>🏠 PARK BUS IN COMPOUND & GO HOME (2D ROOM)</span>
            </button>
          )}
        </div>
      )}

      {/* 🚌 OSHODI NPC BRT MEGA TERMINAL HUD BANNER */}
      {activeBrtStation && !activeGasStation && !activeMechanicCompound && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 pointer-events-auto w-[92vw] max-w-md bg-sky-950/95 border-2 border-sky-400 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500/25 border border-sky-400 flex items-center justify-center text-base shrink-0">
                🚌
              </div>
              <div>
                <div className="text-[9px] font-mono font-black text-sky-300 uppercase tracking-widest">
                  LAMATA BUS RAPID TRANSIT • {activeBrtStation.activeBusCount} BLUE LONG BUSES
                </div>
                <div className="text-xs font-black text-white font-['Bungee'] leading-tight">
                  {activeBrtStation.name}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                const cap = gameState.bus.capacity || 14;
                const curr = passengersCountRef.current;
                if (curr >= cap) {
                  addFeedMessage('🚌 FULL LOAD (14/14)! Drive to the next stop to drop passengers!');
                  return;
                }
                const seatsLeft = cap - curr;
                const poachedCount = Math.min(3, seatsLeft);
                const newPax: Passenger[] = Array.from({ length: poachedCount }, (_, idx) => ({
                  id: `brt-poach-${Date.now()}-${idx}`,
                  name: ['Tunde', 'Ngozi', 'Kunle', 'Bisi'][idx % 4],
                  archetype: 'CORPORATE',
                  archetypeLabel: '💼 BRT Commuter',
                  destination: 'CMS Marina Terminal',
                  fare: 300,
                  seatsTaken: 1,
                  paid: true,
                  patience: 90,
                  maxPatience: 100,
                  hasBigBill: false,
                  changeNeeded: 0,
                  seatedAt: curr + idx,
                  satisfaction: 'HAPPY',
                }));
                const totalEarned = poachedCount * 300;
                passengersCountRef.current = curr + poachedCount;
                soundEngine.playHorn(false);
                soundEngine.playCoin();
                triggerCashToast(totalEarned, `+₦${totalEarned.toLocaleString()} BRT Queue Fares!`);
                setGameState((prev) => {
                  const nextWallet = prev.walletNaira + totalEarned;
                  onUpdateSave?.({ walletNaira: nextWallet });
                  return {
                    ...prev,
                    walletNaira: nextWallet,
                    bus: {
                      ...prev.bus,
                      passengers: [...(prev.bus.passengers || []), ...newPax],
                    },
                  };
                });
                addFeedMessage(
                  `📢 "NO QUEUE FOR BRT, ENTER DANFO!" Poached +${poachedCount} commuters from Oshodi BRT Station (${curr + poachedCount}/${cap} seats, +₦${totalEarned})!`
                );
              }}
              className="px-2.5 py-1.5 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-stone-950 font-black text-[9px] font-['Bungee'] rounded-xl shadow shrink-0"
            >
              📢 POACH QUEUE (+3)
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono text-sky-200 bg-sky-900/50 rounded-lg px-2 py-1 border border-sky-700/50">
            <span>🔵 BAYS 01–06: TBS/CMS • ABULE-EGBA • IKORODU</span>
            <span className="text-emerald-300 font-bold">COWRY CARD ACTIVE</span>
          </div>
        </div>
      )}

      {/* 🛣️ ACTIVE SHORTCUT BYPASS BANNER */}
      {isOnShortcut && !activeGasStation && (
        <div className="absolute top-11 left-1/2 -translate-x-1/2 z-40 pointer-events-none bg-emerald-950/90 border-2 border-emerald-400 rounded-full px-3.5 py-1 shadow-xl flex items-center gap-2">
          <span className="text-xs">🛣️</span>
          <span className="text-[10px] font-mono font-black text-emerald-300">
            SHORTCUT BYPASS LANE • 1.35x ROUTE SPEED • ZERO HIGHWAY TRAFFIC
          </span>
        </div>
      )}

      {/* 📢 AI CONDUCTOR SHOUTING BUBBLE ("Oshodi, Oshodi, enter!") */}
      {conductorShoutText && !activeGasStation && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none bg-amber-400 text-stone-950 border-2 border-stone-950 rounded-2xl px-3.5 py-1 shadow-xl font-mono font-black text-[10px] animate-bounce">
          {conductorShoutText}
        </div>
      )}

      {/* 🗣️ DRAMA PASSENGER QUICK-TAP CHANGE-GIVING MINI-GAME */}
      {dramaChallenge && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-50 pointer-events-auto bg-stone-950/95 border-2 border-rose-400 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-3 max-w-sm w-[90vw]">
          <span className="text-xl">🗣️</span>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-mono font-black text-rose-400">
              DRAMA PASSENGER • {dramaChallenge.passengerName.toUpperCase()}
            </div>
            <div className="text-[11px] text-white font-bold">
              "Conductor! Complete my ₦{dramaChallenge.changeAmount} change o!"
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.playCoin();
              if (dramaChallenge.tapsLeft <= 1) {
                setDramaChallenge(null);
                triggerCashToast(50, '+₦50 Change Settled!');
                addFeedMessage(`🪙 CHANGE SETTLED: ${dramaChallenge.passengerName} received ₦50 change (+₦50 bonus)!`);
                setGameState((prev) => {
                  const nextWallet = prev.walletNaira + 50;
                  const nextCred = prev.streetCred + 5;
                  onUpdateSave?.({ walletNaira: nextWallet, streetCred: nextCred });
                  return {
                    ...prev,
                    walletNaira: nextWallet,
                    streetCred: nextCred,
                  };
                });
              } else {
                setDramaChallenge({
                  ...dramaChallenge,
                  tapsLeft: dramaChallenge.tapsLeft - 1,
                });
              }
            }}
            className="px-3 py-1.5 bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-stone-950 font-black text-[10px] font-['Bungee'] rounded-xl shadow shrink-0"
          >
            🪙 TAP CHANGE ({dramaChallenge.tapsLeft})
          </button>
        </div>
      )}

      {/* 🚧 3RD MAINLAND BRIDGE INTERCHANGE LOCKED ROADBLOCK BANNER (Around 760m - 805m) */}
      {Math.abs(currentDist - 778) < 32 && !activeGasStation && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 pointer-events-none bg-emerald-950/95 border-2 border-amber-400 rounded-2xl px-4 py-1.5 shadow-2xl flex items-center gap-2.5 max-w-md w-[92vw]">
          <span className="text-lg">🚧</span>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-mono font-black text-amber-400 uppercase tracking-wider">
              3RD MAINLAND BRIDGE INTERCHANGE (ADENIJl ADELE / OBALENDE)
            </div>
            <div className="text-[10px] text-white font-bold">
              🔒 LOCKED FOR EXPANSION: Roadblock active on right turn-off. Stay on Main Expressway!
            </div>
          </div>
        </div>
      )}

      {activeShop && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-stone-950/95 border-2 border-amber-400 rounded-2xl px-3 py-2 shadow-2xl flex items-center gap-3 pointer-events-auto max-w-xs w-full">
          <Store className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-mono font-black text-amber-400 truncate">{activeShop.name}</div>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {activeShop.items.map((item) => (
                <button key={item.id} onClick={() => handleBuyShopItem(item)} className="px-1.5 py-0.5 bg-stone-900 border border-stone-700 rounded-lg text-[9px] text-white active:scale-95">
                  {item.icon} <span className="text-amber-400">₦{item.price.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🚏 At Bus Stop: Compact Non-Intrusive Streamlined Indicator (Top-Left under top bar, ZERO Windshield Obstruction!) */}
      {(() => {
        const nearJ = gameState.junctions.find((j) => Math.abs(j.distanceMarkerMeters - currentDist) <= 28);
        if (!nearJ || activeGasStation || activeShop || isSteppedDown) return null;

        const dropOffsCount = (gameState.bus.passengers || []).filter(
          (p) =>
            (p.destinationUid && p.destinationUid === nearJ.uid) ||
            (p.destination && p.destination === nearJ.destinationTag) ||
            (p.destination && nearJ.name.toLowerCase().includes(p.destination.toLowerCase()))
        ).length;

        const isDeliveryDropOff =
          gameState.activeDelivery &&
          (gameState.activeDelivery.destinationJunctionUid === nearJ.uid ||
            gameState.activeDelivery.destinationName.toLowerCase().includes(nearJ.name.toLowerCase()));

        const seatsUsedCount = (gameState.bus.passengers || []).length;

        return (
          <div className="absolute top-11 left-3 z-40 bg-stone-950/92 border border-amber-400/80 rounded-xl px-3 py-1.5 shadow-xl flex items-center gap-2.5 pointer-events-auto max-w-sm backdrop-blur-md">
            <MapPin className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-black text-amber-400 truncate">🚏 {nearJ.name}</span>
                <span className="text-[8px] font-mono text-emerald-400 shrink-0">({nearJ.waitingPassengersCount} wait)</span>
              </div>
              <div className="text-[8px] text-stone-300 font-mono truncate">
                Next: {nearJ.nextStopName} {dropOffsCount > 0 ? `· 🎯 ${dropOffsCount} drop` : ''}
              </div>
            </div>
            <button
              onClick={toggleDoor}
              className={`px-2 py-1 font-black text-[8px] font-['Bungee'] rounded-lg transition-transform active:scale-95 shadow shrink-0 ${
                doorState === 'CLOSED'
                  ? 'bg-amber-400 text-stone-950 hover:bg-amber-300'
                  : 'bg-rose-500 text-white'
              }`}
            >
              {doorState === 'CLOSED' ? 'DOOR (O)' : 'CLOSE'}
            </button>
          </div>
        );
      })()}

      {/* On-Foot Interaction Prompt (Only at Bus Stops or Filling Stations) */}
      {isSteppedDown && !activeNpc && (() => {
        const nearJ = gameState.junctions.find((j) => Math.abs(j.distanceMarkerMeters - currentDist) <= 18);
        const nearG = (gameState.gasStations || []).find((g) => Math.abs(g.distanceMarkerMeters - currentDist) <= 22);
        if (nearJ) {
          return (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-stone-950/95 border-2 border-amber-400 rounded-2xl px-4 py-2 shadow-2xl flex items-center gap-3 pointer-events-auto">
              <span className="text-xl">🗣️</span>
              <div>
                <div className="text-[10px] font-mono font-black text-amber-400">BUS STOP: {nearJ.name}</div>
                <div className="text-[11px] text-white font-semibold">Commuters waiting on roadside</div>
              </div>
              <button
                onClick={() => {
                  const relevantNpc = LAGOS_NPCS.find(n => n.category === 'COMMUTER' || n.category === 'MARKET_WOMAN' || n.category === 'AREA_BOY') || LAGOS_NPCS[0];
                  setActiveNpc(relevantNpc);
                }}
                className="px-3 py-1.5 bg-amber-400 text-stone-950 font-black text-xs font-['Bungee'] rounded-xl active:scale-95 shadow-md"
              >
                TALK
              </button>
            </div>
          );
        }
        if (nearG) {
          return (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-stone-950/95 border-2 border-emerald-400 rounded-2xl px-4 py-2 shadow-2xl flex items-center gap-3 pointer-events-auto">
              <span className="text-xl">⛽</span>
              <div>
                <div className="text-[10px] font-mono font-black text-emerald-400">FILLING STATION: {nearG.name}</div>
                <div className="text-[11px] text-white font-semibold">Attendant at fuel pump</div>
              </div>
              <button
                onClick={() => {
                  const gasNpc = LAGOS_NPCS.find(n => n.category === 'MECHANIC') || LAGOS_NPCS[2];
                  setActiveNpc(gasNpc);
                }}
                className="px-3 py-1.5 bg-emerald-400 text-stone-950 font-black text-xs font-['Bungee'] rounded-xl active:scale-95 shadow-md"
              >
                TALK
              </button>
            </div>
          );
        }
        return null;
      })()}

      {/* ═══════ LIVE REAR-VIEW SIDE MIRRORS & TOP-RIGHT ORTHOGRAPHIC SATELLITE MINI-MAP ═══════ */}
      {!isSteppedDown && (
        <>
          {/* LEFT SIDE MIRROR (Accurate Live Rear View - Uncluttered Left Windshield!) */}
          <div className="absolute left-0 top-10 z-30 pointer-events-none flex items-center">
            {cameraMode === 'FIRST_PERSON' && (
              <div className="w-2 sm:w-3 h-5 bg-gradient-to-r from-amber-500 via-stone-800 to-stone-900 border-y border-stone-700" />
            )}
            <div className="relative rounded-r-xl rounded-l-md bg-stone-950 p-0.5 sm:p-1 border-2 border-stone-700 shadow-[0_6px_18px_rgba(0,0,0,0.9)] ring-1 ring-amber-400/70 overflow-hidden">
              <div className="relative w-[82px] h-[46px] sm:w-[116px] sm:h-[64px] rounded-md overflow-hidden bg-stone-900 border border-stone-600/80">
                <canvas
                  ref={leftMirrorCanvasRef}
                  width={220}
                  height={130}
                  className="w-full h-full object-cover block"
                />
                <div className="absolute top-0 bottom-0 left-[22%] w-px border-l border-dashed border-amber-300/35 pointer-events-none" />
                <div className="absolute top-0.5 left-1 px-1 bg-stone-950/75 rounded text-[6px] sm:text-[7px] font-mono font-black text-amber-400">
                  L-MIRROR
                </div>
                {turnSignal === 'LEFT' || hazardLights ? (
                  <div className="absolute bottom-0.5 left-1 text-[8px] font-black text-amber-400 animate-pulse">
                    ◀
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE MIRROR (Positioned cleanly beside the Top-Right Orthographic Mini-Map) */}
          <div className="absolute right-[108px] sm:right-[134px] top-10 z-30 pointer-events-none flex items-center">
            <div className="relative rounded-xl bg-stone-950 p-0.5 sm:p-1 border-2 border-stone-700 shadow-[0_6px_18px_rgba(0,0,0,0.9)] ring-1 ring-amber-400/70 overflow-hidden">
              <div className="relative w-[82px] h-[46px] sm:w-[116px] sm:h-[64px] rounded-md overflow-hidden bg-stone-900 border border-stone-600/80">
                <canvas
                  ref={rightMirrorCanvasRef}
                  width={220}
                  height={130}
                  className="w-full h-full object-cover block"
                />
                <div className="absolute top-0 bottom-0 right-[22%] w-px border-r border-dashed border-amber-300/35 pointer-events-none" />
                <div className="absolute top-0.5 right-1 px-1 bg-stone-950/75 rounded text-[6px] sm:text-[7px] font-mono font-black text-amber-400">
                  R-MIRROR
                </div>
                {turnSignal === 'RIGHT' || hazardLights ? (
                  <div className="absolute bottom-0.5 right-1 text-[8px] font-black text-amber-400 animate-pulse">
                    ▶
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 🗺️ TOP-RIGHT LIVE 3D ORTHOGRAPHIC CAMERA MINI-MAP (With Integrated Street Label) */}
      <div className="absolute top-10 right-2 z-40 pointer-events-auto flex flex-col items-end">
        <div
          onClick={onOpenMap}
          className="relative w-[96px] h-[96px] sm:w-[120px] sm:h-[120px] rounded-xl overflow-hidden bg-stone-950 border-2 border-amber-400 shadow-[0_8px_24px_rgba(0,0,0,0.95)] cursor-pointer group"
          title="Live 3D Satellite Mini-Map (Click for Full Corridor Map)"
        >
          <canvas
            ref={miniMapCanvasRef}
            width={180}
            height={180}
            className="w-full h-full object-cover block"
          />
          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-stone-950/85 border border-stone-700 text-[7px] font-mono font-black text-amber-400 flex items-center gap-1">
            <span>🧭 N</span>
            <span className="text-emerald-400">SAT</span>
          </div>
          <div className="absolute bottom-0 inset-x-0 bg-stone-950/90 px-1.5 py-0.5 flex items-center justify-between text-[7px] font-mono">
            <span className="text-emerald-300 font-bold truncate max-w-[65%]">
              {streetTelemetry?.currentCorridor && streetTelemetry.currentCorridor !== 'MAIN_EXPRESSWAY'
                ? '↪ SIDE ST'
                : '🟢 EXPRESS'}
            </span>
            <span className="text-amber-300 font-bold tabular-nums">{Math.round(currentDist)}m</span>
          </div>
        </div>
      </div>

      {/* ═══════ FULL-WIDTH FIRST-PERSON BUS COCKPIT DASHBOARD (LEFT-0 TO RIGHT-0) ═══════ */}
      {/* Dashboard spans full width so Gear, Brake, and Tall Gas Pedal rest cleanly ON the right side of the dashboard! */}
      {!isSteppedDown && cameraMode === 'FIRST_PERSON' && (
        <>
          {/* Slim Yellow Danfo A-Pillars framing the edges of the wide windshield */}
          {!isDashHidden && (
            <>
              <div className="absolute top-9 bottom-[104px] sm:bottom-[114px] left-0 w-2 sm:w-2.5 bg-gradient-to-r from-amber-500 to-stone-900 border-r border-stone-800 z-20 pointer-events-none" />
              <div className="absolute top-9 bottom-[104px] sm:bottom-[114px] right-0 w-2 sm:w-2.5 bg-gradient-to-l from-amber-500 to-stone-900 border-l border-stone-800 z-20 pointer-events-none" />
            </>
          )}

          {/* Floating "▲ SHOW DASH" Pill at bottom center when Dash is hidden */}
          {isDashHidden && (
            <button
              onClick={() => setIsDashHidden(false)}
              className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto px-3.5 py-1 bg-stone-950/90 hover:bg-stone-900 border-2 border-amber-400/80 rounded-full text-[9px] font-mono font-black text-amber-300 hover:text-white flex items-center gap-1.5 shadow-xl backdrop-blur active:scale-95 transition-all"
              title="Restore Cockpit Dashboard"
            >
              <span>▲ SHOW DASH</span>
            </button>
          )}

          {/* Full-Width Molded Bus Dashboard Console (left-0 right-0 bottom-0) */}
          <div
            className={`absolute left-0 right-0 bottom-0 z-40 select-none transition-all duration-300 ease-in-out h-[104px] sm:h-[114px] ${
              isDashHidden
                ? 'translate-y-[125%] opacity-0 pointer-events-none'
                : 'translate-y-0 opacity-100 pointer-events-auto'
            }`}
          >
            {/* Dash Hide Button on top center of Dash */}
            <button
              onClick={() => setIsDashHidden(true)}
              className="absolute -top-4 left-1/2 -translate-x-1/2 z-50 px-3 h-4 bg-stone-900/95 border border-stone-600 rounded-t-lg text-[8px] font-mono font-bold text-amber-400 hover:text-white flex items-center gap-1 shadow"
              title="Hide Dashboard Completely"
            >
              ▼ HIDE DASH
            </button>

            <div className="relative w-full h-full bg-gradient-to-b from-stone-800/98 via-stone-900 to-stone-950 border-t-[3px] border-stone-600/90 rounded-t-[18px] shadow-[0_-8px_24px_rgba(0,0,0,0.92)] flex items-center justify-between pl-2 sm:pl-4 pr-[184px] sm:pr-[222px] py-1.5 overflow-visible">
              {/* Top Yellow-Black Danfo Trim Accent Line across the full dashboard */}
              <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-amber-400/80 via-stone-500/40 to-amber-400/80 rounded-full pointer-events-none" />

              {/* Subtle Molded Tray Recession on the Right Side of Dashboard where Gear, Brake & Gas Rest */}
              <div className="absolute right-2 sm:right-3 top-1.5 bottom-1.5 w-[172px] sm:w-[206px] rounded-xl bg-stone-950/75 border border-stone-700/70 shadow-inner pointer-events-none" />

              {/* ── LEFT SECTION: QUICK SWITCHES + 3-SPOKE BUS STEERING WHEEL + INTEGRATED GAUGE CLUSTER ── */}
              <div className="relative flex items-center gap-1.5 sm:gap-2.5 h-full shrink-0">
                {/* Compact Quick-Switch Column (Blinkers, Hazards, Door, Camera & Walk) */}
                <div className="flex flex-col justify-center gap-1 shrink-0 z-30">
                  <div className="flex gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerTurnSignal('LEFT');
                      }}
                      className={`w-6 sm:w-7 py-0.5 rounded border text-[8px] font-mono font-black ${
                        turnSignal === 'LEFT'
                          ? 'bg-emerald-400 text-stone-950 border-emerald-200'
                          : 'bg-stone-900/90 border-stone-700 text-stone-300'
                      }`}
                    >
                      ◀L
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerTurnSignal('RIGHT');
                      }}
                      className={`w-6 sm:w-7 py-0.5 rounded border text-[8px] font-mono font-black ${
                        turnSignal === 'RIGHT'
                          ? 'bg-emerald-400 text-stone-950 border-emerald-200'
                          : 'bg-stone-900/90 border-stone-700 text-stone-300'
                      }`}
                    >
                      R▶
                    </button>
                  </div>
                  <div className="flex gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleHazards();
                      }}
                      className={`w-6 sm:w-7 py-0.5 rounded border text-[8px] font-mono font-black ${
                        hazardLights
                          ? 'bg-rose-500 text-white border-rose-200 animate-pulse'
                          : 'bg-rose-800/80 border-rose-900 text-rose-100'
                      }`}
                      title="Hazard Lights"
                    >
                      ⚠️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDoor();
                      }}
                      className={`w-6 sm:w-7 py-0.5 rounded border text-[8px] font-mono font-bold ${
                        doorState === 'OPEN'
                          ? 'bg-amber-400 text-stone-950 border-amber-200'
                          : 'bg-stone-900/90 border-stone-700 text-stone-300'
                      }`}
                      title="Passenger Door (O)"
                    >
                      🚪
                    </button>
                  </div>
                  <div className="flex gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cycleCameraMode();
                      }}
                      className="w-6 sm:w-7 py-0.5 rounded border border-sky-500/70 bg-sky-950/80 text-sky-300 hover:text-white text-[8px] font-mono font-black"
                      title="Switch Camera View (V)"
                    >
                      🎥
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStepDown();
                      }}
                      className="w-6 sm:w-7 py-0.5 rounded border border-amber-500/70 bg-amber-950/80 text-amber-300 hover:text-white text-[8px] font-mono font-black"
                      title="Step Out / Walk Mode (E)"
                    >
                      🚶
                    </button>
                  </div>
                </div>

                {/* REDESIGNED 3-SPOKE COMMERCIAL BUS STEERING WHEEL */}
                <div
                  ref={wheelElementRef}
                  onPointerDown={handleWheelPointerDown}
                  onPointerMove={handleWheelPointerMove}
                  onPointerUp={handleWheelPointerUp}
                  onPointerCancel={handleWheelPointerUp}
                  className="relative w-[84px] h-[84px] sm:w-[98px] sm:h-[98px] rounded-full cursor-grab active:cursor-grabbing touch-none select-none flex items-center justify-center z-30 shrink-0 -mt-1"
                  style={{
                    transform: `rotate(${wheelVisualAngle}deg)`,
                    filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.95))',
                  }}
                >
                  <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible pointer-events-none">
                    <defs>
                      <radialGradient id="busRimGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="72%" stopColor="#1c1917" />
                        <stop offset="86%" stopColor="#3f3f46" />
                        <stop offset="95%" stopColor="#18181b" />
                        <stop offset="100%" stopColor="#09090b" />
                      </radialGradient>
                      <linearGradient id="spokeMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#71717a" />
                        <stop offset="50%" stopColor="#3f3f46" />
                        <stop offset="100%" stopColor="#18181b" />
                      </linearGradient>
                      <linearGradient id="woodTopGrip" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#78350f" />
                        <stop offset="50%" stopColor="#b45309" />
                        <stop offset="100%" stopColor="#78350f" />
                      </linearGradient>
                    </defs>
                    <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="18" />
                    <path d="M 18 102 L 72 90 L 74 114 L 18 118 Z" fill="url(#spokeMetal)" stroke="#52525b" strokeWidth="1.5" />
                    <path d="M 182 102 L 128 90 L 126 114 L 182 118 Z" fill="url(#spokeMetal)" stroke="#52525b" strokeWidth="1.5" />
                    <path d="M 88 124 L 112 124 L 116 184 L 84 184 Z" fill="url(#spokeMetal)" stroke="#52525b" strokeWidth="1.5" />
                    <rect x="32" y="101" width="28" height="5" rx="2.5" fill="#a1a1aa" opacity="0.75" />
                    <rect x="140" y="101" width="28" height="5" rx="2.5" fill="#a1a1aa" opacity="0.75" />
                    <rect x="97" y="140" width="6" height="28" rx="3" fill="#a1a1aa" opacity="0.75" />
                    <circle cx="100" cy="100" r="86" fill="none" stroke="url(#busRimGrad)" strokeWidth="18" />
                    <path d="M 32 50 A 86 86 0 0 1 168 50" fill="none" stroke="url(#woodTopGrip)" strokeWidth="16" strokeLinecap="round" />
                    <circle cx="100" cy="100" r="77" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" strokeDasharray="6 4" />
                    <rect x="96" y="5" width="8" height="19" rx="2" fill="#facc15" stroke="#18181b" strokeWidth="1.5" />
                    <circle cx="100" cy="105" r="34" fill="#18181b" stroke="#52525b" strokeWidth="3" />
                  </svg>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleHorn();
                    }}
                    className="absolute w-8 h-8 sm:w-9 sm:h-9 mt-0.5 rounded-full bg-gradient-to-b from-amber-400 to-amber-500 active:scale-95 text-stone-950 font-black text-[7px] sm:text-[8px] font-['Bungee'] flex items-center justify-center shadow border border-stone-900 pointer-events-auto"
                  >
                    HORN
                  </button>
                </div>

                {/* Integrated In-Dash Digital Instrument Cluster */}
                <div className="bg-stone-950 border-2 border-stone-700 rounded-xl px-2.5 py-1.5 flex flex-col justify-between w-[104px] sm:w-[138px] h-[74px] sm:h-[84px] shadow-inner shrink-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black ${
                        turnSignal === 'LEFT' || hazardLights ? 'text-emerald-400 animate-pulse' : 'text-stone-700'
                      }`}
                    >
                      ◀
                    </span>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-base sm:text-xl font-black font-mono text-amber-300 tabular-nums leading-none">
                        {hudSpeed}
                      </span>
                      <span className="text-[7px] font-mono text-stone-400">KM/H</span>
                    </div>
                    <span
                      className={`text-[10px] font-black ${
                        turnSignal === 'RIGHT' || hazardLights ? 'text-emerald-400 animate-pulse' : 'text-stone-700'
                      }`}
                    >
                      ▶
                    </span>
                  </div>
                  <div className="w-full bg-stone-900 h-1.5 rounded-full overflow-hidden border border-stone-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all duration-100"
                      style={{ width: `${Math.min(100, Math.round((hudRPM / 5200) * 100))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[8px] font-mono">
                    <span className={hudFuel < 20 ? 'text-rose-400 font-black' : 'text-emerald-300'}>⛽{hudFuel}%</span>
                    <span className="px-1.5 rounded bg-amber-400/20 text-amber-300 font-black">{gear}</span>
                    <span className={hudHeat > 80 ? 'text-rose-400 font-black' : 'text-sky-300'}>🌡️{hudHeat}°</span>
                  </div>
                </div>
              </div>

              {/* ── CENTER OF DASHBOARD: CLEAN ROUTE & CONDUCTOR CONSOLE (Unclipped & Well-Spaced) ── */}
              <div className="hidden md:flex flex-col justify-between flex-1 max-w-[260px] mx-3 h-[74px] sm:h-[84px] bg-stone-950/90 border border-stone-700/80 rounded-xl px-3 py-1.5 shadow-inner">
                <div className="w-full flex items-center justify-between text-[9px] font-mono gap-2">
                  <span className="text-amber-400 font-black truncate">
                    🚏 {currentJunction ? currentJunction.name : 'TERMINAL'}
                  </span>
                  <span className="text-emerald-400 font-black shrink-0 tabular-nums">{Math.max(0, distToJunc)}m</span>
                </div>
                <div className="w-full flex items-center justify-between text-[9px] font-mono text-stone-300">
                  <span>👥 {gameState.bus.passengers?.length || 0}/{gameState.bus.capacity} on board</span>
                  <span className="text-emerald-400 font-black tabular-nums">₦{gameState.conductor.collectedCash.toLocaleString()}</span>
                </div>
                <div className="w-full flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCollectFares();
                    }}
                    className="flex-1 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 rounded-lg text-[8px] font-mono font-black text-emerald-300 active:scale-95"
                  >
                    💵 FARES (C)
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBoot();
                    }}
                    className={`px-2 py-1 rounded-lg border text-[8px] font-mono font-bold ${
                      bootState === 'OPEN' ? 'bg-amber-400 text-stone-950 border-amber-200' : 'bg-stone-900 border-stone-700 text-stone-300'
                    }`}
                    title="Open/Close Rear Boot Outwards (B)"
                  >
                    🧳 BOOT
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWipers();
                    }}
                    className={`px-2 py-1 rounded-lg border text-[8px] font-mono ${
                      wipersActive ? 'bg-sky-400 text-stone-950 border-sky-200' : 'bg-stone-900 border-stone-700 text-stone-300'
                    }`}
                  >
                    🌧️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════ RIGHT DASHBOARD PEDAL & GEAR CLUSTER: RESTS CLEANLY ON THE DASHBOARD, ISOLATED FROM EACH OTHER ═══════ */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        className="absolute bottom-2 right-3 sm:right-4 z-50 pointer-events-auto flex flex-col items-end"
      >
        <div className="flex items-end gap-2 sm:gap-2.5">
          {!isSteppedDown ? (
            <>
              {/* Vertical Gear Selector (R - N - D - P) resting on dashboard */}
              <div className="relative flex flex-col bg-stone-950/95 border-2 border-stone-600 p-1 rounded-xl shadow-lg h-[82px] sm:h-[92px] justify-between">
                {gear === 'R' && (
                  <div className="absolute -top-6 right-0 bg-emerald-950/95 border border-emerald-400/90 text-emerald-300 text-[8px] font-mono font-black px-1.5 py-0.5 rounded shadow-xl flex items-center gap-1 whitespace-nowrap animate-in fade-in">
                    <span>[✓ Fixed] R-Gear Sound</span>
                  </div>
                )}
                {(['R', 'N', 'D', 'P'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setGear(g);
                      inputsRef.current.gear = g;
                      if (!inputsRef.current.isEngineRunning) {
                        addFeedMessage('🔑 Engine is OFF! Start the engine (E / K) before driving.');
                      } else if (g === 'R') {
                        soundEngine.playReverseGearEngaged();
                        soundEngine.playReverseBeep();
                        addFeedMessage('🔄 REVERSE ENGAGED: Smooth mechanical gear whine active.');
                      }
                    }}
                    className={`w-7 sm:w-8 h-4 sm:h-4.5 rounded-md font-mono font-black text-[9px] sm:text-[10px] transition-all flex items-center justify-center cursor-pointer ${
                      gear === g
                        ? g === 'R'
                          ? 'bg-rose-600 text-white shadow-lg ring-2 ring-rose-400 animate-pulse'
                          : g === 'D'
                          ? 'bg-amber-400 text-stone-950 shadow ring-1 ring-amber-200'
                          : 'bg-sky-400 text-stone-950 shadow'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* SHORT WIDE BRAKE PEDAL (58px-66px tall — rests cleanly on dashboard beside Gear & Gas) */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
                  inputsRef.current.gas = false;
                  setIsGasPressed(false);
                  inputsRef.current.brake = true;
                  setIsBrakePressed(true);
                  soundEngine.playAirBrakeHiss();
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
                  inputsRef.current.brake = false;
                  setIsBrakePressed(false);
                }}
                onPointerCancel={(e) => {
                  e.stopPropagation();
                  inputsRef.current.brake = false;
                  setIsBrakePressed(false);
                }}
                onPointerLeave={() => {
                  if (inputsRef.current.brake) {
                    inputsRef.current.brake = false;
                    setIsBrakePressed(false);
                  }
                }}
                className={`w-13 sm:w-15 h-[56px] sm:h-[64px] rounded-xl flex flex-col items-center justify-between py-1.5 px-1.5 select-none touch-none transition-all cursor-pointer ${
                  isBrakePressed
                    ? 'bg-rose-950 border-2 border-rose-400 translate-y-0.5 scale-95 shadow-[0_0_16px_rgba(244,63,94,0.75)]'
                    : 'bg-gradient-to-b from-stone-700 via-stone-800 to-stone-950 border-2 border-stone-500 shadow-lg'
                }`}
              >
                <div className="w-full h-1 bg-stone-950/80 rounded-full pointer-events-none" />
                <div className="flex flex-col items-center leading-none pointer-events-none">
                  <span className={`text-[9px] sm:text-[10px] font-mono font-black ${isBrakePressed ? 'text-rose-300' : 'text-rose-400'}`}>
                    BRAKE
                  </span>
                  <span className="text-[6px] text-stone-400 font-mono mt-0.5">STOP</span>
                </div>
                <div className="w-full h-1 bg-stone-950/80 rounded-full pointer-events-none" />
              </button>

              {/* TALL GAS / ACCELERATOR PEDAL (92px-102px tall — taller than Brake, rests cleanly inside the dashboard height!) */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
                  if (!inputsRef.current.isEngineRunning) {
                    addFeedMessage('🔑 ENGINE IS OFF! Press Engine Start/Stop (E or K) to turn on engine first!');
                    return;
                  }
                  if (inputsRef.current.gear === 'N' || inputsRef.current.gear === 'P') {
                    setGear('D');
                    inputsRef.current.gear = 'D';
                  }
                  inputsRef.current.brake = false;
                  setIsBrakePressed(false);
                  inputsRef.current.gas = true;
                  setIsGasPressed(true);
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
                  inputsRef.current.gas = false;
                  setIsGasPressed(false);
                }}
                onPointerCancel={(e) => {
                  e.stopPropagation();
                  inputsRef.current.gas = false;
                  setIsGasPressed(false);
                }}
                onPointerLeave={() => {
                  if (inputsRef.current.gas) {
                    inputsRef.current.gas = false;
                    setIsGasPressed(false);
                  }
                }}
                className={`w-12 sm:w-14 h-[92px] sm:h-[100px] rounded-2xl flex flex-col items-center justify-between py-2 px-1.5 select-none touch-none transition-all cursor-pointer ${
                  isGasPressed
                    ? 'bg-amber-400 text-stone-950 border-2 border-amber-200 translate-y-0.5 scale-95 shadow-[0_0_24px_rgba(251,191,36,0.9)]'
                    : 'bg-gradient-to-b from-stone-700 via-stone-800 to-stone-950 border-2 border-amber-400 shadow-lg'
                }`}
              >
                <div className="w-full h-1 bg-stone-950/70 rounded-full pointer-events-none" />
                <div className="w-full h-1 bg-stone-950/70 rounded-full pointer-events-none" />
                <div className="flex flex-col items-center leading-none my-0.5 pointer-events-none">
                  <span className={`text-[10px] sm:text-xs font-mono font-black tracking-wider ${isGasPressed ? 'text-stone-950' : 'text-amber-400'}`}>
                    GAS
                  </span>
                  <span className={`text-[7px] font-mono font-bold mt-0.5 ${isGasPressed ? 'text-stone-900' : 'text-stone-300'}`}>
                    ACCEL
                  </span>
                </div>
                <div className="w-full h-1 bg-stone-950/70 rounded-full pointer-events-none" />
                <div className="w-full h-1 bg-stone-950/70 rounded-full pointer-events-none" />
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 items-end mb-2">
              {onGoHome && (
                <button
                  onClick={onGoHome}
                  className="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-black text-xs font-['Bungee'] rounded-2xl shadow-2xl border-2 border-emerald-200 active:scale-95 flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  <span>GO HOME (3D INTERIOR)</span>
                </button>
              )}
              <button
                onClick={toggleStepDown}
                className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs font-['Bungee'] rounded-2xl shadow-2xl border-2 border-amber-200 active:scale-95 flex items-center gap-2"
              >
                <span>🚌</span>
                <span>GET IN BUS (E)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ EXTERNAL CAMERA MODES, HIDDEN DASH MODE, OR ON-FOOT WALK MODE (Bottom-Left Wheel / Walk Pad) ═══════ */}
      {(isSteppedDown || cameraMode !== 'FIRST_PERSON' || isDashHidden) && (
        <>
          {/* ON-FOOT VEHICLE & STREET INTERACTION BAR (When Stepped Down) */}
          {isSteppedDown && (
            <div className="absolute top-11 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center gap-1.5 bg-stone-950/95 border-2 border-amber-400 rounded-full px-3 py-1 shadow-2xl backdrop-blur-md">
              <span className="text-[9px] font-mono font-black text-amber-400 hidden sm:inline">🚶 ON FOOT:</span>
              <button
                onClick={cycleCameraMode}
                className="px-2 py-0.5 bg-sky-900/80 hover:bg-sky-800 text-sky-200 border border-sky-400/60 rounded-full text-[9px] font-mono font-bold active:scale-95"
              >
                {walkThirdPerson ? '🎥 3RD VIEW' : '👁️ 1ST VIEW'}
              </button>
              <button
                onClick={() => {
                  if (engineRef.current) {
                    lookRef.current.yaw = engineRef.current.getYawOffsetToBus();
                    lookRef.current.pitch = -0.04;
                  } else {
                    lookRef.current.yaw = 0;
                    lookRef.current.pitch = -0.04;
                  }
                  addFeedMessage('🎯 Facing your parked yellow Danfo bus!');
                }}
                className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-400/50 rounded-full text-[9px] font-mono font-bold active:scale-95"
              >
                🎯 FACE BUS
              </button>
              <button
                onClick={toggleDoor}
                className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border active:scale-95 ${
                  doorState === 'OPEN'
                    ? 'bg-amber-400 text-stone-950 border-amber-200'
                    : 'bg-stone-800 text-stone-200 border-stone-600'
                }`}
              >
                🚪 DOOR: {doorState}
              </button>
              <button
                onClick={toggleBoot}
                className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border active:scale-95 ${
                  bootState === 'OPEN'
                    ? 'bg-emerald-400 text-stone-950 border-emerald-200'
                    : 'bg-stone-800 text-stone-200 border-stone-600'
                }`}
              >
                🧳 BOOT: {bootState}
              </button>
              {onGoHome && (
                <button
                  onClick={onGoHome}
                  className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-full text-[9px] font-mono font-black active:scale-95"
                >
                  🏠 GO HOME
                </button>
              )}
              <button
                onClick={() => {
                  const randomNpc = LAGOS_NPCS[Math.floor(Math.random() * LAGOS_NPCS.length)];
                  setActiveNpc(randomNpc);
                }}
                className="px-2 py-0.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/50 rounded-full text-[9px] font-mono font-bold active:scale-95"
              >
                🗣️ TALK NPC
              </button>
            </div>
          )}

          {/* BOTTOM-LEFT: Redesigned 3-Spoke Wheel or Walk Joystick */}
          <div className="absolute bottom-3 left-2 z-50 pointer-events-auto flex flex-col items-start">
            <button
              onClick={() => setShowLeftPanel((v) => !v)}
              className="mb-1 w-8 h-5 bg-stone-900/80 border border-stone-700/50 rounded text-stone-400 text-[8px] flex items-center justify-center"
              title="Toggle Bottom-Left Controls"
            >
              {showLeftPanel ? '◀' : '▶'}
            </button>
            <div
              className={`flex items-end gap-2 transition-opacity duration-300 origin-bottom-left ${
                showLeftPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {!isSteppedDown ? (
                <>
                  <div className="flex flex-col gap-1" style={{ transform: 'scale(0.85)', transformOrigin: 'bottom left' }}>
                    <button
                      onClick={() => triggerTurnSignal('LEFT')}
                      className={`w-9 p-1 rounded border text-[9px] font-bold text-center ${
                        turnSignal === 'LEFT' ? 'bg-amber-400 text-stone-950 border-amber-300' : 'bg-stone-900/80 border-stone-700 text-stone-300'
                      }`}
                    >
                      ⬅️
                    </button>
                    <button
                      onClick={() => triggerTurnSignal('RIGHT')}
                      className={`w-9 p-1 rounded border text-[9px] font-bold text-center ${
                        turnSignal === 'RIGHT' ? 'bg-amber-400 text-stone-950 border-amber-300' : 'bg-stone-900/80 border-stone-700 text-stone-300'
                      }`}
                    >
                      ➡️
                    </button>
                    <button
                      onClick={toggleHazards}
                      className={`w-9 p-1 rounded border text-[9px] font-bold text-center ${
                        hazardLights ? 'bg-amber-500 text-stone-950 animate-pulse' : 'bg-stone-900/80 border-stone-700 text-stone-300'
                      }`}
                    >
                      🚨
                    </button>
                    <button
                      onClick={toggleWipers}
                      className={`w-9 p-1 rounded border text-[9px] font-bold text-center ${
                        wipersActive ? 'bg-sky-500 text-stone-950' : 'bg-stone-900/80 border-stone-700 text-stone-300'
                      }`}
                    >
                      🌧️
                    </button>
                  </div>
                  <div
                    ref={wheelElementRef}
                    onPointerDown={handleWheelPointerDown}
                    onPointerMove={handleWheelPointerMove}
                    onPointerUp={handleWheelPointerUp}
                    onPointerCancel={handleWheelPointerUp}
                    className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full cursor-grab active:cursor-grabbing touch-none select-none flex items-center justify-center"
                    style={{
                      transform: `rotate(${wheelVisualAngle}deg)`,
                      filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.9))',
                    }}
                  >
                    <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible pointer-events-none">
                      <circle cx="100" cy="100" r="86" fill="none" stroke="#18181b" strokeWidth="18" />
                      <path d="M 18 102 L 72 90 L 74 114 L 18 118 Z" fill="#3f3f46" stroke="#71717a" strokeWidth="1.5" />
                      <path d="M 182 102 L 128 90 L 126 114 L 182 118 Z" fill="#3f3f46" stroke="#71717a" strokeWidth="1.5" />
                      <path d="M 88 124 L 112 124 L 116 184 L 84 184 Z" fill="#3f3f46" stroke="#71717a" strokeWidth="1.5" />
                      <path d="M 32 50 A 86 86 0 0 1 168 50" fill="none" stroke="#b45309" strokeWidth="15" strokeLinecap="round" />
                      <rect x="96" y="5" width="8" height="19" rx="2" fill="#facc15" stroke="#18181b" strokeWidth="1.5" />
                      <circle cx="100" cy="105" r="32" fill="#18181b" stroke="#52525b" strokeWidth="3" />
                    </svg>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHorn();
                      }}
                      className="absolute w-9 h-9 mt-1 bg-amber-400 hover:bg-amber-300 active:bg-amber-200 text-stone-950 rounded-full font-black text-[8px] font-['Bungee'] flex items-center justify-center shadow-lg border border-stone-900 transition-transform active:scale-95"
                    >
                      HORN
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <div
                    onPointerDown={handleWalkJoyPointerDown}
                    onPointerMove={handleWalkJoyPointerMove}
                    onPointerUp={handleWalkJoyPointerUp}
                    onPointerCancel={handleWalkJoyPointerUp}
                    className="relative w-28 h-28 rounded-full bg-stone-950/90 backdrop-blur-md border-2 border-amber-400/80 shadow-2xl touch-none select-none flex items-center justify-center cursor-grab active:cursor-grabbing"
                  >
                    <div className="absolute top-1 text-[8px] font-black text-amber-400/90 font-mono pointer-events-none">▲ W</div>
                    <div className="absolute bottom-1 text-[8px] font-black text-amber-400/90 font-mono pointer-events-none">▼ S</div>
                    <div className="absolute left-1.5 text-[8px] font-black text-amber-400/90 font-mono pointer-events-none">◀ A</div>
                    <div className="absolute right-1.5 text-[8px] font-black text-amber-400/90 font-mono pointer-events-none">D ▶</div>
                    <div
                      className="w-12 h-12 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-stone-950 font-black text-[9px] shadow-xl border-2 border-amber-200 flex items-center justify-center pointer-events-none transition-transform duration-75"
                      style={{
                        transform: `translate(${walkJoyVisual.x}px, ${walkJoyVisual.y}px)`,
                      }}
                    >
                      WALK
                    </div>
                  </div>
                  <div className="mt-1 text-[8px] font-mono font-bold text-amber-400 bg-stone-950/90 px-2 py-0.5 rounded-full border border-amber-500/40">
                    WASD / TAP OR DRAG
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══════ ACTION FEED (Positioned cleanly above low-profile dashboard) ═══════ */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col gap-0.5 items-center transition-all ${
          !isSteppedDown && cameraMode === 'FIRST_PERSON' && !isDashHidden ? 'bottom-[22vh]' : 'bottom-8'
        }`}
        style={{ maxWidth: '52vw' }}
      >
        {actionFeed.slice(0, 1).map((msg, i) => (
          <div
            key={i}
            className="text-[9px] px-2.5 py-0.5 rounded-full bg-stone-950/80 border border-stone-800/80 backdrop-blur font-mono truncate max-w-full text-amber-300 font-bold"
          >
            {msg}
          </div>
        ))}
      </div>

      {/* NPC Modal */}
      {activeNpc && (
        <NpcInteractionModal
          npc={activeNpc}
          isOpen={true}
          walletNaira={gameState.walletNaira}
          onClose={() => setActiveNpc(null)}
          onSettleOrBuy={(cost, reward, msg) => {
            setGameState((prev) => {
              const nextWallet = Math.max(0, prev.walletNaira - cost + (reward?.cashNaira || 0));
              const nextCred = Math.max(0, prev.streetCred + (reward?.streetCred || 0));
              onUpdateSave?.({ walletNaira: nextWallet, streetCred: nextCred });
              return {
                ...prev,
                walletNaira: nextWallet,
                streetCred: nextCred,
              };
            });
            addFeedMessage(msg);
            setActiveNpc(null);
          }}
        />
      )}
    </div>
  );
};
