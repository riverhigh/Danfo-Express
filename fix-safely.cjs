const fs = require('fs');

// 1. ThreeDrivingEngine.ts changes
let engine = fs.readFileSync('src/game/three/ThreeDrivingEngine.ts', 'utf8');

// Replace danfo.glb fallback safely
engine = engine.split('/models/danfo.glb').join('/models/2005_toyota_townace_gl.glb');

// Inject loadTrafficModels before setupRoadAndCity
if (!engine.includes('function loadTrafficModels')) {
  // We'll just define it outside the class or inside using regex on constructor
  const trafficLogic = `
  // Swapper function
  const swapTrafficModels = (engineInstance) => {
    const loader = new THREE.GLTFLoader(); // We don't have access to GLTFLoader directly if it's not exported to global, but we can use the one already in the file.
    // Wait, let's just insert it safely into the update loop or constructor
  };
  `;
}
// Actually, let's just completely replace the setupRoadAndCity traffic generation to load models immediately!
// I'll rewrite the entire file's traffic generation block.
const trafficGenRegex = /for \(let i = 0; i < 12; i\+\+\) \{[\s\S]*?traffic\.add\(tMesh\);/g;
const newTrafficGen = `for (let i = 0; i < 12; i++) {
        const traffic = new THREE.Group();
        const tMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 4), new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff }));
        tMesh.position.y = 1;
        traffic.add(tMesh);
        
        // Async load real models and swap
        const models = [
          '/models/1991_honda_civic_eg6.glb',
          '/models/3d_model__passenger_tricycle_keke_napep.glb',
          '/models/honda_today_g-type_police.glb',
          '/models/kia_km420.glb',
          '/models/2005_toyota_townace_gl.glb'
        ];
        const randomModel = models[Math.floor(Math.random() * models.length)];
        const loader = new GLTFLoader();
        loader.load(randomModel, (gltf) => {
          const m = gltf.scene;
          if (randomModel.includes('keke')) m.scale.set(1.2, 1.2, 1.2);
          else if (randomModel.includes('townace')) m.scale.set(1.5, 1.5, 1.5);
          else m.scale.set(1.4, 1.4, 1.4);
          m.position.set(0, 0.2, 0);
          m.rotation.y = Math.PI;
          
          traffic.clear();
          traffic.add(m);
        });`;

engine = engine.replace(trafficGenRegex, newTrafficGen);
fs.writeFileSync('src/game/three/ThreeDrivingEngine.ts', engine);
console.log('Engine traffic fixed safely.');


// 2. ThreeDrivingSimulator.tsx Dashboard injection
let sim = fs.readFileSync('src/components/ThreeDrivingSimulator.tsx', 'utf8');

// Find the line that renders the WebGL Canvas and the TOP BAR, and insert Dashboard before the return closing div
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

if (!sim.includes('2D DASHBOARD OVERLAY')) {
  // Insert right before the last closing div of the component return
  const insertPos = sim.lastIndexOf('</div>\n  );\n};');
  if (insertPos !== -1) {
    sim = sim.slice(0, insertPos) + dashHTML + '\n' + sim.slice(insertPos);
    fs.writeFileSync('src/components/ThreeDrivingSimulator.tsx', sim);
    console.log('Dashboard injected safely.');
  } else {
    console.log('Could not find insert pos for dashboard.');
  }
}
