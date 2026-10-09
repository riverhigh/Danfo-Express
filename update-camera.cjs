const fs = require('fs');
const lines = fs.readFileSync('src/game/three/ThreeDrivingEngine.ts','utf8').split(/\r?\n/);

const startIdx = lines.findIndex(l => l.includes('// Eye-level behind steering wheel looking FORWARD'));

if (startIdx !== -1) {
    // Delete from "} else {" to the end of the else block. Let's find "} else {" just before startIdx
    const elseIdx = startIdx - 1;
    let endIdx = startIdx;
    while(endIdx < lines.length && !lines[endIdx].includes('this.camera.updateProjectionMatrix();')) {
        endIdx++;
    }
    endIdx++; // include the '}' line after updateProjectionMatrix

    const newLogic = `    } else if (params.cameraMode === 'THIRD_PERSON') {
      const offsetZ = gear === 'R' ? 10 : -8;
      const camPos = new THREE.Vector3(laneOffsetMeters, 4.5, offsetZ);
      this.camera.position.lerp(camPos, 0.1);
      const lookTarget = new THREE.Vector3(laneOffsetMeters, 1.5, gear === 'R' ? -20 : 20);
      this.camera.lookAt(lookTarget);
      this.camera.fov = 60;
      this.camera.updateProjectionMatrix();
    } else {
      const headBob = speedKmH > 10 ? Math.sin(Date.now() * 0.02) * 0.008 : 0;
      const localCamPos = new THREE.Vector3(-0.4, 1.5 + headBob, -0.15);
      localCamPos.applyEuler(this.busRoot.rotation);
      localCamPos.add(this.busRoot.position);
      this.camera.position.copy(localCamPos);

      const isReversing = gear === 'R';
      const baseYaw = isReversing ? 0 : Math.PI; 
      const pitchG = isBraking ? 0.02 : (speedKmH > 20 ? -0.01 : 0);
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = baseYaw + this.busRoot.rotation.y + (params.cameraLookYaw || 0);
      this.camera.rotation.x = pitchG + (params.cameraLookPitch || 0);
      this.camera.rotation.z = this.busRoot.rotation.z;
      this.camera.fov = 70;
      this.camera.updateProjectionMatrix();
    }`;

    lines.splice(elseIdx, (endIdx - elseIdx) + 1, newLogic);
    fs.writeFileSync('src/game/three/ThreeDrivingEngine.ts', lines.join('\\n'));
    console.log('Done!');
} else {
    console.log('Not found!');
}
