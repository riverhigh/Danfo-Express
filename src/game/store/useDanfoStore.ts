import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GearPosition, DoorState, CameraViewMode } from '../../types/game';

export interface DanfoStoreState {
  // Persisted Economy & Progression
  walletNaira: number;
  bankBalanceNaira: number;
  streetCred: number;
  boostCanisters: number;

  // Real-time Vehicle Telemetry (High-frequency updates from Three.js loop)
  speedKmH: number;
  gear: GearPosition;
  fuelPercent: number;
  engineHeat: number;
  comfortMeter: number;
  distanceTraveledMeters: number;
  passengersCount: number;
  capacity: number;
  isEngineRunning: boolean;
  doorState: DoorState;
  isBoosting: boolean;
  activeCameraMode: CameraViewMode;
  toastMessage: { text: string; amount?: number; timestamp: number } | null;

  // Actions
  buyBoostCanisters: (count?: number, pricePerCanister?: number) => boolean;
  useBoostCanister: () => boolean;
  addWalletNaira: (amount: number) => void;
  deductWalletNaira: (amount: number) => boolean;
  setSpeedKmH: (speed: number) => void;
  setGear: (gear: GearPosition) => void;
  setFuelPercent: (fuel: number) => void;
  setEngineRunning: (running: boolean) => void;
  setDoorState: (door: DoorState) => void;
  setIsBoosting: (boosting: boolean) => void;
  setCameraMode: (mode: CameraViewMode) => void;
  showToast: (text: string, amount?: number) => void;
  updateTelemetry: (data: {
    speedKmH?: number;
    fuelPercent?: number;
    engineHeat?: number;
    comfortMeter?: number;
    distanceTraveledMeters?: number;
    passengersCount?: number;
  }) => void;
}

export const useDanfoStore = create<DanfoStoreState>()(
  persist(
    (set, get) => ({
      walletNaira: 25000,
      bankBalanceNaira: 250000,
      streetCred: 240,
      boostCanisters: 3,

      speedKmH: 0,
      gear: 'D',
      fuelPercent: 100,
      engineHeat: 20,
      comfortMeter: 100,
      distanceTraveledMeters: 0,
      passengersCount: 6,
      capacity: 14,
      isEngineRunning: true,
      doorState: 'CLOSED',
      isBoosting: false,
      activeCameraMode: 'FIRST_PERSON',
      toastMessage: null,

      buyBoostCanisters: (count = 1, pricePerCanister = 500) => {
        const totalCost = count * pricePerCanister;
        const currentWallet = get().walletNaira;
        if (currentWallet >= totalCost) {
          set((state) => ({
            walletNaira: state.walletNaira - totalCost,
            boostCanisters: state.boostCanisters + count,
          }));
          return true;
        }
        return false;
      },

      useBoostCanister: () => {
        const currentBoosts = get().boostCanisters;
        if (currentBoosts > 0) {
          set((state) => ({
            boostCanisters: Math.max(0, state.boostCanisters - 1),
            isBoosting: true,
          }));
          return true;
        }
        return false;
      },

      addWalletNaira: (amount: number) => {
        set((state) => ({ walletNaira: state.walletNaira + amount }));
      },

      deductWalletNaira: (amount: number) => {
        const currentWallet = get().walletNaira;
        if (currentWallet >= amount) {
          set((state) => ({ walletNaira: state.walletNaira - amount }));
          return true;
        }
        return false;
      },

      setSpeedKmH: (speedKmH: number) => set({ speedKmH }),
      setGear: (gear: GearPosition) => set({ gear }),
      setFuelPercent: (fuelPercent: number) => set({ fuelPercent }),
      setEngineRunning: (isEngineRunning: boolean) => set({ isEngineRunning }),
      setDoorState: (doorState: DoorState) => set({ doorState }),
      setIsBoosting: (isBoosting: boolean) => set({ isBoosting }),
      setCameraMode: (activeCameraMode: CameraViewMode) => set({ activeCameraMode }),

      showToast: (text: string, amount?: number) => {
        set({ toastMessage: { text, amount, timestamp: Date.now() } });
      },

      updateTelemetry: (data) => {
        set((state) => ({
          ...state,
          ...(data.speedKmH !== undefined ? { speedKmH: data.speedKmH } : {}),
          ...(data.fuelPercent !== undefined ? { fuelPercent: data.fuelPercent } : {}),
          ...(data.engineHeat !== undefined ? { engineHeat: data.engineHeat } : {}),
          ...(data.comfortMeter !== undefined ? { comfortMeter: data.comfortMeter } : {}),
          ...(data.distanceTraveledMeters !== undefined ? { distanceTraveledMeters: data.distanceTraveledMeters } : {}),
          ...(data.passengersCount !== undefined ? { passengersCount: data.passengersCount } : {}),
        }));
      },
    }),
    {
      name: 'danfo_express_zustand_store',
      storage: createJSONStorage(() => localStorage),
      // Only persist long-term economic and inventory properties, not transient loop properties
      partialize: (state) => ({
        walletNaira: state.walletNaira,
        bankBalanceNaira: state.bankBalanceNaira,
        streetCred: state.streetCred,
        boostCanisters: state.boostCanisters,
      }),
    }
  )
);
