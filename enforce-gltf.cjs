const fs = require('fs');
const path = 'src/game/three/ThreeDrivingEngine.ts';
let code = fs.readFileSync(path, 'utf8');

// Ensure loaders are imported
if (!code.includes('GLTFLoader')) {
  code = code.replace(
    "import * as THREE from 'three';",
    "import * as THREE from 'three';\nimport { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';\nimport { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';"
  );
}

const createDanfoRegex = /private createDanfoBus\(\) \{[\s\S]*?return \{\n      busRoot, busBody, steeringWheel, speedNeedle, tachNeedle, fuelNeedle, accelNeedle,[\s\S]*?wipers: wipersGroup, rosary: danglingRosary, bullBar: bullBarMesh, speakers: roofSpeakersMesh, underglow: underglowLight,\n    \};\n  \}/;

const newCreateDanfo = `private createDanfoBus() {
    const busRoot = new THREE.Group();
    const busBody = new THREE.Group();
    busRoot.add(busBody);

    // Dummy references to prevent physics loop from crashing
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
    // TOP PRIORITY: GLTFLoader for REAL ASSETS
    // ==========================================
    const loader = new GLTFLoader();
    
    // We try to load a real Danfo / Car model from the public directory.
    // The user MUST place 'danfo.glb' inside the public/models/ folder!
    loader.load(
      '/models/danfo.glb',
      (gltf) => {
        const model = gltf.scene;
        
        // Scale down if the model is too big
        model.scale.set(1.5, 1.5, 1.5);
        model.position.set(0, 0.2, 0); // Adjust height
        
        // Ensure shadows and materials look realistic
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });
        
        // Remove the temporary box
        const tempBox = busBody.getObjectByName("tempLoadingBox");
        if (tempBox) busBody.remove(tempBox);
        
        busBody.add(model);
        console.log("SUCCESS: Real 3D Model loaded via GLTFLoader!");
      },
      undefined,
      (error) => {
        console.error("FAILED TO LOAD REAL 3D MODEL: Please ensure 'danfo.glb' is placed in public/models/ directory!", error);
        // We leave the invisible tempBox so the game doesn't crash, but they must provide the file!
      }
    );

    // Temporary loading placeholder (so the camera has something to look at while loading)
    const tempBox = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 5), new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }));
    tempBox.name = "tempLoadingBox";
    tempBox.position.y = 1;
    busBody.add(tempBox);

    return {
      busRoot, busBody, steeringWheel, speedNeedle, tachNeedle, fuelNeedle, accelNeedle,
      dashLeftBlinker, dashRightBlinker, slidingDoor, bootDoor, bootLuggage, conductor,
      lfWheel, rfWheel, rearWheels, lBlinker, rBlinker, lBrake, rBrake,
      wipers: wipersGroup, rosary: danglingRosary, bullBar: bullBarMesh, speakers: roofSpeakersMesh, underglow: underglowLight,
    };
  }`;

code = code.replace(createDanfoRegex, newCreateDanfo);
fs.writeFileSync(path, code);
console.log('GLTFLoader enforced');
