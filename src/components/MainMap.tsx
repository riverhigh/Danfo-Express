import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Zap, ShoppingBag, Car, Fuel, Home, X, Navigation } from 'lucide-react';

export type MapLocation = {
  id: string;
  name: string;
  label: string;
  icon: string;
  x: number; // % from left
  y: number; // % from top
  type: 'JUNCTION' | 'GARAGE' | 'DEALERSHIP' | 'MARKET' | 'GAS_STATION' | 'HOME' | 'PARK';
  description: string;
  color: string;
};

const LAGOS_LOCATIONS: MapLocation[] = [
  { id: 'home-mushin', name: 'Mushin Home', label: 'HOME', icon: '🏠', x: 22, y: 60, type: 'HOME', description: 'Your base. Sleep, cook, and save game here.', color: 'bg-emerald-400' },
  { id: 'park-oshodi', name: 'Oshodi Motor Park', label: 'PARK', icon: '🚌', x: 35, y: 52, type: 'PARK', description: 'Pick up passengers. Start your daily Danfo shift.', color: 'bg-amber-400' },
  { id: 'junction-ikeja', name: 'Ikeja Along', label: 'JUNCTION', icon: '📍', x: 28, y: 38, type: 'JUNCTION', description: 'Busy junction. Pick up Ikeja commuters.', color: 'bg-sky-400' },
  { id: 'dealership-ladipo', name: "Ladipo Car Dealership", label: 'DEALERSHIP', icon: '🚗', x: 48, y: 45, type: 'DEALERSHIP', description: 'Buy new Danfos, electric scooters, and private cars.', color: 'bg-purple-400' },
  { id: 'market-oshodi', name: 'Oshodi Market', label: 'MARKET', icon: '🛒', x: 38, y: 58, type: 'MARKET', description: 'Buy Kolo pot, groceries and spare parts here.', color: 'bg-rose-400' },
  { id: 'gas-total', name: 'Total Fuel Station', label: 'FUEL', icon: '⛽', x: 55, y: 40, type: 'GAS_STATION', description: 'Refuel your Danfo. Diesel ₦950/litre.', color: 'bg-orange-400' },
  { id: 'junction-maryland', name: 'Maryland Junction', label: 'JUNCTION', icon: '📍', x: 45, y: 32, type: 'JUNCTION', description: 'Route to Ikeja or Third Mainland.', color: 'bg-sky-400' },
  { id: 'park-cms', name: 'CMS Marina Terminal', label: 'PARK', icon: '🚢', x: 62, y: 72, type: 'PARK', description: 'Island terminus. Premium fares. High police presence.', color: 'bg-amber-400' },
  { id: 'garage-anthony', name: 'Anthony Auto Garage', label: 'GARAGE', icon: '🔧', x: 42, y: 24, type: 'GARAGE', description: 'Mechanics row. Repair, upgrade and tune your bus.', color: 'bg-stone-400' },
  { id: 'junction-ojuelegba', name: 'Ojuelegba', label: 'JUNCTION', icon: '📍', x: 52, y: 60, type: 'JUNCTION', description: 'The heart of Lagos streets. Busy crossroads.', color: 'bg-sky-400' },
  { id: 'junction-yaba', name: 'Yaba', label: 'JUNCTION', icon: '📍', x: 55, y: 55, type: 'JUNCTION', description: 'Tech hub area. Students and workers commute here.', color: 'bg-sky-400' },
  { id: 'gas-oando', name: 'Oando Filling Station', label: 'FUEL', icon: '⛽', x: 30, y: 48, type: 'GAS_STATION', description: 'Cheaper diesel. Sometimes has long queues.', color: 'bg-orange-400' },
  { id: 'junction-bridge', name: 'Third Mainland Bridge', label: 'JUNCTION', icon: '🌉', x: 65, y: 48, type: 'JUNCTION', description: 'Lagos longest bridge. 80km/h. High speed route to Island.', color: 'bg-sky-400' },
  { id: 'junction-vi', name: 'Victoria Island', label: 'JUNCTION', icon: '🏙️', x: 72, y: 68, type: 'JUNCTION', description: 'Business district. Premium fares, but strict LASTMA.', color: 'bg-sky-400' },
];

const ROAD_PATHS = [
  // Horizontal expressway (top)
  { x1: 15, y1: 32, x2: 85, y2: 32 },
  // Third Mainland bridge
  { x1: 62, y1: 48, x2: 72, y2: 68 },
  // Maryland to Ojuelegba
  { x1: 45, y1: 32, x2: 52, y2: 60 },
  // Oshodi spine
  { x1: 35, y1: 52, x2: 62, y2: 72 },
  // Mushin connector
  { x1: 22, y1: 60, x2: 38, y2: 58 },
  // Ikeja down
  { x1: 28, y1: 38, x2: 35, y2: 52 },
  // Anthony to Maryland
  { x1: 42, y1: 24, x2: 45, y2: 32 },
  // Yaba-Ojuelegba
  { x1: 55, y1: 55, x2: 52, y2: 60 },
  // Total to Maryland
  { x1: 55, y1: 40, x2: 45, y2: 32 },
];

