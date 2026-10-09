const fs = require('fs');

const path = 'src/game/three/ThreeDrivingEngine.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Replace createDanfoBus
const startDanfo = code.indexOf('private createDanfoBus() {');
if (startDanfo !== -1) {
  let depth = 0;
  let endDanfo = -1;
  for (let i = startDanfo; i < code.length; i++) {
    if (code[i] === '{') depth++;
    if (code[i] === '}') {
      depth--;
      if (depth === 0) {
        endDanfo = i + 1;
        break;
      }
    }
  }

  if (endDanfo !== -1) {
    const newDanfo = `private createDanfoBus() {
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

    // Steering Wheel - FIXED ROTATION ORDER
    const steeringWheel = new THREE.Group();
    steeringWheel.rotation.order = 'ZYX'; // Crucial for preventing glitch on Z rotation!

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

    code = code.substring(0, startDanfo) + newDanfo + code.substring(endDanfo);
  }
}

// 2. Replace setupTrafficAndHazards
const startTraffic = code.indexOf('private setupTrafficAndHazards() {');
if (startTraffic !== -1) {
  let depth = 0;
  let endTraffic = -1;
  for (let i = startTraffic; i < code.length; i++) {
    if (code[i] === '{') depth++;
    if (code[i] === '}') {
      depth--;
      if (depth === 0) {
        endTraffic = i + 1;
        break;
      }
    }
  }

  if (endTraffic !== -1) {
    const newTraffic = `private setupTrafficAndHazards() {
    const trafficColors = [0xfacc15, 0x0284c7, 0xdc2626, 0x16a34a, 0x475569];
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, roughness: 0.05, transparent: true, opacity: 0.6 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.1, metalness: 0.9 });
    
    const types = ['BRT', 'KEKE', 'TRUCK', 'OKADA', 'SEDAN'];

    for (let i = 0; i < 15; i++) {
      const traffic = new THREE.Group();
      const type = types[Math.floor(Math.random() * types.length)];
      const color = trafficColors[Math.floor(Math.random() * trafficColors.length)];
      const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });

      if (type === 'BRT') {
        // Massive Blue BRT Bus
        const brtMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.2, 12), brtMat);
        body.position.y = 1.8;
        traffic.add(body);
        
        // Windows
        const windows = new THREE.Mesh(new THREE.BoxGeometry(2.52, 1.2, 11.5), glassMat);
        windows.position.y = 2.2;
        traffic.add(windows);
        
        // LED Sign
        const sign = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 0.1), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        sign.position.set(0, 3.0, 6.05);
        traffic.add(sign);
        
      } else if (type === 'KEKE') {
        // Yellow Keke Napep (Tricycle)
        const kekeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 2.2), kekeMat);
        body.position.set(0, 0.8, 0);
        traffic.add(body);
        
        // Canopy
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 2.2), blackMat);
        canopy.position.set(0, 1.8, 0);
        traffic.add(canopy);
        
        // Windshield
        const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.8), glassMat);
        ws.position.set(0, 1.4, 1.1);
        traffic.add(ws);
        
        // Wheels (1 front, 2 back)
        const frontW = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1), blackMat);
        frontW.rotation.z = Math.PI / 2;
        frontW.position.set(0, 0.2, 1.0);
        traffic.add(frontW);
        
        [-0.6, 0.6].forEach(x => {
          const w = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1), blackMat);
          w.rotation.z = Math.PI / 2;
          w.position.set(x, 0.2, -0.8);
          traffic.add(w);
        });

      } else if (type === 'TRUCK') {
        // Dangote-style Truck
        const cabinMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.5, 2.5), cabinMat);
        cabin.position.set(0, 2.0, 4.0);
        traffic.add(cabin);
        
        const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.0, 8.0), chromeMat);
        cargo.position.set(0, 2.5, -1.5);
        traffic.add(cargo);

      } else if (type === 'OKADA') {
        // Okada Motorcycle
        const bikeMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 1.8), bikeMat);
        body.position.set(0, 0.6, 0);
        traffic.add(body);
        
        const rider = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.4), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
        rider.position.set(0, 1.3, 0);
        traffic.add(rider);
        
        [-0.8, 0.8].forEach(z => {
          const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1), blackMat);
          w.rotation.z = Math.PI / 2;
          w.position.set(0, 0.3, z);
          traffic.add(w);
        });
        
      } else {
        // Sedan
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 4.6), bodyMat);
        body.position.y = 0.7;
        traffic.add(body);
        
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.4), bodyMat);
        top.position.set(0, 1.4, -0.2);
        traffic.add(top);
        
        const windows = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.5, 2.45), glassMat);
        windows.position.set(0, 1.4, -0.2);
        traffic.add(windows);
      }

      // Random Lane
      const lanes = [-5.5, 0, 5.5];
      traffic.position.set(lanes[Math.floor(Math.random() * lanes.length)], 0, 80 + i * 45);
      
      this.scene.add(traffic);
      this.trafficMeshes.push(traffic);
    }
  }`;

    code = code.substring(0, startTraffic) + newTraffic + code.substring(endTraffic);
  }
}

fs.writeFileSync(path, code);
console.log('Successfully updated Engine with robust parser');
