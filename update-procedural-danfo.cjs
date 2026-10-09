const fs = require('fs');

const path = 'src/game/three/ThreeDrivingEngine.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /private createDanfoBus\(\) \{[\s\S]*?return \{\n      busRoot,\n      busBody,\n      steeringWheel,\n      speedNeedle,\n      tachNeedle,\n      fuelNeedle,\n      accelNeedle,\n      dashLeftBlinker,\n      dashRightBlinker,\n      slidingDoor,\n      bootDoor,\n      bootLuggage,\n      conductor,\n      lfWheel,\n      rfWheel,\n      rearWheels,\n      lBlinker,\n      rBlinker,\n      lBrake,\n      rBrake,\n      wipers: wipersGroup,\n      rosary: danglingRosary,\n      bullBar: bullBarMesh,\n      speakers: roofSpeakersMesh,\n      underglow: underglowLight,\n    \};\n  \}/;

const newMethod = `private createDanfoBus() {
    const busRoot = new THREE.Group();
    const busBody = new THREE.Group();
    busRoot.add(busBody);

    const yellowMat = new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.6 });
    const blackMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, roughness: 0.3, metalness: 0.7 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.1, metalness: 0.95 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, roughness: 0.05, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const rustMat = new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 }); // Wooden benches
    
    // Chassis & Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 5.4), rustMat);
    floor.position.set(0, 0.7, 0);
    busBody.add(floor);

    // Exterior Lower Panels
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.7, 5.4), yellowMat);
    lowerBody.position.set(0, 1.1, 0);
    busBody.add(lowerBody);

    // Front Slanted Nose
    const nose = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.7, 0.5), yellowMat);
    nose.position.set(0, 1.1, 2.95);
    nose.rotation.x = -0.15;
    busBody.add(nose);

    // Pillars (Empty spaces for windows)
    const pillarGeo = new THREE.BoxGeometry(0.1, 1.0, 0.15);
    [-2.5, -0.8, 0.8, 2.5].forEach(pz => {
      [-1.15, 1.15].forEach(px => {
        const pillar = new THREE.Mesh(pillarGeo, yellowMat);
        pillar.position.set(px, 1.9, pz);
        busBody.add(pillar);
      });
    });

    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.15, 5.2), yellowMat);
    roof.position.set(0, 2.45, 0);
    busBody.add(roof);

    // Front Windshield
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.95), glassMat);
    windshield.position.set(0, 1.95, 2.65);
    windshield.rotation.x = -0.25;
    busBody.add(windshield);

    // Side Windows
    const sideGlassL = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 0.9), glassMat);
    sideGlassL.position.set(1.16, 1.95, 0);
    sideGlassL.rotation.y = Math.PI / 2;
    busBody.add(sideGlassL);

    const sideGlassR = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 0.9), glassMat);
    sideGlassR.position.set(-1.16, 1.95, 0);
    sideGlassR.rotation.y = -Math.PI / 2;
    busBody.add(sideGlassR);

    // Stripes
    const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(2.37, 0.1, 5.42), blackMat);
    stripe1.position.set(0, 1.0, 0);
    busBody.add(stripe1);
    
    const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(2.37, 0.1, 5.42), blackMat);
    stripe2.position.set(0, 1.3, 0);
    busBody.add(stripe2);

    // Interior Benches (Classic Danfo 4-row setup)
    // Front passenger seat, plus 3 rows behind
    [1.8, 0.5, -0.8, -2.1].forEach((pz, rowIdx) => {
      // Wood base
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.3, 0.4), rustMat);
      base.position.set(0, 0.9, pz);
      busBody.add(base);
      
      // Wood seat plank
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.5), woodMat);
      seat.position.set(0, 1.05, pz);
      busBody.add(seat);

      // Wood backrest
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.05), woodMat);
      back.position.set(0, 1.3, pz - 0.25);
      back.rotation.x = -0.1;
      busBody.add(back);

      // Randomly spawn passengers in the row (3 per row)
      if (rowIdx > 0) { // Skip front driver row for random passengers
        [-0.7, 0, 0.7].forEach(px => {
          if (Math.random() > 0.3) {
            const passengerGroup = new THREE.Group();
            passengerGroup.position.set(px, 1.3, pz);
            
            // Human-like passenger (Cylinders and Sphere)
            const pColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0xffffff];
            const shirtMat = new THREE.MeshStandardMaterial({ color: pColors[Math.floor(Math.random() * pColors.length)] });
            const skinMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 }); // Dark skin tone
            
            // Body
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.5, 16), shirtMat);
            passengerGroup.add(body);
            
            // Head
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), skinMat);
            head.position.y = 0.35;
            passengerGroup.add(head);

            busBody.add(passengerGroup);
          }
        });
      }
    });

    // Driver Seat (Front Left in Lagos / RHD)
    const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.6), rustMat);
    driverSeat.position.set(-0.6, 1.05, 1.8);
    busBody.add(driverSeat);

    // Steering Wheel
    const steeringWheel = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 16, 32), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    steeringWheel.add(rim);
    // Hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 16), chromeMat);
    hub.rotation.x = Math.PI / 2;
    steeringWheel.add(hub);
    
    // Position correctly relative to driver seat and dashboard
    steeringWheel.position.set(-0.6, 1.5, 2.3);
    steeringWheel.rotation.x = -Math.PI / 4; // Tilted towards driver
    busBody.add(steeringWheel);

    // Dashboard
    const dashboard = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.3, 0.4), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    dashboard.position.set(0, 1.4, 2.5);
    busBody.add(dashboard);

    // Wheels
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const createWheel = (px, pz) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 32), tireMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(px, 0.35, pz);
      return w;
    };

    const lfWheel = createWheel(1.1, 1.8);
    const rfWheel = createWheel(-1.1, 1.8);
    const rearWheels = new THREE.Group();
    rearWheels.add(createWheel(1.1, -1.8));
    rearWheels.add(createWheel(-1.1, -1.8));

    busBody.add(lfWheel, rfWheel, rearWheels);

    // Bumpers
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 0.2), blackMat);
    bumper.position.set(0, 0.8, 3.1);
    busBody.add(bumper);

    // Dummy returns for gauges/lights so engine doesn't crash
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
    const lBlinker = new THREE.Mesh();
    const rBlinker = new THREE.Mesh();
    const lBrake = new THREE.Mesh();
    const rBrake = new THREE.Mesh();
    const wipersGroup = new THREE.Group();
    const danglingRosary = new THREE.Mesh();
    const bullBarMesh = new THREE.Mesh();
    const roofSpeakersMesh = new THREE.Mesh();
    const underglowLight = new THREE.PointLight(0x000000);

    return {
      busRoot,
      busBody,
      steeringWheel,
      speedNeedle,
      tachNeedle,
      fuelNeedle,
      accelNeedle,
      dashLeftBlinker,
      dashRightBlinker,
      slidingDoor,
      bootDoor,
      bootLuggage,
      conductor,
      lfWheel,
      rfWheel,
      rearWheels,
      lBlinker,
      rBlinker,
      lBrake,
      rBrake,
      wipers: wipersGroup,
      rosary: danglingRosary,
      bullBar: bullBarMesh,
      speakers: roofSpeakersMesh,
      underglow: underglowLight,
    };
  }`;

// Since the file has changed significantly due to GLTFLoader, let's just do string replacement
if(code.includes('GLTFLoader')) {
  // It has the GLTF loader version, let's replace it
  const regexGLTF = /private createDanfoBus\(\) \{[\s\S]*?return \{\n      busRoot, busBody, steeringWheel, speedNeedle, tachNeedle, fuelNeedle, accelNeedle,[\s\S]*?wipers: wipersGroup, rosary: danglingRosary, bullBar: bullBarMesh, speakers: roofSpeakersMesh, underglow: underglowLight,\n    \};\n  \}/;
  code = code.replace(regexGLTF, newMethod);
} else {
  code = code.replace(regex, newMethod);
}

fs.writeFileSync(path, code);
