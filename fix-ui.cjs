const fs = require('fs');

// 1. Fix default GLB missing
let engine = fs.readFileSync('src/game/three/ThreeDrivingEngine.ts', 'utf8');

// The default GLB to load instead of danfo.glb (since danfo.glb is missing)
engine = engine.replace(
  "loader.load(\n        '/models/danfo.glb',",
  "loader.load(\n        '/models/2005_toyota_townace_gl.glb',"
);

// 2. Fix the Box traffic! Swap geometry when loaded!
// Let's modify the loadTrafficModels method to swap geometry of existing boxes!
const newLoadTraffic = `
    private loadTrafficModels() {
      const loader = new GLTFLoader();
      const modelsToLoad = [
        '/models/1991_honda_civic_eg6.glb',
        '/models/3d_model__passenger_tricycle_keke_napep.glb',
        '/models/honda_today_g-type_police.glb',
        '/models/kia_km420.glb',
        '/models/2005_toyota_townace_gl.glb'
      ];
      
      modelsToLoad.forEach(path => {
        loader.load(path, (gltf) => {
          const m = gltf.scene;
          if (path.includes('keke')) m.scale.set(1.2, 1.2, 1.2);
          else if (path.includes('townace')) m.scale.set(1.5, 1.5, 1.5);
          else m.scale.set(1.4, 1.4, 1.4);
          
          m.position.set(0, 0.2, 0);
          this.trafficModels.push(m);
          
          // Swap geometry of existing boxes if any
          this.trafficMeshes.forEach(t => {
            if (t.children.length > 0 && t.children[0].type === 'Mesh') {
               // It's a box fallback, let's swap it randomly!
               if (Math.random() > 0.5) {
                 t.clear();
                 const clone = m.clone();
                 clone.rotation.y = Math.PI;
                 t.add(clone);
               }
            }
          });
        });
      });
    }
`;
engine = engine.replace(/private loadTrafficModels\(\) \{[\s\S]*?\}\n    private setupRoadAndCity/s, newLoadTraffic + '\n    private setupRoadAndCity');

fs.writeFileSync('src/game/three/ThreeDrivingEngine.ts', engine);
console.log('Engine fixed');

// 3. Inject 2D Dashboard into Simulator
let sim = fs.readFileSync('src/components/ThreeDrivingSimulator.tsx', 'utf8');

const dashHTML = `
      {/* 2D DASHBOARD OVERLAY */}
      {!isSteppedDown && cameraMode !== 'ORBIT' && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[800px] max-w-[95vw] h-40 pointer-events-none z-[80] flex items-end justify-center">
          <div className="relative w-[600px] h-32 bg-gradient-to-t from-stone-900 via-stone-800 to-transparent border-t-4 border-stone-700/50 rounded-t-full opacity-90 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] backdrop-blur-sm flex justify-between px-16 pb-4 items-end overflow-hidden">
            
            {/* Speedometer Left */}
            <div className="relative w-28 h-28 border-4 border-stone-600/50 rounded-full bg-stone-950/80 shadow-inner flex flex-col items-center justify-center">
              <div className="text-3xl text-sky-400 font-black tracking-tighter" style={{ textShadow: '0 0 10px rgba(56,189,248,0.5)' }}>
                {Math.round(simRef.current?.speed || 0)}
              </div>
              <div className="text-[10px] text-stone-400 font-bold tracking-widest uppercase">KM/H</div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                <div className={\`w-2 h-2 rounded-full \${turnSignal === 'LEFT' ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b] animate-pulse' : 'bg-stone-800'}\`} />
                <div className={\`w-2 h-2 rounded-full \${turnSignal === 'RIGHT' ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b] animate-pulse' : 'bg-stone-800'}\`} />
              </div>
            </div>

            {/* Center Info Screen */}
            <div className="flex flex-col items-center justify-end pb-2">
              <div className="px-3 py-1 bg-stone-950 border border-stone-700 rounded text-amber-500 font-mono text-xs shadow-inner">
                {gear} - AUTO
              </div>
            </div>

            {/* RPM / Heat Right */}
            <div className="relative w-28 h-28 border-4 border-stone-600/50 rounded-full bg-stone-950/80 shadow-inner flex flex-col items-center justify-center">
              <div className="text-xl text-rose-500 font-black tracking-tighter">
                {Math.round(gameState.bus.heat)}°
              </div>
              <div className="text-[10px] text-stone-400 font-bold tracking-widest uppercase">TEMP</div>
              <div className="absolute bottom-2 w-16 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" style={{ width: \`\${gameState.bus.heat}%\` }} />
              </div>
            </div>

          </div>
        </div>
      )}
`;

// Insert it right before {/* ═══════ BOTTOM UI ═══════ */}
if (!sim.includes('2D DASHBOARD OVERLAY')) {
  sim = sim.replace('{/* ═══════ BOTTOM UI ═══════ */}', dashHTML + '\n      {/* ═══════ BOTTOM UI ═══════ */}');
}

// 4. Update the Camera Mode button
sim = sim.replace(
  "{cameraMode === 'FIRST_PERSON' ? '🚌 1ST' : cameraMode === 'THIRD_PERSON' ? '📷 3RD' : '🔄 360'}",
  "{cameraMode === 'FIRST_PERSON' ? '📷 1ST' : cameraMode === 'THIRD_PERSON' ? '📷 3RD' : '📷 360'}"
);

fs.writeFileSync('src/components/ThreeDrivingSimulator.tsx', sim);
console.log('Simulator fixed');

