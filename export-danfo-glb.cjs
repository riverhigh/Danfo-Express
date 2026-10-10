const fs = require('fs');

global.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(buf => {
      this.result = buf;
      if (this.onloadend) this.onloadend();
    });
  }
};

const THREE = require('three');
const { GLTFExporter } = require('three/examples/jsm/exporters/GLTFExporter.js');

function buildDanfoBusModel() {
  const root = new THREE.Group();
  root.name = 'DanfoBus';

  // --- Materials ---
  const yellowPaint = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.28,
    metalness: 0.2,
    name: 'DanfoYellow'
  });
  const blackStripe = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.4,
    metalness: 0.1,
    name: 'DanfoBlackStripe'
  });
  const darkChassis = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.8,
    metalness: 0.3,
    name: 'ChassisDark'
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.12,
    metalness: 0.95,
    name: 'Chrome'
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.55,
    name: 'WindowTint'
  });
  const tireRubber = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.85,
    metalness: 0.05,
    name: 'TireRubber'
  });
  const woodBench = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.75,
    metalness: 0.0,
    name: 'WoodBench'
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfde047,
    emissiveIntensity: 1.2,
    roughness: 0.1,
    name: 'HeadlightGlass'
  });
  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xb91c1c,
    emissiveIntensity: 1.0,
    roughness: 0.2,
    name: 'BrakeLightGlass'
  });
  const orangeBlinkerMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xc2410c,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    name: 'OrangeBlinker'
  });
  const signMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.5,
    name: 'Signboard'
  });

  const body = new THREE.Group();
  body.name = 'BusBody';
  root.add(body);

  // 1. Lower Main Body Chassis
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.82, 5.0), yellowPaint);
  lowerBody.position.set(0, 1.05, 0.0);
  lowerBody.name = 'LowerBody';
  body.add(lowerBody);

  // 2. Dual Iconic Black Stripes (Wrapped around lower body)
  const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.11, 5.02), blackStripe);
  stripe1.position.set(0, 0.95, 0.0);
  stripe1.name = 'BlackStripeLower';
  body.add(stripe1);

  const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.11, 5.02), blackStripe);
  stripe2.position.set(0, 1.25, 0.0);
  stripe2.name = 'BlackStripeUpper';
  body.add(stripe2);

  // 3. Cabin Floor & Underbody
  const underbody = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.2, 4.9), darkChassis);
  underbody.position.set(0, 0.65, 0.0);
  underbody.name = 'Chassis';
  body.add(underbody);

  // 4. Front Slanted Bonnet & Nose (Front is +Z)
  const frontBonnet = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.72, 0.65), yellowPaint);
  frontBonnet.position.set(0, 1.1, 2.72);
  frontBonnet.rotation.x = -0.15;
  frontBonnet.name = 'FrontBonnet';
  body.add(frontBonnet);

  // 5. Front Black Grille & Chrome Trim (At Front +Z)
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.08), blackStripe);
  grille.position.set(0, 1.1, 3.05);
  grille.name = 'FrontGrille';
  body.add(grille);

  const grilleBadge = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16), chrome);
  grilleBadge.rotation.x = Math.PI / 2;
  grilleBadge.position.set(0, 1.1, 3.1);
  body.add(grilleBadge);

  // Front Heavy Bumper & Bull Bar (At Front +Z)
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.22, 0.22), darkChassis);
  frontBumper.position.set(0, 0.72, 3.05);
  frontBumper.name = 'FrontBumper';
  body.add(frontBumper);

  // Bull Bar
  const bullBar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 0.1), chrome);
  bullBar.position.set(0, 0.95, 3.18);
  bullBar.name = 'BullBar';
  body.add(bullBar);

  // 6. Front Headlights (At Front +Z)
  [-0.78, 0.78].forEach((hx, idx) => {
    const hlBevel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 20), chrome);
    hlBevel.rotation.x = Math.PI / 2;
    hlBevel.position.set(hx, 1.12, 3.05);
    body.add(hlBevel);

    const hlGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 20), headlightMat);
    hlGlass.rotation.x = Math.PI / 2;
    hlGlass.position.set(hx, 1.12, 3.08);
    hlGlass.name = idx === 0 ? 'LeftHeadlight' : 'RightHeadlight';
    body.add(hlGlass);

    // Front Corner Amber Blinkers
    const blinker = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.08), orangeBlinkerMat);
    blinker.position.set(hx * 1.35, 1.12, 2.96);
    blinker.name = idx === 0 ? 'LeftFrontBlinker' : 'RightFrontBlinker';
    body.add(blinker);
  });

  // 7. Windscreen & Front Windshield (Facing Front +Z)
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 0.92), glass);
  windshield.position.set(0, 1.95, 2.52);
  windshield.rotation.x = -0.22;
  windshield.name = 'FrontWindshield';
  body.add(windshield);

  // Windshield Frame/Pillars (A-pillars)
  [-1.08, 1.08].forEach(px => {
    const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.0, 0.09), yellowPaint);
    aPillar.position.set(px, 1.95, 2.5);
    aPillar.rotation.x = -0.22;
    body.add(aPillar);
  });

  // 8. Roof & Destination Signboard
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.15, 4.85), yellowPaint);
  roof.position.set(0, 2.45, -0.05);
  roof.name = 'Roof';
  body.add(roof);

  // Iconic Destination Signboard above windshield
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.12), signMat);
  signBoard.position.set(0, 2.45, 2.38);
  signBoard.name = 'DestinationSignboard';
  body.add(signBoard);

  // Roof Luggage Carrier (Yellow/black metal roof rack)
  const roofRack = new THREE.Group();
  roofRack.name = 'RoofCarrierRack';
  [-1.0, 1.0].forEach(rx => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 3.8), blackStripe);
    rail.position.set(rx, 2.62, -0.15);
    roofRack.add(rail);
  });
  [-1.6, -0.8, 0.0, 0.8, 1.5].forEach(rz => {
    const crossBar = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.05, 0.05), blackStripe);
    crossBar.position.set(0, 2.6, rz);
    roofRack.add(crossBar);
  });
  // Strapped luggage cartons / bags on roof rack
  const sack1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.9), new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 }));
  sack1.position.set(-0.4, 2.75, -0.4);
  roofRack.add(sack1);
  const sack2 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.3, 0.7), new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.9 }));
  sack2.position.set(0.45, 2.72, 0.3);
  roofRack.add(sack2);
  body.add(roofRack);

  // 9. Side Window Glass & Pillars
  // Left side windows (Driver side in Nigeria)
  const leftGlass = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.84), glass);
  leftGlass.position.set(-1.125, 1.92, -0.1);
  leftGlass.rotation.y = -Math.PI / 2;
  leftGlass.name = 'LeftWindows';
  body.add(leftGlass);

  // Right side windows (Curbside)
  const rightGlassRear = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.84), glass);
  rightGlassRear.position.set(1.125, 1.92, -0.9);
  rightGlassRear.rotation.y = Math.PI / 2;
  rightGlassRear.name = 'RightWindows';
  body.add(rightGlassRear);

  // Body Pillars along sides
  [-2.2, -1.1, 0.1, 1.3].forEach(pz => {
    [-1.12, 1.12].forEach(px => {
      // Don't place pillar blocking sliding door doorway on right (+X) between 0.4 and 1.8
      if (px > 0 && pz > 0.3 && pz < 1.7) return;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.1), yellowPaint);
      pillar.position.set(px, 1.92, pz);
      body.add(pillar);
    });
  });

  // 10. Sliding Passenger Door on Right Curbside (+X side)
  const slidingDoor = new THREE.Group();
  slidingDoor.name = 'SlidingDoor';
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.62, 1.25), yellowPaint);
  doorPanel.position.set(1.135, 1.48, 0.0);
  slidingDoor.add(doorPanel);
  const doorStripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 1.25), blackStripe);
  doorStripe1.position.set(1.135, 0.95, 0.0);
  slidingDoor.add(doorStripe1);
  const doorStripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 1.25), blackStripe);
  doorStripe2.position.set(1.135, 1.25, 0.0);
  slidingDoor.add(doorStripe2);
  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.72, 1.05), glass);
  doorGlass.position.set(1.135, 1.9, 0.0);
  slidingDoor.add(doorGlass);
  const doorHandle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.06), chrome);
  doorHandle.position.set(1.16, 1.35, -0.45);
  slidingDoor.add(doorHandle);
  slidingDoor.position.set(0, 0, 0.95);
  body.add(slidingDoor);

  // 11. Interior Wooden Benches (Classic Danfo Wooden Planks)
  [-1.7, -0.9, -0.1, 0.7].forEach(bz => {
    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.08, 0.38), woodBench);
    benchSeat.position.set(-0.05, 0.98, bz);
    body.add(benchSeat);

    const benchBack = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.38, 0.06), woodBench);
    benchBack.position.set(-0.05, 1.22, bz - 0.18);
    body.add(benchBack);
  });

  // 12. Driver Cabin & Steering Wheel (Front-Left in Nigeria, Front +Z)
  const dashboard = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.42, 0.55), darkChassis);
  dashboard.position.set(0, 1.35, 2.15);
  dashboard.name = 'Dashboard';
  body.add(dashboard);

  // Driver Seat
  const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.6), darkChassis);
  driverSeat.position.set(-0.55, 1.0, 1.55);
  body.add(driverSeat);
  const driverSeatBack = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.12), darkChassis);
  driverSeatBack.position.set(-0.55, 1.35, 1.26);
  body.add(driverSeatBack);

  // Steering Wheel
  const steeringWheel = new THREE.Group();
  steeringWheel.name = 'SteeringWheel';
  const swRim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.024, 12, 24), darkChassis);
  steeringWheel.add(swRim);
  const swSpoke = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.02), darkChassis);
  steeringWheel.add(swSpoke);
  steeringWheel.position.set(-0.55, 1.45, 1.95);
  steeringWheel.rotation.x = -Math.PI / 3;
  body.add(steeringWheel);

  // Rearview Side Mirrors (Left & Right)
  [-1.22, 1.22].forEach(mx => {
    const mirrorStem = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.04), chrome);
    mirrorStem.position.set(mx > 0 ? 1.15 : -1.15, 1.8, 2.35);
    body.add(mirrorStem);

    const mirrorHead = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.18), darkChassis);
    mirrorHead.position.set(mx, 1.8, 2.38);
    body.add(mirrorHead);

    const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.24), chrome);
    mirrorGlass.rotation.y = mx > 0 ? -Math.PI / 2 : Math.PI / 2;
    mirrorGlass.position.set(mx > 0 ? mx - 0.035 : mx + 0.035, 1.8, 2.38);
    body.add(mirrorGlass);
  });

  // 13. Rear End / Tailgate (At Rear -Z)
  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.85, 0.12), yellowPaint);
  rearWall.position.set(0, 1.05, -2.48);
  rearWall.name = 'RearTailgate';
  body.add(rearWall);

  const rearStripe1 = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.11, 0.13), blackStripe);
  rearStripe1.position.set(0, 0.95, -2.48);
  body.add(rearStripe1);

  const rearStripe2 = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.11, 0.13), blackStripe);
  rearStripe2.position.set(0, 1.25, -2.48);
  body.add(rearStripe2);

  const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 0.72), glass);
  rearGlass.position.set(0, 1.9, -2.48);
  rearGlass.rotation.y = Math.PI;
  rearGlass.name = 'RearWindow';
  body.add(rearGlass);

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.22, 0.22), darkChassis);
  rearBumper.position.set(0, 0.72, -2.52);
  rearBumper.name = 'RearBumper';
  body.add(rearBumper);

  // Rear Brake Lights (Red) & Blinkers (Amber) at Rear -Z
  [-0.92, 0.92].forEach((rx, idx) => {
    const brakeLight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.06), brakeLightMat);
    brakeLight.position.set(rx, 1.15, -2.52);
    brakeLight.name = idx === 0 ? 'LeftBrakeLight' : 'RightBrakeLight';
    body.add(brakeLight);

    const rearBlinker = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.06), orangeBlinkerMat);
    rearBlinker.position.set(rx, 1.32, -2.52);
    rearBlinker.name = idx === 0 ? 'LeftRearBlinker' : 'RightRearBlinker';
    body.add(rearBlinker);
  });

  // Exhaust Pipe (At Rear Left, -Z)
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.35, 12), chrome);
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(-0.85, 0.52, -2.55);
  exhaust.name = 'ExhaustPipe';
  body.add(exhaust);

  // 14. Rugged Danfo Wheels (4 Wheels, Front at +1.45, Rear at -1.45)
  function createWheel(wheelName) {
    const wheelGroup = new THREE.Group();
    wheelGroup.name = wheelName;

    // Tire
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.26, 24), tireRubber);
    tire.rotation.z = Math.PI / 2;
    wheelGroup.add(tire);

    // Rim
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.27, 16), chrome);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    // Wheel Cap Bolts
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.29, 8), darkChassis);
    hub.rotation.z = Math.PI / 2;
    wheelGroup.add(hub);

    return wheelGroup;
  }

  const lfWheel = createWheel('FrontLeftWheel');
  lfWheel.position.set(-1.12, 0.38, 1.45);
  root.add(lfWheel);

  const rfWheel = createWheel('FrontRightWheel');
  rfWheel.position.set(1.12, 0.38, 1.45);
  root.add(rfWheel);

  const lrWheel = createWheel('RearLeftWheel');
  lrWheel.position.set(-1.12, 0.38, -1.45);
  root.add(lrWheel);

  const rrWheel = createWheel('RearRightWheel');
  rrWheel.position.set(1.12, 0.38, -1.45);
  root.add(rrWheel);

  return root;
}

// Build and export GLB
console.log('Generating high-detail Lagos Danfo bus model...');
const scene = new THREE.Scene();
const danfoModel = buildDanfoBusModel();
scene.add(danfoModel);

const exporter = new GLTFExporter();
exporter.parse(
  scene,
  (gltf) => {
    const buffer = Buffer.from(gltf);
    console.log('GLB successfully generated! Size:', buffer.length, 'bytes');

    // Save as both public/models/Danfo.glb and public/models/danfo.glb
    if (!fs.existsSync('public/models')) {
      fs.mkdirSync('public/models', { recursive: true });
    }
    fs.writeFileSync('public/models/Danfo.glb', buffer);
    fs.writeFileSync('public/models/danfo.glb', buffer);

    if (fs.existsSync('dist/models')) {
      fs.writeFileSync('dist/models/Danfo.glb', buffer);
      fs.writeFileSync('dist/models/danfo.glb', buffer);
    }

    console.log('Successfully saved to public/models/Danfo.glb and danfo.glb!');
  },
  (err) => {
    console.error('Failed to export GLB:', err);
    process.exit(1);
  },
  { binary: true }
);
