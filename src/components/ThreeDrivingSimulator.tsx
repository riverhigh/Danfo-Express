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
  actionFeed,
  addFeedMessage,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ThreeDrivingEngine | null>(null);
  const lookRef = useRef({ yaw: 0, pitch: 0, isDragging: false, startX: 0, startY: 0, startYaw: 0, startPitch: 0 });

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
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('THIRD_PERSON');
  const cameraModeRef = useRef<CameraViewMode>('THIRD_PERSON');

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  // NPC Interaction State
  const [activeNpc, setActiveNpc] = useState<LagosNpc | null>(null);

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

  // Mutable Simulation & Physics References
  const simRef = useRef({
    speed: 0,
    heat: gameState.bus.heat,
    fuel: gameState.bus.fuelPercent,
    comfort: gameState.bus.comfortMeter,
    laneOffset: 0,
    distanceTraveled: gameState.distanceTraveledMeters,
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

  // Initialize Three.js Engine on mount
  useEffect(() => {
    if (!mountRef.current) return;
    const engine = new ThreeDrivingEngine(mountRef.current, gameState.bus.id);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [gameState.bus.id]);

  const toggleEngine = () => {
    const nextState = !isEngineRunning;
    setIsEngineRunning(nextState); inputsRef.current.isEngineRunning = nextState;
    soundEngine.playEngineIgnition(nextState);
    addFeedMessage(nextState ? '🔑 ENGINE STARTED: Diesel motor rumbling!' : '🛑 ENGINE STOPPED: Ignition off.');
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
      let next: CameraViewMode = 'THIRD_PERSON';
      if (prev === 'THIRD_PERSON') next = 'FIRST_PERSON';
      else if (prev === 'FIRST_PERSON') next = 'TOP_DOWN';
      else if (prev === 'TOP_DOWN') next = 'ORBIT';
      else next = 'THIRD_PERSON';

      cameraModeRef.current = next;

      // STRICT LOGIC: Always reset look yaw/pitch so angles never desync or carry over
      lookRef.current.yaw = 0;
      lookRef.current.pitch = 0;

      const labels: Record<string, string> = {
        FIRST_PERSON: '🎥 1ST PERSON (COCKPIT - BUS FRAME ONLY)',
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
      setGameState((prev) => ({
        ...prev,
        walletNaira: prev.walletNaira + luggageFee,
        conductor: {
          ...prev.conductor,
          collectedCash: prev.conductor.collectedCash + luggageFee,
        },
      }));
      addFeedMessage(`📦 BAGGAGE LOADED: +₦${luggageFee} heavy cargo carriage fee collected!`);
    } else {
      addFeedMessage('🧳 BOOT CLOSED: Rear door slammed shut securely! (KPA-CHUCK)');
    }
  };

  // Conductor Mode Fares & Change
  const handleCollectFares = () => {
    soundEngine.playCoin();
    const fareAmt = Math.floor(Math.random() * 900) + 700;
    setGameState((prev) => ({
      ...prev,
      conductor: {
        ...prev.conductor,
        collectedCash: prev.conductor.collectedCash + fareAmt,
      },
    }));
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

    setGameState((prev) => ({
      ...prev,
      walletNaira: prev.walletNaira - totalCost,
      bus: {
        ...prev.bus,
        fuelPercent: simRef.current.fuel,
      },
    }));

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
      return {
        ...prev,
        walletNaira: prev.walletNaira - item.price,
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
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (wheelElementRef.current) {
      const rect = wheelElementRef.current.getBoundingClientRect();
      wheelCenterRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  };

  const handleWheelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!inputsRef.current.isDraggingWheel || gyroEnabled || isSteppedDown) return;
    const dx = e.clientX - wheelCenterRef.current.x;
    const dy = e.clientY - wheelCenterRef.current.y;
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;
    let normalized = angleDeg + 90;
    if (normalized > 180) normalized -= 360;
    const clamped = Math.max(-90, Math.min(90, normalized));
    simRef.current.steeringAngle = clamped;
    setWheelVisualAngle(clamped);
  };

  const handleWheelPointerUp = () => {
    inputsRef.current.isDraggingWheel = false;
  };

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if (inputsRef.current.gear === 'R' && simRef.current.speed < 2) {
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
          // soundEngine.playReverseBeep();
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
  }, [handleHorn, onConductorAction, onOpenPhone, onOpenInventory, cycleCameraMode]);

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

      // 1. Natural progressive steering wheel steer & self-centering spring
      if (inp.steerLeft) {
        sim.steeringAngle = Math.max(-90, sim.steeringAngle - 190 * dt);
        setWheelVisualAngle(sim.steeringAngle);
      } else if (inp.steerRight) {
        sim.steeringAngle = Math.min(90, sim.steeringAngle + 190 * dt);
        setWheelVisualAngle(sim.steeringAngle);
      } else if (!inp.isDraggingWheel && !inp.gyroEnabled) {
        sim.steeringAngle = sim.steeringAngle * Math.pow(0.02, dt);
        if (Math.abs(sim.steeringAngle) < 0.4) sim.steeringAngle = 0;
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

      // Lateral lane offset
      const turnDir = inp.gear === 'R' ? -1 : 1;
      sim.laneOffset -= turnDir * steerFactor * ((sim.speed / 60) * 4.2 + 0.8) * dt;
      sim.laneOffset = Math.max(-25, Math.min(25, sim.laneOffset));

      // Distance traveled: increases in D, decreases in R
      const deltaM = (sim.speed * 1000 / 3600) * dt;
      if (inp.gear === 'R') {
        sim.distanceTraveled = Math.max(0, sim.distanceTraveled - deltaM);
      } else {
        sim.distanceTraveled += deltaM;
      }

      // 3. Gas Station Detection
      const gasBays = gameState.gasStations || [];
      const nearGas = gasBays.find((g) => Math.abs(g.distanceMarkerMeters - sim.distanceTraveled) < 18 && sim.laneOffset > 2.8);
      if (nearGas && sim.speed < 5) {
        if (!activeGasStationRef.current) { activeGasStationRef.current = nearGas; setActiveGasStation(nearGas); }
      } else if (activeGasStation) {
        setActiveGasStation(null);
      }

      // 4. Roadside Shop Detection (Pulling up near shop curb)
      const shops = gameState.roadsideShops || [];
      const nearShop = shops.find((s) => Math.abs(s.distanceMarkerMeters - sim.distanceTraveled) < 18 && sim.laneOffset > 2.5);
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
        const nearJunc = juncs.find((j) => Math.abs(j.distanceMarkerMeters - sim.distanceTraveled) <= 22);

        // Keep active junction pointing to next upcoming stop
        const upcomingIdx = juncs.findIndex((j) => j.distanceMarkerMeters > sim.distanceTraveled - 16);
        if (upcomingIdx !== -1 && upcomingIdx !== sim.activeJunctionIndex) {
          sim.activeJunctionIndex = upcomingIdx;
        }

        if (nearJunc) {
          const distToJunc = nearJunc.distanceMarkerMeters - sim.distanceTraveled;
          const isAtStop = Math.abs(distToJunc) <= 18 && sim.speed < 7;

          // Check if this stop has an active Waybill Delivery destination!
          if (isAtStop && (sim.doorState === 'OPEN' || bootState === 'OPEN') && gameState.activeDelivery) {
            const delJob = gameState.activeDelivery;
            const isDeliveryMatch = 
              delJob.destinationJunctionUid === nearJunc.uid ||
              delJob.destinationName.toLowerCase().includes(nearJunc.name.toLowerCase());
            if (isDeliveryMatch) {
              soundEngine.playCoin();
              soundEngine.playHorn(true);
              addFeedMessage(`🎉 WAYBILL DELIVERED: ${delJob.itemName} handed over safely at ${nearJunc.name}! (+₦${delJob.rewardNaira.toLocaleString()} Cash Reward!)`);
              setGameState((prev) => ({
                ...prev,
                walletNaira: prev.walletNaira + delJob.rewardNaira,
                streetCred: prev.streetCred + 30,
                activeDelivery: null,
              }));
            }
          }

          if (isAtStop && sim.doorState === 'OPEN' && !nearJunc.cleared) {
            boardingTimer += dt;
            sim.isBoarding = true;

            if (boardingTimer >= 0.75) {
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
                      addFeedMessage(`🚶 ALIGHTED: ${p.name} dropped off at ${activeJ.name}! (+₦${p.fare.toLocaleString()})`);
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
                    soundEngine.playPassengerBoarding();
                    addFeedMessage(`🎟️ BOARDED: ${newPassenger.name} entered bus -> Destination: ${targetStop.name} (₦${fareToCharge})`);
                  }

                  activeJ.waitingPassengersCount = remainingWaiting;
                  const isCleared = remainingWaiting === 0 || remainingPassengers.length >= busCapacity;
                  activeJ.cleared = isCleared;
                  activeJ.stopReached = true;

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
                    walletNaira: prev.walletNaira + cashCollected,
                    streetCred: prev.streetCred + alightedCount * 5 + (isCleared ? 10 : 0),
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
      {(() => {
        const nearJ = gameState.junctions.find((j) => Math.abs(j.distanceMarkerMeters - currentDist) <= 22);
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

      {/* ═══════ BOTTOM-LEFT: Wheel / Joystick ═══════ */}
      <div className="absolute bottom-4 left-2 z-50 pointer-events-auto flex flex-col items-start">
        <button onClick={() => setShowLeftPanel(v => !v)}
          className="mb-1 w-8 h-5 bg-stone-900/80 border border-stone-700/50 rounded text-stone-400 text-[8px] flex items-center justify-center">
          {showLeftPanel ? '◀' : '▶'}
        </button>
        <div className={`flex items-end gap-2 transition-opacity duration-300 origin-bottom-left ${showLeftPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {!isSteppedDown ? (
            <>
              <div className="flex flex-col gap-1.5" style={{ transform: 'scale(0.9)', transformOrigin: 'bottom left' }}>
                <button onClick={() => triggerTurnSignal('LEFT')} className={`w-10 p-1.5 rounded border text-[9px] font-bold text-center ${turnSignal === 'LEFT' ? 'bg-amber-400 text-stone-950 border-amber-300' : 'bg-stone-900/80 border-stone-700 text-stone-300'}`}>⬅️</button>
                <button onClick={() => triggerTurnSignal('RIGHT')} className={`w-10 p-1.5 rounded border text-[9px] font-bold text-center ${turnSignal === 'RIGHT' ? 'bg-amber-400 text-stone-950 border-amber-300' : 'bg-stone-900/80 border-stone-700 text-stone-300'}`}>➡️</button>
                <button onClick={toggleHazards} className={`w-10 p-1.5 rounded border text-[9px] font-bold text-center ${hazardLights ? 'bg-amber-500 text-stone-950 animate-pulse' : 'bg-stone-900/80 border-stone-700 text-stone-300'}`}>🚨</button>
                <button onClick={toggleWipers} className={`w-10 p-1.5 rounded border text-[9px] font-bold text-center ${wipersActive ? 'bg-sky-500 text-stone-950' : 'bg-stone-900/80 border-stone-700 text-stone-300'}`}>🌧️</button>
              </div>
              <div
                ref={wheelElementRef}
                onPointerDown={handleWheelPointerDown}
                onPointerMove={handleWheelPointerMove}
                onPointerUp={handleWheelPointerUp}
                onPointerCancel={handleWheelPointerUp}
                className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full cursor-grab active:cursor-grabbing touch-none select-none flex items-center justify-center shadow-2xl"
                style={{
                  transform: `rotate(${wheelVisualAngle}deg)`,
                  background: 'radial-gradient(circle, rgba(41,37,36,0.7) 35%, rgba(12,10,9,0.95) 100%)',
                  border: '6px solid rgba(87,83,78,0.95)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.9), inset 0 2px 6px rgba(255,255,255,0.25)',
                }}>
                <div className="absolute top-0 w-3 h-2 bg-amber-400 rounded-sm" />
                <div className="absolute bottom-0 w-3 h-2 bg-amber-400 rounded-sm" />
                <div className="absolute w-full h-1.5 bg-stone-600/80 pointer-events-none" />
                <div className="absolute h-full w-1.5 bg-stone-600/80 pointer-events-none" />
                <button onClick={(e) => { e.stopPropagation(); handleHorn(); }}
                  className="relative w-10 h-10 bg-amber-400 hover:bg-amber-300 active:bg-amber-200 text-stone-950 rounded-full font-black text-[9px] font-['Bungee'] flex items-center justify-center shadow-lg border border-stone-900 transition-transform active:scale-95">
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

      {/* ═══════ BOTTOM-CENTER: Action Feed ═══════ */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col gap-0.5 items-center" style={{ maxWidth: '50vw' }}>
        {actionFeed.slice(0, 2).map((msg, i) => (
          <div key={i} className={`text-[9px] px-2 py-0.5 rounded-full bg-stone-950/80 backdrop-blur font-mono truncate max-w-full ${i === 0 ? 'text-amber-300' : 'text-stone-500 opacity-60'}`}>
            {msg}
          </div>
        ))}
      </div>

      {/* ═══════ BOTTOM-RIGHT: Pedals & Gear ═══════ */}
      <div className="absolute bottom-4 right-2 z-50 pointer-events-auto flex flex-col items-end">
        <button onClick={() => setShowRightPanel(v => !v)}
          className="mb-1 w-8 h-5 bg-stone-900/80 border border-stone-700/50 rounded text-stone-400 text-[8px] flex items-center justify-center">
          {showRightPanel ? '▶' : '◀'}
        </button>
        <div className={`flex items-end gap-2 transition-opacity duration-300 origin-bottom-right ${showRightPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {!isSteppedDown ? (
            <>
              <div className="flex flex-col bg-stone-900/85 backdrop-blur border border-stone-700/50 p-1 rounded-xl shadow-lg">
                {(['P', 'R', 'N', 'D', 'L'] as const).map((g) => (
                  <button key={g} onClick={() => setGear(g)}
                    className={`w-6 h-6 rounded-lg font-mono font-black text-[10px] transition-all flex items-center justify-center my-0.5 ${
                      gear === g ? 'bg-amber-400 text-stone-950 shadow-md ring-1 ring-amber-300 scale-105' : 'text-stone-400 hover:text-white'
                    }`}>
                    {g}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <button
                  onPointerDown={(e) => {
                    try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
                    inputsRef.current.brake = true;
                    setIsBrakePressed(true);
                    soundEngine.playAirBrakeHiss();
                  }}
                  onPointerUp={(e) => {
                    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
                    inputsRef.current.brake = false;
                    setIsBrakePressed(false);
                  }}
                  onPointerCancel={() => {
                    inputsRef.current.brake = false;
                    setIsBrakePressed(false);
                  }}
                  className={`w-14 h-18 bg-stone-900/95 rounded-xl flex flex-col items-center justify-center shadow-xl transition-all select-none touch-none ${
                    isBrakePressed
                      ? 'bg-rose-950 border-2 border-rose-500 scale-95 shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                      : 'border border-stone-600 active:border-rose-500'
                  }`}
                  style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 4px, rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.05) 8px)' }}>
                  <span className={`text-[10px] font-mono font-black ${isBrakePressed ? 'text-rose-300' : 'text-rose-400'}`}>BRAKE</span>
                  <span className="text-[7px] text-stone-400 font-mono mt-0.5">STOP</span>
                </button>
                <button
                  onPointerDown={(e) => {
                    try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
                    inputsRef.current.gas = true;
                    setIsGasPressed(true);
                  }}
                  onPointerUp={(e) => {
                    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
                    inputsRef.current.gas = false;
                    setIsGasPressed(false);
                  }}
                  onPointerCancel={() => {
                    inputsRef.current.gas = false;
                    setIsGasPressed(false);
                  }}
                  className={`w-14 h-26 rounded-xl flex flex-col items-center justify-center shadow-xl transition-all select-none touch-none ${
                    isGasPressed
                      ? 'bg-amber-400 text-stone-950 border-2 border-amber-300 scale-95 shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                      : isEngineRunning
                      ? 'bg-stone-900/95 border border-stone-600 active:border-amber-500'
                      : 'bg-stone-900/60 border border-stone-700 opacity-60'
                  }`}
                  style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 6px, rgba(251,191,36,0.1) 6px, rgba(251,191,36,0.1) 10px)' }}>
                  <span className={`text-[10px] font-mono font-black ${isGasPressed ? 'text-stone-950' : 'text-amber-400'}`}>GAS</span>
                  <span className={`text-[7px] font-mono mt-0.5 ${isGasPressed ? 'text-stone-800' : 'text-stone-400'}`}>DRIVE</span>
                </button>
              </div>
            </>
          ) : (
            <button onClick={toggleStepDown} className="px-6 py-4 bg-amber-400 text-stone-950 font-black rounded-xl shadow-2xl active:scale-95 animate-bounce mb-8">
              GET IN BUS
            </button>
          )}
        </div>
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
    
      {/* 2D DASHBOARD OVERLAY - CENTERED COMPACT INSTRUMENT CLUSTER (NEVER BLOCKS STEERING WHEEL) */}
      {!isSteppedDown && cameraMode === 'FIRST_PERSON' && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-80 max-w-[50vw] h-24 pointer-events-none z-20 flex items-end justify-center">
          <div className="relative w-full h-20 bg-stone-950/90 border border-stone-700/60 rounded-2xl shadow-[0_-5px_25px_rgba(0,0,0,0.8)] backdrop-blur-md flex items-center justify-around px-4">
            
            {/* Speedometer Center-Left of cluster */}
            <div className="flex flex-col items-center justify-center">
              <div className="text-2xl text-sky-400 font-black tracking-tight" style={{ textShadow: '0 0 10px rgba(56,189,248,0.5)' }}>
                {Math.round(simRef.current?.speed || 0)}
              </div>
              <div className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">KM/H</div>
            </div>

            {/* Center Gear Info */}
            <div className="flex flex-col items-center">
              <div className="px-2.5 py-0.5 bg-stone-900 border border-stone-700 rounded text-amber-400 font-mono text-[11px] font-black shadow-inner">
                {gear} - AUTO
              </div>
            </div>

            {/* Engine Temp Center-Right */}
            <div className="flex flex-col items-center justify-center">
              <div className="text-base text-rose-400 font-black tracking-tight">
                {Math.round(gameState.bus.heat)}°
              </div>
              <div className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">TEMP</div>
            </div>

          </div>
        </div>
      )}

</div>
  );
};
