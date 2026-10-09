const fs = require('fs');

const path = 'src/game/three/ThreeDrivingEngine.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /private setupTrafficAndHazards\(\) \{[\s\S]*?this\.trafficMeshes\.push\(traffic\);\n    \}\n  \}/;

const newMethod = `private setupTrafficAndHazards() {
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

code = code.replace(regex, newMethod);
fs.writeFileSync(path, code);
console.log('Traffic updated');
