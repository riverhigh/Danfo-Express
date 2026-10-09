const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeDrivingSimulator.tsx', 'utf8');

const target = `        // 6. Decoupled UI Telemetry at 10 Hz
        if (telemetryAcc >= 0.1) {`;

const replacement = `        // 6. Decoupled UI Telemetry at 10 Hz
        if (telemetryAcc >= 0.1) {
          // Drain Needs slowly (10Hz loop means dt is roughly 0.1s)
          setGameState(prev => {
             const n = prev.needs;
             return {
               ...prev,
               needs: {
                 hunger: Math.max(0, n.hunger - 0.05),
                 energy: Math.max(0, n.energy - 0.03),
                 fun: Math.max(0, n.fun - 0.04),
                 social: Math.max(0, n.social - 0.02),
                 hygiene: Math.max(0, n.hygiene - 0.01),
                 bladder: Math.max(0, n.bladder - 0.06),
               }
             };
          });
`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/ThreeDrivingSimulator.tsx', code);
