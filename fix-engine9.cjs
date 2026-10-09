const fs = require('fs');

// We revert it first to HEAD
const { execSync } = require('child_process');
execSync('git checkout HEAD src/game/three/ThreeDrivingEngine.ts');

let code = fs.readFileSync('src/game/three/ThreeDrivingEngine.ts', 'utf8');

// 1. Constructor
code = code.replace(/constructor\(container: HTMLElement\) \{/, "constructor(container: HTMLElement, busId: string = 'RUSTIC_VAN') {\n    (this as any)._currentBusId = busId;");

// 2. Conductor Crash Fix
code = code.replace(
  /this\.conductorMesh\.children\[4\]\.rotation\.z = slapSwing;/,
  "if (this.conductorMesh.children.length >= 5) { this.conductorMesh.children[4].rotation.z = slapSwing; }"
);

// 3. Camera Offset Fix
code = code.replace(
  /let cx = -0\.45; let cy = 1\.6; let cz = -0\.2;[\s\S]*?const localCamPos = new THREE\.Vector3\(cx, cy \+ headBob, cz\);/,
  `// Place camera on the hood/front bumper so opaque windows don't block the view!
        let cx = 0; let cy = 1.6; let cz = -1.8;
        const bId = (this as any)._currentBusId || 'RUSTIC_VAN';
        if (bId === 'KEKE_NAPEP') { cy = 1.3; cz = -0.8; }
        else if (bId === 'HONDA_CIVIC') { cy = 1.1; cz = -1.2; }
        else if (bId === 'POLICE_CAR') { cy = 1.2; cz = -1.2; }
        else if (bId === 'ARMY_JEEP') { cy = 1.5; cz = -1.5; }
        else { cy = 1.7; cz = -2.0; } // Townace/Danfo

        const localCamPos = new THREE.Vector3(cx, cy + headBob, cz);`
);

// 4. Loader Fix
const loaderStart = "// Try to load the user's downloaded GLB";
const loaderEnd = "console.error('Error loading Danfo GLB:', error);\r\n        }\r\n      );";
const loaderEndFallback = "console.error('Error loading Danfo GLB:', error);\n        }\n      );";

let sIdx = code.indexOf(loaderStart);
let endIdx = code.indexOf(loaderEnd, sIdx);
let lEndLen = loaderEnd.length;
if (endIdx === -1) {
    endIdx = code.indexOf(loaderEndFallback, sIdx);
    lEndLen = loaderEndFallback.length;
}

if (sIdx !== -1 && endIdx !== -1) {
    const replacement = `// Try to load the user's downloaded GLB
      const loader = new GLTFLoader();
      const glbMap: Record<string, string> = {
        'KEKE_NAPEP': '/models/3d_model__passenger_tricycle_keke_napep.glb',
        'HONDA_CIVIC': '/models/1991_honda_civic_eg6.glb',
        'POLICE_CAR': '/models/honda_today_g-type_police.glb',
        'ARMY_JEEP': '/models/kia_km420.glb',
        'TOYOTA_TOWNACE': '/models/2005_toyota_townace_gl.glb',
        'RUSTIC_VAN': '/models/2005_toyota_townace_gl.glb' // fallback
      };
      const busId = (this as any)._currentBusId || 'RUSTIC_VAN';
      const glbPath = glbMap[busId] || glbMap['RUSTIC_VAN'];

      loader.load(
        glbPath,
        (gltf) => {
          const model = gltf.scene;
          let scale = 1.5;
          if (busId === 'KEKE_NAPEP') scale = 1.0;
          if (busId === 'HONDA_CIVIC') scale = 1.2;
          
          model.scale.set(scale, scale, scale);
          model.position.set(0, 0.2, 0);
          model.rotation.y = Math.PI;
  
          fallbackGroup.visible = false;
          busBody.add(model);
        },
        undefined,
        (error) => console.error('FAILED TO LOAD BUS GLB:', error)
      );`;

    code = code.substring(0, sIdx) + replacement + code.substring(endIdx + lEndLen);
}

fs.writeFileSync('src/game/three/ThreeDrivingEngine.ts', code);
console.log('Fixed everything properly!');
