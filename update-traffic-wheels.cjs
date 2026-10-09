const fs = require('fs');
let code = fs.readFileSync('src/game/three/ThreeDrivingEngine.ts', 'utf8');

// I will just use regex to add wheels to all traffic vehicles right before "traffic.position.set("
// Wait, the end of setupTrafficAndHazards loop:
const searchString = `traffic.position.set((Math.random() - 0.5) * 8, 0, (Math.random() + 0.1) * 300);`;
const replacement = `
        // --- ADD WHEELS ---
        const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheelOffsets = [
          [-0.9, 0.35, 1.2],
          [0.9, 0.35, 1.2],
          [-0.9, 0.35, -1.2],
          [0.9, 0.35, -1.2]
        ];
        wheelOffsets.forEach(pos => {
          const w = new THREE.Mesh(wheelGeo, blackMat);
          w.position.set(pos[0], pos[1], pos[2]);
          traffic.add(w);
        });
        
        traffic.position.set((Math.random() - 0.5) * 8, 0, (Math.random() + 0.1) * 300);`;

if(code.includes(searchString)) {
    code = code.replace(searchString, replacement);
    fs.writeFileSync('src/game/three/ThreeDrivingEngine.ts', code);
    console.log("Wheels added to traffic!");
} else {
    console.log("Could not find insertion point for wheels.");
}
