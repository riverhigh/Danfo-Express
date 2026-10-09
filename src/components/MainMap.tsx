import React, { useState } from 'react';
import { X, Navigation } from 'lucide-react';

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
  { id: 'park-oshodi', name: 'Oshodi Motor Park', label: 'PARK', icon: '🚍', x: 35, y: 52, type: 'PARK', description: 'Pick up passengers. Start your daily Danfo shift.', color: 'bg-amber-400' },
  { id: 'junction-ikeja', name: 'Ikeja Along', label: 'JUNCTION', icon: '📍', x: 28, y: 38, type: 'JUNCTION', description: 'Busy junction. Pick up Ikeja commuters.', color: 'bg-sky-400' },
  { id: 'dealership-ladipo', name: "Ladipo Car Dealership", label: 'DEALERSHIP', icon: '🚗', x: 48, y: 45, type: 'DEALERSHIP', description: 'Buy new Danfos, electric scooters, and private cars.', color: 'bg-purple-400' },
  { id: 'market-oshodi', name: 'Oshodi Market', label: 'MARKET', icon: '🛒', x: 38, y: 58, type: 'MARKET', description: 'Buy Kolo pot, groceries and spare parts here.', color: 'bg-rose-400' },
  { id: 'gas-total', name: 'Total Fuel Station', label: 'FUEL', icon: '⛽', x: 55, y: 40, type: 'GAS_STATION', description: 'Refuel your Danfo. Diesel ₦950/litre.', color: 'bg-orange-400' },
  { id: 'junction-maryland', name: 'Maryland Junction', label: 'JUNCTION', icon: '📍', x: 45, y: 32, type: 'JUNCTION', description: 'Route to Ikeja or Third Mainland.', color: 'bg-sky-400' },
  { id: 'park-cms', name: 'CMS Marina Terminal', label: 'PARK', icon: '🚌', x: 62, y: 72, type: 'PARK', description: 'Island terminus. Premium fares. High police presence.', color: 'bg-amber-400' },
  { id: 'garage-anthony', name: 'Anthony Auto Garage', label: 'GARAGE', icon: '🔧', x: 42, y: 24, type: 'GARAGE', description: 'Mechanics row. Repair, upgrade and tune your bus.', color: 'bg-stone-400' },
  { id: 'junction-ojuelegba', name: 'Ojuelegba', label: 'JUNCTION', icon: '📍', x: 52, y: 60, type: 'JUNCTION', description: 'The heart of Lagos streets. Busy crossroads.', color: 'bg-sky-400' },
  { id: 'junction-yaba', name: 'Yaba', label: 'JUNCTION', icon: '📍', x: 55, y: 55, type: 'JUNCTION', description: 'Tech hub area. Students and workers commute here.', color: 'bg-sky-400' },
  { id: 'gas-oando', name: 'Oando Filling Station', label: 'FUEL', icon: '⛽', x: 30, y: 48, type: 'GAS_STATION', description: 'Cheaper diesel. Sometimes has long queues.', color: 'bg-orange-400' },
  { id: 'junction-bridge', name: 'Third Mainland Bridge', label: 'JUNCTION', icon: '🌉', x: 65, y: 48, type: 'JUNCTION', description: 'Lagos longest bridge. 80km/h. High speed route to Island.', color: 'bg-sky-400' },
  { id: 'junction-vi', name: 'Victoria Island', label: 'JUNCTION', icon: '🏢', x: 72, y: 68, type: 'JUNCTION', description: 'Business district. Premium fares, but strict LASTMA.', color: 'bg-sky-400' },
];

interface MainMapProps {
  isOpen?: boolean;
  onClose: () => void;
  onNavigateTo: (loc: any) => void;
  walletNaira: number;
}

export const MainMap: React.FC<MainMapProps> = ({ isOpen, onClose, onNavigateTo, walletNaira }) => {
  const [selectedLoc, setSelectedLoc] = useState<MapLocation | null>(null);

  if (!isOpen) return null;

  const handleRoute = () => {
    if (selectedLoc) {
      onNavigateTo(selectedLoc);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1f2937] flex flex-col border-[8px] border-[#ff66cc]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-stone-950 border-b border-[#ff66cc]">
        <div className="flex items-center gap-3">
          <Navigation className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="font-black text-[#ff66cc] font-['Bungee'] text-base">LAGOS CITY MAP</h2>
            <p className="text-[10px] text-stone-400">Tap a location to navigate • Wallet: ₦{walletNaira.toLocaleString()}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-300 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative overflow-hidden bg-[#1f2937]">
        
        {/* City Grid Background (SVG) identical to MiniMap but scaled */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-50" width="100%" height="100%">
          <defs>
            <pattern id="mainGrid" width="120" height="120" patternUnits="userSpaceOnUse">
              <rect x="10" y="10" width="100" height="100" fill="#2d3748" rx="8" />
              <rect x="20" y="20" width="40" height="40" fill="#4a5568" rx="4" />
              <rect x="70" y="70" width="30" height="30" fill="#4a5568" rx="4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mainGrid)" />
          
          {/* Main Expressway */}
          <rect x="30%" y="0" width="40" height="100%" fill="#111827" />
          <line x1="calc(30% + 20px)" y1="0" x2="calc(30% + 20px)" y2="100%" stroke="#f59e0b" strokeWidth="4" strokeDasharray="20 20" />
          
          <rect x="0" y="40%" width="100%" height="30" fill="#111827" />
          <rect x="0" y="60%" width="100%" height="40" fill="#111827" />
        </svg>

        {/* POI Emojis on Map */}
        <div className="absolute top-[20%] left-[10%] text-4xl">🍕</div>
        <div className="absolute top-[40%] right-[20%] text-4xl">💵</div>
        <div className="absolute bottom-[30%] left-[40%] text-4xl">🌴</div>
        <div className="absolute top-[70%] left-[80%] text-4xl">🍸</div>

        {/* Connections (Svg paths between nodes could go here, but omitted for simplicity) */}
        
        {/* Render Locations */}
        {LAGOS_LOCATIONS.map((loc) => (
          <button
            key={loc.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 group z-10 focus:outline-none"
            style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
            onClick={() => setSelectedLoc(loc)}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-xl transition-all duration-200 border-2 border-stone-900 ${loc.color} ${selectedLoc?.id === loc.id ? 'scale-125 ring-4 ring-white z-20' : 'hover:scale-110'}`}>
              {loc.icon}
            </div>
            <div className={`mt-1 px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-[9px] font-bold whitespace-nowrap transition-opacity ${selectedLoc?.id === loc.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {loc.name}
            </div>
          </button>
        ))}

        {/* Selected Location Info Panel */}
        {selectedLoc && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-11/12 max-w-sm bg-stone-900/95 backdrop-blur-md border border-stone-700 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${selectedLoc.color} border-2 border-stone-800 shadow-inner`}>
                  {selectedLoc.icon}
                </div>
                <div>
                  <h3 className="font-black text-lg text-white font-['Bungee'] leading-tight">{selectedLoc.name}</h3>
                  <span className="text-[10px] font-bold text-stone-400 bg-stone-800 px-2 py-0.5 rounded uppercase">{selectedLoc.label}</span>
                </div>
              </div>
              <button onClick={() => setSelectedLoc(null)} className="p-1 text-stone-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-stone-300 mb-4">{selectedLoc.description}</p>
            
            <button
              onClick={handleRoute}
              className="w-full py-3 bg-[#ff66cc] hover:bg-[#ff44aa] text-white font-black rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <Navigation className="w-4 h-4" />
              SET GPS ROUTE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
