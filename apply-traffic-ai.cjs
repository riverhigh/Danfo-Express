const fs = require('fs');

let code = fs.readFileSync('src/game/three/ThreeDrivingEngine.ts', 'utf8');

// 1. Update setupTrafficAndHazards to set rotY, hide circles/pedestals, and initialize userData
const oldSetupTrafficStart = 'private setupTrafficAndHazards() {';
const oldSetupTrafficEnd = 'this.trafficMeshes.push(traffic);\n    }\n  }';
const oldSetupTrafficEndCrlf = 'this.trafficMeshes.push(traffic);\r\n    }\r\n  }';

const newSetupTraffic = `  private setupTrafficAndHazards() {
    const npcGlbPaths = [
      { path: '/models/1991_honda_civic_eg6.glb', scale: 1.2, rotY: Math.PI },
      { path: '/models/2005_toyota_townace_gl.glb', scale: 1.5, rotY: Math.PI },
      // Keke tricycle was modeled facing X-axis (+90 deg offset), so rotY = -Math.PI / 2 makes it drive forward, NOT sideways!
      { path: '/models/3d_model__passenger_tricycle_keke_napep.glb', scale: 1.0, rotY: -Math.PI / 2 },
      { path: '/models/honda_today_g-type_police.glb', scale: 1.3, rotY: Math.PI },
      { path: '/models/kia_km420.glb', scale: 1.4, rotY: Math.PI },
      { path: '/models/2000_honda_civic_type_r_ek9.glb', scale: 1.2, rotY: Math.PI },
      { path: '/models/2010_kia_forte_koup.glb', scale: 1.3, rotY: Math.PI },
      { path: '/models/ac_-_honda_acty_ha3_free.glb', scale: 1.0, rotY: Math.PI },
    ];
    const loader = new GLTFLoader();
    const lanes = [-5.5, 0, 5.5];

    for (let i = 0; i < 15; i++) {
      const traffic = new THREE.Group();
      const cfg = npcGlbPaths[i % npcGlbPaths.length];
      const initialLane = lanes[i % lanes.length];
      
      // Initialize vehicle AI state
      traffic.userData = {
        targetLaneX: initialLane,
        baseRotY: cfg.rotY || 0,
        currentSpeed: 7.0 + (i % 5) * 1.0, // 25-40 km/h cruising speed
        laneChangeCooldown: Math.random() * 4 + 2,
        hasGlb: false
      };

      traffic.position.set(initialLane, 0, 60 + i * 35);
      this.scene.add(traffic);
      this.trafficMeshes.push(traffic);

      loader.load(cfg.path, (gltf) => {
        const m = gltf.scene;
        m.scale.setScalar(cfg.scale);
        m.position.set(0, 0, 0);
        if (cfg.rotY) {
          m.rotation.y = cfg.rotY;
        }

        // Clean out ground shadow circles / cylinders / turntables under keke, police car, etc.
        m.traverse((child: any) => {
          if (child.isMesh && child.name) {
            const n = child.name.toLowerCase();
            if (
              n.includes('circle') ||
              n.includes('pcylinder') ||
              n.includes('cylinder_24') ||
              n.includes('shadow') ||
              n.includes('pedestal') ||
              n.includes('turntable')
            ) {
              child.visible = false;
            }
          }
        });

        traffic.add(m);
        traffic.userData.hasGlb = true;
      }, undefined, (err) => console.warn('Traffic GLB fail:', err));
    }
  }`;

const tsIdx = code.indexOf(oldSetupTrafficStart);
let teIdx = -1;
let teLen = 0;
if (tsIdx !== -1) {
  const te1 = code.indexOf(oldSetupTrafficEnd, tsIdx);
  const te2 = code.indexOf(oldSetupTrafficEndCrlf, tsIdx);
  if (te1 !== -1 && (te2 === -1 || te1 < te2)) {
    teIdx = te1;
    teLen = oldSetupTrafficEnd.length;
  } else if (te2 !== -1) {
    teIdx = te2;
    teLen = oldSetupTrafficEndCrlf.length;
  }
}

if (tsIdx !== -1 && teIdx !== -1) {
  code = code.substring(0, tsIdx) + newSetupTraffic + code.substring(teIdx + teLen);
  console.log('Successfully replaced setupTrafficAndHazards!');
} else {
  console.log('Could not find setupTrafficAndHazards bounds:', tsIdx, teIdx);
}

// Also in createDanfoBus, clean ground shadow circles under keke or police car if chosen as player vehicle:
const cdbLoaderMarker = 'fallbackGroup.visible = false;';
const cdbTraverseClean = `fallbackGroup.visible = false;
        // Clean out ground shadow circles / cylinders under keke, police car, etc.
        model.traverse((child: any) => {
          if (child.isMesh && child.name) {
            const n = child.name.toLowerCase();
            if (
              n.includes('circle') ||
              n.includes('pcylinder') ||
              n.includes('cylinder_24') ||
              n.includes('shadow') ||
              n.includes('pedestal') ||
              n.includes('turntable')
            ) {
              child.visible = false;
            }
          }
        });`;

if (code.includes(cdbLoaderMarker) && !code.includes('Clean out ground shadow circles')) {
  code = code.replace(cdbLoaderMarker, cdbTraverseClean);
  console.log('Added shadow circle cleaner to player car loader!');
}

// 2. Intelligent Traffic Flow & Collision Avoidance in update()
const oldTrafficUpdateStart = '// 15. Traffic Flow (Adapts dynamically to Drive and Reverse)';
const oldTrafficUpdateEnd = 'this.trafficMeshes.forEach((t) => {\n      t.position.z -= (effectiveSpeed - 8) * dt;\n      if (t.position.z < -40) {\n        t.position.z = 160 + Math.random() * 50;\n      } else if (t.position.z > 220) {\n        t.position.z = -30;\n      }\n    });';
const oldTrafficUpdateEndCrlf = oldTrafficUpdateEnd.replace(/\n/g, '\r\n');

