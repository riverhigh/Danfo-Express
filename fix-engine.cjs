const fs = require('fs');
const path = require('path');

const p = path.resolve('src/game/three/ThreeDrivingEngine.ts');
let code = fs.readFileSync(p, 'utf8');

// 1. Replace the hardcoded GLTFLoader string with dynamic bus loading
const loaderRegex = /loader\.load\([\s\S]*?'\/models\/2005_toyota_townace_gl\.glb',[\s\S]*?\(gltf\) => \{([\s\S]*?)fallbackGroup\.visible = false;[\s\S]*?busBody\.add\(model\);[\s\S]*?console\.log\('Danfo GLB Loaded successfully!'\);[\s\S]*?\},[\s\S]*?undefined, \/\/ onProgress[\s\S]*?\(err\) => \{[\s\S]*?\}\s*\);/;

const newLoader = `
    const glbMap: Record<string, string> = {
      'KEKE_NAPEP': '/models/3d_model__passenger_tricycle_keke_napep.glb',
      'HONDA_CIVIC': '/models/1991_honda_civic_eg6.glb',
      'POLICE_CAR': '/models/honda_today_g-type_police.glb',
      'ARMY_JEEP': '/models/kia_km420.glb',
      'TOYOTA_TOWNACE': '/models/2005_toyota_townace_gl.glb',
      'RUSTIC_VAN': '/models/2005_toyota_townace_gl.glb' // fallback for now
    };
    const glbPath = glbMap[busId] || glbMap['RUSTIC_VAN'];

    loader.load(
      glbPath,
      (gltf) => {
        const model = gltf.scene;
        // Generic scale/pos for most Sketchfab models
        let scale = 1.5;
        if (busId === 'KEKE_NAPEP') scale = 1.0;
        if (busId === 'HONDA_CIVIC') scale = 1.2;
        
        model.scale.set(scale, scale, scale);
        model.position.set(0, 0, 0);
        
        // Orient the bus so it faces forward
        model.rotation.y = Math.PI;

        // Hide fallback once loaded
        fallbackGroup.visible = false;
        busBody.add(model);
        
        // Store busId for camera positioning
        (this as any)._currentBusId = busId;
      },
      undefined,
      (err) => {
        console.error("FAILED TO LOAD BUS GLB:", err);
      }
    );
`;
code = code.replace(loaderRegex, newLoader);

// 2. Fix the 1st person camera position so it sits safely on the hood for ALL vehicles
const camRegex = /const localCamPos = new THREE\.Vector3\(-0\.45, 1\.35 \+ headBob, -0\.6\);/;
const newCam = `
        let cx = -0.45; let cy = 1.6; let cz = -0.2;
        const bId = (this as any)._currentBusId || 'RUSTIC_VAN';
        if (bId === 'KEKE_NAPEP') { cx = 0; cy = 1.3; cz = -0.2; }
        else if (bId === 'HONDA_CIVIC') { cx = -0.3; cy = 1.1; cz = -0.1; }
        else if (bId === 'POLICE_CAR') { cx = -0.3; cy = 1.2; cz = -0.1; }
        else if (bId === 'ARMY_JEEP') { cx = -0.4; cy = 1.5; cz = -0.2; }
        else { cx = -0.45; cy = 1.7; cz = -0.2; } // Townace/Danfo (higher to avoid clipping the dash)

        const localCamPos = new THREE.Vector3(cx, cy + headBob, cz);
`;
code = code.replace(camRegex, newCam);

// 3. Fix the "cars pass tru me" physics by adding a hard stop collision check
// We need to find the update() loop
const updateRegex = /if \(Date\.now\(\) - this\.lastHazardTime > 5000\) \{/;
const newCollision = `
      // HARD COLLISION CHECK (Player vs Traffic)
      // Check distance from player (busRoot) to all traffic models
      let hitTraffic = false;
      for (const tMesh of this.trafficMeshes) {
        if (!tMesh.visible) continue;
        const dist = this.busRoot.position.distanceTo(tMesh.position);
        if (dist < 3.5) { // roughly close enough to hit
          hitTraffic = true;
          break;
        }
      }
      
      // If we hit traffic, force speed to 0 (hard stop!)
      if (hitTraffic) {
        // We're crashed into a car! Stop the player immediately.
        // For physics realism, we could push the player back slightly
        this.busRoot.position.z -= 0.5; // Bounce back
        if (Math.abs(speedKmH) > 5) {
          // Trigger a honk or scream maybe?
        }
      }

      if (Date.now() - this.lastHazardTime > 5000) {
`;
code = code.replace(updateRegex, newCollision);


fs.writeFileSync(p, code);
console.log('Fixed Engine!');
