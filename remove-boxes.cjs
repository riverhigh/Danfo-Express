const fs = require('fs');

let code = fs.readFileSync('src/game/three/ThreeDrivingEngine.ts', 'utf8');

// 1. Remove Player fallback Minecraft boxes
// Find `const fallbackGroup = new THREE.Group();`
// and replace its children additions with nothing.
const fallbackStart = "const fallbackGroup = new THREE.Group();";
const fallbackEnd = "busBody.add(fallbackGroup);";
let sF = code.indexOf(fallbackStart);
let eF = code.indexOf(fallbackEnd, sF);
if (sF !== -1 && eF !== -1) {
  code = code.substring(0, sF) + "const fallbackGroup = new THREE.Group();\n      busBody.add(fallbackGroup);" + code.substring(eF + fallbackEnd.length);
}

// 2. Remove Conductor Minecraft box
// In `ThreeDrivingEngine.ts`, conductor is returned as `conductor: new THREE.Group()` already from previous fix?
// Wait, did I ever fix the conductor in `createDanfoBus`? Yes, in `fix-engine3.cjs`? No!
// I only added `if (this.conductorMesh.children.length >= 5)` to prevent the crash!
// Let me look for conductorGroup.
const condStart = "const conductorGroup = new THREE.Group();";
const condEnd = "conductorGroup.add(slapArm);";
let sC = code.indexOf(condStart);
let eC = code.indexOf(condEnd, sC);
if (sC !== -1 && eC !== -1) {
  code = code.substring(0, sC) + "const conductorGroup = new THREE.Group();" + code.substring(eC + condEnd.length);
}

// 3. Traffic Minecraft Boxes
// Replace the ENTIRE `createTrafficCar` method body with returning an empty group.
const trafficMethodStart = "private createTrafficCar(seed: number) {";
const trafficMethodEnd = "return traffic;\n    }";
const trafficMethodEnd2 = "return traffic;\r\n    }";
let sT = code.indexOf(trafficMethodStart);
let eT = code.indexOf(trafficMethodEnd, sT);
let tLen = trafficMethodEnd.length;
if (eT === -1) {
    eT = code.indexOf(trafficMethodEnd2, sT);
    tLen = trafficMethodEnd2.length;
}

if (sT !== -1 && eT !== -1) {
  const newTraffic = `private createTrafficCar(seed: number) {
      const traffic = new THREE.Group();
      // Keep bounding box properties for collisions
      (traffic as any)._carType = 'SEDAN';
      return traffic;
    }`;
  code = code.substring(0, sT) + newTraffic + code.substring(eT + tLen);
}

// 4. Passenger Minecraft Boxes
// In `syncJunctionShelters`, there's a loop creating passengers:
// `const pGroup = new THREE.Group();`
// followed by `const pHead = ...`
const pStart = "const pGroup = new THREE.Group();";
const pEnd = "pGroup.add(arm);";
let sP = code.indexOf(pStart);
while (sP !== -1) {
    let eP = code.indexOf(pEnd, sP);
    if (eP !== -1) {
        code = code.substring(0, sP) + "const pGroup = new THREE.Group();\n          (pGroup as any)._isNpc = true;" + code.substring(eP + pEnd.length);
    }
    sP = code.indexOf(pStart, sP + 10);
}

// 5. Update loop logic to attach GLB to Traffic and NPCs dynamically
// Add new NPC loader to `loadTrafficModels`
const loadStart = "const modelsToLoad = [";
const newLoad = `
        const npcLoader = new GLTFLoader();
        this.npcModels = [];
        const npcPaths = [
          '/models/african_female_model.glb',
          '/models/free_download_athletic_african_man_walking_223.glb',
          '/models/free_download_attractive_african_woman_236.glb',
          '/models/human.glb'
        ];
        npcPaths.forEach(path => {
          npcLoader.load(path, (gltf) => {
            const m = gltf.scene;
            m.scale.set(1.4, 1.4, 1.4);
            m.position.set(0, 0, 0);
            this.npcModels.push(m);
          });
        });
        
        const modelsToLoad = [`;
code = code.replace(loadStart, newLoad);

// Define `npcModels` in the class
code = code.replace("private trafficModels: THREE.Group[] = [];", "private trafficModels: THREE.Group[] = [];\n  private npcModels: THREE.Group[] = [];");

// In `update()`, check traffic and attach
const trafficLoopStart = "if (!t.userData.hasGlb && this.trafficModels.length > 0) {";
const trafficLoopEnd = "}";
// We'll just replace the whole inner logic for traffic swap.
const swapOld = `if (!t.userData.hasGlb && this.trafficModels.length > 0) {
        if (Math.random() < 0.02) {
          const prefab = this.trafficModels[Math.floor(Math.random() * this.trafficModels.length)];
          const clone = prefab.clone();
          t.clear();
          t.add(clone);
          t.userData.hasGlb = true;
        }
      }`;
const swapNew = `if (!t.userData.hasGlb && this.trafficModels.length > 0) {
        const prefab = this.trafficModels[Math.floor(Math.random() * this.trafficModels.length)];
        const clone = prefab.clone();
        t.clear();
        t.add(clone);
        t.userData.hasGlb = true;
      }`;
code = code.replace(swapOld, swapNew);

// In `update()`, loop over junctions and attach NPCs
const junctionUpdate = `this.junctionMeshes.forEach((j) => {`;
const junctionNew = `this.junctionMeshes.forEach((j) => {
      j.passengers.forEach(p => {
        if ((p as any)._isNpc && !(p as any).hasGlb && this.npcModels.length > 0) {
          const prefab = this.npcModels[Math.floor(Math.random() * this.npcModels.length)];
          const clone = prefab.clone();
          p.clear();
          p.add(clone);
          (p as any).hasGlb = true;
        }
      });`;
code = code.replace(junctionUpdate, junctionNew);

fs.writeFileSync('src/game/three/ThreeDrivingEngine.ts', code);
console.log('Removed minecraft boxes and added NPC GLBs!');
