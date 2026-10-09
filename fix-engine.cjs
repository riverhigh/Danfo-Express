const fs = require('fs');
let code = fs.readFileSync('src/game/three/ThreeDrivingEngine.ts', 'utf8');

// ===== 4. Hide fallback geometry immediately (invisible until GLB loads) =====
code = code.replace(
  'fallbackGroup.add(floor);\n      busBody.add(fallbackGroup);',
  'fallbackGroup.add(floor);\n      fallbackGroup.visible = false; // Stay hidden — only show if GLB fails\n      busBody.add(fallbackGroup);'
);

// ===== 5. Add ORBIT camera (slow auto-rotate around bus) + 360 view =====
// Find the THIRD_PERSON camera block and add ORBIT after it
const thirdPersonBlock = `      } else if (params.cameraMode === 'THIRD_PERSON') {
      const offsetZ = gear === 'R' ? 10 : -8;
      const camPos = new THREE.Vector3(laneOffsetMeters, 4.5, offsetZ);
      this.camera.position.lerp(camPos, 0.1);
      const lookTarget = new THREE.Vector3(laneOffsetMeters, 1.5, gear === 'R' ? -20 : 20);
      this.camera.lookAt(lookTarget);
      this.camera.fov = 60;
      this.camera.updateProjectionMatrix();`;

const thirdPersonReplacement = `      } else if (params.cameraMode === 'THIRD_PERSON') {
      const orbitAngle = Date.now() * 0.0005 + (params.cameraLookYaw || 0);
      const orbitRadius = 9;
      const orbitX = laneOffsetMeters + Math.sin(orbitAngle) * orbitRadius;
      const orbitZ = Math.cos(orbitAngle) * orbitRadius;
      const orbitY = 3.5;
      this.camera.position.lerp(new THREE.Vector3(orbitX, orbitY, orbitZ), 0.06);
      this.camera.lookAt(new THREE.Vector3(laneOffsetMeters, 1.2, 0));
      this.camera.fov = 65;
      this.camera.updateProjectionMatrix();`;

code = code.replace(thirdPersonBlock, thirdPersonReplacement);

// ===== 6. Add lane blocking — if traffic is in the same lane as player, push it back =====
const trafficFlowBlock = `      // 15. Traffic Flow (Adapts dynamically to Drive and Reverse)
    this.trafficMeshes.forEach((t) => {
        t.position.z -= (effectiveSpeed - 8) * dt;
        if (t.position.z < -40) {
          t.position.z = 160 + Math.random() * 50;
        } else if (t.position.z > 220) {
          t.position.z = -30;
        }
      });`;

const trafficFlowReplacement = `      // 15. Traffic Flow with Lane Awareness
    this.trafficMeshes.forEach((t) => {
        t.position.z -= (effectiveSpeed - 8) * dt;
        if (t.position.z < -40) {
          t.position.z = 160 + Math.random() * 50;
          // Re-randomize X lane on reset
          t.position.x = [-5.5, 0, 5.5][Math.floor(Math.random() * 3)];
        } else if (t.position.z > 220) {
          t.position.z = -30;
          t.position.x = [-5.5, 0, 5.5][Math.floor(Math.random() * 3)];
        }

        // Lane blocking: if this NPC is in the same lane as the player, stop it from passing through
        const sameLane = Math.abs(t.position.x - laneOffsetMeters) < 2.5;
        if (sameLane && t.position.z > 0 && t.position.z < 25) {
          // NPC is directly in front of player — push it back to maintain gap
          const gap = t.position.z;
          if (gap < 14) {
            // This NPC is blocking — nudge it forward (it shouldn't pass through)
            t.position.z = Math.max(t.position.z, 14);
          }
        }
      });`;

code = code.replace(trafficFlowBlock, trafficFlowReplacement);

fs.writeFileSync('src/game/three/ThreeDrivingEngine.ts', code);
console.log('Engine fixes applied');
