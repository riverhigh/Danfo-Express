import React from 'react';
import { JunctionStop } from '../types/game';
import { Navigation, Users, MapPin, Flag } from 'lucide-react';

interface MiniMapProps {
  currentDistanceMeters: number;
  totalDistanceMeters: number;
  laneOffset: number; // -5.5 to +5.5
  junctions: JunctionStop[];
  activeJunctionIndex: number;
  speedKmH: number;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  currentDistanceMeters,
  totalDistanceMeters,
  laneOffset,
  junctions,
  activeJunctionIndex,
  speedKmH,
}) => {
  const currentJunction = junctions[activeJunctionIndex] || junctions[junctions.length - 1];
  const distToNext = Math.max(0, Math.round((currentJunction?.distanceMarkerMeters || 0) - currentDistanceMeters));
  const isAtStop = distToNext <= 12;

  // Mini-map radar dimensions
  const mapWidth = 200;
  const mapHeight = 120;
  // Route view window: show 250m ahead and 50m behind
  const lookAhead = 300;
  const busY = mapHeight - 25; // Bus position on radar

  return (
    <div className="flex flex-col gap-1.5 select-none pointer-events-auto">
      {/* Mini-Map Radar Box */}
      <div className="relative w-48 sm:w-56 h-32 bg-stone-950/95 backdrop-blur border-2 border-stone-700/80 rounded-2xl p-2 shadow-2xl overflow-hidden flex flex-col justify-between">
        {/* Header telemetry */}
        <div className="flex items-center justify-between text-[9px] font-mono font-bold text-stone-300 z-10 border-b border-stone-800 pb-1">
          <div className="flex items-center gap-1 text-amber-400">
            <Navigation className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>GPS RADAR</span>
          </div>
          <span className="text-emerald-400 font-mono">
            {Math.round(currentDistanceMeters)}m / {Math.round(totalDistanceMeters)}m
          </span>
        </div>

        {/* SVG Road Radar Display */}
        <div className="relative flex-1 w-full h-full overflow-hidden my-0.5">
          <svg className="w-full h-full" viewBox={`0 0 ${mapWidth} ${mapHeight}`}>
            {/* Dark background grid */}
            <defs>
              <pattern id="radarGrid" width="16" height="16" patternUnits="userSpaceOnUse">
                <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#292524" strokeWidth="0.5" />
              </pattern>
              <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1c1917" />
                <stop offset="100%" stopColor="#292524" />
              </linearGradient>
            </defs>
            <rect width={mapWidth} height={mapHeight} fill="url(#radarGrid)" />

            {/* Asphalt Highway Road Corridor */}
            {/* Center X is 100 */}
            <rect x="58" y="0" width="84" height={mapHeight} fill="url(#roadGrad)" rx="2" />
            <line x1="58" y1="0" x2="58" y2={mapHeight} stroke="#ca8a04" strokeWidth="2" />
            <line x1="142" y1="0" x2="142" y2={mapHeight} stroke="#facc15" strokeWidth="2" strokeDasharray="6,4" />

            {/* Lane dividers */}
            <line x1="86" y1="0" x2="86" y2={mapHeight} stroke="#57534e" strokeWidth="1" strokeDasharray="8,6" />
            <line x1="114" y1="0" x2="114" y2={mapHeight} stroke="#57534e" strokeWidth="1" strokeDasharray="8,6" />

            {/* Junction bus stop markers on radar */}
            {junctions.map((junc, idx) => {
              const relM = junc.distanceMarkerMeters - currentDistanceMeters;
              if (relM < -40 || relM > lookAhead) return null;
              // Map relM to Y: relM = 0 -> busY, relM = lookAhead -> 10
              const yPos = busY - (relM / lookAhead) * (busY - 12);
              const isTarget = idx === activeJunctionIndex;

              return (
                <g key={junc.id}>
                  {/* Bus Stop Bay on right shoulder */}
                  <rect
                    x="142"
                    y={yPos - 6}
                    width="12"
                    height="12"
                    fill={isTarget ? '#f59e0b' : '#3b82f6'}
                    rx="2"
                    opacity={0.85}
                  />
                  {/* Radar pulse beacon if active target */}
                  {isTarget && (
                    <circle cx="148" cy={yPos} r="8" fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.7" className="animate-ping" />
                  )}
                  {/* Stop Name label */}
                  <text
                    x="158"
                    y={yPos + 3}
                    fill={isTarget ? '#fef08a' : '#94a3b8'}
                    fontSize="7"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {junc.name.split(' ')[0]} {relM > 0 ? `(${Math.round(relM)}m)` : 'HERE'}
                  </text>
                </g>
              );
            })}

            {/* Traffic cars simulation on radar */}
            {[-25, 45, 110, 190].map((tDist, i) => {
              const relM = (currentDistanceMeters * 0.4 + tDist * 4) % lookAhead;
              const yPos = busY - (relM / lookAhead) * (busY - 12);
              const laneX = i % 2 === 0 ? 72 : 100;
              return (
                <rect
                  key={i}
                  x={laneX - 3}
                  y={yPos - 4}
                  width="6"
                  height="8"
                  fill="#94a3b8"
                  opacity="0.6"
                  rx="1"
                />
              );
            })}

            {/* Player's Danfo Bus Marker */}
            {/* laneOffset: -5.5 to +5.5 maps to x: 68 to 132 */}
            {(() => {
              const busX = 100 + (laneOffset / 5.5) * 30;
              return (
                <g transform={`translate(${busX}, ${busY})`}>
                  {/* Vehicle heading glow */}
                  <circle cx="0" cy="0" r="10" fill="rgba(250, 204, 21, 0.2)" />
                  {/* Danfo Yellow Rectangle */}
                  <rect x="-4" y="-8" width="8" height="15" fill="#facc15" stroke="#09090b" strokeWidth="1" rx="1.5" />
                  {/* Black double stripes */}
                  <line x1="-4" y1="-2" x2="4" y2="-2" stroke="#09090b" strokeWidth="1" />
                  <line x1="-4" y1="2" x2="4" y2="2" stroke="#09090b" strokeWidth="1" />
                  {/* Windshield blue */}
                  <rect x="-3" y="-7" width="6" height="3" fill="#38bdf8" />
                  {/* Forward headlight beams */}
                  <polygon points="-3,-8 -7,-18 7,-18 3,-8" fill="rgba(254, 240, 138, 0.25)" />
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Bottom Route Progress Track */}
        <div className="w-full bg-stone-900 h-1.5 rounded-full overflow-hidden border border-stone-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${Math.min(100, (currentDistanceMeters / Math.max(1, totalDistanceMeters)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Target Junction Banner */}
      {currentJunction && (
        <div className={`px-2.5 py-1.5 rounded-xl border backdrop-blur flex items-center justify-between text-xs transition-colors shadow-lg ${
          isAtStop 
            ? 'bg-amber-400 text-stone-950 border-amber-300 font-black animate-pulse' 
            : 'bg-stone-950/90 text-stone-100 border-stone-800'
        }`}>
          <div className="flex items-center gap-1.5 overflow-hidden">
            <MapPin className={`w-3.5 h-3.5 shrink-0 ${isAtStop ? 'text-stone-950' : 'text-amber-400'}`} />
            <div className="truncate">
              <div className="text-[8px] uppercase tracking-wider opacity-80 leading-none">
                {isAtStop ? 'PULLED UP AT STOP' : 'NEXT JUNCTION'}
              </div>
              <div className="font-bold text-[11px] truncate">{currentJunction.name}</div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1 text-[10px] font-mono font-bold ml-2">
            {isAtStop ? (
              <span className="bg-stone-950 text-amber-400 px-1.5 py-0.5 rounded text-[9px]">STOP HERE!</span>
            ) : (
              <span>{distToNext}m</span>
            )}
            <span className="flex items-center gap-0.5 opacity-80 text-[9px]">
              <Users className="w-2.5 h-2.5" />
              {currentJunction.waitingPassengersCount}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