interface MainMapProps {
  isOpen: boolean;
  onClose: () => void;
  walletNaira: number;
  onNavigateTo: (location: MapLocation) => void;
}

export const MainMap: React.FC<MainMapProps> = ({ isOpen, onClose, walletNaira, onNavigateTo }) => {
  const [selected, setSelected] = useState<MapLocation | null>(null);
  const [playerPos, setPlayerPos] = useState({ x: 22, y: 60 }); // starts at home
  const [isTransiting, setIsTransiting] = useState(false);

  if (!isOpen) return null;

  const handleNavigate = () => {
    if (!selected || isTransiting) return;
    setIsTransiting(true);
    // Animate player dot to destination
    setTimeout(() => {
      setPlayerPos({ x: selected.x, y: selected.y });
      setTimeout(() => {
        setIsTransiting(false);
        onNavigateTo(selected);
        onClose();
      }, 600);
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-stone-950 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <Navigation className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="font-black text-amber-400 font-['Bungee'] text-base">LAGOS CITY MAP</h2>
            <p className="text-[10px] text-stone-400">Tap a location to navigate • Wallet: ₦{walletNaira.toLocaleString()}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-300 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative overflow-hidden bg-[#0c1a0d]">
        
        {/* SVG Road Network */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {ROAD_PATHS.map((r, i) => (
            <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
              stroke="#44403c" strokeWidth="0.8" strokeDasharray="1,0.5" />
          ))}
          {/* Expressway road (thicker) */}
          <line x1="15" y1="32" x2="85" y2="32" stroke="#57534e" strokeWidth="1.4" />
          {/* Water (Lagos lagoon) */}
          <ellipse cx="65" cy="82" rx="28" ry="12" fill="#0f2744" opacity="0.8" />
          <text x="60" y="83" fontSize="2.5" fill="#38bdf8" fontWeight="bold" fontFamily="monospace">LAGOS LAGOON</text>
        </svg>

        {/* Lagos district color zones */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute rounded-full opacity-10 bg-amber-400" style={{ left: '20%', top: '45%', width: '18%', height: '22%' }} />
          <div className="absolute rounded-full opacity-10 bg-purple-500" style={{ left: '40%', top: '35%', width: '22%', height: '20%' }} />
          <div className="absolute rounded-full opacity-10 bg-blue-500" style={{ left: '56%', top: '55%', width: '20%', height: '22%' }} />
        </div>

        {/* Location Pins */}
        {LAGOS_LOCATIONS.map((loc) => (
          <button
            key={loc.id}
            onClick={() => setSelected(loc)}
            style={{ left: `${loc.x}%`, top: `${loc.y}%`, transform: 'translate(-50%, -50%)' }}
            className={`absolute flex flex-col items-center gap-0.5 transition-all active:scale-90 ${selected?.id === loc.id ? 'z-20 scale-125' : 'z-10 hover:scale-110'}`}
          >
            <div className={`w-8 h-8 rounded-full ${loc.color} flex items-center justify-center shadow-lg text-base ${selected?.id === loc.id ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent' : ''}`}>
              {loc.icon}
            </div>
            <span className="text-[8px] font-bold text-white bg-black/60 px-1 rounded whitespace-nowrap">{loc.name.split(' ')[0]}</span>
          </button>
        ))}

        {/* Player dot */}
        <div
          style={{ left: `${playerPos.x}%`, top: `${playerPos.y}%`, transform: 'translate(-50%, -50%)', transition: 'all 0.6s ease-in-out' }}
          className="absolute z-30 pointer-events-none"
        >
          <div className="w-5 h-5 rounded-full bg-amber-400 border-2 border-white shadow-xl flex items-center justify-center text-[10px]">🚌</div>
          <div className="absolute -inset-1 rounded-full bg-amber-400/30 animate-ping" />
        </div>

        {/* Legend */}
        <div className="absolute bottom-2 left-2 bg-black/70 rounded-xl p-2 space-y-1 text-[9px] text-stone-300">
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Park / Shift Start</div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />Dealership</div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />Market</div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-stone-400 inline-block" />Garage</div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />Fuel Station</div>
        </div>
      </div>

      {/* Location Detail Panel */}
      {selected && (
        <div className="bg-stone-950 border-t-2 border-amber-500/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selected.icon}</span>
              <div>
                <h3 className="font-black text-amber-400 font-['Bungee'] text-sm">{selected.name}</h3>
                <p className="text-[11px] text-stone-400 mt-0.5">{selected.description}</p>
              </div>
            </div>
            <button
              onClick={handleNavigate}
              disabled={isTransiting}
              className="shrink-0 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-stone-950 font-black text-xs rounded-xl font-['Bungee'] flex items-center gap-1.5"
            >
              <Navigation className="w-3.5 h-3.5" />
              {isTransiting ? 'DRIVING...' : 'DRIVE THERE'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { LAGOS_LOCATIONS };
