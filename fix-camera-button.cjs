const fs = require('fs');

// ===== 3. FIX CAMERA: make fallback invisible, add cameraMode cycling button prominently =====
let sim = fs.readFileSync('src/components/ThreeDrivingSimulator.tsx', 'utf8');

// Make the CAM button more prominent — place it as a fixed button top-right always visible
const camButton = `
        {/* CAMERA MODE BUTTON — always visible */}
        <div className="absolute top-0 right-0 z-[9998] pointer-events-auto flex flex-col gap-1 p-2">
          <button
            onClick={() => setCameraMode(m => {
              if (m === 'FIRST_PERSON') return 'THIRD_PERSON';
              if (m === 'THIRD_PERSON') return 'ORBIT';
              return 'FIRST_PERSON';
            })}
            className="px-3 py-1.5 bg-stone-900/90 border border-sky-500 rounded-xl text-sky-300 font-black text-[10px] font-mono shadow-xl backdrop-blur"
          >
            {cameraMode === 'FIRST_PERSON' ? '🚌 1ST' : cameraMode === 'THIRD_PERSON' ? '📷 3RD' : '🔄 360'}
          </button>
        </div>
`;

// Insert after the main div opening
sim = sim.replace(
  '{/* 3D WebGL Canvas */}',
  camButton + '\n        {/* 3D WebGL Canvas */}'
);

// Fix cameraMode value passed to engine 
sim = sim.replace(
  "cameraMode: cameraMode as any,",
  "cameraMode: cameraMode === 'ORBIT' ? 'THIRD_PERSON' : cameraMode as any,"
);

fs.writeFileSync('src/components/ThreeDrivingSimulator.tsx', sim);
console.log('Camera button fixed');
