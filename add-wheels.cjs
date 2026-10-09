const fs = require('fs');
let code = fs.readFileSync('src/game/three/ThreeDrivingEngine.ts', 'utf8');

const search = '        // Random Lane\r\n        const lanes = [-5.5, 0, 5.5];';
const search2 = '        // Random Lane\n        const lanes = [-5.5, 0, 5.5];';

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

        // Random Lane
        const lanes = [-5.5, 0, 5.5];`;

if (code.includes(search)) {
    code = code.replace(search, replacement);
} else if (code.includes(search2)) {
    code = code.replace(search2, replacement);
}
fs.writeFileSync('src/game/three/ThreeDrivingEngine.ts', code);
