const fs = require('fs');

const path = 'src/game/three/ThreeDrivingEngine.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Add GLTFLoader Import
if (!code.includes('GLTFLoader')) {
  code = code.replace(
    "import * as THREE from 'three';",
    "import * as THREE from 'three';\nimport { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';\nimport { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';"
  );
}

// 2. Refactor createDanfoBus to load GLTF or fallback
const createDanfoBusRegex = /private createDanfoBus\(\) \{[\s\S]*?return \{\n      busRoot,\n      busBody,[\s\S]*?wipers: wipersGroup,\n      rosary: danglingRosary,\n      bullBar: bullBarMesh,\n      speakers: roofSpeakersMesh,\n      underglow: underglowLight,\n    \};\n  \}/;

const newCreateDanfoBus = `private createDanfoBus() {
    const busRoot = new THREE.Group();
    const busBody = new THREE.Group();
    busRoot.add(busBody);

    // DUMMY REFERENCES FOR THE ENGINE TO STILL WORK IF WE JUST USE A SINGLE MODEL
    // We create invisible placeholders so the rest of the game logic doesn't crash
    const steeringWheel = new THREE.Group();
    const speedNeedle = new THREE.Mesh();
    const tachNeedle = new THREE.Mesh();
    const fuelNeedle = new THREE.Mesh();
    const accelNeedle = new THREE.Mesh();
    const dashLeftBlinker = new THREE.Mesh();
    const dashRightBlinker = new THREE.Mesh();
    const slidingDoor = new THREE.Group();
    const bootDoor = new THREE.Group();
    const bootLuggage = new THREE.Group();
    const conductor = new THREE.Mesh();
    const lfWheel = new THREE.Mesh();
    const rfWheel = new THREE.Mesh();
    const rearWheels = new THREE.Group();
    const lBlinker = new THREE.Mesh();
    const rBlinker = new THREE.Mesh();
    const lBrake = new THREE.Mesh();
    const rBrake = new THREE.Mesh();
    const wipersGroup = new THREE.Group();
    const danglingRosary = new THREE.Mesh();
    const bullBarMesh = new THREE.Mesh();
    const roofSpeakersMesh = new THREE.Mesh();
    const underglowLight = new THREE.PointLight(0x000000);

    // ==========================================
    // 1. ATTEMPT TO LOAD HIGH-QUALITY GLB MODEL
    // ==========================================
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);

    console.log("Attempting to load realistic GLB vehicle models...");
    
    // We will attempt to load /models/danfo.glb from public folder
    // If it fails, we fall back to a blocky placeholder
    loader.load(
      '/models/danfo.glb',
      (gltf) => {
        const model = gltf.scene;
        // Adjust scale and position based on your specific model
        model.scale.set(1, 1, 1);
        model.position.set(0, 0, 0);
        
        // Enhance materials
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (mesh.material) {
              // Upgrading standard materials to physical ones for realism
              if (mesh.name.toLowerCase().includes('glass') || mesh.name.toLowerCase().includes('window')) {
                mesh.material = new THREE.MeshPhysicalMaterial({
                  color: 0x0f172a,
                  transparent: true,
                  opacity: 0.4,
                  roughness: 0.1,
                  transmission: 0.8
                });
              } else if (mesh.name.toLowerCase().includes('body') || mesh.name.toLowerCase().includes('paint')) {
                mesh.material = new THREE.MeshPhysicalMaterial({
                  color: 0xf59e0b,
                  roughness: 0.2,
                  metalness: 0.8,
                  clearcoat: 1.0,
                  clearcoatRoughness: 0.1
                });
              }
            }
          }
        });
        
        // Remove fallback if loaded successfully
        const fallback = busBody.getObjectByName("fallbackBus");
        if (fallback) busBody.remove(fallback);
        
        busBody.add(model);
        console.log("Loaded high-quality GLB Danfo bus!");
      },
      undefined,
      (error) => {
        console.warn("Could not load /models/danfo.glb. Falling back to simple geometry. Please place a 3D model at public/models/danfo.glb to replace the Minecraft look.", error);
      }
    );

    // ==========================================
    // 2. FALLBACK PROCEDURAL GEOMETRY (WHILE LOADING OR IF MISSING)
    // ==========================================
    const fallbackGroup = new THREE.Group();
    fallbackGroup.name = "fallbackBus";

    const yellowMat = new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.8, clearcoat: 1.0, clearcoatRoughness: 0.1 });
    const blackStripeMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, roughness: 0.3, metalness: 0.6, clearcoat: 0.8 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.1, transparent: true, opacity: 0.4, transmission: 0.8, side: THREE.DoubleSide });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });

    // Chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.15, 5.2), yellowMat);
    chassis.position.y = 0.95;
    chassis.castShadow = true;
    fallbackGroup.add(chassis);

    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.22, 5.0), yellowMat);
    roof.position.set(0, 2.52, -0.1);
    fallbackGroup.add(roof);

    // Actual Windows (Cutouts)
    const windowSides = new THREE.Mesh(new THREE.BoxGeometry(2.25, 1.0, 4.8), glassMat);
    windowSides.position.set(0, 1.9, -0.1);
    fallbackGroup.add(windowSides);

    const windscreen = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.8), glassMat);
    windscreen.position.set(0, 1.95, 2.31);
    fallbackGroup.add(windscreen);

    // Wheels
    const tireGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 24);
    tireGeo.rotateZ(Math.PI / 2);
    [[-1.0, 1.5], [1.0, 1.5], [-1.0, -1.8], [1.0, -1.8]].forEach(([x, z]) => {
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.position.set(x, 0.45, z);
      tire.castShadow = true;
      fallbackGroup.add(tire);
    });

    busBody.add(fallbackGroup);

    return {
      busRoot, busBody, steeringWheel, speedNeedle, tachNeedle, fuelNeedle, accelNeedle,
      dashLeftBlinker, dashRightBlinker, slidingDoor, bootDoor, bootLuggage, conductor,
      lfWheel, rfWheel, rearWheels, lBlinker, rBlinker, lBrake, rBrake,
      wipers: wipersGroup, rosary: danglingRosary, bullBar: bullBarMesh, speakers: roofSpeakersMesh, underglow: underglowLight,
    };
  }`;

