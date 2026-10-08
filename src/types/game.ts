/**
 * Core Game Entities & State Machine Types for Danfo Express
 */

export type ScreenState = 'MENU' | 'SHIFT_ACTIVE' | 'SHIFT_RESULTS';

export type ShiftTimeOfDay = 'MORNING_RUSH' | 'MIDDAY_HUSTLE' | 'EVENING_RUSH';

export type PassengerArchetype = 
  | 'CORPORATE'       // Low noise tolerance, high fare, strict time
  | 'MARKET_WOMAN'    // High luggage, patient, haggles on change
  | 'STUDENT'         // Low fare, high speed tolerance, jumps off fast
  | 'AGBERO_TOUT'     // High tension, requires street cred or settlement
  | 'PREACHER';       // Loud, affects surrounding passenger patience

export type LagosDestination = 
  | 'Oshodi Interchange'
  | 'Ikeja Along'
  | 'Third Mainland Bridge / Obalende'
  | 'Ojuelegba Underbridge'
  | 'Lekki Phase 1 Toll Gate'
  | 'CMS Marina Terminal';

export interface Passenger {
  id: string;
  name: string;
  archetype: PassengerArchetype;
  destination: LagosDestination;
  fare: number;
  paid: boolean;
  patience: number; // 0 to 100
  maxPatience: number;
  hasBigBill: boolean; // e.g. hands ₦10,000 note
  changeNeeded: number;
  seatedAt: number; // Seat index 0..capacity-1
  satisfaction: 'HAPPY' | 'NEUTRAL' | 'ANGRY' | 'ALIGHTED';
}

export interface BusUpgrades {
  dualRadiatorFan: boolean; // Prevents overheating faster
  heavyBullBar: boolean;    // Reduces damage from bumps
  roofMegaSpeakers: boolean;// Boosts passenger patience with music
  musicalHorn: boolean;     // 3-tone musical horn
  offroadSuspension: boolean;// Less damage from potholes
  customUnderglow: boolean; // Amber/green Lagos underglow neon
}

export type RoadHazardType = 'POTHOLE' | 'OKADA_BIKE' | 'RIVAL_DANFO' | 'WATER_PUDDLE' | 'LASTMA_BARRICADE';

export interface RoadHazard {
  id: string;
  type: RoadHazardType;
  laneOffsetPx: number; // -120, -60, 0, 60, 120
  yPx: number; // 0 (top horizon) to 600 (bottom)
  speed: number; // Speed moving down or static
  width: number;
  height: number;
  hit: boolean;
}

export type CameraViewMode = 'CABIN_1ST' | 'CHASE_3RD' | 'TOP_DOWN' | 'ON_FOOT';

export type GearPosition = 'P' | 'R' | 'N' | 'D' | 'L';

export interface MissionGoal {
  id: string;
  title: string;
  location: string;
  description: string;
  timeLimitSec: number;
  targetDistanceMeters: number;
  rewardNaira: number;
  badge: string;
  type: 'PARK_OUT' | 'LANE_DISCIPLINE' | 'SMOOTH_STOP' | 'FUEL_SAVER' | 'NARROW_SQUEEZE';
}

export type BusModelId = 'RUSTIC_VAN' | 'TURBO_SPRINTER' | 'HIGH_RISER_COASTER';

export interface JunctionStop {
  id: string;
  name: string;
  landmark: string;
  distanceMarkerMeters: number;
  waitingPassengersCount: number;
  averageFare: number;
  destinationTag: LagosDestination;
  stopReached: boolean;
  cleared: boolean;
}

export interface ConductorProfile {
  id: string;
  name: string;
  nickname: string;
  dailyFee: number;
  speedMultiplier: number;
  shoutBonus: number;
  description: string;
}

export type DoorState = 'CLOSED' | 'OPEN';

export interface Bus {
  id: BusModelId;
  name: string;
  slogan: string; // e.g. "No King as God", "Face Your Front"
  speed: number;  // Current speed in km/h
  maxSpeed: number; // Max speed km/h
  acceleration: number;
  handling: number; // 0 to 1
  heat: number; // 0 to 100 (Overheat stalls at 100)
  maxHeat: number;
  heatDissipationRate: number;
  brakeHealth: number; // 0 to 100
  durability: number;  // 0 to 100 (Health of the bus)
  maxDurability: number;
  capacity: number; // Max seats (e.g. 14, 18, 24)
  passengers: Passenger[];
  upgrades: BusUpgrades;
  soundSystemVolume: number; // 0 to 100 (drowns preachers, boosts vibe)
  fuelPercent: number; // 0 to 100%
  comfortMeter: number; // 0 to 100% (Passenger smoothness rating)
  turnSignal: 'OFF' | 'LEFT' | 'RIGHT';
  hazardLights: boolean;
  wipersActive: boolean;
  isEngineRunning: boolean;
  doorState: DoorState;
}

