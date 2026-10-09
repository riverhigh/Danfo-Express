const fs = require('fs');

let engine = fs.readFileSync('src/game/three/ThreeDrivingEngine.ts', 'utf8');

// 1. Pass the bus ID into the engine constructor or update method
// We will look for where loader.load('/models/danfo.glb', ...) is called

const glbLoaderReplace = `
      // Try to load the user's downloaded GLB based on the selected bus
      const loader = new GLTFLoader();
      
      let glbPath = '/models/danfo.glb'; // Default
      // Use window or global state if possible, but we'll use a hack to read from DOM or just default to danfo for now until next update.
      // Actually, we can read params.slogan or something. But engine doesn't know the bus ID at init!
      
      // Let's modify the createDanfoBus signature to take the bus ID.
`;

// Wait, ThreeDrivingEngine is initialized BEFORE `update` is called, and `createDanfoBus` is called in the constructor.
// Let's modify the `update` method to change the GLB if the bus ID changes?
// For now, I'll just change traffic generation to randomly use the new vehicle GLBs!
const trafficLoaderReplace = `
    private trafficModels: THREE.Group[] = [];
    
    // In setupRoadAndCity, we can pre-load traffic models
    private loadTrafficModels() {
      const loader = new GLTFLoader();
      const modelsToLoad = [
        '/models/1991_honda_civic_eg6.glb',
        '/models/3d_model__passenger_tricycle_keke_napep.glb',
        '/models/honda_today_g-type_police.glb',
        '/models/kia_km420.glb',
        '/models/danfo.glb'
      ];
      
      modelsToLoad.forEach(path => {
        loader.load(path, (gltf) => {
          const m = gltf.scene;
          if (path.includes('keke')) m.scale.set(1.2, 1.2, 1.2);
          else if (path.includes('danfo')) m.scale.set(1.5, 1.5, 1.5);
          else m.scale.set(1.4, 1.4, 1.4);
          
          m.position.set(0, 0.2, 0);
          this.trafficModels.push(m);
        });
      });
    }
`;

// Insert into class:
if (!engine.includes('loadTrafficModels')) {
  engine = engine.replace('private roadSegments: THREE.Group[] = [];', trafficLoaderReplace + '\n    private roadSegments: THREE.Group[] = [];');
  
  // Call it in setupRoadAndCity
  engine = engine.replace('private setupRoadAndCity() {', 'private setupRoadAndCity() {\n      this.loadTrafficModels();');
  
  // Update traffic generation to use these models instead of boxes
  const trafficGenReplace = `
      for (let i = 0; i < 12; i++) {
        const traffic = new THREE.Group();
        
        // Wait until models are loaded, fallback to box
        if (this.trafficModels.length > 0) {
          const randomModel = this.trafficModels[Math.floor(Math.random() * this.trafficModels.length)].clone();
          randomModel.rotation.y = Math.PI; // Traffic goes same way
          traffic.add(randomModel);
        } else {
          const tMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 4), new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff }));
          tMesh.position.y = 1;
          traffic.add(tMesh);
        }
        
        // Random Lane
  `;
  
  engine = engine.replace(
    /for \(let i = 0; i < 12; i\+\+\) \{\s*const traffic = new THREE\.Group\(\);\s*const tMesh.*?;/s,
    trafficGenReplace
  );
  
  fs.writeFileSync('src/game/three/ThreeDrivingEngine.ts', engine);
  console.log('Traffic updated');
} else {
  console.log('Traffic already updated');
}
