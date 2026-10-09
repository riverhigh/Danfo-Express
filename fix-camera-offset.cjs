const fs = require('fs');
let code = fs.readFileSync('src/game/three/ThreeDrivingEngine.ts', 'utf8');

const camOld = `// Place camera on the hood/front bumper so opaque windows don't block the view!
        let cx = 0; let cy = 1.6; let cz = -1.8;
        const bId = (this as any)._currentBusId || 'RUSTIC_VAN';
        if (bId === 'KEKE_NAPEP') { cy = 1.3; cz = -0.8; }
        else if (bId === 'HONDA_CIVIC') { cy = 1.1; cz = -1.2; }
        else if (bId === 'POLICE_CAR') { cy = 1.2; cz = -1.2; }
        else if (bId === 'ARMY_JEEP') { cy = 1.5; cz = -1.5; }
        else { cy = 1.7; cz = -2.0; } // Townace/Danfo

        const localCamPos = new THREE.Vector3(cx, cy + headBob, cz);`;

const camOldWin = camOld.replace(/\n/g, '\r\n');

const camNew = `// Place camera near the steering wheel/dash, ensuring it doesn't clip backwards into the interior
        let cx = -0.45; let cy = 1.65; let cz = 0.5; // +Z is forward!
        const bId = (this as any)._currentBusId || 'RUSTIC_VAN';
        if (bId === 'KEKE_NAPEP') { cx = 0; cy = 1.3; cz = 0.2; }
        else if (bId === 'HONDA_CIVIC') { cx = -0.3; cy = 1.1; cz = 0.2; }
        else if (bId === 'POLICE_CAR') { cx = -0.3; cy = 1.2; cz = 0.2; }
        else if (bId === 'ARMY_JEEP') { cx = -0.4; cy = 1.5; cz = 0.3; }
        else { cx = -0.45; cy = 1.75; cz = 0.8; } // Townace/Danfo

        const localCamPos = new THREE.Vector3(cx, cy + headBob, cz);`;

if (code.includes(camOld)) {
    code = code.replace(camOld, camNew);
    fs.writeFileSync('src/game/three/ThreeDrivingEngine.ts', code);
    console.log("Fixed camera LF");
} else if (code.includes(camOldWin)) {
    code = code.replace(camOldWin, camNew);
    fs.writeFileSync('src/game/three/ThreeDrivingEngine.ts', code);
    console.log("Fixed camera CRLF");
} else {
    console.log("Could not find camera block!");
}