code = code.replace(createDanfoBusRegex, newCreateDanfoBus);

// 3. Add Pedestrian Bridges & Trees to Road
const buildCityRegex = /\/\/ 3\. Buildings — varied heights & colors/;
const newCityScenery = `// 2.5 Diverse Road Scenery (Trees & Pedestrian Bridges)
        if (i % 2 === 1) {
          // Add a pedestrian bridge every other segment
          const bridgeGroup = new THREE.Group();
          const bridgePillarMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.8 });
          const bridgeSpanMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.4, roughness: 0.6 });
          
          // Pillars
          [-11, 11].forEach(px => {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 7, 1.5), bridgePillarMat);
            pillar.position.set(px, 3.5, 0);
            pillar.castShadow = true;
            bridgeGroup.add(pillar);
          });
          
          // Span
          const span = new THREE.Mesh(new THREE.BoxGeometry(24, 1, 3), bridgeSpanMat);
          span.position.set(0, 7.5, 0);
          span.castShadow = true;
          bridgeGroup.add(span);
          
          // Bridge Signboard
          const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 1.5), new THREE.MeshBasicMaterial({ color: 0x15803d }));
          sign.position.set(0, 7.5, 1.55);
          bridgeGroup.add(sign);
          
          group.add(bridgeGroup);
        }

        // Add some random Trees along the road
        const treeGeo = new THREE.ConeGeometry(2, 6, 8);
        const trunkGeo = new THREE.CylinderGeometry(0.4, 0.4, 2);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 });
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
        
        for (let t = -roadLength / 2; t < roadLength / 2; t += 30) {
          if (Math.random() > 0.5) {
            [-12.5, 12.5].forEach(tx => {
              if (Math.random() > 0.3) {
                 const tree = new THREE.Group();
                 const trunk = new THREE.Mesh(trunkGeo, trunkMat);
                 trunk.position.y = 1;
                 const leaves = new THREE.Mesh(treeGeo, leafMat);
                 leaves.position.y = 4;
                 tree.add(trunk, leaves);
                 tree.position.set(tx, 0, t + Math.random() * 10);
                 tree.castShadow = true;
                 group.add(tree);
              }
            });
          }
        }

        // 3. Buildings — varied heights & colors`;

code = code.replace(buildCityRegex, newCityScenery);

fs.writeFileSync(path, code);
console.log('Done GLTF integration and scenery update');
