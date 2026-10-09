const fs = require('fs');

const path = 'src/game/three/ThreeDrivingEngine.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Refactor createDanfoBus for realistic procedural VW T3 shape with windows
const createDanfoBusRegex = /private createDanfoBus\(\) \{[\s\S]*?return \{\n      busRoot, busBody, steeringWheel, speedNeedle, tachNeedle, fuelNeedle, accelNeedle,\n      dashLeftBlinker, dashRightBlinker, slidingDoor, bootDoor, bootLuggage, conductor,\n      lfWheel, rfWheel, rearWheels, lBlinker, rBlinker, lBrake, rBrake,\n      wipers: wipersGroup, rosary: danglingRosary, bullBar: bullBarMesh, speakers: roofSpeakersMesh, underglow: underglowLight,\n    \};\n  \}/;

const newCreateDanfoBus = `private createDanfoBus() {
    const busRoot = new THREE.Group();
    const busBody = new THREE.Group();
    busRoot.add(busBody);

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

    // ---- REALISTIC PROCEDURAL MATERIALS ----
    const yellowMat = new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.6, clearcoat: 0.8, clearcoatRoughness: 0.2 });
    const blackMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, roughness: 0.3, metalness: 0.7, clearcoat: 0.5 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.1, metalness: 0.95 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.05, transparent: true, opacity: 0.5, transmission: 0.4, side: THREE.DoubleSide });
    const darkInteriorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.0 });

    // 1. CHASSIS BASE
    const baseGeo = new THREE.BoxGeometry(2.2, 0.4, 5.4);
    const baseMesh = new THREE.Mesh(baseGeo, darkInteriorMat);
    baseMesh.position.y = 0.6;
    baseMesh.castShadow = true;
    busBody.add(baseMesh);

    // 2. LOWER BODY (Yellow paint, up to window line)
    const lowerBodyGeo = new THREE.BoxGeometry(2.3, 0.8, 5.4);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, yellowMat);
    lowerBody.position.y = 1.2;
    lowerBody.castShadow = true;
    busBody.add(lowerBody);

    // 3. FRONT NOSE (Slanted VW T3 shape)
    // We build it using shapes for a slanted front
    const noseGeo = new THREE.BoxGeometry(2.3, 0.8, 0.5);
    const nose = new THREE.Mesh(noseGeo, yellowMat);
    nose.position.set(0, 1.2, 2.95);
    nose.rotation.x = -0.15; // Slant forward
    nose.castShadow = true;
    busBody.add(nose);

    // Grille & Headlights
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 0.1), blackMat);
    grille.position.set(0, 1.2, 3.2);
    busBody.add(grille);

    const headlightGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 32);
    headlightGeo.rotateX(Math.PI / 2);
    [-0.6, 0.6].forEach(px => {
      const hl = new THREE.Mesh(headlightGeo, lightMat);
      hl.position.set(px, 1.2, 3.25);
      busBody.add(hl);
      
      const hlRim = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 32), chromeMat);
      hlRim.rotation.x = Math.PI / 2;
      hlRim.position.set(px, 1.2, 3.24);
      busBody.add(hlRim);
    });

    // 4. BUMPERS
    const bumperGeo = new THREE.BoxGeometry(2.4, 0.25, 0.3);
    const frontBumper = new THREE.Mesh(bumperGeo, chromeMat);
    frontBumper.position.set(0, 0.8, 3.1);
    busBody.add(frontBumper);

    const rearBumper = new THREE.Mesh(bumperGeo, chromeMat);
    rearBumper.position.set(0, 0.8, -2.8);
    busBody.add(rearBumper);

    // 5. CABIN & ROOF (With explicit window pillars to let glass show)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.2, 5.2), yellowMat);
    roof.position.set(0, 2.6, 0);
    roof.castShadow = true;
    busBody.add(roof);

    // Pillars
    const pillarGeo = new THREE.BoxGeometry(0.15, 1.0, 0.2);
    // 4 pillars per side
    [-2.5, -0.8, 0.8, 2.5].forEach(pz => {
      [-1.1, 1.1].forEach(px => {
        const pillar = new THREE.Mesh(pillarGeo, yellowMat);
        pillar.position.set(px, 2.1, pz);
        busBody.add(pillar);
      });
    });

    // Windshield Pillars (Slanted)
    [-1.1, 1.1].forEach(px => {
      const wPillar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 0.2), yellowMat);
      wPillar.position.set(px, 2.1, 2.65);
      wPillar.rotation.x = -0.25; // Slant to match windshield
      busBody.add(wPillar);
    });

    // 6. REAL WINDOW GLASS
    // Windshield
    const windshieldGeo = new THREE.PlaneGeometry(2.0, 0.95);
    const windshield = new THREE.Mesh(windshieldGeo, glassMat);
    windshield.position.set(0, 2.12, 2.76);
    windshield.rotation.x = -0.25;
    busBody.add(windshield);

    // Rear window
    const backGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.9), glassMat);
    backGlass.position.set(0, 2.1, -2.61);
    backGlass.rotation.y = Math.PI;
    busBody.add(backGlass);

    // Side Windows (Left)
    const sideGlassL = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.9), glassMat);
    sideGlassL.position.set(1.14, 2.1, 0);
    sideGlassL.rotation.y = Math.PI / 2;
    busBody.add(sideGlassL);

    // Side Windows (Right)
    const sideGlassR = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.9), glassMat);
    sideGlassR.position.set(-1.14, 2.1, 0);
    sideGlassR.rotation.y = -Math.PI / 2;
    busBody.add(sideGlassR);

    // 7. STRIPES (Two iconic black stripes)
    const stripeGeo = new THREE.BoxGeometry(2.32, 0.12, 5.42);
    const stripe1 = new THREE.Mesh(stripeGeo, blackMat);
    stripe1.position.set(0, 1.1, 0);
    busBody.add(stripe1);
    
    const stripe2 = new THREE.Mesh(stripeGeo, blackMat);
    stripe2.position.set(0, 1.4, 0);
    busBody.add(stripe2);

    // 8. WHEELS
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 32);
    wheelGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.27, 16);
    rimGeo.rotateZ(Math.PI / 2);
    
    const createWheel = (x, z) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(x, 0.35, z);
      
      const tire = new THREE.Mesh(wheelGeo, tireMat);
      tire.castShadow = true;
      wGroup.add(tire);
      
      const rim = new THREE.Mesh(rimGeo, chromeMat);
      wGroup.add(rim);
      
      return wGroup;
    };

    const flWheel = createWheel(1.1, 1.8);
    const frWheel = createWheel(-1.1, 1.8);
    const blWheel = createWheel(1.1, -1.8);
    const brWheel = createWheel(-1.1, -1.8);
    
    busBody.add(flWheel, frWheel, blWheel, brWheel);

    return {
      busRoot, busBody, steeringWheel, speedNeedle, tachNeedle, fuelNeedle, accelNeedle,
      dashLeftBlinker, dashRightBlinker, slidingDoor, bootDoor, bootLuggage, conductor,
      lfWheel, rfWheel, rearWheels, lBlinker, rBlinker, lBrake, rBrake,
      wipers: wipersGroup, rosary: danglingRosary, bullBar: bullBarMesh, speakers: roofSpeakersMesh, underglow: underglowLight,
    };
  }`;

