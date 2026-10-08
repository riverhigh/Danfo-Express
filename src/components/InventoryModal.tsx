import React from 'react';
import { GameState, InventoryItem } from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { X, Package, CookingPot, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  addFeedMessage: (msg: string) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  gameState,
  setGameState,
  addFeedMessage,
}) => {
  if (!isOpen) return null;

  // Use / Consume item
  const handleUseItem = (item: InventoryItem) => {
    if (item.category === 'MEAL') {
      soundEngine.playCoin();
      setGameState((prev) => ({
        ...prev,
        inventory: prev.inventory
          .map((i) => (i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i))
          .filter((i) => i.quantity > 0),
        hustleMeter: Math.min(100, prev.hustleMeter + 45),
      }));
      addFeedMessage(`😋 ATE ${item.name}: Delicious meal! Stamina & Hustle Meter restored.`);
    } else if (item.id.includes('coolant')) {
      soundEngine.playSplash();
      setGameState((prev) => ({
        ...prev,
        inventory: prev.inventory
          .map((i) => (i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i))
          .filter((i) => i.quantity > 0),
        bus: {
          ...prev.bus,
          heat: Math.max(10, prev.bus.heat - 40),
        },
      }));
      addFeedMessage('❄️ RADIATOR COOLANT POURED: Engine temperature dropped by 40°C!');
    } else if (item.category === 'GROCERY') {
      addFeedMessage(`🍳 ${item.name}: Cook this in your kitchen at home via the Housing app!`);
    } else {
      soundEngine.playUpgradeChime();
      addFeedMessage(`✨ EQUIPPED ${item.name}: Swag active on Lagos road.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border-2 border-amber-400/60 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            <h3 className="font-black text-lg text-white font-['Bungee']">
              DRIVER INVENTORY
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto space-y-2.5">
          {gameState.inventory.length === 0 ? (
            <div className="p-8 text-center text-stone-500 font-mono text-xs">
              Inventory is empty. Buy groceries, food, or spare parts from roadside shops or phone boutique!
            </div>
          ) : (
            gameState.inventory.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-stone-950 border border-stone-800 rounded-2xl flex items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl shrink-0">{item.icon}</span>
                  <div>
                    <div className="font-bold text-xs text-white flex items-center gap-1.5">
                      <span>{item.name}</span>
                      <span className="text-[10px] text-amber-400 font-mono">x{item.quantity}</span>
                    </div>
                    <div className="text-[10px] text-stone-400">{item.description}</div>
                    {item.effect && (
                      <div className="text-[10px] font-semibold text-emerald-400 mt-0.5">
                        {item.effect}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleUseItem(item)}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs rounded-xl shadow shrink-0 font-mono"
                >
                  {item.category === 'MEAL' ? 'EAT' : item.category === 'SPARE_PART' ? 'USE' : 'INSPECT'}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="pt-2 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
