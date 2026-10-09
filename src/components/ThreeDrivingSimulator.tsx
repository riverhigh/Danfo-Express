import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ThreeDrivingEngine } from '../game/three/ThreeDrivingEngine';
import { GameState, CameraViewMode, GearPosition, DoorState, JunctionStop, GasStationBay, RoadsideShop } from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { MiniMap } from './MiniMap';
import { LAGOS_NPCS, LagosNpc } from '../game/npcData';
import { NpcInteractionModal } from './NpcInteractionModal';
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
  const [isBoarding, setIsBoarding] = useState<boolean>(false);

  // NPC Interaction State
  const [activeNpc, setActiveNpc] = useState<LagosNpc | null>(null);

  // Gas Station & Roadside Shop Drive-In States
  const [activeGasStation, setActiveGasStation] = useState<GasStationBay | null>(null);
  const [activeShop, setActiveShop] = useState<RoadsideShop | null>(null);

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
    simRef.current.targetDistance = gameState.targetDistanceMeters;
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
    const engine = new ThreeDrivingEngine(mountRef.current);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const toggleEngine = () => {
    const nextState = !isEngineRunning;
    setIsEngineRunning(nextState);
    soundEngine.playEngineIgnition(nextState);
    addFeedMessage(nextState ? '🔑 ENGINE STARTED: Diesel motor rumbling!' : '🛑 ENGINE STOPPED: Ignition off.');
  };

  const toggleDoor = () => {
    const nextDoor: DoorState = doorState === 'CLOSED' ? 'OPEN' : 'CLOSED';
    setDoorState(nextDoor);
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

  const toggleStepDown = () => {
    if (simRef.current.speed > 5) {
      addFeedMessage('⚠️ Slow down to 0 KM/H before stepping down from driver seat!');
      return;
    }
    const nextStep = !isSteppedDown;
    setIsSteppedDown(nextStep);
    soundEngine.playDoorOpenClose();
    if (nextStep) {
      if (doorState === 'CLOSED') {
        setDoorState('OPEN');
        soundEngine.playDoorSlide(true);
      }
      addFeedMessage('🚶 EJECTED / STEPPED DOWN: Standing at passenger door to usher commuters in!');
      // Trigger nearby NPC if stopped
      const randomNpc = LAGOS_NPCS[Math.floor(Math.random() * LAGOS_NPCS.length)];
      setActiveNpc(randomNpc);
    } else {
      addFeedMessage('🚍 BACK IN DRIVER SEAT: Hands gripped on steering wheel, ready to accelerate!');
    }
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
    const clamped = Math.max(-125, Math.min(125, normalized));
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
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        if (inputsRef.current.gear === 'D' && simRef.current.speed < 2) {
          setGear('R');
          inputsRef.current.gear = 'R';
          inputsRef.current.gas = true;
          inputsRef.current.brake = false;
          soundEngine.playReverseBeep();
        } else if (inputsRef.current.gear === 'R') {
          inputsRef.current.gas = true;
          inputsRef.current.brake = false;
        } else {
          inputsRef.current.brake = true;
          soundEngine.playAirBrakeHiss();
        }
      }
      if (e.key === 'd' || e.key === 'D') {
        setGear('D');
        inputsRef.current.gear = 'D';
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
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') inputsRef.current.gas = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        inputsRef.current.brake = false;
        if (inputsRef.current.gear === 'R') inputsRef.current.gas = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleHorn, onConductorAction, onOpenPhone, onOpenInventory]);

  // Main 60 FPS RequestAnimationFrame Physics Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let telemetryAcc = 0;
    let boardingTimer = 0;

    const loop = (currTime: number) => {
      const dt = Math.min((currTime - lastTime) / 1000, 0.1);
      lastTime = currTime;
      telemetryAcc += dt;

      const sim = simRef.current;
      const inp = inputsRef.current;

      // 1. Steering wheel self-centering spring
      if (!inp.isDraggingWheel && !inp.gyroEnabled) {
        sim.steeringAngle = sim.steeringAngle * Math.pow(0.05, dt);
        if (Math.abs(sim.steeringAngle) < 0.6) sim.steeringAngle = 0;
      }
      const steerFactor = sim.steeringAngle / 120;

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
      sim.laneOffset += turnDir * steerFactor * ((sim.speed / 60) * 4.2 + 0.8) * dt;
      sim.laneOffset = Math.max(-5.5, Math.min(5.5, sim.laneOffset));

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
        if (!activeGasStation) setActiveGasStation(nearGas);
      } else if (activeGasStation) {
        setActiveGasStation(null);
      }

      // 4. Roadside Shop Detection (Pulling up near shop curb)
      const shops = gameState.roadsideShops || [];
      const nearShop = shops.find((s) => Math.abs(s.distanceMarkerMeters - sim.distanceTraveled) < 18 && sim.laneOffset > 2.5);
      if (nearShop && sim.speed < 6) {
        if (!activeShop) setActiveShop(nearShop);
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

      // 5. Junction Bus Stop Detection & Passenger Boarding
      const juncs = gameState.junctions;
      const currJunc = juncs[sim.activeJunctionIndex];

      if (currJunc) {
        const distToJunc = currJunc.distanceMarkerMeters - sim.distanceTraveled;
        const isAtStop = Math.abs(distToJunc) <= 14 && sim.speed < 5;

        if (isAtStop && sim.doorState === 'OPEN' && !currJunc.cleared) {
          boardingTimer += dt;
          sim.isBoarding = true;

          if (boardingTimer >= 0.8) {
            boardingTimer = 0;
            soundEngine.playPassengerBoarding();
            const fareEarned = currJunc.averageFare;

            setTimeout(() => {
              setGameState((prev) => {
                const updatedJuncs = [...prev.junctions];
                const activeJ = updatedJuncs[prev.activeJunctionIndex];
                if (!activeJ || activeJ.cleared) return prev;

                const remaining = Math.max(0, activeJ.waitingPassengersCount - 1);
                activeJ.waitingPassengersCount = remaining;
                const isCleared = remaining === 0;
                activeJ.cleared = isCleared;

                return {
                  ...prev,
                  conductor: {
                    ...prev.conductor,
                    collectedCash: prev.conductor.collectedCash + fareEarned,
                  },
                  walletNaira: prev.walletNaira + fareEarned,
                  junctions: updatedJuncs,
                  activeJunctionIndex: isCleared 
                    ? Math.min(updatedJuncs.length - 1, prev.activeJunctionIndex + 1)
                    : prev.activeJunctionIndex,
                };
              });

              addFeedMessage(`💰 COMMUTER BOARDED: +₦${fareEarned} collected!`);
            }, 0);
          }
        } else {
          sim.isBoarding = false;
        }
      }

      // Terminal reached
      if (sim.distanceTraveled >= sim.targetDistance && !sim.finished) {
        sim.finished = true;
        setTimeout(() => {
          onFinishShift(true);
        }, 0);
      }

      // 5. Update 3D Three.js Engine
      if (engineRef.current) {
        engineRef.current.update(
          {
            speedKmH: Math.round(sim.speed),
            steeringWheelAngleDeg: sim.steeringAngle,
            laneOffsetMeters: sim.laneOffset,
            gear: inp.gear,
            isBraking: inp.brake,
            cameraMode: 'CABIN_1ST',
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
          },
          dt
        );
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
  }, [gameState.junctions, gameState.activeJunctionIndex, gameState.conductor.hasConductor, gameState.gasStations, onFinishShift, setGameState, addFeedMessage, activeGasStation]);

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
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full pointer-events-auto" />

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
      {activeGasStation && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-stone-950/95 border-2 border-emerald-400 rounded-2xl px-3 py-2 shadow-2xl flex items-center gap-3 pointer-events-auto">
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
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-stone-950/95 border-2 border-amber-400 rounded-2xl px-3 py-2 shadow-2xl flex items-center gap-3 pointer-events-auto max-w-xs w-full">
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
      {isAtCurrentJunction && !activeGasStation && !activeShop && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-stone-950/95 border-2 border-amber-400 rounded-2xl px-3 py-2 shadow-2xl flex items-center gap-3 pointer-events-auto">
          <MapPin className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
          <div>
            <div className="text-[9px] font-mono font-black text-amber-400">📍 {currentJunction?.name}</div>
            <div className="text-[10px] text-white">{currentJunction?.waitingPassengersCount} waiting</div>
          </div>
          <button onClick={toggleDoor} className={`px-2.5 py-1 font-black text-[9px] font-['Bungee'] rounded-xl ${doorState === 'CLOSED' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-200'}`}>
            {doorState === 'CLOSED' ? 'OPEN' : 'CLOSE'}
          </button>
        </div>
      )}

      {/* ═══════ BOTTOM-LEFT: Wheel / Joystick ═══════ */}
      <div className="absolute bottom-4 left-2 z-30 pointer-events-auto flex flex-col items-start">
        <button onClick={() => setShowLeftPanel(v => !v)}
          className="mb-1 w-8 h-5 bg-stone-900/80 border border-stone-700/50 rounded text-stone-400 text-[8px] flex items-center justify-center">
          {showLeftPanel ? '◀' : '▶'}
        </button>
        <div className={`flex items-end gap-2 transition-opacity duration-300 origin-bottom-left ${showLeftPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {!isSteppedDown ? (
            <>
              <div className="flex flex-col gap-1" style={{ transform: 'scale(0.85)', transformOrigin: 'bottom left' }}>
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
                className="relative w-28 h-28 rounded-full cursor-grab active:cursor-grabbing touch-none select-none flex items-center justify-center shadow-2xl"
                style={{
                  transform: `rotate(${wheelVisualAngle}deg)`,
                  background: 'radial-gradient(circle, rgba(41,37,36,0.65) 35%, rgba(12,10,9,0.92) 100%)',
                  border: '7px solid rgba(68,64,60,0.85)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.85), inset 0 2px 4px rgba(255,255,255,0.15)',
                }}>
                <div className="absolute top-0 w-3 h-2 bg-amber-400 rounded-sm" />
                <div className="absolute bottom-0 w-3 h-2 bg-amber-400 rounded-sm" />
                <div className="absolute w-full h-1.5 bg-stone-600/80 pointer-events-none" />
                <div className="absolute h-full w-1.5 bg-stone-600/80 pointer-events-none" />
                <button onClick={(e) => { e.stopPropagation(); handleHorn(); }}
                  className="relative w-9 h-9 bg-amber-400/90 active:bg-amber-300 text-stone-950 rounded-full font-black text-[8px] font-['Bungee'] flex items-center justify-center shadow-lg border border-stone-900 transition-transform active:scale-95">
                  HORN
                </button>
              </div>
            </>
          ) : (
            <div className="w-28 h-28 rounded-full bg-stone-900/70 backdrop-blur border-2 border-amber-500/60 flex flex-col items-center justify-between p-2 shadow-xl">
              <button className="w-8 h-8 bg-stone-800 rounded-full flex items-center justify-center text-white text-lg active:bg-amber-400"
                onPointerDown={() => { inputsRef.current.gas = true; }} onPointerUp={() => { inputsRef.current.gas = false; }}>▲</button>
              <div className="flex w-full justify-between px-1">
                <button className="w-8 h-8 bg-stone-800 rounded-full flex items-center justify-center text-white text-lg active:bg-amber-400">◀</button>
                <button className="w-8 h-8 bg-stone-800 rounded-full flex items-center justify-center text-white text-lg active:bg-amber-400">▶</button>
              </div>
              <button className="w-8 h-8 bg-stone-800 rounded-full flex items-center justify-center text-white text-lg active:bg-amber-400"
                onPointerDown={() => { inputsRef.current.brake = true; }} onPointerUp={() => { inputsRef.current.brake = false; }}>▼</button>
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
      <div className="absolute bottom-4 right-2 z-30 pointer-events-auto flex flex-col items-end">
        <button onClick={() => setShowRightPanel(v => !v)}
          className="mb-1 w-8 h-5 bg-stone-900/80 border border-stone-700/50 rounded text-stone-400 text-[8px] flex items-center justify-center">
          {showRightPanel ? '▶' : '◀'}
        </button>
        <div className={`flex items-end gap-2 transition-opacity duration-300 origin-bottom-right ${showRightPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {!isSteppedDown && (
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
              <div className="flex items-end gap-1.5">
                <button
                  onMouseDown={() => { inputsRef.current.brake = true; soundEngine.playAirBrakeHiss(); }}
                  onMouseUp={() => { inputsRef.current.brake = false; }}
                  onTouchStart={() => { inputsRef.current.brake = true; soundEngine.playAirBrakeHiss(); }}
                  onTouchEnd={() => { inputsRef.current.brake = false; }}
                  className="w-14 h-16 bg-stone-900/90 active:bg-rose-900/90 border border-stone-600 active:border-rose-500 rounded-xl flex items-center justify-center shadow-xl transition-transform active:translate-y-1"
                  style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 4px, rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.05) 8px)' }}>
                  <span className="text-[9px] font-mono font-black text-rose-400">BRAKE</span>
                </button>
                <button
                  onMouseDown={() => { inputsRef.current.gas = true; }}
                  onMouseUp={() => { inputsRef.current.gas = false; }}
                  onTouchStart={() => { inputsRef.current.gas = true; }}
                  onTouchEnd={() => { inputsRef.current.gas = false; }}
                  className={`w-12 h-24 bg-stone-900/90 rounded-xl flex items-center justify-center shadow-xl transition-transform active:translate-y-1 ${isEngineRunning ? 'active:bg-amber-400/90 active:text-stone-950 border border-stone-600 active:border-amber-500' : 'border border-stone-700 opacity-60'}`}
                  style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 6px, rgba(251,191,36,0.1) 6px, rgba(251,191,36,0.1) 10px)' }}>
                  <span className="text-[9px] font-mono font-black text-amber-400">GAS</span>
                </button>
              </div>
            </>
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
    </div>
  );
};