code = code.replace(createDanfoBusRegex, newCreateDanfoBus);

// 2. Refactor buildOshodiArea to match the modern terminal image
const buildOshodiRegex = /private buildOshodiArea\(\) \{[\s\S]*?group\.add\(awning\);\n      \}\n\n      this\.scene\.add\(group\);\n    \}/;

const newOshodiArea = `private buildOshodiArea() {
    const group = new THREE.Group();
    group.position.set(0, 0, 1800); // distanceMarker 1800

    // OSHODI TRANSPORT INTERCHANGE (Modern Design based on image)
    const terminalWhiteMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3, metalness: 0.2 });
    const terminalGlassMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.1, metalness: 0.8 }); // Dark reflective glass
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.4, metalness: 0.7 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5, emissive: 0x7f1d1d });

    // Left and Right massive curved terminal buildings
    [-18, 18].forEach(sideX => {
      // Main Base Block
      const base = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 24), terminalWhiteMat);
      base.position.set(sideX, 3, 0);
      base.castShadow = true;
      group.add(base);

      // Slanted modern glass facade
      const glassFacade = new THREE.Mesh(new THREE.BoxGeometry(16.2, 5, 20), terminalGlassMat);
      glassFacade.position.set(sideX, 4, 0);
      group.add(glassFacade);

      // Angled Roof/Canopy (sweeping up)
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(18, 1, 26), terminalWhiteMat);
      canopy.position.set(sideX, 8, 0);
      canopy.rotation.x = 0.1;
      canopy.castShadow = true;
      group.add(canopy);
      
      // Giant Tower Pillars
      const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 16, 4), terminalGlassMat);
      tower.position.set(sideX * 0.7, 8, 0);
      group.add(tower);
    });

    // Massive Overhead Skybridge Connecting the Terminals
    const skybridge = new THREE.Mesh(new THREE.BoxGeometry(40, 2.5, 6), terminalWhiteMat);
    skybridge.position.set(0, 10, 0);
    skybridge.castShadow = true;
    group.add(skybridge);

    // Skybridge Glass Windows
    const bridgeGlass = new THREE.Mesh(new THREE.BoxGeometry(40.2, 1.5, 5.8), terminalGlassMat);
    bridgeGlass.position.set(0, 10, 0);
    group.add(bridgeGlass);

    // Steel Suspension Cables holding the bridge
    for(let i = -15; i <= 15; i += 5) {
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 8), steelMat);
      cable.position.set(i, 13, 0);
      group.add(cable);
    }

    // OSHODI STATION RED SIGN ON SKYBRIDGE
    // We create letters using basic boxes since TextGeometry requires font files
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(20, 1.8, 0.5), terminalWhiteMat);
    signBoard.position.set(0, 12, 3);
    group.add(signBoard);

    // Create a texture for the red sign
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = '#dc2626'; // Red text
    ctx.font = 'bold 120px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OSHODI STATION', 512, 128);
    
    const signTex = new THREE.CanvasTexture(canvas);
    const signTextMesh = new THREE.Mesh(new THREE.PlaneGeometry(19, 1.5), new THREE.MeshBasicMaterial({ map: signTex, transparent: true }));
    signTextMesh.position.set(0, 12, 3.26);
    group.add(signTextMesh);

    // Parked Yellow Danfos at the terminal bus bays
    for(let i = -10; i <= 10; i += 5) {
      [-14, 14].forEach(bx => {
        const bus = new THREE.Mesh(new THREE.BoxGeometry(2, 2.2, 5), new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.6 }));
        bus.position.set(bx, 1.1, i);
        bus.rotation.y = (bx > 0 ? 1 : -1) * 0.2;
        group.add(bus);
      });
    }

    this.scene.add(group);
  }`;

code = code.replace(buildOshodiRegex, newOshodiArea);

fs.writeFileSync(path, code);
console.log('Done upgrading bus and Oshodi terminal');