const newTrafficUpdate = `// 15. INTELLIGENT TRAFFIC AI: Collision Avoidance & Overtaking ("Go Around")
    const availableLanes = [-5.5, 0, 5.5];

    this.trafficMeshes.forEach((t, i) => {
      if (!t.userData) return;
      const u = t.userData;
      u.laneChangeCooldown = Math.max(0, (u.laneChangeCooldown || 0) - dt);

      // Target cruising speed
      let desiredSpeed = 8.5;

      // ─── A. AVOID PLAYER VEHICLE (GO AROUND PLAYER) ───
      // Player is at (laneOffsetMeters, 0)
      const distToPlayerZ = t.position.z; // Relative Z to player
      const inPlayerLane = Math.abs(t.position.x - laneOffsetMeters) < 2.3;

      if (inPlayerLane && Math.abs(distToPlayerZ) < 30) {
        // Player is blocking this lane! Go around the player!
        if (u.laneChangeCooldown <= 0) {
          // Find open lane adjacent to current lane
          const alternativeLanes = availableLanes.filter(l => Math.abs(l - laneOffsetMeters) > 2.0);
          if (alternativeLanes.length > 0) {
            // Pick the lane with fewest nearby cars
            const bestLane = alternativeLanes.reduce((best, candidate) => {
              const bestCrowd = this.trafficMeshes.filter(o => o !== t && Math.abs(o.position.x - best) < 1.5 && Math.abs(o.position.z - t.position.z) < 20).length;
              const candCrowd = this.trafficMeshes.filter(o => o !== t && Math.abs(o.position.x - candidate) < 1.5 && Math.abs(o.position.z - t.position.z) < 20).length;
              return candCrowd < bestCrowd ? candidate : best;
            }, alternativeLanes[0]);

            u.targetLaneX = bestLane;
            u.laneChangeCooldown = 2.5;
          }
        }

        // If very close to player in same lane, brake to avoid passing through
        if (distToPlayerZ > 0 && distToPlayerZ < 10) {
          desiredSpeed = Math.min(desiredSpeed, Math.max(0, speedMps * 0.8));
        } else if (distToPlayerZ < 0 && distToPlayerZ > -8 && speedMps < 2) {
          // Stopped in front of traffic
          desiredSpeed = 0;
        }
      }

      // ─── B. AVOID OTHER TRAFFIC VEHICLES (NO PASSING THROUGH EACH OTHER) ───
      this.trafficMeshes.forEach((other, j) => {
        if (i === j) return;
        const dz = other.position.z - t.position.z; // other ahead if dz > 0
        const sameLane = Math.abs(t.position.x - other.position.x) < 2.0;

        // Vehicle ahead in same lane within 18m
        if (sameLane && dz > 0 && dz < 18) {
          // Slow down to match car ahead
          desiredSpeed = Math.min(desiredSpeed, (other.userData?.currentSpeed || 8.0) * 0.9);

          // Try to overtake / switch lanes to go around car ahead!
          if (u.laneChangeCooldown <= 0) {
            const openLanes = availableLanes.filter(l => Math.abs(l - t.position.x) > 2.0);
            const clearLane = openLanes.find(laneX => {
              // Lane is clear if no other car is within 25m
              return !this.trafficMeshes.some(o => Math.abs(o.position.x - laneX) < 1.8 && Math.abs(o.position.z - t.position.z) < 25);
            });
            if (clearLane !== undefined) {
              u.targetLaneX = clearLane;
              u.laneChangeCooldown = 3.0;
            }
          }
        }
      });

      // Smooth acceleration / braking
      u.currentSpeed = THREE.MathUtils.lerp(u.currentSpeed || 8.0, desiredSpeed, dt * 2.5);

      // Smooth lane changing (move X towards targetLaneX)
      const laneDiff = (u.targetLaneX !== undefined ? u.targetLaneX : t.position.x) - t.position.x;
      t.position.x += laneDiff * Math.min(1.0, dt * 2.8);

      // Subtle steering tilt while changing lanes
      const baseRot = u.baseRotY || 0;
      t.rotation.y = baseRot + Math.max(-0.2, Math.min(0.2, laneDiff * 0.15));

      // Advance along road relative to player speed
      t.position.z -= (effectiveSpeed - u.currentSpeed) * dt;

      // Respawn ahead or behind when out of view
      if (t.position.z < -45) {
        t.position.z = 180 + Math.random() * 60;
        const newLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
        t.position.x = newLane;
        u.targetLaneX = newLane;
        u.currentSpeed = 7.5 + Math.random() * 3.5;
        u.laneChangeCooldown = 1.5;
      } else if (t.position.z > 250) {
        t.position.z = -35 - Math.random() * 20;
        const newLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
        t.position.x = newLane;
        u.targetLaneX = newLane;
      }
    });`;

if (code.includes(oldTrafficUpdateEnd)) {
  code = code.replace(oldTrafficUpdateEnd, newTrafficUpdate);
  console.log('Replaced traffic update with AI collision avoidance!');
} else if (code.includes(oldTrafficUpdateEndCrlf)) {
  code = code.replace(oldTrafficUpdateEndCrlf, newTrafficUpdate);
  console.log('Replaced traffic update with AI collision avoidance (CRLF)!');
} else {
  console.log('oldTrafficUpdateEnd not found');
}

fs.writeFileSync('src/game/three/ThreeDrivingEngine.ts', code);
console.log('Wrote updated ThreeDrivingEngine.ts');
