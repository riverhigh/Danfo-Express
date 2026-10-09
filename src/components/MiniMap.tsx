/**
 * GTA-Style MiniMap with waylines, area labels, and route path
 */
import React from 'react';
import { JunctionStop } from '../types/game';
import { MapPin, Navigation, Users } from 'lucide-react';

// Canonical map of Lagos areas with their road positions
const AREA_LANDMARKS = [
  { id: 'ikeja',     name: 'IKEJA',     x: 100, routeKm: 0,    color: '#f59e0b' },
  { id: 'oshodi',    name: 'OSHODI',    x: 100, routeKm: 1800, color: '#ef4444' },
  { id: 'surulere',  name: 'SURULERE',  x: 100, routeKm: 3000, color: '#3b82f6' },
];

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
  totalDistanceMeters,
  laneOffset,
  junctions,
  activeJunctionIndex,
  speedKmH,
}) => {
  const currentJunction = junctions[activeJunctionIndex];
  const distToNext = Math.max(0, Math.round((currentJunction?.distanceMarkerMeters || 0) - currentDistanceMeters));
  const isAtStop = distToNext <= 12;

  // Map canvas dimensions
  const W = 220;
  const H = 170;

  // How many meters visible vertically on the map
  const LOOK_AHEAD = 400;
  const LOOK_BEHIND = 80;
  const TOTAL_VIEW = LOOK_AHEAD + LOOK_BEHIND;

  // Player Y position on the canvas (from top)
  const PLAYER_Y = H * (LOOK_BEHIND / TOTAL_VIEW); // ~22% from top
  // Road center X
  const ROAD_CX = 100;
  const ROAD_HALF_W = 28;

  // Convert meters relative to player to canvas Y (ahead = upward on map)
  const mToY = (relM: number) => PLAYER_Y - (relM / TOTAL_VIEW) * H;

  // Lane offset to canvas X
  const laneToX = (offset: number) => ROAD_CX + (offset / 5.5) * ROAD_HALF_W;

  // Build route path points — straight road going up
  const routePoints = [
    `${ROAD_CX},${H}`,
    `${ROAD_CX},0`,
  ].join(' ');

  // Build next-stop wayline: thick line from player to next junction
  const nextJunc = currentJunction;
  const waypointY = nextJunc ? mToY(nextJunc.distanceMarkerMeters - currentDistanceMeters) : null;

  // Area label positions
  const areaLabels = AREA_LANDMARKS.map((area) => {
    const relM = area.routeKm - currentDistanceMeters;
    const y = mToY(relM);
    if (y < -20 || y > H + 20) return null;
    return { ...area, y };
  }).filter(Boolean);

  return (
    <div className="flex flex-col gap-1.5 select-none pointer-events-auto">
      {/* GTA-Style Map Box */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-stone-700/80"
        style={{ width: W, height: H + 32 }}>
        
        {/* Map SVG */}
        <svg width={W} height={H} className="block" style={{ background: '#111827' }}>
          <defs>
            {/* Green satellite-style terrain */}
            <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1a2e1a" />
              <stop offset="100%" stopColor="#0f1a0f" />
            </radialGradient>
            
            {/* Waypoint pulse */}
            <filter id="waypointGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Terrain background */}
          <rect width={W} height={H} fill="url(#mapGlow)" />

          {/* City blocks — left side */}
          {[-1, 0, 1, 2, 3].map((i) => (
            <rect key={`bl${i}`}
              x={8} y={i * 38 - 10}
              width={52} height={28}
              fill="#1f2937" stroke="#374151" strokeWidth="0.5" rx="1"
            />
          ))}
          {/* City blocks — right side */}
          {[-1, 0, 1, 2, 3].map((i) => (
            <rect key={`br${i}`}
              x={W - 60} y={i * 38 - 10}
              width={52} height={28}
              fill="#1f2937" stroke="#374151" strokeWidth="0.5" rx="1"
            />
          ))}

          {/* Side streets / cross roads */}
          {[0.15, 0.40, 0.65, 0.90].map((frac, i) => {
            const y = H * frac;
            return (
              <g key={`cs${i}`}>
                <line x1={60} y1={y} x2={ROAD_CX - ROAD_HALF_W - 2} y2={y} stroke="#374151" strokeWidth="2" />
                <line x1={ROAD_CX + ROAD_HALF_W + 2} y1={y} x2={W - 60} y2={y} stroke="#374151" strokeWidth="2" />
              </g>
            );
          })}

          {/* Main road asphalt */}
          <rect x={ROAD_CX - ROAD_HALF_W} y={0} width={ROAD_HALF_W * 2} height={H} fill="#1c1917" />
          {/* Road edge lines */}
          <line x1={ROAD_CX - ROAD_HALF_W} y1={0} x2={ROAD_CX - ROAD_HALF_W} y2={H} stroke="#ca8a04" strokeWidth="1.5" />
          <line x1={ROAD_CX + ROAD_HALF_W} y1={0} x2={ROAD_CX + ROAD_HALF_W} y2={H} stroke="#ca8a04" strokeWidth="1.5" />
          {/* Center dashes */}
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`dash${i}`}
              x1={ROAD_CX} y1={i * 16}
              x2={ROAD_CX} y2={i * 16 + 8}
              stroke="#facc15" strokeWidth="1" opacity="0.5"
            />
          ))}
          {/* Lane lines */}
          {[-12, 12].map((lx, i) => (
            Array.from({ length: 12 }).map((_, j) => (
              <line key={`lane${i}-${j}`}
                x1={ROAD_CX + lx} y1={j * 16}
                x2={ROAD_CX + lx} y2={j * 16 + 8}
                stroke="#374151" strokeWidth="0.8" opacity="0.6"
              />
            ))
          ))}

          {/* Area labels (Ikeja, Oshodi, Surulere) */}
          {areaLabels.map((area) => area && (
            <g key={area.id}>
              {/* Area marker dot on road */}
              <circle cx={ROAD_CX} cy={area.y} r={6} fill={area.color} opacity={0.8} />
              <line x1={ROAD_CX + 6} y1={area.y} x2={ROAD_CX + 16} y2={area.y} stroke={area.color} strokeWidth="1" />
              <text x={ROAD_CX + 18} y={area.y + 4}
                fill={area.color} fontSize="8" fontWeight="bold" fontFamily="monospace"
              >{area.name}</text>
            </g>
          ))}

          {/* Route wayline — dashed line from player to next stop */}
          {waypointY !== null && waypointY < PLAYER_Y && (
            <line
              x1={laneToX(laneOffset)} y1={PLAYER_Y}
              x2={ROAD_CX} y2={Math.max(0, waypointY)}
              stroke="#facc15" strokeWidth="2.5" strokeDasharray="6,4"
              opacity="0.85"
            />
          )}

          {/* Junction stops */}
          {junctions.map((junc, idx) => {
            const relM = junc.distanceMarkerMeters - currentDistanceMeters;
            if (relM < -60 || relM > LOOK_AHEAD) return null;
            const y = mToY(relM);
            const isTarget = idx === activeJunctionIndex;
            return (
              <g key={junc.id} filter={isTarget ? "url(#waypointGlow)" : undefined}>
                {/* Bus stop bay on right shoulder */}
                <rect
                  x={ROAD_CX + ROAD_HALF_W + 1}
                  y={y - 5} width={12} height={10}
                  fill={isTarget ? '#f59e0b' : '#3b82f6'}
                  rx="2" opacity={0.9}
                />
                {/* Pulsing beacon for active target */}
                {isTarget && (
                  <circle cx={ROAD_CX + ROAD_HALF_W + 7} cy={y} r={9}
                    fill="none" stroke="#f59e0b" strokeWidth="1.5"
                    opacity="0.6" className="animate-ping"
                  />
                )}
                {/* Stop label */}
                <text
                  x={ROAD_CX + ROAD_HALF_W + 15} y={y + 3}
                  fill={isTarget ? '#fef08a' : '#94a3b8'}
                  fontSize="7" fontWeight={isTarget ? 'bold' : 'normal'} fontFamily="monospace"
                >
                  {junc.name.split(' ').slice(0, 2).join(' ')}
                  {relM > 0 ? ` ${Math.round(relM)}m` : ' ◄'}
                </text>
              </g>
            );
          })}

          {/* Traffic dots (simulated) */}
          {[30, 80, 140, 210, 270].map((tOff, i) => {
            const relM = (tOff + currentDistanceMeters * 0.3) % LOOK_AHEAD;
            const y = mToY(relM);
            if (y < 0 || y > H) return null;
            const laneX = [ROAD_CX - 18, ROAD_CX - 8, ROAD_CX + 8][i % 3];
            return (
              <rect key={`t${i}`}
                x={laneX - 3} y={y - 5}
                width={6} height={10}
                fill={i % 3 === 0 ? '#facc15' : '#6b7280'}
                rx="1" opacity="0.75"
              />
            );
          })}

          {/* Player's Danfo (the bright yellow arrow marker) */}
          {(() => {
            const px = laneToX(laneOffset);
            const py = PLAYER_Y;
            return (
              <g transform={`translate(${px}, ${py})`}>
                {/* Heading cone / FOV  */}
                <polygon points="0,-22 -10,0 10,0" fill="rgba(250,204,21,0.15)" />
                {/* Bus body rectangle */}
                <rect x="-6" y="-8" width="12" height="16"
                  fill="#facc15" stroke="#09090b" strokeWidth="1.5" rx="2"
                />
                {/* Black double stripes */}
                <line x1="-6" y1="-2" x2="6" y2="-2" stroke="#09090b" strokeWidth="1.5" />
                <line x1="-6" y1="3" x2="6" y2="3" stroke="#09090b" strokeWidth="1.5" />
                {/* Windshield */}
                <rect x="-5" y="-7" width="10" height="4" fill="#38bdf8" opacity="0.85" />
                {/* Direction arrow */}
                <polygon points="0,-10 -3,-6 3,-6" fill="#fef08a" />
              </g>
            );
          })()}

          {/* Speed indicator top-right */}
          <text x={W - 6} y={14} fill="#facc15" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="end">
            {Math.round(speedKmH)} km/h
          </text>
          
          {/* North indicator */}
          <text x={8} y={14} fill="#94a3b8" fontSize="8" fontFamily="monospace">N↑</text>
        </svg>

        {/* Bottom progress bar + distance */}
        <div className="bg-stone-950 px-2 py-1 flex items-center gap-2" style={{ height: 32 }}>
          <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${Math.min(100, (currentDistanceMeters / Math.max(1, totalDistanceMeters)) * 100)}%` }}
            />
          </div>
          <span className="text-[9px] font-mono text-stone-400 shrink-0">
            {Math.round(currentDistanceMeters)}m / {Math.round(totalDistanceMeters)}m
          </span>
        </div>
      </div>

      {/* Active stop banner */}
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
