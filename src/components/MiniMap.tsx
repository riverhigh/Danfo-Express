import React from 'react';
import { JunctionStop } from '../types/game';

interface MiniMapProps {
  currentDistanceMeters: number;
  totalDistanceMeters: number;
  laneOffset: number;
  junctions: JunctionStop[];
  activeJunctionIndex: number;
  speedKmH: number;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  currentDistanceMeters,
  laneOffset,
  junctions,
  activeJunctionIndex
}) => {
  const currentJunction = junctions[activeJunctionIndex];
  
  // Calculate vertical offset to scroll the map background
  // A modulus keeps the city grid repeating smoothly
  const mapScrollY = (currentDistanceMeters % 1000) * 0.4;
  const playerX = 125 + (laneOffset * 3); // Map center is 125, lane offset scaled

  return (
    <div className="relative w-48 h-48 rounded-full overflow-hidden shadow-2xl border-[6px] border-[#ff66cc] bg-stone-900 shadow-[#ff66cc]/20 transition-all pointer-events-none">
      
      {/* City Grid Background (SVG) */}
      <svg
        className="absolute top-0 left-0 w-[500px] h-[1000px]"
        style={{
          transform: `translate(calc(-50% + 96px), calc(-50% + 96px + ${mapScrollY}px))`,
          transition: 'transform 0.1s linear'
        }}
      >
        <defs>
          <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
            {/* City Blocks */}
            <rect x="5" y="5" width="70" height="70" fill="#2d3748" rx="8" />
            <rect x="10" y="10" width="30" height="30" fill="#4a5568" rx="4" />
            <rect x="45" y="45" width="25" height="25" fill="#4a5568" rx="4" />
          </pattern>
        </defs>

        {/* Grass / Base */}
        <rect width="100%" height="100%" fill="#1f2937" />
        {/* Repeating Blocks */}
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* The Main Expressway (Vertical) */}
        <rect x="225" y="0" width="50" height="100%" fill="#111827" />
        
        {/* Expressway dividers */}
        <line x1="250" y1="0" x2="250" y2="1000" stroke="#f59e0b" strokeWidth="2" strokeDasharray="10 10" />
        
        {/* Intersecting Streets / Shortcuts */}
        <rect x="0" y="200" width="100%" height="30" fill="#111827" />
        <rect x="0" y="500" width="100%" height="20" fill="#111827" />
        <rect x="0" y="800" width="100%" height="40" fill="#111827" />

        {/* Street Labels */}
        <text x="180" y="218" fill="#9ca3af" fontSize="12" fontWeight="bold">Allen Ave</text>
        <text x="290" y="514" fill="#9ca3af" fontSize="12" fontWeight="bold">Toyin Str</text>
        
        {/* Points of Interest (Icons on map) */}
        <text x="150" y="250" fontSize="20">🍕</text>
        <text x="300" y="450" fontSize="20">💵</text>
        <text x="210" y="150" fontSize="20">🍸</text>
        <text x="190" y="650" fontSize="20">🛒</text>
        <text x="280" y="850" fontSize="20">🌴</text>
        
        {/* Dynamic Junction Waypoint */}
        {currentJunction && (
          <circle 
            cx="250" 
            cy={1000 - (currentJunction.distanceMarkerMeters % 1000)} 
            r="12" 
            fill="#3b82f6" 
            className="animate-ping" 
          />
        )}
      </svg>

      {/* Map Perimeter Icons (Fixed to the pink ring) */}
      <div className="absolute top-2 right-4 text-xl drop-shadow-md">🌴</div>
      <div className="absolute bottom-4 left-4 text-xl drop-shadow-md">💲</div>
      <div className="absolute bottom-2 right-8 text-xl drop-shadow-md">📼</div>

      {/* Compass North / Navigation Icon */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center font-black text-black border-[3px] border-black z-20 shadow-xl">
        N
      </div>

      <div className="absolute bottom-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center font-black text-black border-2 border-black z-20">
        <svg viewBox="0 0 24 24" fill="black" className="w-4 h-4"><path d="M12 2L21 21l-9-4-9 4 9-19z"/></svg>
      </div>

      {/* Player Arrow (Center) */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
        style={{ transform: `translate(calc(-50% + ${laneOffset * 2}px), -50%)` }}
      >
        <svg width="24" height="28" viewBox="0 0 24 28" fill="white" stroke="black" strokeWidth="2">
          <path d="M12 0 L24 28 L12 22 L0 28 Z" />
        </svg>
      </div>

    </div>
  );
};
