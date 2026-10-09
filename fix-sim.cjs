const fs = require('fs');
let sim = fs.readFileSync('src/components/ThreeDrivingSimulator.tsx', 'utf8');

// ===== NPC Horn/Curse when blocking lane =====
// Find where boarding timer / Junction logic sits and add a traffic NPC honk trigger

// Find addFeedMessage - we'll inject NPC horn messages into the loop
const trafficInsert = `
        // NPC honk when player is blocking their lane
        if (Math.random() < 0.0015) {
          const hornMessages = [
            '📢 "Driver move na! You dey block road!" 🚗💨',
            '🚕 "Oga park well! Area boys go vex!" 😤',
            '📯 "PAMPAMPAM! Werey driver!" 🤦',
            '🚌 "Driver! Comot for my lane abeg!" 🙏',
            '😡 "You go pay for this traffic!" 💸',
          ];
          addFeedMessage(hornMessages[Math.floor(Math.random() * hornMessages.length)]);
          soundEngine.playHorn(false);
        }
`;

// Insert into the game loop, after junction detection
sim = sim.replace(
  '// 5. Junction Bus Stop Detection',
  trafficInsert + '\n        // 5. Junction Bus Stop Detection'
);

// ===== Fix accelerometer / speedometer in 2D dashboard =====
// The issue: hudSpeed may not update fast enough. Let's also show it in real-time from simRef
sim = sim.replace(
  '<div className="text-2xl text-sky-400 font-black">{hudSpeed}</div>',
  '<div className="text-2xl text-sky-400 font-black">{Math.round(simRef.current?.speed || hudSpeed)}</div>'
);

sim = sim.replace(
  '<div className="text-2xl text-white font-black">{Math.round(hudRPM / 1000)}</div>',
  '<div className="text-2xl text-white font-black">{Math.round((hudRPM || 800) / 1000)}<span className="text-xs text-stone-500">k</span></div>'
);

// ===== Fix 2D Dashboard showing in wrong cameraMode =====
// Dashboard should show in FIRST_PERSON and THIRD_PERSON (but not ORBIT so you can see the full bus)
sim = sim.replace(
  "!isSteppedDown && cameraMode === 'FIRST_PERSON' && (",
  "!isSteppedDown && cameraMode !== 'ORBIT' && ("
);

fs.writeFileSync('src/components/ThreeDrivingSimulator.tsx', sim);
console.log('Sim fixes applied: NPC honks, speedometer, dashboard visibility');
