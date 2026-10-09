import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { CameraViewMode, BusUpgrades, JunctionStop, DoorState, GasStationBay, RoadsideShop } from '../../types/game';
import { 
  createAsphaltTexture, 
  createCurbTexture, 
  createBuildingFacadeTexture, 
  createSignboardTexture,
  createBusStopSignTexture,
  createDashboardClusterTexture,
  createNairaNoteTexture 
} from './textures';
import { getCustomBillboards, createBillboardTexture, BillboardAd } from '../billboards';

export interface SceneUpdateParams {
  speedKmH: number;
  steeringWheelAngleDeg: number;
  laneOffsetMeters: number;
  gear: 'P' | 'R' | 'N' | 'D' | 'L';
  isBraking: boolean;
  cameraMode: CameraViewMode;
  turnSignal: 'OFF' | 'LEFT' | 'RIGHT';
  hazardLights: boolean;
  wipersActive: boolean;
  isEngineRunning: boolean;
  upgrades: BusUpgrades;
  slogan: string;
  roadDistanceTraveled: number;
  fuelPercent: number;
  throttle: number;
  // Passenger Door & Conductor
  doorState: DoorState;
  bootState?: 'OPEN' | 'CLOSED';
  hasConductor: boolean;
  isSteppedDown: boolean;
  junctions: JunctionStop[];
  activeJunctionIndex: number;
  isBoardingPassengers: boolean;
  gasStations?: GasStationBay[];
  roadsideShops?: RoadsideShop[];
}

