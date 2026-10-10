import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ThreeDrivingEngine } from '../game/three/ThreeDrivingEngine';
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
  Sparkles
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
  onUpdateSave?: (updates: any) => void;
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
  onUpdateSave,
  actionFeed,
  addFeedMessage,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ThreeDrivingEngine | null>(null);
  const leftMirrorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightMirrorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lookRef = useRef({ yaw: 0, pitch: 0, isDragging: false, startX: 0, startY: 0, startYaw: 0, startPitch: 0 });
  const wheelDragRef = useRef({ startPointerAngle: 0, startSteeringAngle: 0 });

  // UI Interactive States
  const [gear, setGear] = useState<GearPosition>('D');
  const [isEngineRunning, setIsEngineRunning] = useState<boolean>(true);
  const [doorState, setDoorState] = useState<DoorState>(gameState.bus.doorState || 'CLOSED');
  const [bootState, setBootState] = useState<'OPEN' | 'CLOSED'>('CLOSED');
  const [isSteppedDown, setIsSteppedDown] = useState<boolean>(false);
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

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  // NPC Interaction State
  const [activeNpc, setActiveNpc] = useState<LagosNpc | null>(null);
  const [cashToast, setCashToast] = useState<{ amount: number; text: string; id: number } | null>(null);

  const triggerCashToast = (amount: number, text: string) => {
    setCashToast({ amount, text, id: Date.now() });
    setTimeout(() => {
      setCashToast(null);
    }, 2800);
  };

  // Gas Station & Roadside Shop Drive-In States
  const [activeGasStation, setActiveGasStation] = useState<GasStationBay | null>(null);
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
  const activeShopRef = useRef<RoadsideShop | null>(null);

  // HUD Telemetry
  const [hudSpeed, setHudSpeed] = useState<number>(0);
  const [hudRPM, setHudRPM] = useState<number>(800);
  const [hudHeat, setHudHeat] = useState<number>(gameState.bus.heat);
  const [hudFuel, setHudFuel] = useState<number>(gameState.bus.fuelPercent);
  const [hudComfort, setHudComfort] = useState<number>(gameState.bus.comfortMeter);
  const [currentDist, setCurrentDist] = useState<number>(0);
  const [activeJuncIndex, setActiveJuncIndex] = useState<number>(gameState.activeJunctionIndex || 0);

  // Start parked inside the Oshodi Danfo Bus Park (-15.5m lateral offset) when beginning a shift
  const initialLaneOffset = (gameState.distanceTraveledMeters || 0) < 10 ? -15.5 : 0;

  // Mutable Simulation & Physics References
  const simRef = useRef({
    speed: 0,
    heat: gameState.bus.heat,
    fuel: gameState.bus.fuelPercent,
    comfort: gameState.bus.comfortMeter,
    laneOffset: initialLaneOffset,
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

  // Initialize Three.js Engine on mount & connect live rear-view mirror canvases
  useEffect(() => {
    if (!mountRef.current) return;
    const engine = new ThreeDrivingEngine(mountRef.current, gameState.bus.id);
    engineRef.current = engine;
    engine.setMirrorCanvases(leftMirrorCanvasRef.current, rightMirrorCanvasRef.current);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [gameState.bus.id]);

  // Keep mirror canvases synced if camera mode or step-down state changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setMirrorCanvases(leftMirrorCanvasRef.current, rightMirrorCanvasRef.current);
    }
  }, [cameraMode, isSteppedDown]);

  const toggleEngine = () => {
    const nextState = !isEngineRunning;
    setIsEngineRunning(nextState);
    inputsRef.current.isEngineRunning = nextState;
    soundEngine.playEngineIgnition(nextState);
    if (nextState) {
      if (gear === 'N' || gear === 'P' || inputsRef.current.gear === 'N' || inputsRef.current.gear === 'P') {
        setGear('D');
        inputsRef.current.gear = 'D';
      }
      addFeedMessage('🔑 IGNITION ON: Diesel engine rumbles to life! Drive out of the Bus Park onto the expressway.');
    } else {
      addFeedMessage('🛑 ENGINE STOPPED: Ignition key turned off.');
    }
  };

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

  // Strict camera mode switcher
  const cycleCameraMode = useCallback(() => {
    if (isSteppedDown) {
      addFeedMessage('🚶 Walkout mode: Drag to look around in first-person outside your bus.');
      return;
    }
    setCameraMode((prev) => {
      let next: CameraViewMode = 'FIRST_PERSON';
      if (prev === 'FIRST_PERSON') next = 'THIRD_PERSON';
      else if (prev === 'THIRD_PERSON') next = 'TOP_DOWN';
      else if (prev === 'TOP_DOWN') next = 'ORBIT';
      else next = 'FIRST_PERSON';

      cameraModeRef.current = next;

      // STRICT LOGIC: Always reset look yaw/pitch so angles never desync or carry over
      lookRef.current.yaw = 0;
      lookRef.current.pitch = 0;

      const labels: Record<string, string> = {
        FIRST_PERSON: '🎥 1ST PERSON (DR. DRIVING BUS DASH)',
        THIRD_PERSON: '🚗 3RD PERSON (CHASE CAM)',
        TOP_DOWN: '🦅 TOP-DOWN (BIRD EYE)',
        ORBIT: '🔄 360 FREE ORBIT',
      };
      addFeedMessage(`📷 CAMERA VIEW: ${labels[next] || next}`);
      return next;
    });
  }, [isSteppedDown, addFeedMessage]);

  const toggleStepDown = () => {
    if (simRef.current.speed > 5) {
      addFeedMessage('⚠️ Slow down to 0 KM/H before stepping down from driver seat!');
      return;
    }
    const nextStep = !isSteppedDown;
    setIsSteppedDown(nextStep);
    simRef.current.isSteppedDown = nextStep;
    soundEngine.playDoorOpenClose();
    if (nextStep) {
      if (doorState === 'CLOSED') {
        setDoorState('OPEN');
        simRef.current.doorState = 'OPEN';
        soundEngine.playDoorSlide(true);
      }
      // Reset walk look angles
      lookRef.current.yaw = 0;
      lookRef.current.pitch = 0;

      // STRICT: ONLY open NPC dialogue popup if parked at a BUS STOP or FILLING STATION!
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
        // Highway / open road: NO POPUP DIALOG!
        setActiveNpc(null);
        addFeedMessage('🚪 STEPPED OUT: Walking on roadside. (Park at a Bus Stop or Filling Station to interact with commuters & attendants)');
      }
    } else {
      // RE-ENTERING DRIVER SEAT: automatically ready to start & drive!
      setActiveNpc(null);
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
  };

  // Walk Mode Virtual Analog Joystick Handlers
  const handleWalkJoyPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    walkJoyRef.current.isDragging = true;
    walkJoyRef.current.startX = e.clientX;
    walkJoyRef.current.startY = e.clientY;
  };

  const handleWalkJoyPointerMove = (e: React.PointerEvent) => {
    if (!walkJoyRef.current.isDragging) return;
    const dx = e.clientX - walkJoyRef.current.startX;
    const dy = e.clientY - walkJoyRef.current.startY;
    const maxRadius = 36;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(maxRadius, dist);
    const angle = Math.atan2(dy, dx);
    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    walkJoyRef.current.x = clampedX / maxRadius;
    walkJoyRef.current.y = clampedY / maxRadius;
    setWalkJoyVisual({ x: clampedX, y: clampedY });
  };

  const handleWalkJoyPointerUp = () => {
    walkJoyRef.current.isDragging = false;
    walkJoyRef.current.x = 0;
    walkJoyRef.current.y = 0;
    setWalkJoyVisual({ x: 0, y: 0 });
  };

  // Rear Boot (Luggage Trunk) Door Toggle
  const toggleBoot = () => {
    const nextBoot = bootState === 'CLOSED' ? 'OPEN' : 'CLOSED';
    setBootState(nextBoot);
    soundEngine.playBootDoorSound(nextBoot === 'OPEN');
    if (nextBoot === 'OPEN') {
      addFeedMessage('🧳 BOOT OPENED: Rear door lifted up! Customers loading heavy yam & luggage.');
      // Luggage tip
      const luggageFee = 900;
      soundEngine.playCoin();
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
      addFeedMessage(`📦 BAGGAGE LOADED: +₦${luggageFee} heavy cargo carriage fee collected!`);
    } else {
      addFeedMessage('🧳 BOOT CLOSED: Rear door slammed shut securely! (KPA-CHUCK)');
    }
  };

  // Conductor Mode Fares & Change
  const handleCollectFares = () => {
    soundEngine.playCoin();
    const fareAmt = Math.floor(Math.random() * 900) + 700;
    triggerCashToast(fareAmt, `+₦${fareAmt.toLocaleString()} Fares Collected!`);
    setGameState((prev) => {
      const nextWallet = prev.walletNaira + fareAmt;
      onUpdateSave?.({ walletNaira: nextWallet });
      return {
        ...prev,
        walletNaira: nextWallet,
        conductor: {
          ...prev.conductor,
          collectedCash: prev.conductor.collectedCash + fareAmt,
        },
      };
    });
    addFeedMessage(`💵 CONDUCTOR COLLECTED: ₦${fareAmt.toLocaleString()} fares from passenger rows!`);
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

    const el = wheelElementRef.current || (e.currentTarget as HTMLDivElement);
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
    setWheelVisualAngle(clamped);
  };

  const handleWheelPointerUp = () => {
    inputsRef.current.isDraggingWheel = false;
  };

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Toggle / Start Engine Ignition
      if (e.key === 'k' || e.key === 'K' || e.key === 'x' || e.key === 'X') {
        toggleEngine();
        return;
      }
      if (!inputsRef.current.isEngineRunning && (e.key === 'e' || e.key === 'E' || e.key === 'i' || e.key === 'I')) {
        toggleEngine();
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if (!inputsRef.current.isEngineRunning) {
          soundEngine.playStarterDeadClick();
          addFeedMessage('⚡ Engine is OFF! Tap [START ENGINE] or press [K] to start the diesel ignition.');
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
        setGear((prev) => (prev === 'D' ? 'R' : prev === 'R' ? 'N' : 'D'));
      }
      if (e.key === 'r' || e.key === 'R') {
        setGear('R');
        inputsRef.current.gear = 'R';
        soundEngine.playReverseBeep();
      }
      if (e.key === 'n' || e.key === 'N') {
        setGear('N');
        inputsRef.current.gear = 'N';
      }
      if (e.key === ' ' || e.key === 'h' || e.key === 'H') handleHorn();
      if (e.key === 'o' || e.key === 'O') toggleDoor();
      if (e.key === 'b' || e.key === 'B') toggleBoot();
      if (e.key === 'e' || e.key === 'E') toggleStepDown();
      if (e.key === 'p' || e.key === 'P') onOpenPhone();
      if (e.key === 'i' || e.key === 'I') onOpenInventory();
      if (e.key === 'q' || e.key === 'Q') onConductorAction('CALLING');
      if (e.key === 'c' || e.key === 'C') handleCollectFares();
      if (e.key === 'v' || e.key === 'V') cycleCameraMode();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        inputsRef.current.gas = false;
        setIsGasPressed(false);
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        inputsRef.current.brake = false;
        setIsBrakePressed(false);
        if (inputsRef.current.gear === 'R') {
          inputsRef.current.gas = false;
          setIsGasPressed(false);
        }
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') inputsRef.current.steerLeft = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') inputsRef.current.steerRight = false;
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

    const loop = (currTime: number) => {
      const dt = Math.min((currTime - lastTime) / 1000, 0.1);
      lastTime = currTime;
      telemetryAcc += dt;

      const sim = simRef.current;
      const inp = inputsRef.current;

      // 1. Natural progressive steering wheel steer & self-centering spring (Responsive & agile)
      if (inp.steerLeft) {
        sim.steeringAngle = Math.max(-90, sim.steeringAngle - 380 * dt);
        setWheelVisualAngle(sim.steeringAngle);
      } else if (inp.steerRight) {
        sim.steeringAngle = Math.min(90, sim.steeringAngle + 380 * dt);
        setWheelVisualAngle(sim.steeringAngle);
      } else if (!inp.isDraggingWheel && !inp.gyroEnabled) {
        sim.steeringAngle = sim.steeringAngle * Math.pow(0.015, dt);
        if (Math.abs(sim.steeringAngle) < 0.25) sim.steeringAngle = 0;
        setWheelVisualAngle(sim.steeringAngle);
      }
      const steerFactor = sim.steeringAngle / 90;

      // 2. Acceleration & Braking Physics
      if (!inp.isEngineRunning || sim.isSteppedDown) {
        sim.speed = Math.max(0, sim.speed - 30 * dt);
      } else {
        if (inp.gear === 'D') {
          // DRIVE GEAR (Forward Motion)
          if (inp.gas) {
            sim.speed = Math.min(85, sim.speed + 19 * dt);
            sim.heat = Math.min(100, sim.heat + 3.0 * dt);
            sim.fuel = Math.max(0, sim.fuel - 0.03 * dt);
          } else if (inp.brake) {
            sim.speed = Math.max(0, sim.speed - 60 * dt);
            sim.comfort = Math.max(20, sim.comfort - 10 * dt);
          } else {
            sim.speed = Math.max(0, sim.speed - 9 * dt);
          }
        } else if (inp.gear === 'R') {
          // REVERSE GEAR (Reverse Motion)
          if (inp.gas) {
            sim.speed = Math.min(25, sim.speed + 15 * dt);
            sim.fuel = Math.max(0, sim.fuel - 0.04 * dt);
          } else if (inp.brake) {
            sim.speed = Math.max(0, sim.speed - 50 * dt);
          } else {
            sim.speed = Math.max(0, sim.speed - 18 * dt);
          }
        } else if (inp.gear === 'L') {
          if (inp.gas) {
            sim.speed = Math.min(45, sim.speed + 28 * dt);
            sim.heat = Math.min(100, sim.heat + 5.0 * dt);
          } else if (inp.brake) {
            sim.speed = Math.max(0, sim.speed - 70 * dt);
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

      // Lateral lane offset - FIXED so Steering Left (negative angle) moves LEFT (+X on screen)
      // and Steering Right (positive angle) moves RIGHT (-X on screen)!
      const turnDir = inp.gear === 'R' ? -1 : 1;
      const speedMultiplier = Math.max(5.8, (sim.speed / 28) * 9.5);
      sim.laneOffset -= turnDir * steerFactor * speedMultiplier * dt;
      // Allow wider right-side boundary (-26.5m) at the start (z < 48m) so player can drive out of the Oshodi Danfo Bus Park!
      const minLaneX = sim.distanceTraveled < 48 ? -26.5 : -8.5;
      sim.laneOffset = Math.max(minLaneX, Math.min(8.5, sim.laneOffset));

      // Distance traveled: increases in D, decreases in R
      const deltaM = (sim.speed * 1000 / 3600) * dt;
      if (inp.gear === 'R') {
        sim.distanceTraveled = Math.max(0, sim.distanceTraveled - deltaM);
      } else {
        sim.distanceTraveled += deltaM;
      }

      // 3. Gas Station Detection
      const gasBays = gameState.gasStations || [];
      const nearGas = gasBays.find((g) => Math.abs(g.distanceMarkerMeters - sim.distanceTraveled) < 18 && Math.abs(sim.laneOffset) > 2.5);
      if (nearGas && sim.speed < 5) {
        if (!activeGasStationRef.current) { activeGasStationRef.current = nearGas; setActiveGasStation(nearGas); }
      } else if (activeGasStation) {
        setActiveGasStation(null);
      }

      // 4. Roadside Shop Detection (Pulling up near shop curb)
      const shops = gameState.roadsideShops || [];
      const nearShop = shops.find((s) => Math.abs(s.distanceMarkerMeters - sim.distanceTraveled) < 18 && Math.abs(sim.laneOffset) > 2.5);
      if (nearShop && sim.speed < 6) {
        if (!activeShopRef.current) { activeShopRef.current = nearShop; setActiveShop(nearShop); }
      } else if (activeShop) {
        setActiveShop(null);
      }

      // Reverse Safety Beep Audio
      if (inp.gear === 'R' && sim.speed > 1) {
        boardingTimer += dt;
        if (boardingTimer >= 0.9) {
          soundEngine.playReverseBeep();
        }
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

        // Periodic NPC Waybill Delivery Offer (every ~32s if no delivery is active or offered)
        waybillTimer += dt;
        if (waybillTimer >= 32 && !gameState.activeDelivery && !gameState.availableDelivery && sim.distanceTraveled > 100) {
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

        // 5. Junction Bus Stop Detection & Passenger Alighting / Boarding
        const juncs = gameState.junctions;
        const nearJunc = juncs.find((j) => Math.abs(j.distanceMarkerMeters - sim.distanceTraveled) <= 55);

        // Keep active junction pointing to next upcoming stop
        const upcomingIdx = juncs.findIndex((j) => j.distanceMarkerMeters > sim.distanceTraveled - 16);
        if (upcomingIdx !== -1 && upcomingIdx !== sim.activeJunctionIndex) {
          sim.activeJunctionIndex = upcomingIdx;
        }

        if (nearJunc) {
          const distToJunc = nearJunc.distanceMarkerMeters - sim.distanceTraveled;
          const isAtStop = Math.abs(distToJunc) <= 28 && sim.speed < 16;

          // Check if this stop has an active Waybill Delivery destination!
          if (isAtStop && (sim.doorState === 'OPEN' || bootState === 'OPEN') && gameState.activeDelivery) {
            const delJob = gameState.activeDelivery;
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

          if (isAtStop && sim.doorState === 'OPEN' && !nearJunc.cleared) {
            boardingTimer += dt;
            sim.isBoarding = true;

            if (boardingTimer >= 0.55) {
              boardingTimer = 0;

              setTimeout(() => {
                setGameState((prev) => {
                  const updatedJuncs = [...prev.junctions];
                  const activeJ = updatedJuncs.find((j) => j.uid === nearJunc.uid);
                  if (!activeJ || activeJ.cleared) return prev;

                  let currentPassengers = [...(prev.bus.passengers || [])];
                  let cashCollected = 0;
                  let alightedCount = 0;

                  // 1. NPC ALIGHTING: Commuters drop off at this stop and pay fare!
                  const remainingPassengers: Passenger[] = [];
                  for (const p of currentPassengers) {
                    const isDropOffHere = 
                      (p.destinationUid && p.destinationUid === activeJ.uid) ||
                      (p.destination && p.destination === activeJ.destinationTag) ||
                      (p.destination && activeJ.name.toLowerCase().includes(p.destination.toLowerCase()));

                    if (isDropOffHere) {
                      alightedCount++;
                      cashCollected += p.fare;
                      addFeedMessage(`🚶 ALIGHTED: ${p.name} dropped off at ${activeJ.name}! (+₦${p.fare.toLocaleString()} fare paid)`);
                    } else {
                      remainingPassengers.push(p);
                    }
                  }

                  if (alightedCount > 0) {
                    soundEngine.playCoin();
                  }

                  // 2. NPC BOARDING: Waiting commuters board up to bus capacity!
                  const busCapacity = prev.bus.capacity || 14;
                  let remainingWaiting = activeJ.waitingPassengersCount;

                  if (remainingPassengers.length < busCapacity && remainingWaiting > 0) {
                    const currIndexInList = updatedJuncs.findIndex((j) => j.uid === activeJ.uid);
                    const downstreamStops = updatedJuncs.slice(currIndexInList + 1);
                    const targetStop = downstreamStops.length > 0
                      ? downstreamStops[Math.floor(Math.random() * downstreamStops.length)]
                      : updatedJuncs[updatedJuncs.length - 1];

                    const archetypes: PassengerArchetype[] = ['CORPORATE', 'MARKET_WOMAN', 'STUDENT', 'AGBERO_TOUT', 'PREACHER'];
                    const randomName = PASSENGER_NAMES[Math.floor(Math.random() * PASSENGER_NAMES.length)];
                    const fareToCharge = targetStop.averageFare || activeJ.averageFare;

                    const newPassenger: Passenger = {
                      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                      name: randomName,
                      archetype: archetypes[Math.floor(Math.random() * archetypes.length)],
                      destination: targetStop.destinationTag,
                      destinationUid: targetStop.uid,
                      fare: fareToCharge,
                      paid: true,
                      patience: 100,
                      maxPatience: 100,
                      hasBigBill: Math.random() < 0.2,
                      changeNeeded: 0,
                      seatedAt: remainingPassengers.length,
                      satisfaction: 'HAPPY',
                    };

                    remainingPassengers.push(newPassenger);
                    remainingWaiting = Math.max(0, remainingWaiting - 1);
                    cashCollected += fareToCharge;
                    soundEngine.playPassengerBoarding();
                    soundEngine.playCoin();
                    addFeedMessage(`🎟️ BOARDED: ${newPassenger.name} entered bus -> Destination: ${targetStop.name} (+₦${fareToCharge.toLocaleString()})`);
                  }

                  activeJ.waitingPassengersCount = remainingWaiting;
                  const isCleared = remainingWaiting === 0 || remainingPassengers.length >= busCapacity;
                  activeJ.cleared = isCleared;
                  activeJ.stopReached = true;

                  const nextWallet = prev.walletNaira + cashCollected;
                  const nextCred = prev.streetCred + alightedCount * 5 + (isCleared ? 15 : 0);
                  if (cashCollected > 0 || alightedCount > 0) {
                    onUpdateSave?.({ walletNaira: nextWallet, streetCred: nextCred });
                    triggerCashToast(cashCollected, `+₦${cashCollected.toLocaleString()} Fares Collected!`);
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

      // 5. Update 3D Three.js Engine
      if (cameraModeRef.current === 'THIRD_PERSON' && !lookRef.current.isDragging) {
        const decay = Math.max(0, 1 - dt * 5.0);
        lookRef.current.yaw *= decay;
        lookRef.current.pitch *= decay;
      }

      if (engineRef.current) {
        engineRef.current.update(
          {
            speedKmH: Math.round(sim.speed),
            steeringWheelAngleDeg: sim.steeringAngle,
            laneOffsetMeters: sim.laneOffset,
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
            bootState: bootState,
            hasConductor: gameState.conductor.hasConductor,
            isSteppedDown: sim.isSteppedDown,
            junctions: gameState.junctions,
            activeJunctionIndex: sim.activeJunctionIndex,
            isBoardingPassengers: sim.isBoarding,
            activeDelivery: gameState.activeDelivery,
            walkMoveX: walkJoyRef.current.x,
            walkMoveZ: walkJoyRef.current.y,
          },
          dt
        );

        const phys = engineRef.current.getPhysicsChassis();
        if (phys && !isNaN(phys.speedKmH) && !isNaN(phys.position.x) && !isNaN(phys.position.z)) {
          sim.speed = phys.speedKmH;
          sim.laneOffset = phys.position.x;
          sim.distanceTraveled = Math.max(0, phys.position.z);
        }

        const collisionMsg = engineRef.current.consumeCollisionMessage();
        if (collisionMsg) {
          sim.comfort = Math.max(10, sim.comfort - 8);
          addFeedMessage(collisionMsg);
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
        setActiveJuncIndex(gameState.activeJunctionIndex);
        setIsBoarding(sim.isBoarding);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState.junctions, gameState.activeJunctionIndex, gameState.conductor.hasConductor, gameState.gasStations, onFinishShift, setGameState, addFeedMessage]);

  const currentJunction = gameState.junctions[activeJuncIndex];
  const distToJunc = currentJunction ? Math.round(currentJunction.distanceMarkerMeters - currentDist) : 0;
  const isAtCurrentJunction = Math.abs(distToJunc) <= 14;
  const unreadMessagesCount = gameState.messages?.filter((m) => m.unread).length || 0;


  // ── Retractable panel states ──────────────────────────────────────
  const [showTopHUD, setShowTopHUD] = React.useState(true);
  const [showLeftPanel, setShowLeftPanel] = React.useState(true);
  const [showRightPanel, setShowRightPanel] = React.useState(true);

  return (
    <div className="relative w-[100vw] h-[100vh] bg-stone-950 overflow-hidden select-none pointer-events-none" style={{ position: "relative", width: "100vw", height: "100vh" }}>
      
        {/* CAMERA MODE BUTTON - Positioned top-right below top HUD bar */}
        <div className="absolute top-11 right-3 z-50 pointer-events-auto flex flex-col gap-1">
          <button
            onClick={cycleCameraMode}
            className="px-3 py-1.5 bg-stone-950/95 border-2 border-sky-400 hover:border-sky-300 rounded-xl text-sky-300 hover:text-white font-black text-[10px] font-mono shadow-2xl backdrop-blur flex items-center gap-1.5 active:scale-95 transition-all"
            title="Cycle Camera View (or press V)"
          >
            {isSteppedDown ? (
              '🚶 ON FOOT (DRAG TO LOOK)'
            ) : (
              <>
                {cameraMode === 'FIRST_PERSON' && '🎥 1ST COCKPIT'}
                {cameraMode === 'THIRD_PERSON' && '🚗 3RD CHASE'}
                {cameraMode === 'TOP_DOWN' && '🦅 BIRD EYE'}
                {cameraMode === 'ORBIT' && '🔄 360 FREE'}
              </>
            )}
          </button>
        </div>

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
            // WALKING MODE:
            // Moving cam left (dx < 0) turns LEFT!
            // Moving cam right (dx > 0) turns RIGHT!
            // Moving cam up (dy < 0) looks UP!
            // Moving cam down (dy > 0) looks DOWN!
            lookRef.current.yaw = lookRef.current.startYaw - dx * 0.005;
            lookRef.current.pitch = Math.max(-0.6, Math.min(0.6, lookRef.current.startPitch - dy * 0.004));
          } else if (cameraMode === 'FIRST_PERSON') {
            // STRICT COCKPIT: Clamped within the windscreen and dashboard frame! NEVER 360!
            lookRef.current.yaw = Math.max(-0.75, Math.min(0.75, lookRef.current.startYaw + dx * 0.003));
            lookRef.current.pitch = Math.max(-0.35, Math.min(0.25, lookRef.current.startPitch - dy * 0.003));
          } else if (cameraMode === 'THIRD_PERSON') {
            // DYNAMIC CHASE PEEK: Pan around the bus smoothly with mouse/touch drag
            lookRef.current.yaw = Math.max(-1.1, Math.min(1.1, lookRef.current.startYaw + dx * 0.004));
            lookRef.current.pitch = Math.max(-0.35, Math.min(0.35, lookRef.current.startPitch - dy * 0.003));
          } else if (cameraMode === 'ORBIT') {
            // 360 Free Orbit around the vehicle
            lookRef.current.yaw = lookRef.current.startYaw + dx * 0.006;
            lookRef.current.pitch = Math.max(-0.6, Math.min(0.6, lookRef.current.startPitch - dy * 0.005));
          }
        }}
        onPointerUp={() => { lookRef.current.isDragging = false; }}
        onPointerCancel={() => { lookRef.current.isDragging = false; }}
        className="absolute inset-0 w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing touch-none"
      />

      {/* ═══════ TOP BAR ═══════ */}
      <div className={`absolute top-0 left-0 right-0 z-40 pointer-events-auto transition-transform duration-300 ${showTopHUD ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-stretch h-9 bg-stone-950/85 backdrop-blur-md border-b border-stone-700/60 shadow-xl">
          {/* MiniMap pinned top-left */}
          <div className="w-[88px] h-[88px] shrink-0 absolute top-0 left-0 pointer-events-auto z-10 origin-top-left" style={{ transform: 'scale(0.75)' }}>
            <MiniMap
              currentDistanceMeters={currentDist}
              totalDistanceMeters={gameState.targetDistanceMeters}
              laneOffset={simRef.current.laneOffset}
              junctions={gameState.junctions}
              activeJunctionIndex={activeJuncIndex}
              speedKmH={hudSpeed}
            />
          </div>
          {/* Centre strip */}
          <div className="ml-[66px] flex-1 flex items-center justify-center gap-2.5 px-2 text-[10px] font-mono">
            <span className="text-stone-400">SPD</span><span className="font-black text-white tabular-nums">{hudSpeed}</span><span className="text-stone-500 text-[8px]">km/h</span>
            <div className="w-px h-4 bg-stone-700" />
            <Fuel className="w-2.5 h-2.5 text-amber-400" />
            <div className="w-10 h-1.5 bg-stone-800 rounded-full overflow-hidden"><div className={`h-full transition-all ${hudFuel < 20 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`} style={{ width: `${hudFuel}%` }} /></div>
            <span className={hudFuel < 20 ? 'text-rose-400' : 'text-stone-400'}>{hudFuel}%</span>
            <div className="w-px h-4 bg-stone-700" />
            <span className={hudHeat > 80 ? 'text-rose-400 font-bold' : 'text-stone-300'}>🌡️{hudHeat}°</span>
            <div className="w-px h-4 bg-stone-700" />
            <Coins className="w-2.5 h-2.5 text-emerald-400" /><span className="text-emerald-400 font-black tabular-nums">₦{gameState.conductor.collectedCash.toLocaleString()}</span>
            <div className="w-px h-4 bg-stone-700" />
            <span className={`font-black text-sm ${gear === 'D' ? 'text-amber-400' : gear === 'R' ? 'text-rose-400' : gear === 'P' ? 'text-sky-400' : 'text-stone-300'}`}>{gear}</span>
          </div>
          {/* Right buttons */}
          <div className="flex items-center gap-1 px-1.5 shrink-0">
            <button 
              onClick={cycleCameraMode} 
              title={isSteppedDown ? 'Walking Outside' : `Camera: ${cameraMode} (Press V)`}
              className={`p-1.5 rounded border font-mono font-black text-[9px] transition-colors ${
                isSteppedDown 
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' 
                  : 'bg-sky-950/80 border-sky-500/70 text-sky-300 hover:text-white hover:bg-sky-900'
              }`}
            >
              {isSteppedDown ? '🚶 FOOT' : cameraMode === 'FIRST_PERSON' ? '🎥 1ST' : cameraMode === 'THIRD_PERSON' ? '🚗 3RD' : cameraMode === 'TOP_DOWN' ? '🦅 TOP' : '🔄 360'}
            </button>
            <button onClick={toggleDoor} className={`p-1.5 rounded border font-bold transition-colors ${doorState === 'OPEN' ? 'bg-amber-400 border-amber-300 text-stone-950' : 'bg-stone-800/80 border-stone-600 text-stone-300'}`}>
              {doorState === 'OPEN' ? <DoorOpen className="w-3.5 h-3.5" /> : <DoorClosed className="w-3.5 h-3.5" />}
            </button>
            <button onClick={toggleEngine} className={`p-1.5 rounded border font-bold transition-colors ${isEngineRunning ? 'bg-rose-900/80 border-rose-600 text-rose-300' : 'bg-emerald-900/80 border-emerald-400 text-emerald-300 animate-pulse'}`}>
              <Power className="w-3.5 h-3.5" />
            </button>
            <button onClick={toggleStepDown} title={isSteppedDown ? 'Get Back In' : 'Exit Bus'}
              className={`p-1.5 rounded border font-bold transition-colors ${isSteppedDown ? 'bg-amber-400 border-amber-300 text-stone-950' : 'bg-stone-800/80 border-stone-600 text-stone-300'}`}>
              <Footprints className="w-3.5 h-3.5" />
            </button>
            <button onClick={onOpenPhone} className="p-1.5 rounded border border-indigo-500/50 bg-indigo-950/70 text-indigo-300">
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onFinishShift(false)} className="p-1.5 rounded border border-stone-600 bg-stone-800/80 text-stone-400 hover:text-rose-400 transition-colors">
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

      {activeGasStation && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-stone-950/95 border-2 border-emerald-400 rounded-2xl px-3 py-2 shadow-2xl flex items-center gap-3 pointer-events-auto">
          <Fuel className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="text-[9px] font-mono font-black text-emerald-400">⛽ {activeGasStation.name}</div>
            <div className="text-[10px] text-white">₦{activeGasStation.fuelPricePerLiter}/L · Fuel: {hudFuel}%</div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => handleFillGas(false)} className="px-2 py-1 bg-stone-800 text-stone-200 font-bold text-[9px] rounded-xl">15L</button>
            <button onClick={() => handleFillGas(true)} className="px-2.5 py-1 bg-emerald-400 text-stone-950 font-black text-[9px] font-['Bungee'] rounded-xl">FULL</button>
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
      {/* 🔑 PROMINENT ENGINE OFF IGNITION STARTER BANNER */}
      {!isEngineRunning && !isSteppedDown && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex flex-col items-center gap-2.5 bg-stone-950/95 border-2 border-amber-400 rounded-2xl p-4 shadow-[0_0_35px_rgba(251,191,36,0.4)] backdrop-blur-md max-w-sm w-[90vw] animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-3 w-full">
            <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-400 flex items-center justify-center text-2xl shrink-0 animate-pulse">
              🔑
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-black font-['Bungee'] text-amber-400 tracking-wide">
                DIESEL ENGINE IS OFF
              </h3>
              <p className="text-[10px] text-stone-300 font-medium leading-tight mt-0.5">
                Crank the starter key to start up your Danfo!
              </p>
            </div>
          </div>
          <button
            onClick={toggleEngine}
            className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 font-black text-xs font-['Bungee'] rounded-xl shadow-lg transition-transform flex items-center justify-center gap-2 border border-amber-200"
          >
            <Power className="w-4 h-4 text-stone-950" />
            START ENGINE (CRANK KEY)
          </button>
          <div className="text-[9px] font-mono text-stone-400 flex items-center gap-1.5">
            <span>Press keyboard:</span>
            <kbd className="px-1.5 py-0.5 bg-stone-900 text-amber-400 rounded border border-stone-700 font-bold">K</kbd>
            <span>or</span>
            <kbd className="px-1.5 py-0.5 bg-stone-900 text-amber-400 rounded border border-stone-700 font-bold">E</kbd>
          </div>
        </div>
      )}

      {/* 🚏 Upcoming Bus Stop Alert (30m to 70m ahead) */}
      {(() => {
        const upcomingJ = gameState.junctions.find(
          (j) => j.distanceMarkerMeters - currentDist > 28 && j.distanceMarkerMeters - currentDist <= 70
        );
        if (!upcomingJ || activeGasStation || activeShop || isSteppedDown || !isEngineRunning) return null;
        const distAhead = Math.round(upcomingJ.distanceMarkerMeters - currentDist);
        return (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-stone-950/90 border border-amber-400/70 rounded-full px-4 py-1.5 shadow-xl flex items-center gap-2 pointer-events-auto backdrop-blur-sm animate-pulse">
            <span className="text-xs">🚏</span>
            <span className="text-[10px] font-mono font-black text-amber-400">UPCOMING STOP: {upcomingJ.name}</span>
            <span className="text-[9px] font-mono text-stone-300">({distAhead}m ahead • {upcomingJ.side} CURB)</span>
          </div>
        );
      })()}

      {/* 🚏 At Bus Stop: Boarding & Alighting Hub */}
      {(() => {
        const nearJ = gameState.junctions.find((j) => Math.abs(j.distanceMarkerMeters - currentDist) <= 28);
        if (!nearJ || activeGasStation || activeShop || isSteppedDown) return null;

        const dropOffsCount = (gameState.bus.passengers || []).filter(
          p => (p.destinationUid && p.destinationUid === nearJ.uid) ||
               (p.destination && p.destination === nearJ.destinationTag) ||
               (p.destination && nearJ.name.toLowerCase().includes(p.destination.toLowerCase()))
        ).length;

        const isDeliveryDropOff = gameState.activeDelivery && (
          gameState.activeDelivery.destinationJunctionUid === nearJ.uid ||
          gameState.activeDelivery.destinationName.toLowerCase().includes(nearJ.name.toLowerCase())
        );

        return (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-stone-950/95 border-2 border-amber-400 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-3.5 pointer-events-auto max-w-md w-full">
            <MapPin className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-black text-amber-400">🚏 {nearJ.name}</span>
                {nearJ.side && (
                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${nearJ.side === 'LEFT' ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'}`}>
                    {nearJ.side} CURB
                  </span>
                )}
              </div>
              <div className="text-[10px] text-stone-300 flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={dropOffsCount > 0 ? "text-emerald-400 font-bold" : "text-stone-400"}>
                  🎯 {dropOffsCount} alighting
                </span>
                <span>•</span>
                <span className="text-amber-300 font-bold">
                  🚪 {nearJ.waitingPassengersCount} waiting
                </span>
                <span>•</span>
                <span className="text-sky-300">
                  👥 {gameState.bus.passengers?.length || 0}/{gameState.bus.capacity} seats
                </span>
              </div>
              {isDeliveryDropOff && (
                <div className="mt-1 text-[9px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                  <span>📦 WAYBILL DESTINATION:</span>
                  <span>{gameState.activeDelivery?.itemName} (+₦{gameState.activeDelivery?.rewardNaira.toLocaleString()})</span>
                </div>
              )}
            </div>
            <button onClick={toggleDoor} className={`px-3 py-1.5 font-black text-[10px] font-['Bungee'] rounded-xl transition-transform active:scale-95 shadow-md shrink-0 ${doorState === 'CLOSED' ? 'bg-amber-400 text-stone-950 hover:bg-amber-300' : 'bg-rose-500 text-white'}`}>
              {doorState === 'CLOSED' ? 'OPEN DOOR' : 'CLOSE DOOR'}
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

      {/* 🚌 OSHODI DANFO BUS PARK DEPARTURE BANNER (At start of shift) */}
      {!isSteppedDown && currentDist < 36 && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex items-center gap-2.5 bg-stone-950/90 border-2 border-amber-400 rounded-2xl px-4 py-1.5 shadow-[0_8px_25px_rgba(0,0,0,0.85)] backdrop-blur-md">
          <span className="text-base">🚌</span>
          <div>
            <div className="text-[9px] font-mono font-black text-amber-400 uppercase tracking-wider">
              OSHODI DANFO MOTOR PARK • DEPARTURE BAY 1
            </div>
            <div className="text-[10px] text-stone-200 font-semibold">
              Hold <span className="text-amber-300 font-black">GAS (W)</span> & steer <span className="text-emerald-300 font-black">LEFT (A)</span> through the Park Exit Gate onto the Lagos Expressway!
            </div>
          </div>
        </div>
      )}

      {/* ═══════ LIVE REAR-VIEW SIDE MIRRORS (LEFT & RIGHT) ═══════ */}
      {!isSteppedDown && (
        <>
          {/* LEFT SIDE MIRROR (Accurate Live Rear View) */}
          <div
            className={`absolute z-30 pointer-events-none transition-all duration-300 flex items-center ${
              cameraMode === 'FIRST_PERSON'
                ? 'left-0 top-[18%] sm:top-[16%]'
                : 'left-2 top-11'
            }`}
          >
            {/* Mirror Mounting Bracket Arm in First-Person Cockpit */}
            {cameraMode === 'FIRST_PERSON' && (
              <div className="w-3 sm:w-5 h-7 bg-gradient-to-r from-amber-500 via-stone-800 to-stone-900 border-y-2 border-stone-700 shadow-lg" />
            )}
            <div className="relative rounded-r-2xl rounded-l-lg bg-stone-950 p-1 sm:p-1.5 border-[3px] border-stone-700 shadow-[0_10px_28px_rgba(0,0,0,0.95)] ring-2 ring-amber-400/70 overflow-hidden">
              <div className="relative w-[108px] h-[64px] sm:w-[148px] sm:h-[86px] rounded-lg overflow-hidden bg-stone-900 border border-stone-600/80">
                <canvas
                  ref={leftMirrorCanvasRef}
                  width={220}
                  height={130}
                  className="w-full h-full object-cover block"
                />
                {/* Subtle convex mirror glare & blind-spot line */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-sky-300/[0.08] pointer-events-none" />
                <div className="absolute top-0 bottom-0 left-[22%] w-px border-l border-dashed border-amber-300/40 pointer-events-none" />
                <div className="absolute top-1 left-1.5 px-1 py-0.2 bg-stone-950/75 rounded text-[7px] font-mono font-black text-amber-400 tracking-wider">
                  L-MIRROR • LIVE REAR
                </div>
                {turnSignal === 'LEFT' || hazardLights ? (
                  <div className="absolute bottom-1 left-1.5 text-[9px] font-black text-amber-400 animate-pulse">
                    ◀ BLINK
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE MIRROR (Accurate Live Rear View) */}
          <div
            className={`absolute z-30 pointer-events-none transition-all duration-300 flex items-center ${
              cameraMode === 'FIRST_PERSON'
                ? 'right-0 top-[18%] sm:top-[16%]'
                : 'right-2 top-20'
            }`}
          >
            <div className="relative rounded-l-2xl rounded-r-lg bg-stone-950 p-1 sm:p-1.5 border-[3px] border-stone-700 shadow-[0_10px_28px_rgba(0,0,0,0.95)] ring-2 ring-amber-400/70 overflow-hidden">
              <div className="relative w-[108px] h-[64px] sm:w-[148px] sm:h-[86px] rounded-lg overflow-hidden bg-stone-900 border border-stone-600/80">
                <canvas
                  ref={rightMirrorCanvasRef}
                  width={220}
                  height={130}
                  className="w-full h-full object-cover block"
                />
                {/* Subtle convex mirror glare & blind-spot line */}
                <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-white/[0.04] to-sky-300/[0.08] pointer-events-none" />
                <div className="absolute top-0 bottom-0 right-[22%] w-px border-r border-dashed border-amber-300/40 pointer-events-none" />
                <div className="absolute top-1 right-1.5 px-1 py-0.2 bg-stone-950/75 rounded text-[7px] font-mono font-black text-amber-400 tracking-wider">
                  LIVE REAR • R-MIRROR
                </div>
                {turnSignal === 'RIGHT' || hazardLights ? (
                  <div className="absolute bottom-1 right-1.5 text-[9px] font-black text-amber-400 animate-pulse">
                    BLINK ▶
                  </div>
                ) : null}
              </div>
            </div>
            {cameraMode === 'FIRST_PERSON' && (
              <div className="w-3 sm:w-5 h-7 bg-gradient-to-l from-amber-500 via-stone-800 to-stone-900 border-y-2 border-stone-700 shadow-lg" />
            )}
          </div>
        </>
      )}

      {/* ═══════ FIRST-PERSON DR. DRIVING STYLE COMMERCIAL BUS COCKPIT DASHBOARD ═══════ */}
      {!isSteppedDown && cameraMode === 'FIRST_PERSON' && (
        <>
          {/* Bus Windshield Frame: Left & Right Yellow Danfo A-Pillars */}
          <div className="absolute top-9 bottom-[34%] left-0 w-3 sm:w-4 bg-gradient-to-r from-amber-500 via-amber-600 to-stone-900 border-r-2 border-stone-800 z-20 pointer-events-none shadow-2xl" />
          <div className="absolute top-9 bottom-[34%] right-0 w-3 sm:w-4 bg-gradient-to-l from-amber-500 via-amber-600 to-stone-900 border-l-2 border-stone-800 z-20 pointer-events-none shadow-2xl" />

          {/* Full-Width Molded Bus Dashboard Panel (Dr. Driving Inspired) */}
          <div className="absolute inset-x-0 bottom-0 h-[36%] min-h-[210px] max-h-[285px] z-40 pointer-events-auto select-none flex flex-col justify-end">
            {/* Curved Upper Dash Glare Shield & Instrument Binnacle Arch */}
            <div className="relative w-full h-full bg-gradient-to-b from-stone-800 via-stone-900 to-stone-950 border-t-[4px] border-stone-600/90 rounded-t-[28px] shadow-[0_-14px_35px_rgba(0,0,0,0.95)] flex items-stretch justify-between px-2 sm:px-5 pt-2 pb-2.5 overflow-visible">
              {/* Top Yellow-Black Danfo Trim Accent Line */}
              <div className="absolute top-0 left-6 right-6 h-1 bg-gradient-to-r from-amber-400/80 via-stone-500/40 to-amber-400/80 rounded-full pointer-events-none" />

              {/* ── LEFT SECTION: INSTRUMENT BINNACLE HOOD + REDESIGNED 3-SPOKE BUS STEERING WHEEL ── */}
              <div className="relative flex items-end gap-1.5 sm:gap-3 w-[46%] sm:w-[44%] h-full">
                {/* Left Quick-Switch Stalk Column */}
                <div className="flex flex-col justify-end gap-1 pb-1 shrink-0 z-30">
                  <button
                    onClick={() => triggerTurnSignal('LEFT')}
                    className={`w-8 sm:w-9 py-1 rounded-lg border text-[9px] font-mono font-black transition-all ${
                      turnSignal === 'LEFT'
                        ? 'bg-emerald-400 text-stone-950 border-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                        : 'bg-stone-900/90 border-stone-700 text-stone-300 hover:border-stone-500'
                    }`}
                    title="Left Turn Signal"
                  >
                    ◀ L
                  </button>
                  <button
                    onClick={() => triggerTurnSignal('RIGHT')}
                    className={`w-8 sm:w-9 py-1 rounded-lg border text-[9px] font-mono font-black transition-all ${
                      turnSignal === 'RIGHT'
                        ? 'bg-emerald-400 text-stone-950 border-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                        : 'bg-stone-900/90 border-stone-700 text-stone-300 hover:border-stone-500'
                    }`}
                    title="Right Turn Signal"
                  >
                    R ▶
                  </button>
                  <button
                    onClick={toggleWipers}
                    className={`w-8 sm:w-9 py-1 rounded-lg border text-[9px] font-mono font-bold transition-all ${
                      wipersActive
                        ? 'bg-sky-400 text-stone-950 border-sky-200'
                        : 'bg-stone-900/90 border-stone-700 text-stone-300'
                    }`}
                    title="Windshield Wipers"
                  >
                    🌧️
                  </button>
                  <button
                    onClick={toggleDoor}
                    className={`w-8 sm:w-9 py-1 rounded-lg border text-[9px] font-mono font-bold transition-all ${
                      doorState === 'OPEN'
                        ? 'bg-amber-400 text-stone-950 border-amber-200'
                        : 'bg-stone-900/90 border-stone-700 text-stone-300'
                    }`}
                    title="Passenger Sliding Door (O)"
                  >
                    🚪
                  </button>
                </div>

                {/* Instrument Cluster Binnacle + Bus Steering Wheel Assembly */}
                <div className="relative flex-1 h-full flex flex-col items-center justify-end">
                  {/* Raised Instrument Cluster Hood (Visible above & through top of Steering Wheel like Dr. Driving) */}
                  <div className="absolute -top-7 sm:-top-8 w-[175px] sm:w-[225px] h-[82px] sm:h-[92px] bg-stone-950 border-[3px] border-stone-700 rounded-t-[44px] rounded-b-xl shadow-[inset_0_4px_16px_rgba(0,0,0,0.95),0_-4px_14px_rgba(0,0,0,0.85)] px-3 pt-1.5 pb-1 flex flex-col justify-between pointer-events-none z-10">
                    {/* Top Row: Blinker Arrows + Analog Arc + Digital Speedometer */}
                    <div className="flex items-center justify-between px-1">
                      <span
                        className={`text-xs sm:text-sm font-black transition-opacity ${
                          turnSignal === 'LEFT' || hazardLights
                            ? 'text-emerald-400 opacity-100 drop-shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse'
                            : 'text-emerald-950 opacity-40'
                        }`}
                      >
                        ◀
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg sm:text-2xl font-black font-mono text-amber-300 tabular-nums tracking-tight drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
                          {hudSpeed}
                        </span>
                        <span className="text-[8px] font-mono font-bold text-stone-400">KM/H</span>
                      </div>
                      <span
                        className={`text-xs sm:text-sm font-black transition-opacity ${
                          turnSignal === 'RIGHT' || hazardLights
                            ? 'text-emerald-400 opacity-100 drop-shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse'
                            : 'text-emerald-950 opacity-40'
                        }`}
                      >
                        ▶
                      </span>
                    </div>

                    {/* Middle Row: RPM Bar & Gear / Fuel / Temp Cluster */}
                    <div className="w-full bg-stone-900/90 h-2 rounded-full overflow-hidden border border-stone-800 p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all duration-100"
                        style={{ width: `${Math.min(100, Math.round((hudRPM / 5200) * 100))}%` }}
                      />
                    </div>

                    {/* Bottom Row of Cluster: Fuel, Gear Indicator, Engine Temp */}
                    <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-mono px-1">
                      <span className={hudFuel < 20 ? 'text-rose-400 font-black animate-pulse' : 'text-emerald-300 font-bold'}>
                        ⛽{hudFuel}%
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-400/20 border border-amber-400/60 text-amber-300 font-black">
                        GEAR {gear}
                      </span>
                      <span className={hudHeat > 80 ? 'text-rose-400 font-black animate-pulse' : 'text-sky-300 font-bold'}>
                        🌡️{hudHeat}°C
                      </span>
                    </div>
                  </div>

                  {/* REDESIGNED 3-SPOKE COMMERCIAL BUS STEERING WHEEL (Dr. Driving Inspired) */}
                  <div
                    ref={wheelElementRef}
                    onPointerDown={handleWheelPointerDown}
                    onPointerMove={handleWheelPointerMove}
                    onPointerUp={handleWheelPointerUp}
                    onPointerCancel={handleWheelPointerUp}
                    className="relative w-[154px] h-[154px] sm:w-[186px] sm:h-[186px] rounded-full cursor-grab active:cursor-grabbing touch-none select-none flex items-center justify-center z-20 -mb-2"
                    style={{
                      transform: `rotate(${wheelVisualAngle}deg)`,
                      filter: 'drop-shadow(0 12px 20px rgba(0,0,0,0.95))',
                    }}
                  >
                    {/* SVG Commercial 3-Spoke Bus Steering Wheel */}
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

                      {/* Outer Shadow Ring */}
                      <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(0,0,0,0.65)" strokeWidth="18" />

                      {/* 3 Sculpted Commercial Bus Spokes (Left, Right, Bottom) leaving top window wide open for gauges! */}
                      {/* Left Spoke */}
                      <path
                        d="M 18 102 L 72 90 L 74 114 L 18 118 Z"
                        fill="url(#spokeMetal)"
                        stroke="#52525b"
                        strokeWidth="1.5"
                      />
                      {/* Right Spoke */}
                      <path
                        d="M 182 102 L 128 90 L 126 114 L 182 118 Z"
                        fill="url(#spokeMetal)"
                        stroke="#52525b"
                        strokeWidth="1.5"
                      />
                      {/* Bottom Center Spoke */}
                      <path
                        d="M 88 124 L 112 124 L 116 184 L 84 184 Z"
                        fill="url(#spokeMetal)"
                        stroke="#52525b"
                        strokeWidth="1.5"
                      />
                      {/* Chrome Spoke Accent Slots */}
                      <rect x="32" y="101" width="28" height="5" rx="2.5" fill="#a1a1aa" opacity="0.75" />
                      <rect x="140" y="101" width="28" height="5" rx="2.5" fill="#a1a1aa" opacity="0.75" />
                      <rect x="97" y="140" width="6" height="28" rx="3" fill="#a1a1aa" opacity="0.75" />

                      {/* Main Heavy-Duty Perforated Leather Rim */}
                      <circle
                        cx="100"
                        cy="100"
                        r="86"
                        fill="none"
                        stroke="url(#busRimGrad)"
                        strokeWidth="18"
                      />

                      {/* Classic Woodgrain / Amber Top Rim Arc */}
                      <path
                        d="M 32 50 A 86 86 0 0 1 168 50"
                        fill="none"
                        stroke="url(#woodTopGrip)"
                        strokeWidth="16"
                        strokeLinecap="round"
                      />

                      {/* Inner Rim Stitching Highlight */}
                      <circle
                        cx="100"
                        cy="100"
                        r="77"
                        fill="none"
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth="1.2"
                        strokeDasharray="6 4"
                      />

                      {/* Top-Center Yellow Alignment Stripe (Shows exact wheel angle at a glance) */}
                      <rect x="96" y="5" width="8" height="19" rx="2" fill="#facc15" stroke="#18181b" strokeWidth="1.5" />

                      {/* Center Bus Horn Pad Housing */}
                      <circle cx="100" cy="105" r="34" fill="#18181b" stroke="#52525b" strokeWidth="3" />
                      <circle cx="100" cy="105" r="28" fill="#27272a" stroke="#facc15" strokeWidth="1.5" strokeOpacity="0.6" />
                    </svg>

                    {/* Interactive Center Danfo Horn Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHorn();
                      }}
                      className="absolute w-12 h-12 sm:w-14 sm:h-14 mt-1 rounded-full bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-stone-950 font-black text-[8px] sm:text-[9px] font-['Bungee'] flex flex-col items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.85)] border-2 border-stone-900 pointer-events-auto"
                    >
                      <span>🚌</span>
                      <span>HORN</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ── CENTER SECTION: AC LOUVERS, RED HAZARD SWITCH & DANFO INFOTAINMENT CONSOLE ── */}
              <div className="hidden sm:flex flex-col justify-between items-center w-[24%] h-full py-1 px-2 border-x border-stone-800/80">
                {/* Dual Bus AC Louvers + Red Hazard Button (Just like Dr. Driving!) */}
                <div className="w-full flex items-center justify-between gap-1.5 bg-stone-950/90 px-2 py-1.5 rounded-xl border border-stone-700/80 shadow-inner">
                  {/* Left AC Vent */}
                  <div className="flex-1 h-7 bg-stone-900 rounded border border-stone-700 flex flex-col justify-evenly px-1">
                    <div className="w-full h-0.5 bg-stone-600" />
                    <div className="w-full h-0.5 bg-stone-600" />
                    <div className="w-full h-0.5 bg-stone-600" />
                  </div>
                  {/* Red Hazard Switch Button */}
                  <button
                    onClick={toggleHazards}
                    className={`w-8 h-7 rounded-lg font-black text-xs flex items-center justify-center border transition-all shadow-md ${
                      hazardLights
                        ? 'bg-rose-500 text-white border-rose-200 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.9)]'
                        : 'bg-rose-700 hover:bg-rose-600 text-rose-100 border-rose-900'
                    }`}
                    title="Hazard Warning Lights"
                  >
                    ⚠️
                  </button>
                  {/* Right AC Vent */}
                  <div className="flex-1 h-7 bg-stone-900 rounded border border-stone-700 flex flex-col justify-evenly px-1">
                    <div className="w-full h-0.5 bg-stone-600" />
                    <div className="w-full h-0.5 bg-stone-600" />
                    <div className="w-full h-0.5 bg-stone-600" />
                  </div>
                </div>

                {/* Recessed Danfo Route & Conductor Digital Display */}
                <div className="w-full flex-1 my-1 bg-stone-950 border-2 border-stone-700/90 rounded-xl p-1.5 flex flex-col justify-between shadow-inner">
                  <div className="flex items-center justify-between text-[8px] font-mono">
                    <span className="text-amber-400 font-black truncate">
                      🚏 {currentJunction ? currentJunction.name : 'TERMINAL'}
                    </span>
                    <span className="text-emerald-400 font-black">
                      {Math.max(0, distToJunc)}m
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono bg-stone-900/90 px-1.5 py-0.5 rounded border border-stone-800">
                    <span className="text-sky-300 font-bold">
                      👥 {gameState.bus.passengers?.length || 0}/{gameState.bus.capacity}
                    </span>
                    <span className="text-emerald-400 font-black">
                      ₦{gameState.conductor.collectedCash.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleCollectFares}
                      className="flex-1 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 rounded text-[8px] font-mono font-black text-emerald-300 active:scale-95"
                    >
                      💵 FARES (C)
                    </button>
                    <button
                      onClick={toggleEngine}
                      className={`px-1.5 py-0.5 rounded border text-[8px] font-mono font-black ${
                        isEngineRunning
                          ? 'bg-stone-800 border-stone-600 text-emerald-400'
                          : 'bg-amber-400 text-stone-950 border-amber-200 animate-pulse'
                      }`}
                    >
                      🔑 {isEngineRunning ? 'ON' : 'START'}
                    </button>
                  </div>
                </div>
              </div>

              {/* ── RIGHT SECTION: DR. DRIVING VERTICAL GEAR SHIFTER + RIBBED BRAKE & GAS PEDALS ── */}
              <div className="flex items-end justify-end gap-2 sm:gap-3.5 w-[52%] sm:w-[32%] h-full pr-1">
                {/* Mobile Hazard Button (visible on small screens) */}
                <button
                  onClick={toggleHazards}
                  className={`sm:hidden mb-2 w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center border ${
                    hazardLights
                      ? 'bg-rose-500 text-white border-rose-200 animate-pulse'
                      : 'bg-rose-700 text-rose-100 border-rose-900'
                  }`}
                >
                  ⚠️
                </button>

                {/* DR. DRIVING VERTICAL GEAR SHIFTER TRACK (R - N - D - P) */}
                <div className="relative h-[142px] sm:h-[158px] w-14 sm:w-16 bg-gradient-to-b from-stone-900 to-stone-950 border-[3px] border-stone-600 rounded-2xl p-1.5 flex flex-col justify-between shadow-[inset_0_4px_12px_rgba(0,0,0,0.95),0_6px_16px_rgba(0,0,0,0.85)]">
                  {/* Center Vertical Shifter Slot */}
                  <div className="absolute top-3 bottom-3 right-3 w-2 bg-stone-950 border border-stone-700 rounded-full pointer-events-none" />
                  {(['R', 'N', 'D', 'P'] as const).map((g) => {
                    const isActive = gear === g;
                    return (
                      <button
                        key={g}
                        onClick={() => {
                          setGear(g);
                          inputsRef.current.gear = g;
                          if (g === 'R') soundEngine.playReverseBeep();
                        }}
                        className={`relative z-10 w-full h-7 sm:h-8 rounded-xl font-mono font-black text-xs flex items-center justify-between px-2 transition-all ${
                          isActive
                            ? g === 'R'
                              ? 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.8)] border border-rose-200 scale-105'
                              : g === 'D'
                              ? 'bg-amber-400 text-stone-950 shadow-[0_0_12px_rgba(251,191,36,0.8)] border border-amber-200 scale-105'
                              : 'bg-sky-400 text-stone-950 shadow-[0_0_12px_rgba(56,189,248,0.8)] border border-sky-200 scale-105'
                            : 'text-stone-400 hover:text-white bg-stone-900/60'
                        }`}
                      >
                        <span>{g}</span>
                        {/* Shift Knob Handle on Active Gear */}
                        <span
                          className={`w-3.5 h-3.5 rounded-full border ${
                            isActive
                              ? 'bg-stone-950 border-white shadow-md'
                              : 'bg-stone-800 border-stone-600'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* DR. DRIVING RIBBED RUBBER BRAKE & GAS PEDALS */}
                <div className="flex items-end gap-2 sm:gap-2.5 h-full pb-0.5">
                  {/* BRAKE PEDAL (Wide Ribbed Tread) */}
                  <button
                    onPointerDown={(e) => {
                      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
                      inputsRef.current.brake = true;
                      setIsBrakePressed(true);
                      soundEngine.playAirBrakeHiss();
                    }}
                    onPointerUp={(e) => {
                      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
                      inputsRef.current.brake = false;
                      setIsBrakePressed(false);
                    }}
                    onPointerCancel={() => {
                      inputsRef.current.brake = false;
                      setIsBrakePressed(false);
                    }}
                    className={`w-14 sm:w-16 h-[92px] sm:h-[104px] rounded-xl flex flex-col items-center justify-between py-2.5 px-1.5 select-none touch-none transition-all ${
                      isBrakePressed
                        ? 'bg-rose-950 border-[3px] border-rose-400 translate-y-1.5 scale-95 shadow-[0_0_20px_rgba(244,63,94,0.75)]'
                        : 'bg-gradient-to-b from-stone-700 via-stone-800 to-stone-900 border-[3px] border-stone-500 shadow-[0_8px_16px_rgba(0,0,0,0.9)]'
                    }`}
                  >
                    <div className="w-full flex flex-col gap-1">
                      <div className="w-full h-1.5 bg-stone-950/80 rounded-full" />
                      <div className="w-full h-1.5 bg-stone-950/80 rounded-full" />
                      <div className="w-full h-1.5 bg-stone-950/80 rounded-full" />
                    </div>
                    <span className={`text-[10px] font-mono font-black tracking-wider ${isBrakePressed ? 'text-rose-300' : 'text-rose-400'}`}>
                      BRAKE
                    </span>
                    <div className="w-full flex flex-col gap-1">
                      <div className="w-full h-1.5 bg-stone-950/80 rounded-full" />
                      <div className="w-full h-1.5 bg-stone-950/80 rounded-full" />
                    </div>
                  </button>

                  {/* GAS / ACCELERATOR PEDAL (Tall Vertical Ribbed Tread like Dr. Driving) */}
                  <button
                    onPointerDown={(e) => {
                      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
                      if (!inputsRef.current.isEngineRunning) {
                        toggleEngine();
                      }
                      inputsRef.current.gas = true;
                      setIsGasPressed(true);
                    }}
                    onPointerUp={(e) => {
                      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
                      inputsRef.current.gas = false;
                      setIsGasPressed(false);
                    }}
                    onPointerCancel={() => {
                      inputsRef.current.gas = false;
                      setIsGasPressed(false);
                    }}
                    className={`w-14 sm:w-16 h-[132px] sm:h-[148px] rounded-xl flex flex-col items-center justify-between py-3 px-2 select-none touch-none transition-all ${
                      isGasPressed
                        ? 'bg-amber-400 text-stone-950 border-[3px] border-amber-200 translate-y-1.5 scale-95 shadow-[0_0_24px_rgba(251,191,36,0.85)]'
                        : 'bg-gradient-to-b from-stone-700 via-stone-800 to-stone-900 border-[3px] border-amber-400/80 shadow-[0_8px_16px_rgba(0,0,0,0.9)]'
                    }`}
                  >
                    <div className="w-full flex justify-between gap-1 h-8">
                      <div className={`flex-1 rounded-full ${isGasPressed ? 'bg-stone-900/40' : 'bg-stone-950/80'}`} />
                      <div className={`flex-1 rounded-full ${isGasPressed ? 'bg-stone-900/40' : 'bg-stone-950/80'}`} />
                      <div className={`flex-1 rounded-full ${isGasPressed ? 'bg-stone-900/40' : 'bg-stone-950/80'}`} />
                    </div>
                    <span className={`text-[11px] font-mono font-black tracking-wider ${isGasPressed ? 'text-stone-950' : 'text-amber-400'}`}>
                      GAS
                    </span>
                    <div className="w-full flex justify-between gap-1 h-8">
                      <div className={`flex-1 rounded-full ${isGasPressed ? 'bg-stone-900/40' : 'bg-stone-950/80'}`} />
                      <div className={`flex-1 rounded-full ${isGasPressed ? 'bg-stone-900/40' : 'bg-stone-950/80'}`} />
                      <div className={`flex-1 rounded-full ${isGasPressed ? 'bg-stone-900/40' : 'bg-stone-950/80'}`} />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════ EXTERNAL CAMERA MODES (3RD PERSON / BIRD EYE / 360) OR ON-FOOT CONTROLS ═══════ */}
      {(isSteppedDown || cameraMode !== 'FIRST_PERSON') && (
        <>
          {/* BOTTOM-LEFT: Redesigned 3-Spoke Wheel or Walk Joystick */}
          <div className="absolute bottom-4 left-2 z-50 pointer-events-auto flex flex-col items-start">
            <button
              onClick={() => setShowLeftPanel((v) => !v)}
              className="mb-1 w-8 h-5 bg-stone-900/80 border border-stone-700/50 rounded text-stone-400 text-[8px] flex items-center justify-center"
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
                  <div className="flex flex-col gap-1.5" style={{ transform: 'scale(0.9)', transformOrigin: 'bottom left' }}>
                    <button
                      onClick={() => triggerTurnSignal('LEFT')}
                      className={`w-10 p-1.5 rounded border text-[9px] font-bold text-center ${
                        turnSignal === 'LEFT' ? 'bg-amber-400 text-stone-950 border-amber-300' : 'bg-stone-900/80 border-stone-700 text-stone-300'
                      }`}
                    >
                      ⬅️
                    </button>
                    <button
                      onClick={() => triggerTurnSignal('RIGHT')}
                      className={`w-10 p-1.5 rounded border text-[9px] font-bold text-center ${
                        turnSignal === 'RIGHT' ? 'bg-amber-400 text-stone-950 border-amber-300' : 'bg-stone-900/80 border-stone-700 text-stone-300'
                      }`}
                    >
                      ➡️
                    </button>
                    <button
                      onClick={toggleHazards}
                      className={`w-10 p-1.5 rounded border text-[9px] font-bold text-center ${
                        hazardLights ? 'bg-amber-500 text-stone-950 animate-pulse' : 'bg-stone-900/80 border-stone-700 text-stone-300'
                      }`}
                    >
                      🚨
                    </button>
                    <button
                      onClick={toggleWipers}
                      className={`w-10 p-1.5 rounded border text-[9px] font-bold text-center ${
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
                    className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full cursor-grab active:cursor-grabbing touch-none select-none flex items-center justify-center"
                    style={{
                      transform: `rotate(${wheelVisualAngle}deg)`,
                      filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.9))',
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
                      className="absolute w-11 h-11 mt-1 bg-amber-400 hover:bg-amber-300 active:bg-amber-200 text-stone-950 rounded-full font-black text-[9px] font-['Bungee'] flex items-center justify-center shadow-lg border border-stone-900 transition-transform active:scale-95"
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
                    className="relative w-32 h-32 rounded-full bg-stone-950/90 backdrop-blur-md border-2 border-amber-400/80 shadow-2xl touch-none select-none flex items-center justify-center cursor-grab active:cursor-grabbing"
                  >
                    <div className="absolute top-1 text-[8px] font-black text-amber-400/80 font-mono">▲ W</div>
                    <div className="absolute bottom-1 text-[8px] font-black text-amber-400/80 font-mono">▼ S</div>
                    <div className="absolute left-1.5 text-[8px] font-black text-amber-400/80 font-mono">◀ A</div>
                    <div className="absolute right-1.5 text-[8px] font-black text-amber-400/80 font-mono">D ▶</div>
                    <div
                      className="w-14 h-14 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-stone-950 font-black text-[10px] shadow-xl border-2 border-amber-200 flex items-center justify-center pointer-events-none transition-transform duration-75"
                      style={{
                        transform: `translate(${walkJoyVisual.x}px, ${walkJoyVisual.y}px)`,
                      }}
                    >
                      WALK
                    </div>
                  </div>
                  <div className="mt-1 text-[8px] font-mono font-bold text-amber-400 bg-stone-950/90 px-2 py-0.5 rounded-full border border-amber-500/40">
                    DRAG TO WALK
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM-RIGHT: Pedals & Gear */}
          <div className="absolute bottom-4 right-2 z-50 pointer-events-auto flex flex-col items-end">
            <button
              onClick={() => setShowRightPanel((v) => !v)}
              className="mb-1 w-8 h-5 bg-stone-900/80 border border-stone-700/50 rounded text-stone-400 text-[8px] flex items-center justify-center"
            >
              {showRightPanel ? '▶' : '◀'}
            </button>
            <div
              className={`flex items-end gap-2 transition-opacity duration-300 origin-bottom-right ${
                showRightPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {!isSteppedDown ? (
                <>
                  <div className="flex flex-col bg-stone-900/90 backdrop-blur border-2 border-stone-700 p-1 rounded-xl shadow-lg">
                    {(['R', 'N', 'D', 'P'] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => {
                          setGear(g);
                          inputsRef.current.gear = g;
                        }}
                        className={`w-7 h-7 rounded-lg font-mono font-black text-[10px] transition-all flex items-center justify-center my-0.5 ${
                          gear === g
                            ? 'bg-amber-400 text-stone-950 shadow-md ring-1 ring-amber-300 scale-105'
                            : 'text-stone-400 hover:text-white'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      onPointerDown={(e) => {
                        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
                        inputsRef.current.brake = true;
                        setIsBrakePressed(true);
                        soundEngine.playAirBrakeHiss();
                      }}
                      onPointerUp={(e) => {
                        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
                        inputsRef.current.brake = false;
                        setIsBrakePressed(false);
                      }}
                      onPointerCancel={() => {
                        inputsRef.current.brake = false;
                        setIsBrakePressed(false);
                      }}
                      className={`w-14 h-20 bg-stone-900/95 rounded-xl flex flex-col items-center justify-center shadow-xl transition-all select-none touch-none ${
                        isBrakePressed
                          ? 'bg-rose-950 border-2 border-rose-500 scale-95 shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                          : 'border border-stone-600 active:border-rose-500'
                      }`}
                    >
                      <span className={`text-[10px] font-mono font-black ${isBrakePressed ? 'text-rose-300' : 'text-rose-400'}`}>BRAKE</span>
                      <span className="text-[7px] text-stone-400 font-mono mt-0.5">STOP</span>
                    </button>
                    <button
                      onPointerDown={(e) => {
                        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
                        inputsRef.current.gas = true;
                        setIsGasPressed(true);
                      }}
                      onPointerUp={(e) => {
                        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
                        inputsRef.current.gas = false;
                        setIsGasPressed(false);
                      }}
                      onPointerCancel={() => {
                        inputsRef.current.gas = false;
                        setIsGasPressed(false);
                      }}
                      className={`w-14 h-28 rounded-xl flex flex-col items-center justify-center shadow-xl transition-all select-none touch-none ${
                        isGasPressed
                          ? 'bg-amber-400 text-stone-950 border-2 border-amber-300 scale-95 shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                          : 'bg-stone-900/95 border border-stone-600 active:border-amber-500'
                      }`}
                    >
                      <span className={`text-[10px] font-mono font-black ${isGasPressed ? 'text-stone-950' : 'text-amber-400'}`}>GAS</span>
                      <span className={`text-[7px] font-mono mt-0.5 ${isGasPressed ? 'text-stone-800' : 'text-stone-400'}`}>DRIVE</span>
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={toggleStepDown}
                  className="px-6 py-4 bg-amber-400 text-stone-950 font-black rounded-xl shadow-2xl active:scale-95 animate-bounce mb-8"
                >
                  GET IN BUS
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══════ ACTION FEED (Positioned cleanly above dashboard in First-Person) ═══════ */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col gap-0.5 items-center transition-all ${
          !isSteppedDown && cameraMode === 'FIRST_PERSON' ? 'bottom-[37%]' : 'bottom-3'
        }`}
        style={{ maxWidth: '52vw' }}
      >
        {actionFeed.slice(0, 2).map((msg, i) => (
          <div
            key={i}
            className={`text-[9px] px-2.5 py-0.5 rounded-full bg-stone-950/85 border border-stone-800/80 backdrop-blur font-mono truncate max-w-full ${
              i === 0 ? 'text-amber-300 font-bold' : 'text-stone-400 opacity-75'
            }`}
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
            setGameState((prev) => ({
              ...prev,
              walletNaira: Math.max(0, prev.walletNaira - cost + (reward?.cashNaira || 0)),
              streetCred: Math.max(0, prev.streetCred + (reward?.streetCred || 0)),
            }));
            addFeedMessage(msg);
            setActiveNpc(null);
          }}
        />
      )}
    </div>
  );
};
