const fs = require('fs');
let code = fs.readFileSync('src/game/three/ThreeDrivingEngine.ts', 'utf8');

if (!code.includes('import { GLTFLoader }')) {
  code = "import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';\n" + code;
}

const gltfLogic = `private createDanfoBus() {
    const busRoot = new THREE.Group();
    const busBody = new THREE.Group();
    busRoot.add(busBody);

    // Placeholder returned objects so engine properties don't crash
    const steeringWheel = new THREE.Group();
    steeringWheel.rotation.order = 'ZYX';
    steeringWheel.position.set(-0.6, 1.5, 2.3);
    busBody.add(steeringWheel);
    
    // We will build a basic procedural bus as a fallback/scaffold
    const fallbackGroup = new THREE.Group();
    const yellowMat = new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.6 });
    const rustMat = new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.9 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 5.4), rustMat);
    floor.position.set(0, 0.7, 0);
    fallbackGroup.add(floor);
    busBody.add(fallbackGroup);

    // Try to load the user's downloaded GLB
    const loader = new GLTFLoader();
    loader.load(
      '/models/danfo.glb',
      (gltf) => {
        const model = gltf.scene;
        
        // Scale and position adjustment based on typical sketchfab models
        model.scale.set(1.5, 1.5, 1.5);
        model.position.set(0, 0.2, 0);
        
        // Orient the bus so it faces forward (Z-negative usually, or adjust based on model)
        model.rotation.y = Math.PI;

        // Hide fallback once loaded
        fallbackGroup.visible = false;
        busBody.add(model);
        console.log('Danfo GLB Loaded successfully!');
      },
      undefined,
      (error) => {
        console.error('Error loading Danfo GLB:', error);
      }
    );

    // Wheels dummy
    const lfWheel = new THREE.Mesh();
    const rfWheel = new THREE.Mesh();
    const rearWheels = new THREE.Group();
    busBody.add(lfWheel, rfWheel, rearWheels);

    return {
      busRoot,
      busBody,
      steeringWheel,
      speedNeedle: new THREE.Mesh(),
      tachNeedle: new THREE.Mesh(),
      fuelNeedle: new THREE.Mesh(),
      accelNeedle: new THREE.Mesh(),
      dashLeftBlinker: new THREE.Mesh(),
      dashRightBlinker: new THREE.Mesh(),
      slidingDoor: new THREE.Group(),
      bootDoor: new THREE.Group(),
      bootLuggage: new THREE.Group(),
      conductor: new THREE.Group(),
      lfWheel,
      rfWheel,
      rearWheels,
      lBlinker: new THREE.Mesh(),
      rBlinker: new THREE.Mesh(),
      lBrake: new THREE.Mesh(),
      rBrake: new THREE.Mesh(),
      wipers: new THREE.Group(),
      rosary: new THREE.Group(),
      bullBar: new THREE.Group(),
      speakers: new THREE.Group(),
      underglow: new THREE.PointLight(0x000000),
    } as any;
  }`;

const startIndex = code.indexOf('private createDanfoBus() {');
if (startIndex !== -1) {
  let endDanfo = -1;
  let depth = 0;
  for (let i = startIndex; i < code.length; i++) {
    if (code[i] === '{') depth++;
    if (code[i] === '}') {
      depth--;
      if (depth === 0) {
        endDanfo = i + 1;
        break;
      }
    }
  }

  code = code.substring(0, startIndex) + gltfLogic + code.substring(endDanfo);
  fs.writeFileSync('src/game/three/ThreeDrivingEngine.ts', code);
}
