import { useState, useEffect } from 'react';
import { GameState, HouseTierId, ShiftTimeOfDay, BusModelId } from '../types/game';

interface SaveData {
  walletNaira: number;
  bankBalanceNaira: number;
  koloBalanceNaira: number;
  hasKolo: boolean;
  ajoContributionsNaira: number;
  streetCred: number;
  playerName: string;
  playerGender: 'MALE' | 'FEMALE';
  ownedVehicles: BusModelId[];
  selectedBusId: BusModelId;
  selectedSlogan: string;
  unlockedHouses: HouseTierId[];
  activeHouseId: HouseTierId;
}

const DEFAULT_SAVE: SaveData = {
  walletNaira: 25000,
  bankBalanceNaira: 0,
  koloBalanceNaira: 0,
  hasKolo: false,
  ajoContributionsNaira: 0,
  streetCred: 240,
  playerName: 'Driver',
  playerGender: 'MALE',
  ownedVehicles: ['RUSTIC_VAN'],
  selectedBusId: 'RUSTIC_VAN',
  selectedSlogan: 'No King as God',
  unlockedHouses: ['ROOM_AND_PARLOUR'],
  activeHouseId: 'ROOM_AND_PARLOUR'
};

const SAVE_KEY = 'danfo_express_save_v1';

export function useGameSave() {
  const [saveData, setSaveData] = useState<SaveData>(() => {
    try {
      const stored = localStorage.getItem(SAVE_KEY);
      if (stored) {
        return { ...DEFAULT_SAVE, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to load save data', e);
    }
    return DEFAULT_SAVE;
  });

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (e) {
      console.error('Failed to save data', e);
    }
  }, [saveData]);

  const updateSave = (updates: Partial<SaveData>) => {
    setSaveData(prev => ({ ...prev, ...updates }));
  };

  const wipeSave = () => {
    localStorage.removeItem(SAVE_KEY);
    setSaveData(DEFAULT_SAVE);
  };

  return { saveData, updateSave, wipeSave };
}