export interface ShiftConfig {
  id: ShiftTimeOfDay;
  title: string;
  subtitle: string;
  startTime: string; // "06:00"
  endTime: string;   // "10:00"
  durationSeconds: number; // Real-world seconds for the shift
  baseTrafficDensity: number; // 0 to 1
  potholeFrequency: number;
  floodRisk: boolean;
  policePresence: number; // 0 to 1
  passengerMultiplier: number;
  unionLevy: number; // Chairman cut in Naira
}

export interface ConductorState {
  hasConductor: boolean;
  id: string;
  name: string;
  nickname: string;
  energy: number; // 0 to 100
  callingLocation: boolean;
  hangingOutDoor: boolean;
  currentAction: 'IDLE' | 'CALLING' | 'COLLECTING' | 'SLAPPING_VAN' | 'SETTLING';
  collectedCash: number;
}

export interface ShiftResultData {
  shiftId: ShiftTimeOfDay;
  shiftTitle: string;
  totalFaresCollected: number;
  passengersDelivered: number;
  passengersLost: number;
  unionLevyPaid: number;
  fuelAndRepairsCost: number;
  bribesSettled: number;
  netProfit: number;
  maxCombo: number;
  hustleScore: number;
  streetCredEarned: number;
  terminalReached: boolean;
}

export type HouseTierId = 'FACE_ME_I_SLAP_YOU' | 'SELF_CONTAIN' | 'FLAT_3BED' | 'LEKKI_DUPLEX';

export interface HouseInfo {
  id: HouseTierId;
  title: string;
  location: string;
  rentCost: number;
  purchaseCost?: number;
  isOwned: boolean;
  hasGenerator: boolean;
  generatorFuelLiters: number;
  nepaActive: boolean;
  hasStove: boolean;
  description: string;
  comfortRating: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'GROCERY' | 'MEAL' | 'SPARE_PART' | 'GEAR';
  quantity: number;
  icon: string;
  description: string;
  effect?: string;
}

export interface PhoneMessage {
  id: string;
  sender: string;
  avatar: string;
  preview: string;
  fullText: string;
  timestamp: string;
  unread: boolean;
  actionRequired?: 'PAY_RENT' | 'PAY_NEPA' | 'PAY_LEVY';
  costNaira?: number;
}

export interface GasStationBay {
  id: string;
  name: string;
  brand: string;
  distanceMarkerMeters: number;
  fuelPricePerLiter: number;
  isInBay: boolean;
}

export interface RoadsideShopItem {
  id: string;
  name: string;
  price: number;
  icon: string;
  description: string;
  category: 'GROCERY' | 'MEAL' | 'SPARE_PART' | 'GEAR';
}

export interface RoadsideShop {
  id: string;
  name: string;
  locationName: string;
  distanceMarkerMeters: number;
  category: 'TECH' | 'FOOD' | 'AUTO_PARTS' | 'GROCERY';
  items: RoadsideShopItem[];
}

export interface GameState {
  screen: ScreenState;
  activeShift: ShiftConfig;
  shiftTimeRemaining: number; // in seconds
  shiftClockDisplay: string;  // e.g. "07:45 AM"
  bus: Bus;
  conductor: ConductorState;
  
  // Economy & Progression
  walletNaira: number;
  bankBalanceNaira: number;
  streetCred: number; // Level / XP
  
  // Life Simulation & Bills
  house: HouseInfo;
  inventory: InventoryItem[];
  messages: PhoneMessage[];
  nepaBillDue: number;
  rentDue: number;
  gasStations: GasStationBay[];
  roadsideShops: RoadsideShop[];
  isGasStationBayActive: boolean;
  activeShopId: string | null;

  // Driving Dynamics & Hustle
  hustleMeter: number; // 0 to 100
  comboMultiplier: number; // 1x to 5x
  comboStreak: number;
  distanceTraveledMeters: number;
  targetDistanceMeters: number;

  // Lagos Junctions & Bus Stops along Route
  junctions: JunctionStop[];
  activeJunctionIndex: number;
  
  // Active in-bus micro-event (Overcooked style)
  activeCabinEvent: CabinEvent | null;
  
  // Results of last completed shift
  lastShiftResult: ShiftResultData | null;
  
  // Game session stats
  totalShiftsCompleted: number;
  isPaused: boolean;
}

export type CabinEventType = 
  | 'BIG_BILL_DISPUTE'   // Passenger with ₦10k note demands change
  | 'STREET_PREACHER'    // Loud preacher causing passenger irritation
  | 'AGBERO_JUMP_ON'     // Union tout hanging on rear ladder demanding money
  | 'SUDDEN_DROP_OFF'    // Passenger yells "Drop me here now!" in illegal zone
  | 'ENGINE_OVERHEAT';   // Steam pouring out, radiator needs water

export interface CabinEvent {
  id: string;
  type: CabinEventType;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  timeRemainingSeconds: number;
  targetPassengerId?: string;
  requiredActionPrompt: string;
  resolved: boolean;
  failed: boolean;
}
