const fs = require('fs');

let code = fs.readFileSync('src/game/three/ThreeDrivingEngine.ts', 'utf8');

const target = `    if (isSteppedDown) {
      // Driver stepped down to roadside passenger door to usher passengers in
      this.camera.position.set(laneOffsetMeters + 1.8, 1.65, 0.2);
      this.camera.lookAt(laneOffsetMeters + 3.8, 1.6, 0.5);
      this.camera.fov = 68;
      this.camera.updateProjectionMatrix();
    } else if (params.cameraMode === 'THIRD_PERSON') {`;

const targetWin = target.replace(/\n/g, '\r\n');

const replacement = `    if (isSteppedDown) {
      // Driver stepped down to roadside passenger door
      this.camera.position.set(laneOffsetMeters + 1.8, 1.65, 0.2);
      this.camera.rotation.order = 'YXZ';
      // Look outward towards the door by default (approx -1.8 rad), plus user drag
      this.camera.rotation.y = -1.8 + (params.cameraLookYaw || 0);
      this.camera.rotation.x = (params.cameraLookPitch || 0);
      this.camera.rotation.z = 0;
      this.camera.fov = 68;
      this.camera.updateProjectionMatrix();
    } else if (params.cameraMode === 'THIRD_PERSON') {`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/game/three/ThreeDrivingEngine.ts', code);
    console.log("Fixed camera LF");
} else if (code.includes(targetWin)) {
    code = code.replace(targetWin, replacement);
    fs.writeFileSync('src/game/three/ThreeDrivingEngine.ts', code);
    console.log("Fixed camera CRLF");
} else {
    console.log("Could not find block!");
}