export class ThreeDrivingEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // 3D Player Bus
  private busRoot: THREE.Group;
  private busBody: THREE.Group;
  private steeringWheelMesh: THREE.Group;
  private speedNeedle: THREE.Mesh;
  private tachNeedle: THREE.Mesh;
  private fuelNeedle: THREE.Mesh;
  private accelNeedle: THREE.Mesh;
  private dashLeftBlinker: THREE.Mesh;
  private dashRightBlinker: THREE.Mesh;
  private slidingDoorGroup: THREE.Group;
  private bootDoorGroup: THREE.Group;
  private bootLuggageGroup: THREE.Group;
  private conductorMesh: THREE.Group;
  private leftFrontWheel: THREE.Mesh;
  private rightFrontWheel: THREE.Mesh;
  private rearWheels: THREE.Mesh[] = [];
  private leftBlinker: THREE.Mesh;
  private rightBlinker: THREE.Mesh;
  private leftBrakeLight: THREE.Mesh;
  private rightBrakeLight: THREE.Mesh;
  private wipersGroup: THREE.Group;
  private danglingRosary: THREE.Group;
  private bullBarMesh: THREE.Group;
  private roofSpeakersMesh: THREE.Group;
  private underglowLight: THREE.PointLight;
  private headLights: THREE.SpotLight[] = [];

  // Road & Environment
  private roadSegments: THREE.Group[] = [];
  private junctionMeshes: { group: THREE.Group; junction: JunctionStop; passengers: THREE.Group[] }[] = [];
  private gasStationMeshes: THREE.Group[] = [];
  private billboardMeshes: { group: THREE.Group; ad: BillboardAd }[] = [];
  private shopMeshes: THREE.Group[] = [];
  private trafficMeshes: THREE.Group[] = [];
  private exhaustParticles: THREE.Points;
  private exhaustPositions: Float32Array;
  private rainParticles: THREE.Points | null = null;

  // Animation Timers & Physics
  private blinkerTimer: number = 0;
  private wiperAngle: number = 0;
  private wiperDirection: number = 1;
  private wheelRotationRad: number = 0;
  private rosarySwingAngle: number = 0;
  private rosaryVel: number = 0;
  private doorSlidePos: number = 0; // 0 (closed) to 1 (open)
  private bootDoorAngle: number = 0; // 0 (closed) to Math.PI * 0.42 (open)
  private conductorClapTimer: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene & Warm Lagos Golden Hour Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1e1510);
    this.scene.fog = new THREE.FogExp2(0x322014, 0.009);

    // 2. Camera (Wide-Angle Cockpit View Looking Forward Out Windshield)
    this.camera = new THREE.PerspectiveCamera(70, width / height, 0.08, 480);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 4. Lighting
    this.setupLighting();

    // 5. Road & City Environment
    this.setupRoadAndCity();

    // 6. Danfo Bus Cockpit & Passenger Cabin with 3D Driver Hands & Dual Mirrors
    const busComponents = this.createDanfoBus();
    this.busRoot = busComponents.busRoot;
    this.busBody = busComponents.busBody;
    this.steeringWheelMesh = busComponents.steeringWheel;
    this.speedNeedle = busComponents.speedNeedle;
    this.tachNeedle = busComponents.tachNeedle;
    this.fuelNeedle = busComponents.fuelNeedle;
    this.accelNeedle = busComponents.accelNeedle;
    this.dashLeftBlinker = busComponents.dashLeftBlinker;
    this.dashRightBlinker = busComponents.dashRightBlinker;
    this.slidingDoorGroup = busComponents.slidingDoor;
    this.bootDoorGroup = busComponents.bootDoor;
    this.bootLuggageGroup = busComponents.bootLuggage;
    this.conductorMesh = busComponents.conductor as any;
    this.leftFrontWheel = busComponents.lfWheel as any;
    this.rightFrontWheel = busComponents.rfWheel as any;
    this.rearWheels = busComponents.rearWheels as any;
    this.leftBlinker = busComponents.lBlinker;
    this.rightBlinker = busComponents.rBlinker;
    this.leftBrakeLight = busComponents.lBrake;
    this.rightBrakeLight = busComponents.rBrake;
    this.wipersGroup = busComponents.wipers;
    this.danglingRosary = busComponents.rosary as any;
    this.bullBarMesh = busComponents.bullBar as any;
    this.roofSpeakersMesh = busComponents.speakers as any;
    this.underglowLight = busComponents.underglow;
    this.scene.add(this.busRoot);

    // 7. Gas Stations along Highway
    this.setupGasStations();

    // 8. Overhead Highway Billboards (Flutterwave, OPay, Chowdeck, Custom Ads)
    this.setupBillboards();

    // 9. Traffic & Hazards
    this.setupTrafficAndHazards();

    // 10. Particle Exhaust System
    const { points, posArray } = this.createExhaustSystem();
    this.exhaustParticles = points;
    this.exhaustPositions = posArray;
    this.scene.add(this.exhaustParticles);

    // 11. Rain Particles
    this.setupRain();

    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xfef3c7, 0.9);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xf59e0b, 1.9);
    sunLight.position.set(35, 45, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    this.scene.add(sunLight);

    const skyLight = new THREE.HemisphereLight(0x38bdf8, 0x78350f, 0.65);
    this.scene.add(skyLight);
  }

  private setupRoadAndCity() {
    const asphaltTex = createAsphaltTexture();
    const curbTex = createCurbTexture();

    const roadLength = 120;
    const segmentCount = 4; // More segments for longer road

    for (let i = 0; i < segmentCount; i++) {
      const group = new THREE.Group();
      group.position.z = i * roadLength;

      // 1. Asphalt Roadway (wider — real expressway)
      const roadGeo = new THREE.PlaneGeometry(20, roadLength);
      const roadMat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.82, metalness: 0.08 });
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.receiveShadow = true;
      group.add(roadMesh);

      // Yellow double center line
      [-0.2, 0.2].forEach((cx) => {
        const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.18, roadLength), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
        cl.rotation.x = -Math.PI / 2;
        cl.position.set(cx, 0.01, 0);
        group.add(cl);
      });

      // White lane dashes (3 lanes each side)
      [-6, -2, 2, 6].forEach((laneX) => {
        for (let s = -roadLength / 2; s < roadLength / 2; s += 10) {
          const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 5), new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }));
          dash.rotation.x = -Math.PI / 2;
          dash.position.set(laneX, 0.01, s);
          group.add(dash);
        }
      });

      // 2. Curbs & Sidewalks (wider Lagos-style)
      [-10.5, 10.5].forEach((curbX, idx) => {
        const curb = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, roadLength), new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.7 }));
        curb.position.set(curbX, 0.15, 0);
        curb.receiveShadow = true;
        group.add(curb);

        // Sidewalk
        const walk = new THREE.Mesh(new THREE.BoxGeometry(7, 0.25, roadLength), new THREE.MeshStandardMaterial({ color: 0x3a3732, roughness: 0.95 }));
        walk.position.set(idx === 0 ? -14.5 : 14.5, 0.12, 0);
        group.add(walk);
      });

      // 2.5 Diverse Road Scenery (Trees & Pedestrian Bridges)
        if (i % 2 === 1) {
          // Add a pedestrian bridge every other segment
          const bridgeGroup = new THREE.Group();
          const bridgePillarMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.8 });
          const bridgeSpanMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.4, roughness: 0.6 });
          
          // Pillars
          [-11, 11].forEach(px => {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 7, 1.5), bridgePillarMat);
            pillar.position.set(px, 3.5, 0);
            pillar.castShadow = true;
            bridgeGroup.add(pillar);
          });
          
          // Span
          const span = new THREE.Mesh(new THREE.BoxGeometry(24, 1, 3), bridgeSpanMat);
          span.position.set(0, 7.5, 0);
          span.castShadow = true;
          bridgeGroup.add(span);
          
          // Bridge Signboard
          const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 1.5), new THREE.MeshBasicMaterial({ color: 0x15803d }));
          sign.position.set(0, 7.5, 1.55);
          bridgeGroup.add(sign);
          
          group.add(bridgeGroup);
        }

        // Add some random Trees along the road
        const treeGeo = new THREE.ConeGeometry(2, 6, 8);
        const trunkGeo = new THREE.CylinderGeometry(0.4, 0.4, 2);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 });
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
        
        for (let t = -roadLength / 2; t < roadLength / 2; t += 30) {
          if (Math.random() > 0.5) {
            [-12.5, 12.5].forEach(tx => {
              if (Math.random() > 0.3) {
                 const tree = new THREE.Group();
                 const trunk = new THREE.Mesh(trunkGeo, trunkMat);
                 trunk.position.y = 1;
                 const leaves = new THREE.Mesh(treeGeo, leafMat);
                 leaves.position.y = 4;
                 tree.add(trunk, leaves);
                 tree.position.set(tx, 0, t + Math.random() * 10);
                 tree.castShadow = true;
                 group.add(tree);
              }
            });
          }
        }

        // 3. Buildings — varied heights & colors
      const shopVariants: [string, string, number, number][] = [
        ['EKO PHARMACY & CHEMIST',    '#0284c7', 14, 22],
        ['MAMA PUT AMALA BUKKA',      '#dc2626', 10, 20],
        ['COMPUTER VILLAGE TECH',     '#16a34a', 18, 24],
        ['TOTAL PETROL PLAZA',        '#9333ea', 12, 20],
        ['FIRST BANK OF NIGERIA',     '#1e40af', 22, 24],
        ['ZENITH BANK MEGA BRANCH',   '#991b1b', 16, 22],
        ['MTN EXPERIENCE CENTER',     '#b45309', 12, 20],
        ['SHOPRITE IKEJA MALL',       '#065f46', 20, 28],
      ];

      for (let s = -roadLength / 2 + 12; s < roadLength / 2; s += 28) {
        const seed = Math.abs(Math.round(i * 100 + s));
        const shopL = shopVariants[seed % shopVariants.length];
        const shopR = shopVariants[(seed + 3) % shopVariants.length];

        const bTexL = createBuildingFacadeTexture(shopL[0], shopL[1]);
        const hL = shopL[2];
        const bMeshL = new THREE.Mesh(new THREE.BoxGeometry(11, hL, shopL[3]), new THREE.MeshStandardMaterial({ map: bTexL, roughness: 0.85 }));
        bMeshL.position.set(-20, hL / 2, s);
        bMeshL.castShadow = true;
        group.add(bMeshL);

        const bTexR = createBuildingFacadeTexture(shopR[0], shopR[1]);
        const hR = shopR[2];
        const bMeshR = new THREE.Mesh(new THREE.BoxGeometry(11, hR, shopR[3]), new THREE.MeshStandardMaterial({ map: bTexR, roughness: 0.85 }));
        bMeshR.position.set(20, hR / 2, s);
        bMeshR.castShadow = true;
        group.add(bMeshR);

        // Street lamp post with glow bulb
        [-11, 11].forEach((lx) => {
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0x52525b, metalness: 0.7 }));
          pole.position.set(lx, 4, s);
          group.add(pole);
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfef08a, emissiveIntensity: 1.2 }));
          bulb.position.set(lx, 8.2, s);
          group.add(bulb);
        });
      }

      // Overhead gantry signs on every other segment
      if (i % 2 === 1) {
        const signTex = createSignboardTexture('LAGOS–IBADAN EXPRESSWAY', 'IKEJA → OSHODI → SURULERE → CMS', '#047857');
        const sign = new THREE.Mesh(new THREE.BoxGeometry(18, 3.2, 0.35), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.35 }));
        sign.position.set(0, 8.0, 0);
        group.add(sign);

        [-9.5, 9.5].forEach((px) => {
          const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 8.2), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.65 }));
          pillar.position.set(px, 4.1, 0);
          group.add(pillar);
        });
      }

      this.scene.add(group);
      this.roadSegments.push(group);
    }

    // ================================================
    // MAJOR LANDMARK AREAS (fixed world positions)
    // These scroll with the road to simulate movement
    // ================================================
    this.buildIkejaArea();
    this.buildOshodiArea();
    this.buildSurulereArea();
  }

  /** IKEJA — Administrative capital vibe. Tall glass buildings, Computer Village market */
  private buildIkejaArea() {
    const group = new THREE.Group();
    group.position.set(0, 0, 280); // Matches distanceMarker 280

    // Overhead pedestrian bridge (very Lagos)
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(30, 0.6, 3), new THREE.MeshStandardMaterial({ color: 0x78716c, metalness: 0.5 }));
    bridge.position.set(0, 5.5, 0);
    group.add(bridge);
    // Bridge railings
    [-14, 14].forEach((bx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 3), new THREE.MeshStandardMaterial({ color: 0xa8a29e }));
      rail.position.set(bx, 5.8, 0);
      group.add(rail);
    });
    // Bridge columns
    [-13, 0, 13].forEach((bx) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 5.5), new THREE.MeshStandardMaterial({ color: 0x57534e, metalness: 0.5 }));
      col.position.set(bx, 2.75, 0);
      group.add(col);
    });

    // IKEJA overhead sign
    const signTex = createSignboardTexture('IKEJA ALONG', 'Computer Village • Allen Avenue', '#1e40af');
    const sign = new THREE.Mesh(new THREE.BoxGeometry(14, 2.5, 0.3), new THREE.MeshStandardMaterial({ map: signTex }));
    sign.position.set(0, 9.5, 0);
    group.add(sign);

    // Computer Village stalls (market on right)
    for (let i = 0; i < 5; i++) {
      const stall = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.8, 4), new THREE.MeshStandardMaterial({ color: [0x1e3a5f, 0x3d1a0d, 0x0f3d1a, 0x3d1a3d, 0x1a3d1a][i % 5], roughness: 0.85 }));
      stall.position.set(14 + i * 4.5, 1.4, i * 3 - 6);
      group.add(stall);
      // Stall awning
      const awning = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.15, 5), new THREE.MeshStandardMaterial({ color: [0x3b82f6, 0xef4444, 0x22c55e, 0xa855f7, 0xf59e0b][i % 5] }));
      awning.position.set(14 + i * 4.5, 2.8, i * 3 - 6);
      group.add(awning);
    }

    // Tall office buildings behind
    [[-22, 0, 28], [22, 0, 28], [-22, 0, -15], [22, 0, -15]].forEach(([x, , z], idx) => {
      const h = [26, 32, 22, 28][idx];
      const bTex = createBuildingFacadeTexture(['IKEJA CITY MALL', 'ACCESS BANK TOWER', 'MINISTERIAL QUARTERS', 'GTB PLAZA'][idx], ['#1e40af', '#dc2626', '#065f46', '#b45309'][idx]);
      const b = new THREE.Mesh(new THREE.BoxGeometry(12, h, 18), new THREE.MeshStandardMaterial({ map: bTex, roughness: 0.75 }));
      b.position.set(x, h / 2, z);
      group.add(b);
    });

    this.scene.add(group);
  }

  /** OSHODI — Busy interchange. Market stalls everywhere, commuter chaos */
  private buildOshodiArea() {
    const group = new THREE.Group();
    group.position.set(0, 0, 1800); // distanceMarker 1800

    // Massive flyover bridge overhead
    const flyover = new THREE.Mesh(new THREE.BoxGeometry(40, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6 }));
    flyover.position.set(0, 6.8, 0);
    group.add(flyover);
    // Flyover support pillars
    [-16, -8, 0, 8, 16].forEach((px) => {
      const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 7), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.4 }));
      fp.position.set(px, 3.5, 0);
      group.add(fp);
    });

    // OSHODI overhead sign
    const signTex = createSignboardTexture('OSHODI INTERCHANGE', 'Airport Road • Mushin • Ikorodu', '#dc2626');
    const sign = new THREE.Mesh(new THREE.BoxGeometry(16, 2.8, 0.35), new THREE.MeshStandardMaterial({ map: signTex }));
    sign.position.set(0, 10.5, 0);
    group.add(sign);

    // Dense market stalls left and right (chaotic Oshodi market)
    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? -16 : 16;
      const stall = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 3.5), new THREE.MeshStandardMaterial({ color: 0x2a1a0d, roughness: 0.9 }));
      stall.position.set(side + (i > 4 ? 5 : 0), 1.2, i * 5 - 18);
      group.add(stall);
      const awningColors = [0xef4444, 0xf59e0b, 0x22c55e, 0x3b82f6];
      const awning = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.2, 4.5), new THREE.MeshStandardMaterial({ color: awningColors[i % 4] }));
      awning.position.set(side + (i > 4 ? 5 : 0), 2.5, i * 5 - 18);
      group.add(awning);
    }

    // Molue bus terminal on the right (parked buses)
    for (let j = 0; j < 3; j++) {
      const molue = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 6), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 }));
      molue.position.set(18 + j * 3, 1.1, j * 8 - 8);
      group.add(molue);
      // Black stripe
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.25, 6), new THREE.MeshStandardMaterial({ color: 0x09090b }));
      stripe.position.set(18 + j * 3, 0.9, j * 8 - 8);
      group.add(stripe);
    }

    this.scene.add(group);
  }

  /** SURULERE — Residential + Teslim Balogun stadium area */
  private buildSurulereArea() {
    const group = new THREE.Group();
    group.position.set(0, 0, 3000); // distanceMarker 3000

    // SURULERE overhead sign
    const signTex = createSignboardTexture('SURULERE', 'Balogun Stadium • Ojuelegba • Costain', '#7c3aed');
    const sign = new THREE.Mesh(new THREE.BoxGeometry(15, 2.6, 0.35), new THREE.MeshStandardMaterial({ map: signTex }));
    sign.position.set(0, 8.8, 0);
    group.add(sign);
    [-8, 8].forEach((px) => {
      const pc = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 9), new THREE.MeshStandardMaterial({ color: 0x52525b }));
      pc.position.set(px, 4.5, 0);
      group.add(pc);
    });

    // Teslim Balogun Stadium (visible from expressway — large curved structure)
    const stadiumBase = new THREE.Mesh(new THREE.CylinderGeometry(16, 18, 8, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.7, side: THREE.DoubleSide }));
    stadiumBase.position.set(-35, 4, 25);
    group.add(stadiumBase);
    const stadiumRoof = new THREE.Mesh(new THREE.TorusGeometry(16, 2.5, 8, 24), new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.5, metalness: 0.3 }));
    stadiumRoof.rotation.x = Math.PI / 2;
    stadiumRoof.position.set(-35, 8.5, 25);
    group.add(stadiumRoof);

    // Stadium TESLIM BALOGUN sign
    const sTex = createSignboardTexture('TESLIM BALOGUN STADIUM', 'Home of Lagos Sports', '#7c3aed');
    const sSign = new THREE.Mesh(new THREE.BoxGeometry(10, 1.8, 0.3), new THREE.MeshStandardMaterial({ map: sTex }));
    sSign.position.set(-35, 9.5, 9);
    group.add(sSign);

    // Surulere residential apartments
    [[-22, 0, -10], [-22, 0, 20], [22, 0, -10], [22, 0, 20]].forEach(([x, , z], idx) => {
      const h = [18, 22, 16, 20][idx];
      const bTex = createBuildingFacadeTexture(['SURULERE COURTS', 'BODE THOMAS FLATS', 'ADENIRAN OGUNSANYA ST', 'OJUELEGBA LINK'][idx], ['#7c3aed', '#059669', '#1e40af', '#9333ea'][idx]);
      const b = new THREE.Mesh(new THREE.BoxGeometry(10, h, 14), new THREE.MeshStandardMaterial({ map: bTex, roughness: 0.8 }));
      b.position.set(x, h / 2, z);
      group.add(b);
    });

    this.scene.add(group);
  }


  /**
   * Builds the 3D Gas Station (Total Energies / Oando Plaza) on the right shoulder
   */
  private setupGasStations() {
    [520, 1750].forEach((stationZ, idx) => {
      const group = new THREE.Group();
      group.position.set(15, 0, stationZ);

      // Station Canopy Roof
      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(14, 0.5, 22),
        new THREE.MeshStandardMaterial({ color: idx === 0 ? 0xdc2626 : 0x0284c7, roughness: 0.4 })
      );
      canopy.position.set(0, 5.2, 0);
      group.add(canopy);

      // Station Brand Signboard
      const signTex = createSignboardTexture(idx === 0 ? 'TOTAL ENERGIES' : 'OANDO MEGA PETROL', 'DIESEL ₦950/L • CAR WASH', '#facc15');
      const sign = new THREE.Mesh(new THREE.BoxGeometry(13.8, 1.2, 0.2), new THREE.MeshStandardMaterial({ map: signTex }));
      sign.position.set(0, 5.2, 10.9);
      group.add(sign);

      // Canopy Pillars
      [-5, 5].forEach((px) => {
        [-8, 8].forEach((pz) => {
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 5.2), new THREE.MeshStandardMaterial({ color: 0xffffff }));
          col.position.set(px, 2.6, pz);
          group.add(col);
        });
      });

      // Fuel Pump Dispensers
      [-3, 3].forEach((px) => {
        const pump = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 2.2, 2.5),
          new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.5 })
        );
        pump.position.set(px, 1.1, 0);
        group.add(pump);
      });

      // Pump Attendant in Orange Overall
      const attendant = new THREE.Group();
      const aHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshStandardMaterial({ color: 0x78350f }));
      aHead.position.y = 1.6;
      attendant.add(aHead);
      const aBody = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 0.25), new THREE.MeshStandardMaterial({ color: 0xea580c }));
      aBody.position.y = 1.1;
      attendant.add(aBody);
      attendant.position.set(0, 0, 1.8);
      group.add(attendant);

      this.scene.add(group);
      this.gasStationMeshes.push(group);
    });
  }

  /**
   * Builds 3D Highway Overhead Gantries & Large Billboards for Brands & Custom Owner Ads
   */
  private setupBillboards() {
    const ads = getCustomBillboards();
    ads.forEach((ad) => {
      const group = new THREE.Group();
      group.position.set(0, 0, ad.distanceMarkerMeters);

      // Steel gantry columns on left and right shoulders
      [-10.5, 10.5].forEach((colX) => {
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.38, 9, 12),
          new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 })
        );
        col.position.set(colX, 4.5, 0);
        group.add(col);
      });

      // Overhead cross-truss bridge spanning across both lanes
      const truss = new THREE.Mesh(
        new THREE.BoxGeometry(22, 0.7, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 })
      );
      truss.position.set(0, 8.4, 0);
      group.add(truss);

      // Billboard LED Board
      const billboardTex = createBillboardTexture(ad);
      const boardGeo = new THREE.BoxGeometry(16, 4.6, 0.25);
      const boardMat = new THREE.MeshStandardMaterial({
        map: billboardTex,
        roughness: 0.2,
      });
      const board = new THREE.Mesh(boardGeo, boardMat);
      board.position.set(0, 8.4, 0);
      group.add(board);

      this.scene.add(group);
      this.billboardMeshes.push({ group, ad });
    });
  }

  /**
   * Builds the detailed 3D Danfo Bus, with Dr. Driving style First-Person Driver Cockpit,
   * 3D Driver Hands gripping the wheel, working dashboard cluster, dual side mirrors,
   * and the animated Passenger Sliding Door on the right!
   */
  private createDanfoBus() {
    const busRoot = new THREE.Group();
    const busBody = new THREE.Group();
    busRoot.add(busBody);

    // Placeholder returned objects so engine properties don't crash
    const steeringWheel = new THREE.Group();
    steeringWheel.rotation.order = 'ZYX';
    steeringWheel.position.set(-0.6, 1.5, 2.3);
    busBody.add(steeringWheel);
    
    // We will build a basic procedural bus as a fallback/scaffold
    const fallbackGroup = new THREE.Group();
    const yellowMat = new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.6 });
    const rustMat = new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.9 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 5.4), rustMat);
    floor.position.set(0, 0.7, 0);
    fallbackGroup.add(floor);
    busBody.add(fallbackGroup);

    // Try to load the user's downloaded GLB
    const loader = new GLTFLoader();
    loader.load(
      '/models/danfo.glb',
      (gltf) => {
        const model = gltf.scene;
        
        // Scale and position adjustment based on typical sketchfab models
        model.scale.set(1.5, 1.5, 1.5);
        model.position.set(0, 0.2, 0);
        
        // Orient the bus so it faces forward (Z-negative usually, or adjust based on model)
        model.rotation.y = Math.PI;

        // Hide fallback once loaded
        fallbackGroup.visible = false;
        busBody.add(model);
        console.log('Danfo GLB Loaded successfully!');
      },
      undefined,
      (error) => {
        console.error('Error loading Danfo GLB:', error);
      }
    );

    // Wheels dummy
    const lfWheel = new THREE.Mesh();
    const rfWheel = new THREE.Mesh();
    const rearWheels = [new THREE.Mesh(), new THREE.Mesh()];
    busBody.add(lfWheel, rfWheel, ...rearWheels);

    return {
      busRoot,
      busBody,
      steeringWheel,
      speedNeedle: new THREE.Mesh(),
      tachNeedle: new THREE.Mesh(),
      fuelNeedle: new THREE.Mesh(),
      accelNeedle: new THREE.Mesh(),
      dashLeftBlinker: new THREE.Mesh(),
      dashRightBlinker: new THREE.Mesh(),
      slidingDoor: new THREE.Group(),
      bootDoor: new THREE.Group(),
      bootLuggage: new THREE.Group(),
      conductor: new THREE.Group(),
      lfWheel,
      rfWheel,
      rearWheels,
      lBlinker: new THREE.Mesh(),
      rBlinker: new THREE.Mesh(),
      lBrake: new THREE.Mesh(),
      rBrake: new THREE.Mesh(),
      wipers: new THREE.Group(),
      rosary: new THREE.Group(),
      bullBar: new THREE.Group(),
      speakers: new THREE.Group(),
      underglow: new THREE.PointLight(0x000000),
    } as any;
  }

  /**
   * Builds roadside Junction Bus Stops with shelters, signboards, and high-graphic 3D waiting passengers!
   */
  public syncJunctionShelters(junctions: JunctionStop[]) {
    if (this.junctionMeshes.length > 0) return;

    junctions.forEach((junc) => {
      const group = new THREE.Group();

      // Bus Stop Shelter on the right shoulder
      const shelterRoof = new THREE.Mesh(
        new THREE.BoxGeometry(7, 0.25, 10),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 })
      );
      shelterRoof.position.set(10.5, 3.8, 0);
      shelterRoof.rotation.z = -0.05;
      group.add(shelterRoof);

      [-4, 4].forEach((sz) => {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 3.8),
          new THREE.MeshStandardMaterial({ color: 0x57534e })
        );
        pillar.position.set(10.5, 1.9, sz);
        group.add(pillar);
      });

      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x78350f })
      );
      bench.position.set(12, 0.45, 0);
      group.add(bench);

      // Bus Stop Signboard
      const signTex = createBusStopSignTexture(junc.name, junc.destinationTag);
      const signMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 2.2, 4.4),
        new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 })
      );
      signMesh.position.set(8.2, 3.2, 5.2);
      group.add(signMesh);

      // Yellow striped road curb stop-box on road edge
      const stopBox = new THREE.Mesh(
        new THREE.PlaneGeometry(3.5, 12),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.35 })
      );
      stopBox.rotation.x = -Math.PI / 2;
      stopBox.position.set(5.8, 0.02, 0);
      group.add(stopBox);

      // High-Graphic 3D Waiting Commuter Figures
      const passengers: THREE.Group[] = [];
      const passengerColors = [0x1e3a8a, 0xdc2626, 0x16a34a, 0x9333ea, 0xd97706, 0x0284c7];

      for (let p = 0; p < Math.min(6, junc.waitingPassengersCount); p++) {
        const pGroup = new THREE.Group();
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), new THREE.MeshStandardMaterial({ color: 0x78350f }));
        head.position.y = 1.6;
        pGroup.add(head);

        // Headgear (Gele or Cap)
        if (p % 2 === 0) {
          const gele = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.06, 8, 16), new THREE.MeshStandardMaterial({ color: passengerColors[(p + 2) % passengerColors.length] }));
          gele.position.y = 1.7;
          pGroup.add(gele);
        }

        const shirtColor = passengerColors[p % passengerColors.length];
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.65, 0.22), new THREE.MeshStandardMaterial({ color: shirtColor }));
        body.position.y = 1.15;
        pGroup.add(body);

        const legs = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.8, 0.18), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
        legs.position.y = 0.4;
        pGroup.add(legs);

        // Raised waving arm
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.08), new THREE.MeshStandardMaterial({ color: 0x78350f }));
        arm.position.set(-0.22, 1.4, 0.1);
        arm.rotation.z = 0.6;
        pGroup.add(arm);

        const pX = 9.2 + Math.random() * 2.2;
        const pZ = -3.5 + p * 1.4;
        pGroup.position.set(pX, 0, pZ);
        pGroup.rotation.y = -Math.PI / 2;
        group.add(pGroup);
        passengers.push(pGroup);
      }

      this.scene.add(group);
      this.junctionMeshes.push({ group, junction: junc, passengers });
    });
  }

  private setupTrafficAndHazards() {
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
  }

  private createExhaustSystem() {
    const pCount = 35;
    const geometry = new THREE.BufferGeometry();
    const posArray = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount * 3; i += 3) {
      posArray[i] = -0.95;
      posArray[i + 1] = 0.4;
      posArray[i + 2] = -2.6;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const material = new THREE.PointsMaterial({
      color: 0x3f3f46,
      size: 0.45,
      transparent: true,
      opacity: 0.6,
    });

    const points = new THREE.Points(geometry, material);
    return { points, posArray };
  }

  private setupRain() {
    const rainCount = 450;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount * 3; i += 3) {
      rainPos[i] = (Math.random() - 0.5) * 40;
      rainPos[i + 1] = Math.random() * 25;
      rainPos[i + 2] = (Math.random() - 0.5) * 60;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.15,
      transparent: true,
      opacity: 0.4,
    });

    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  /**
   * Main 60 FPS Render Tick
   */
  public update(params: SceneUpdateParams, dt: number) {
    const {
      speedKmH,
      steeringWheelAngleDeg,
      laneOffsetMeters,
      gear,
      isBraking,
      turnSignal,
      hazardLights,
      wipersActive,
      isEngineRunning,
      upgrades,
      roadDistanceTraveled,
      doorState,
      hasConductor,
      isSteppedDown,
      junctions,
      isBoardingPassengers,
      fuelPercent,
      throttle,
    } = params;

    const speedMps = (speedKmH * 1000) / 3600;

    // 1. Synchronize Junction Stop Models
    if (junctions && junctions.length > 0) {
      this.syncJunctionShelters(junctions);
    }

    // 2. Bus Root Position & Steering Tilt
    this.busRoot.position.x = laneOffsetMeters;
    const steerFactor = steeringWheelAngleDeg / 120;
    this.busRoot.rotation.y = steerFactor * 0.08;
    this.busRoot.rotation.z = -steerFactor * 0.04;

    // Front Wheels turn towards the steered direction
    this.leftFrontWheel.rotation.y = steerFactor * 0.45;
    this.rightFrontWheel.rotation.y = steerFactor * 0.45;

    // Rolling Wheels
    this.wheelRotationRad += (gear === 'R' ? -1 : 1) * speedMps * dt * 2.2;
    this.leftFrontWheel.rotation.x = this.wheelRotationRad;
    this.rightFrontWheel.rotation.x = this.wheelRotationRad;
    this.rearWheels.forEach((w) => {
      w.rotation.x = this.wheelRotationRad;
    });

    // 3. Cockpit 3D Steering Wheel with Hands Rotating Together
    this.steeringWheelMesh.rotation.z = -THREE.MathUtils.degToRad(steeringWheelAngleDeg);

    // 4. Working Dashboard Needles (All 4 Working Gauges)
    // Speedometer: 0 km/h -> -135 deg, 140 km/h -> +135 deg
    const speedRatio = Math.min(1.0, speedKmH / 140);
    this.speedNeedle.rotation.z = -Math.PI * 0.75 + speedRatio * (Math.PI * 1.5);

    // Tachometer: idling ~800 RPM, revving ~5500 RPM
    const rpm = isEngineRunning ? 800 + (speedKmH / 85) * 3500 + (throttle > 0 ? 1200 : 0) : 0;
    const rpmRatio = Math.min(1.0, rpm / 5500);
    this.tachNeedle.rotation.z = -Math.PI * 0.75 + rpmRatio * (Math.PI * 1.5);

    // Graphic Fuel Gauge: E (-135 deg) to F (+115 deg)
    const fuelRatio = Math.min(1.0, Math.max(0, fuelPercent / 100));
    this.fuelNeedle.rotation.z = -Math.PI * 0.75 + fuelRatio * (Math.PI * 1.4);

    // Acceleration / Torque Meter: 0% (-135 deg) to 100% (+115 deg)
    const accelRatio = isEngineRunning ? (throttle > 0 ? Math.min(1.0, 0.25 + throttle * 0.75) : 0.04) : 0;
    this.accelNeedle.rotation.z = -Math.PI * 0.75 + accelRatio * (Math.PI * 1.4);

    // 5. Blinker flashers
    this.blinkerTimer += dt * 4;
    const isBlinkerOn = Math.floor(this.blinkerTimer) % 2 === 0;

    const lBlinkMat = this.leftBlinker.material as THREE.MeshBasicMaterial;
    const rBlinkMat = this.rightBlinker.material as THREE.MeshBasicMaterial;
    const dashLMat = this.dashLeftBlinker.material as THREE.MeshBasicMaterial;
    const dashRMat = this.dashRightBlinker.material as THREE.MeshBasicMaterial;

    if (hazardLights) {
      lBlinkMat.color.setHex(isBlinkerOn ? 0xf59e0b : 0x291804);
      rBlinkMat.color.setHex(isBlinkerOn ? 0xf59e0b : 0x291804);
      dashLMat.color.setHex(isBlinkerOn ? 0x22c55e : 0x14532d);
      dashRMat.color.setHex(isBlinkerOn ? 0x22c55e : 0x14532d);
    } else if (turnSignal === 'LEFT') {
      lBlinkMat.color.setHex(isBlinkerOn ? 0xf59e0b : 0x291804);
      rBlinkMat.color.setHex(0x291804);
      dashLMat.color.setHex(isBlinkerOn ? 0x22c55e : 0x14532d);
      dashRMat.color.setHex(0x14532d);
    } else if (turnSignal === 'RIGHT') {
      lBlinkMat.color.setHex(0x291804);
      rBlinkMat.color.setHex(isBlinkerOn ? 0xf59e0b : 0x291804);
      dashLMat.color.setHex(0x14532d);
      dashRMat.color.setHex(isBlinkerOn ? 0x22c55e : 0x14532d);
    } else {
      lBlinkMat.color.setHex(0x291804);
      rBlinkMat.color.setHex(0x291804);
      dashLMat.color.setHex(0x14532d);
      dashRMat.color.setHex(0x14532d);
    }

    // Brake lights
    const lBrakeMat = this.leftBrakeLight.material as THREE.MeshBasicMaterial;
    const rBrakeMat = this.rightBrakeLight.material as THREE.MeshBasicMaterial;
    if (isBraking) {
      lBrakeMat.color.setHex(0xff0000);
      rBrakeMat.color.setHex(0xff0000);
    } else {
      lBrakeMat.color.setHex(0x500707);
      rBrakeMat.color.setHex(0x500707);
    }

    // 6. Sliding Passenger Door Animation
    const targetDoorPos = doorState === 'OPEN' ? 1.0 : 0.0;
    this.doorSlidePos = THREE.MathUtils.lerp(this.doorSlidePos, targetDoorPos, dt * 8);
    this.slidingDoorGroup.position.z = 0.85 - this.doorSlidePos * 1.15;
    this.slidingDoorGroup.position.x = 1.1 + this.doorSlidePos * 0.05;

    // 6b. Rear Boot (Trunk) Door Animation (Door swings up when luggage loaded)
    const targetBootAngle = params.bootState === 'OPEN' ? Math.PI * 0.42 : 0.0;
    this.bootDoorAngle = THREE.MathUtils.lerp(this.bootDoorAngle, targetBootAngle, dt * 6);
    this.bootDoorGroup.rotation.x = -this.bootDoorAngle;

    // 7. Conductor Mesh at Doorway
    if (hasConductor && this.doorSlidePos > 0.3) {
      this.conductorMesh.visible = true;
      this.conductorClapTimer += dt * 6;
      const slapSwing = Math.sin(this.conductorClapTimer) * 0.3;
      this.conductorMesh.children[4].rotation.z = slapSwing;
    } else {
      this.conductorMesh.visible = false;
    }

    // 8. Dangling Rosary Physics Swing
    const targetRosary = steerFactor * 0.45 + (isBraking ? 0.35 : 0);
    const rosaryDiff = targetRosary - this.rosarySwingAngle;
    this.rosaryVel += rosaryDiff * 25 * dt;
    this.rosaryVel *= Math.pow(0.2, dt);
    this.rosarySwingAngle += this.rosaryVel * dt;
    this.danglingRosary.rotation.z = this.rosarySwingAngle;

    // 9. Wipers
    if (wipersActive) {
      this.wiperAngle += this.wiperDirection * dt * 4.5;
      if (this.wiperAngle > 0.8) this.wiperDirection = -1;
      if (this.wiperAngle < -0.2) this.wiperDirection = 1;
      this.wipersGroup.children.forEach((w) => {
        w.rotation.z = this.wiperAngle;
      });
    }

    // 10. Upgrades Visibility
    this.bullBarMesh.visible = upgrades.heavyBullBar;
    this.roofSpeakersMesh.visible = upgrades.roofMegaSpeakers;
    this.underglowLight.intensity = upgrades.customUnderglow ? 3.5 : 0;

    // ========================================================
    // 11. CAMERA: LOOK FORWARD OUT FRONT WINDSHIELD TOWARDS +Z
    // (FIXES THE BACKWARD R AND D PERCEPTION!)
    // ========================================================
    if (isSteppedDown) {
      // Driver stepped down to roadside passenger door to usher passengers in
      this.camera.position.set(laneOffsetMeters + 1.8, 1.65, 0.2);
      this.camera.lookAt(laneOffsetMeters + 3.8, 1.6, 0.5);
      this.camera.fov = 68;
      this.camera.updateProjectionMatrix();
    } else {
      // Eye-level behind steering wheel looking FORWARD out windshield towards +Z!
      const eyeX = laneOffsetMeters - 0.5;
      const eyeY = 1.82 + (speedKmH > 10 ? Math.sin(Date.now() * 0.02) * 0.008 : 0);
      const eyeZ = 1.3;

      this.camera.position.set(eyeX, eyeY, eyeZ);

      // Perfect sync with bus body rotation + pitch + chassis roll
      const pitchG = isBraking ? 0.02 : (speedKmH > 20 ? -0.01 : 0);
      
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = Math.PI + steerFactor * 0.08;
      this.camera.rotation.x = pitchG;
      this.camera.rotation.z = steerFactor * -0.02;

      this.camera.fov = 70;
      this.camera.updateProjectionMatrix();
    }

    // ========================================================
    // 12. CONTINUOUS ROAD STREAMING (FORWARD IN D, REVERSE IN R)
    // ========================================================
    // When in D (Drive), bus moves towards +Z, so world streams from +Z towards -Z!
    // When in R (Reverse), bus moves towards -Z, so world streams from -Z towards +Z!
    const effectiveSpeed = (gear === 'R' ? -1 : 1) * speedMps;
    const roadSpeed = effectiveSpeed * dt;

    this.roadSegments.forEach((seg) => {
      seg.position.z -= roadSpeed;
      if (seg.position.z < -80) {
        seg.position.z += 360;
      } else if (seg.position.z > 280) {
        seg.position.z -= 360;
      }
    });

    // 13. Junction Bus Stops Positioning & Commuter Boarding Animation
    this.junctionMeshes.forEach((jMesh) => {
      const relZ = jMesh.junction.distanceMarkerMeters - roadDistanceTraveled;
      jMesh.group.position.z = relZ;

      const isAtThisStop = Math.abs(relZ) < 14;
      if (isAtThisStop && isBoardingPassengers && doorState === 'OPEN') {
        jMesh.passengers.forEach((p, idx) => {
          if (p.position.x > 1.8) {
            p.position.x -= dt * (2.2 + idx * 0.4);
            p.position.z = THREE.MathUtils.lerp(p.position.z, 0, dt * 2);
          } else {
            p.visible = false;
          }
        });
      }
    });

    // 14. Gas Station Positioning along Road
    const gasDistances = [520, 1750];
    this.gasStationMeshes.forEach((gMesh, idx) => {
      const relZ = gasDistances[idx] - roadDistanceTraveled;
      gMesh.position.z = relZ;
    });

    // 14b. Overhead Highway Billboards Positioning
    this.billboardMeshes.forEach((bMesh) => {
      const relZ = bMesh.ad.distanceMarkerMeters - roadDistanceTraveled;
      bMesh.group.position.z = relZ;
    });

    // 15. Traffic Flow (Adapts dynamically to Drive and Reverse)
    this.trafficMeshes.forEach((t) => {
      t.position.z -= (effectiveSpeed - 8) * dt;
      if (t.position.z < -40) {
        t.position.z = 160 + Math.random() * 50;
      } else if (t.position.z > 220) {
        t.position.z = -30;
      }
    });

    // 16. Exhaust Particles
    if (isEngineRunning && speedKmH > 4) {
      this.exhaustParticles.visible = true;
      for (let i = 0; i < this.exhaustPositions.length; i += 3) {
        this.exhaustPositions[i + 2] -= speedMps * dt * 0.45;
        if (this.exhaustPositions[i + 2] < -9) {
          this.exhaustPositions[i] = laneOffsetMeters - 0.95 + (Math.random() - 0.5) * 0.25;
          this.exhaustPositions[i + 1] = 0.4 + Math.random() * 0.2;
          this.exhaustPositions[i + 2] = -2.6;
        }
      }
      this.exhaustParticles.geometry.attributes.position.needsUpdate = true;
    } else {
      this.exhaustParticles.visible = false;
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.container && this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
