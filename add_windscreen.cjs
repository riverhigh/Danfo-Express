const fs = require('fs');
const path = require('path');

const enginePath = path.join(__dirname, 'src/game/three/ThreeDrivingEngine.ts');
let engineContent = fs.readFileSync(enginePath, 'utf8');

// 1. Add Windscreen
const windscreenCode = `
    // Windscreen (Front Glass)
    const windscreen = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.8), glassMat);
    windscreen.position.set(0, 1.95, 2.31);
    busBody.add(windscreen);
`;

const cabinSearch = `    // Glass Windows
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.15, 4.8), glassMat);
    cabin.position.set(0, 1.9, -0.1);
    busBody.add(cabin);`;

engineContent = engineContent.replace(cabinSearch, cabinSearch + windscreenCode);
fs.writeFileSync(enginePath, engineContent);
console.log('Added windscreen');
