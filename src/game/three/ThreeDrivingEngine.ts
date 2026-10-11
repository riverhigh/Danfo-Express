import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { CameraViewMode, BusUpgrades, JunctionStop, DoorState, GasStationBay, RoadsideShop, DeliveryJob } from '../../types/game';
import { soundEngine } from '../../audio/soundEngine';
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
  cameraLookYaw?: number;
  cameraLookPitch?: number;
  steeringWheelAngleDeg: number;
  laneOffsetMeters: number;
  headingYaw?: number;
  walkThirdPerson?: boolean;
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
  activeDelivery?: DeliveryJob | null;
  gasStations?: GasStationBay[];
  roadsideShops?: RoadsideShop[];
  walkMoveX?: number;
  walkMoveZ?: number;
}

export class ThreeDrivingEngine {
  private static modelCache: Map<string, THREE.Group> = new Map();
  private currentBusId: string = 'RUSTIC_VAN';
  private busHeadingYaw: number = 0;
  private lastCameraModeKey: string = 'FIRST_PERSON';
  private driverWalkPos: THREE.Vector3 = new THREE.Vector3(2.5, 0, 0.5);
  private driverFacingYaw: number = 0;
  private driverWalkAnimTimer: number = 0;
  private driverCharacterGroup!: THREE.Group;
  private walkBaseYaw: number = 0;
  private wasSteppedDown: boolean = false;
  private bumpTimer: number = 0;
  private bumpImpulse: number = 0;
  private bumpCooldown: number = 0;
  private lastCollisionAlertTime: number = 0;
  private pendingCollisionMessage: string | null = null;
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private leftMirrorCamera: THREE.PerspectiveCamera;
  private rightMirrorCamera: THREE.PerspectiveCamera;
  private leftMirrorCanvas: HTMLCanvasElement | null = null;
  private rightMirrorCanvas: HTMLCanvasElement | null = null;
  private renderer: THREE.WebGLRenderer;

  // Cannon-es Physics World & Raycast Vehicle
  private world!: CANNON.World;
  private groundBody!: CANNON.Body;
  private chassisBody!: CANNON.Body;
  private vehicle!: CANNON.RaycastVehicle;

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
  private trafficModels: THREE.Group[] = [];
  private npcModels: THREE.Group[] = [];
    
  // Pre-load Lagos pedestrians with proper foot-level alignment (no vehicle GLBs downloaded)
  private loadTrafficModels() {
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
        // 1. Calculate the character's exact physical boundaries
        const humanBox = new THREE.Box3().setFromObject(gltf.scene);
        const lowestY = humanBox.min.y; // Finds the absolute bottom of their shoes

        // 2. Shift the internal meshes up so the feet rest at Y = 0
        gltf.scene.children.forEach(child => {
          child.position.y -= lowestY;
        });

        const m = gltf.scene;
        m.scale.set(1.4, 1.4, 1.4);
        m.position.set(0, 0, 0);
        this.npcModels.push(m);
      }, undefined, (err) => console.warn('Pedestrian GLB load warning:', err));
    });
  }

    private roadSegments: THREE.Group[] = [];
  private junctionMeshes: { group: THREE.Group; junction: JunctionStop; passengers: THREE.Group[] }[] = [];
  private gasStationMeshes: THREE.Group[] = [];
  private billboardMeshes: { group: THREE.Group; ad: BillboardAd }[] = [];
  private shopMeshes: THREE.Group[] = [];
  private trafficMeshes: THREE.Group[] = [];
  private exhaustParticles: THREE.Points;
  private exhaustPositions: Float32Array;
  private rainParticles: THREE.Points | null = null;

  // Dynamic Chase Camera Smooth Spring Damping & Speed FOV
  private currentChaseCamPos: THREE.Vector3 = new THREE.Vector3(0, 3.8, -10.5);
  private currentChaseLookTarget: THREE.Vector3 = new THREE.Vector3(0, 1.4, 4.5);
  private dynamicFov: number = 65;

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

  constructor(container: HTMLElement, busId: string = 'RUSTIC_VAN') {
    this.currentBusId = busId || 'RUSTIC_VAN';
    (this as any)._currentBusId = this.currentBusId;
    this.container = container;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene & Warm Lagos Golden Hour Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1e1510);
    this.scene.fog = new THREE.FogExp2(0x322014, 0.009);

    // 2. Camera (Wide-Angle Cockpit View Looking Forward Out Windshield)
    this.camera = new THREE.PerspectiveCamera(70, width / height, 0.45, 480);
    this.leftMirrorCamera = new THREE.PerspectiveCamera(56, 220 / 130, 0.4, 240);
    this.rightMirrorCamera = new THREE.PerspectiveCamera(56, 220 / 130, 0.4, 240);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    this.renderer.shadowMap.enabled = false;
    container.appendChild(this.renderer.domElement);

    // 4. Lighting
    this.setupLighting();

    // 5. Road & City Environment
    this.setupRoadAndCity();

    // 5b. Cannon-es Physics World & RaycastVehicle
    this.setupPhysics();

    // 6. Danfo Bus Cockpit & Passenger Cabin with 3D Driver Hands & Dual Mirrors
    const busComponents = this.createDanfoBus(this.currentBusId);
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

    // 6b. 3D On-Foot Driver Character for Walk Mode
    this.driverCharacterGroup = this.createDriverCharacter();
    this.driverCharacterGroup.visible = false;
    this.scene.add(this.driverCharacterGroup);

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

  public setMirrorCanvases(left: HTMLCanvasElement | null, right: HTMLCanvasElement | null) {
    this.leftMirrorCanvas = left;
    this.rightMirrorCanvas = right;
  }

  public consumeCollisionMessage(): string | null {
    const msg = this.pendingCollisionMessage;
    this.pendingCollisionMessage = null;
    return msg;
  }

  public getWalkLookYawToBus(): number {
    if (!this.busRoot) return 0;
    const targetYaw = Math.atan2(
      this.driverWalkPos.x - this.busRoot.position.x,
      this.driverWalkPos.z - this.busRoot.position.z
    );
    return targetYaw - this.walkBaseYaw;
  }

  /**
   * Cannon.js / cannon-es physics setup for realistic Lagos Danfo driving dynamics
   */
  private setupPhysics() {
    // 1. Create a new CANNON.World() with gravity set to -9.82 on the Y-axis
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);

    // 2. Create a static CANNON.Body with a CANNON.Plane shape to serve as the physical ground matching our road mesh
    const groundShape = new CANNON.Plane();
    this.groundBody = new CANNON.Body({
      mass: 0,
      shape: groundShape,
      type: CANNON.Body.STATIC,
    });
    // Rotate plane so normal points +Y (up)
    this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(this.groundBody);
    this.groundBody.updateAABB();

    // Road side physical safety barriers along expressway shoulders (curbs)
    const barrierShape = new CANNON.Box(new CANNON.Vec3(1.2, 2.5, 50000));
    const leftBarrier = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, shape: barrierShape });
    leftBarrier.position.set(-28.5, 2.0, 0);
    this.world.addBody(leftBarrier);

    const rightBarrier = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, shape: barrierShape });
    rightBarrier.position.set(11.5, 2.0, 0);
    this.world.addBody(rightBarrier);

    // 3. Implement a CANNON.RaycastVehicle setup for our Danfo bus
    // Give the chassis body a mass of 1500
    const chassisShape = new CANNON.Box(new CANNON.Vec3(1.06, 0.85, 2.45));
    this.chassisBody = new CANNON.Body({ mass: 1500 });
    this.chassisBody.addShape(chassisShape, new CANNON.Vec3(0, 0, 0));
    // Position chassis above ground
    this.chassisBody.position.set(0, 0.85, 0);
    // CRITICAL: Strictly lock pitch (X) and roll (Z) so vehicle CANNOT flip upside down!
    this.chassisBody.angularFactor.set(0, 1, 0);
    this.chassisBody.angularDamping = 0.6;
    this.chassisBody.linearDamping = 0.04;
    this.world.addBody(this.chassisBody);

    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.chassisBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2,
    });

    // Configure 4 physical wheels with realistic suspension stiffness, damping, and zero roll influence
    const wheelOptions = {
      radius: 0.42,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 28,
      suspensionRestLength: 0.4,
      frictionSlip: 12.0,
      dampingRelaxation: 2.6,
      dampingCompression: 2.6,
      maxSuspensionForce: 100000,
      rollInfluence: 0.0, // Zero roll influence so suspension cannot flip or tilt the bus!
      axleLocal: new CANNON.Vec3(1, 0, 0),
      chassisConnectionPointLocal: new CANNON.Vec3(0, 0, 0),
      maxSuspensionTravel: 0.3,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true,
    };

    // 4 physical wheels: Front-Left, Front-Right, Rear-Left, Rear-Right
    this.vehicle.addWheel({
      ...wheelOptions,
      chassisConnectionPointLocal: new CANNON.Vec3(1.05, -0.2, 1.6),
      isFrontWheel: true,
    });
    this.vehicle.addWheel({
      ...wheelOptions,
      chassisConnectionPointLocal: new CANNON.Vec3(-1.05, -0.2, 1.6),
      isFrontWheel: true,
    });
    this.vehicle.addWheel({
      ...wheelOptions,
      chassisConnectionPointLocal: new CANNON.Vec3(1.05, -0.2, -1.6),
      isFrontWheel: false,
    });
    this.vehicle.addWheel({
      ...wheelOptions,
      chassisConnectionPointLocal: new CANNON.Vec3(-1.05, -0.2, -1.6),
      isFrontWheel: false,
    });

    this.vehicle.addToWorld(this.world);
  }

  private normalizeVehicleModel(model: THREE.Group, _path: string) {
    // 1. Clean out ground shadow pedestals / turntables
    model.traverse((child: any) => {
      if (child.isMesh && child.name) {
        const n = child.name.toLowerCase();
        if (
          n.includes('shadow') ||
          n.includes('pedestal') ||
          n.includes('turntable') ||
          n.includes('ground_plane')
        ) {
          child.visible = false;
        }
      }
    });

    // 2. Danfo Bus: Authored facing front (+Z)
    model.rotation.set(0, 0, 0);
    model.scale.set(1, 1, 1);
    model.position.set(0, 0, 0);
    model.updateMatrixWorld(true);

    const b = new THREE.Box3().setFromObject(model);
    const sz = new THREE.Vector3();
    b.getSize(sz);
    const scale = 5.0 / Math.max(0.1, sz.z);
    model.scale.set(scale, scale, scale);
    model.updateMatrixWorld(true);

    // Ground alignment: place bottom of tyres at exactly Y = 0
    const finalBox = new THREE.Box3().setFromObject(model);
    model.position.y = -finalBox.min.y;
  }

  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xfef3c7, 0.9);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xf59e0b, 1.9);
    sunLight.position.set(35, 45, 25);
    sunLight.castShadow = false;
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
      this.loadTrafficModels();
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
      const rightSideProps = new THREE.Group();
      rightSideProps.visible = i > 0; // Hidden at segment 0 so the starting Bus Park connects cleanly to the expressway!
      group.add(rightSideProps);
      group.userData.rightSideProps = rightSideProps;

      [-10.5, 10.5].forEach((curbX, idx) => {
        const curb = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, roadLength), new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.7 }));
        curb.position.set(curbX, 0.15, 0);
        curb.receiveShadow = true;
        if (idx === 0) rightSideProps.add(curb);
        else group.add(curb);

        // Sidewalk
        const walk = new THREE.Mesh(new THREE.BoxGeometry(7, 0.25, roadLength), new THREE.MeshStandardMaterial({ color: 0x3a3732, roughness: 0.95 }));
        walk.position.set(idx === 0 ? -14.5 : 14.5, 0.12, 0);
        if (idx === 0) rightSideProps.add(walk);
        else group.add(walk);
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
               if (tx < 0) rightSideProps.add(tree);
               else group.add(tree);
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
        rightSideProps.add(bMeshL);

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
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfef08a, emissiveIntensity: 1.2 }));
          bulb.position.set(lx, 8.2, s);
          if (lx < 0) {
            rightSideProps.add(pole, bulb);
          } else {
            group.add(pole, bulb);
          }
        });
      }

      // 3D Road Speed Bump / Asphalt Ridge across lanes
      if (i % 2 === 0 && i > 0) {
        const bumpGeo = new THREE.CylinderGeometry(0.5, 0.5, 17, 12, 1, false, 0, Math.PI);
        const bumpMat = new THREE.MeshStandardMaterial({
          color: 0x332a20,
          roughness: 0.9,
          metalness: 0.1
        });
        const bumpMesh = new THREE.Mesh(bumpGeo, bumpMat);
        bumpMesh.rotation.z = Math.PI / 2;
        bumpMesh.position.set(0, 0.06, 25);
        bumpMesh.scale.set(0.12, 1.0, 1.6);
        group.add(bumpMesh);
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
    // STARTING MOTOR PARK & MAJOR LANDMARK AREAS
    // ================================================
    this.buildBusPark();
    this.buildIkejaArea();
    this.buildOshodiArea();
    this.buildSurulereArea();
  }

  /**
   * STARTING LAGOS DANFO MOTOR PARK (BUS GARAGE TERMINAL)
   * Player spawns parked in Departure Bay 02 (-15.5, 0) and drives forward + steers LEFT
   * through the Motor Park Exit Gate onto the main expressway!
   */
  private buildBusPark() {
    const park = new THREE.Group();
    park.position.set(0, 0, 0);

    // 1. Concrete Tarmac Yard on right-hand side of expressway (-X is right side when looking down +Z)
    const tarmacMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.88, metalness: 0.05 });
    const tarmac = new THREE.Mesh(new THREE.BoxGeometry(22, 0.06, 85), tarmacMat);
    tarmac.position.set(-20.5, 0.03, 12);
    park.add(tarmac);

    // Smooth Asphalt Driveway Merge Apron connecting Park to Expressway
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 42), new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.85 }));
    apron.rotation.x = -Math.PI / 2;
    apron.position.set(-10.5, 0.02, 22);
    park.add(apron);

    // 2. Yellow Painted Parking Bays & Departure Lane Striping
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const greenGlowMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });

    // Parking bay dividers
    [-14, -4, 6, 16].forEach((bz) => {
      const bayLine = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 0.2), lineMat);
      bayLine.rotation.x = -Math.PI / 2;
      bayLine.position.set(-22.0, 0.07, bz);
      park.add(bayLine);
    });

    // Player Starting Bay Frame (Bay 02 at x = -15.5, z = 0)
    [-17.2, -13.8].forEach((bx) => {
      const sideStripe = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 7.5), greenGlowMat);
      sideStripe.rotation.x = -Math.PI / 2;
      sideStripe.position.set(bx, 0.07, 0);
      park.add(sideStripe);
    });

    // Directional Exit Arrows / Chevrons guiding player forward and LEFT out the Exit Gate onto Expressway
    const chevronWaypoints: [number, number, number][] = [
      [-15.5, 7, 0],
      [-15.2, 13, 0.15],
      [-14.2, 19, 0.45],
      [-12.6, 24, 0.75],
      [-10.4, 28, 0.95],
      [-7.8, 32, 0.65],
    ];
    chevronWaypoints.forEach(([cx, cz, rotY], idx) => {
      const chev = new THREE.Mesh(
        new THREE.ConeGeometry(0.75, 1.8, 3),
        new THREE.MeshBasicMaterial({ color: idx % 2 === 0 ? 0xfacc15 : 0x4ade80 })
      );
      chev.rotation.x = Math.PI / 2;
      chev.rotation.z = -rotY;
      chev.position.set(cx, 0.09, cz);
      park.add(chev);
    });

    // 3. Grand Motor Park Exit Archway Gate (at driveway exit x = -11.5, z = 14..36)
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4, metalness: 0.3 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
    [14, 36].forEach((gz) => {
      const pCol = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6.2, 0.8), pillarMat);
      pCol.position.set(-11.2, 3.1, gz);
      park.add(pCol);
      const pBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, 1.1), trimMat);
      pBase.position.set(-11.2, 0.6, gz);
      park.add(pBase);
    });

    // Overhead Archway Signboard facing the player inside the park
    const gateSignTex = createSignboardTexture('IKEJA CENTRAL DANFO PARK', 'EXIT TO EXPRESSWAY ➔ DRIVE SAFE', '#15803d');
    const gateBeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 2.0, 23.5),
      new THREE.MeshStandardMaterial({ map: gateSignTex, roughness: 0.3 })
    );
    gateBeam.position.set(-11.2, 5.8, 25);
    park.add(gateBeam);

    // Second Overhead Signboard directly in front of player's starting bay
    const frontExitSignTex = createSignboardTexture('⬅ EXPRESSWAY EXIT GATE', 'STEER LEFT TO MERGE ONTO HIGHWAY', '#ca8a04');
    const frontExitBoard = new THREE.Mesh(
      new THREE.BoxGeometry(8.5, 1.8, 0.3),
      new THREE.MeshStandardMaterial({ map: frontExitSignTex, roughness: 0.3 })
    );
    frontExitBoard.position.set(-15.5, 4.8, 36);
    park.add(frontExitBoard);
    [-19.2, -11.8].forEach((px) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 4.8), pillarMat);
      post.position.set(px, 2.4, 36);
      park.add(post);
    });

    // 4. Parked Fellow Danfo Buses & Keke Napep in Adjacent Terminal Bays
    const parkedDanfo1 = this.createProceduralDanfo(0xfacc15, 'GOD DEY');
    parkedDanfo1.position.set(-21.5, 0.06, -9);
    parkedDanfo1.rotation.y = 0.25;
    park.add(parkedDanfo1);

    const parkedDanfo2 = this.createProceduralDanfo(0xf59e0b, 'NO KING AS GOD');
    parkedDanfo2.position.set(-21.5, 0.06, 1);
    parkedDanfo2.rotation.y = 0.22;
    park.add(parkedDanfo2);

    const parkedDanfo3 = this.createProceduralDanfo(0xeab308, 'OSHODI EXPRESS');
    parkedDanfo3.position.set(-21.5, 0.06, 11);
    parkedDanfo3.rotation.y = 0.2;
    park.add(parkedDanfo3);

    const parkedBehind = this.createProceduralDanfo(0xfacc15, 'LAGOS HUSTLER');
    parkedBehind.position.set(-21.5, 0.06, -18);
    parkedBehind.rotation.y = 0.22;
    park.add(parkedBehind);

    const parkedKeke = this.createProceduralKeke('BLESSING');
    parkedKeke.position.set(-21.5, 0.06, 21);
    parkedKeke.rotation.y = 0.4;
    park.add(parkedKeke);

    // 5. Motor Park Dispatch Shed, Union Ticket Booth & Waiting Shelter
    const shedRoof = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 0.35, 38),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 })
    );
    shedRoof.position.set(-26.8, 4.2, 2);
    park.add(shedRoof);

    const terminalBuilding = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 4.0, 36),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    terminalBuilding.position.set(-28.5, 2.0, 2);
    park.add(terminalBuilding);

    const unionSignTex = createSignboardTexture('NURTW MOTOR PARK TERMINAL', 'TICKETS • DISPATCH • WAYBILL OFFICE', '#b45309');
    const unionSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 1.6, 18),
      new THREE.MeshStandardMaterial({ map: unionSignTex })
    );
    unionSign.position.set(-24.2, 4.4, 2);
    park.add(unionSign);

    // Perimeter low concrete wall at back & far end of park (leaving z=14..38 exit wide open)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.7 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(20, 1.1, 0.6), wallMat);
    backWall.position.set(-20.5, 0.55, -24);
    park.add(backWall);

    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(18, 1.1, 0.6), wallMat);
    frontWall.position.set(-20.5, 0.55, 46);
    park.add(frontWall);

    const curbWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 36), wallMat);
    curbWall.position.set(-11.2, 0.45, -5);
    park.add(curbWall);

    this.scene.add(park);
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
  /**
   * Builds a 3D Lagos Driver Character for On-Foot Walk Mode with articulated limbs
   */
  private createDriverCharacter(): THREE.Group {
    const group = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.65 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
    const vestTrimMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.5 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });

    // Torso (Lagos Danfo Yellow & Green Ankara-accented Driver Shirt)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.58, 0.26), shirtMat);
    torso.position.set(0, 1.12, 0);
    group.add(torso);

    const chestStripe = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.27), vestTrimMat);
    chestStripe.position.set(0, 1.2, 0);
    group.add(chestStripe);

    // Head & Driver Cap
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), skinMat);
    head.position.set(0, 1.56, 0);
    group.add(head);

    const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.09, 16), capMat);
    capCrown.position.set(0, 1.66, 0);
    group.add(capCrown);

    const capVisor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.16), vestTrimMat);
    capVisor.position.set(0, 1.62, 0.12);
    group.add(capVisor);

    // Articulated Left & Right Legs
    const makeLeg = (lx: number) => {
      const legPivot = new THREE.Group();
      legPivot.position.set(lx, 0.82, 0);
      const legMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.18), pantsMat);
      legMesh.position.set(0, -0.36, 0);
      const shoeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.26), shoeMat);
      shoeMesh.position.set(0, -0.75, 0.04);
      legPivot.add(legMesh, shoeMesh);
      group.add(legPivot);
      return legPivot;
    };

    const leftLeg = makeLeg(-0.12);
    const rightLeg = makeLeg(0.12);

    // Articulated Left & Right Arms
    const makeArm = (ax: number) => {
      const armPivot = new THREE.Group();
      armPivot.position.set(ax, 1.35, 0);
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.22, 0.14), shirtMat);
      sleeve.position.set(0, -0.1, 0);
      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.34, 0.11), skinMat);
      forearm.position.set(0, -0.34, 0);
      armPivot.add(sleeve, forearm);
      group.add(armPivot);
      return armPivot;
    };

    const leftArm = makeArm(-0.29);
    const rightArm = makeArm(0.29);

    // Ground selection ring under driver feet so player position is unmistakable
    const footRing = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.44, 24),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    );
    footRing.rotation.x = -Math.PI / 2;
    footRing.position.set(0, 0.03, 0);
    group.add(footRing);

    group.userData = { leftLeg, rightLeg, leftArm, rightArm };
    return group;
  }

  /**
   * Builds the showcase-grade 3D Lagos Danfo Bus (VW Transporter T3 / Korope Edition)
   * with high-gloss clearcoat paint, twin black waistline stripes, recessed chrome-trimmed radiator grille,
   * flared wheel arches, deep-dish chrome rims, panoramic framed windows, interior commuters,
   * tubular steel roof rack with Ghana-Must-Go cargo & rear ladder, and animated sliding door & boot!
   */
  private createDanfoBus(busId: string = 'RUSTIC_VAN') {
    const busRoot = new THREE.Group();
    const busBody = new THREE.Group();
    // Offset visual bus group so the wheels seat cleanly on physical road at Y = 0
    busBody.position.set(0, -0.85, -0.21);
    busRoot.add(busBody);

    const danfoGroup = new THREE.Group();
    busBody.add(danfoGroup);

    // --- Showcase-Grade Lagos Danfo Automotive Materials ---
    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.2,
      metalness: 0.22,
    });
    const warmAmberMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.2,
    });
    const blackStripeMat = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.35,
      metalness: 0.15,
    });
    const greenBadgeMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.3,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0c192c,
      roughness: 0.05,
      metalness: 0.25,
      transparent: true,
      opacity: 0.58,
      side: THREE.DoubleSide,
    });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x141417, roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.12, metalness: 0.92 });
    const rustFloorMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.85 });
    const woodBenchMat = new THREE.MeshStandardMaterial({ color: 0x7c4a27, roughness: 0.65 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.08, metalness: 0.96 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.55 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.38, metalness: 0.82 });

    // 1. Heavy Chassis Frame, Rocker Skirts & Cabin Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.14, 5.28), rustFloorMat);
    floor.position.set(0, 0.68, 0.22);
    danfoGroup.add(floor);

    const rockerSkirt = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.16, 5.15), darkMat);
    rockerSkirt.position.set(0, 0.64, 0.22);
    danfoGroup.add(rockerSkirt);

    // 2. Sculpted Lower Body Shell & Upper Beltline Molding
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.88, 5.26), yellowMat);
    lowerBody.position.set(0, 1.15, 0.18);
    danfoGroup.add(lowerBody);

    const beltMolding = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.07, 5.32), warmAmberMat);
    beltMolding.position.set(0, 1.56, 0.18);
    danfoGroup.add(beltMolding);

    // 3. Flared Black Wheel Arch Fenders over all 4 Wheels
    const archGeo = new THREE.CylinderGeometry(0.47, 0.47, 0.14, 20, 1, false, 0, Math.PI);
    archGeo.rotateZ(Math.PI / 2);
    [
      [-1.13, 1.6],
      [1.13, 1.6],
      [-1.13, -1.6],
      [1.13, -1.6],
    ].forEach(([ax, az]) => {
      const arch = new THREE.Mesh(archGeo, darkMat);
      arch.position.set(ax, 0.45, az);
      danfoGroup.add(arch);
    });

    // 4. Dual Iconic Matte-Black Lagos Danfo Waistline Stripes (Wrapping Sides, Front & Rear)
    const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.13, 5.3), blackStripeMat);
    stripe1.position.set(0, 1.02, 0.18);
    danfoGroup.add(stripe1);

    const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.13, 5.3), blackStripeMat);
    stripe2.position.set(0, 1.32, 0.18);
    danfoGroup.add(stripe2);

    // Lagos State Commercial Green-White-Green Hack Stripes on Front Quarter Panels
    [-1.18, 1.18].forEach((qx) => {
      const gStripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.45), greenBadgeMat);
      gStripe1.position.set(qx, 1.18, 2.25);
      const wStripe = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.28, 0.16), chromeMat);
      wStripe.position.set(qx, 1.18, 2.25);
      danfoGroup.add(gStripe1, wStripe);
    });

    // 5. Aerodynamic Slanted Front Nose Cone & Heavy Front Bumper
    const frontNose = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.82, 0.68), yellowMat);
    frontNose.position.set(0, 1.16, 2.86);
    frontNose.rotation.x = -0.12;
    danfoGroup.add(frontNose);

    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.24, 0.28), darkMat);
    frontBumper.position.set(0, 0.72, 3.22);
    danfoGroup.add(frontBumper);

    const frontBumperChrome = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.05, 0.3), chromeMat);
    frontBumperChrome.position.set(0, 0.78, 3.22);
    danfoGroup.add(frontBumperChrome);

    // Yellow warning fog lights in front bumper
    [-0.86, 0.86].forEach((fx) => {
      const fog = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.09, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      fog.position.set(fx, 0.68, 3.36);
      danfoGroup.add(fog);
    });

    // 6. Classic VW T3 Recessed Radiator Grille with Chrome Louver Bars & Center Emblem
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.42, 0.1), darkMat);
    grille.position.set(0, 1.16, 3.19);
    danfoGroup.add(grille);

    [-0.12, 0, 0.12].forEach((gy) => {
      const louver = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.022, 0.11), chromeMat);
      louver.position.set(0, 1.16 + gy, 3.195);
      danfoGroup.add(louver);
    });

    const centerEmblem = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 20), chromeMat);
    centerEmblem.rotation.x = Math.PI / 2;
    centerEmblem.position.set(0, 1.16, 3.24);
    danfoGroup.add(centerEmblem);

    // 7. Dual Crystal Round Headlights with Chrome Bezels & Warm Beams
    const createHeadlightUnit = (hx: number) => {
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.07, 24), chromeMat);
      bezel.rotation.x = Math.PI / 2;
      bezel.position.set(hx, 1.16, 3.2);
      danfoGroup.add(bezel);

      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.155, 0.155, 0.09, 24),
        new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfef08a, emissiveIntensity: 2.0 })
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.set(hx, 1.16, 3.21);
      danfoGroup.add(lens);
      return lens;
    };
    createHeadlightUnit(-0.74);
    createHeadlightUnit(0.74);

    // 8. Wrap-Around Amber Turn Signal Blinkers
    const lBlinker = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.13, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xd97706 })
    );
    lBlinker.position.set(-1.08, 1.16, 3.17);
    danfoGroup.add(lBlinker);

    const rBlinker = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.13, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xd97706 })
    );
    rBlinker.position.set(1.08, 1.16, 3.17);
    danfoGroup.add(rBlinker);

    // 9. Nigerian Commercial Number Plates (Front & Rear)
    const plateGeo = new THREE.BoxGeometry(0.76, 0.21, 0.04);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.25 });
    const frontPlate = new THREE.Mesh(plateGeo, plateMat);
    frontPlate.position.set(0, 0.72, 3.36);
    danfoGroup.add(frontPlate);

    const rearPlate = new THREE.Mesh(plateGeo, plateMat);
    rearPlate.position.set(0, 0.94, -2.5);
    danfoGroup.add(rearPlate);

    // 10. Sculpted Cabin Window Pillars, VW Rear Engine Vents & Crowned High Roof
    const pillarGeo = new THREE.BoxGeometry(0.11, 0.96, 0.14);
    [-2.35, -1.0, 0.4, 1.65, 2.52].forEach((pz) => {
      [-1.13, 1.13].forEach((px) => {
        const pillar = new THREE.Mesh(pillarGeo, yellowMat);
        pillar.position.set(px, 1.96, pz);
        danfoGroup.add(pillar);
      });
    });

    // Signature VW T3 Rear-Pillar Black Engine Air Intake Louver Panels
    [-1.15, 1.15].forEach((vx) => {
      const ventPanel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.62, 0.36), darkMat);
      ventPanel.position.set(vx, 1.98, -2.12);
      danfoGroup.add(ventPanel);
    });

    // Main Roof & Rounded Upper Roof Crown
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.18, 5.22), yellowMat);
    roof.position.set(0, 2.45, 0.12);
    danfoGroup.add(roof);

    const roofCrown = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.12, 4.95), warmAmberMat);
    roofCrown.position.set(0, 2.57, 0.1);
    danfoGroup.add(roofCrown);

    // Side Route Banner Boards along Roofline ("OSHODI • IKEJA • CMS EXPRESS")
    const routeSideTex = createSignboardTexture('OSHODI • IKEJA • CMS', 'EXPRESS COMMUTER DANFO', '#111827');
    [-1.17, 1.17].forEach((rx) => {
      const rBanner = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.2, 3.2),
        new THREE.MeshStandardMaterial({ map: routeSideTex, roughness: 0.3 })
      );
      rBanner.position.set(rx, 2.44, 0.1);
      danfoGroup.add(rBanner);
    });

    // 11. Tubular Galvanized Roof Carrier Rack, Rear Ladder & Authentic Lagos Cargo
    const roofRack = new THREE.Group();
    const rackFrame = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.1, 3.6), steelMat);
    rackFrame.position.set(0, 2.66, -0.2);
    roofRack.add(rackFrame);

    // Tubular Chrome Side Rails on Roof Rack
    [-0.94, 0.94].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.6, 12), chromeMat);
      rail.rotation.x = Math.PI / 2;
      rail.position.set(rx, 2.78, -0.2);
      roofRack.add(rail);
    });

    // Rear Tailgate Access Ladder
    const ladderGroup = new THREE.Group();
    [-0.78, -0.48].forEach((lx) => {
      const stile = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.55, 8), steelMat);
      stile.position.set(lx, 1.72, -2.52);
      ladderGroup.add(stile);
    });
    [1.1, 1.4, 1.7, 2.0, 2.3].forEach((ry) => {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.32, 8), chromeMat);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(-0.63, ry, -2.52);
      ladderGroup.add(rung);
    });
    roofRack.add(ladderGroup);

    // Colorful "Ghana-Must-Go" Bags, Market Sacks & Strapped Spare Tire on Roof Rack
    const sackColors = [0xdc2626, 0x2563eb, 0x16a34a, 0xd97706];
    [-0.48, 0.48].forEach((sx, idx) => {
      const sack1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.34, 0.95),
        new THREE.MeshStandardMaterial({ color: sackColors[idx], roughness: 0.7 })
      );
      sack1.position.set(sx, 2.86, -0.85 + idx * 0.35);
      roofRack.add(sack1);

      const sack2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.3, 0.85),
        new THREE.MeshStandardMaterial({ color: sackColors[idx + 2], roughness: 0.75 })
      );
      sack2.position.set(sx, 2.84, 0.35 - idx * 0.25);
      roofRack.add(sack2);
    });

    // Spare Tire Strapped Flat on Front of Roof Rack
    const roofSpareTire = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.2, 20), tireMat);
    roofSpareTire.position.set(0, 2.82, 1.12);
    const roofSpareRim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.21, 16), rimMat);
    roofSpareRim.position.set(0, 2.82, 1.12);
    roofRack.add(roofSpareTire, roofSpareRim);

    danfoGroup.add(roofRack);

    // Roof Mega-Speakers upgrade
    const roofSpeakers = new THREE.Group();
    [-0.62, 0.62].forEach((spx) => {
      const spk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.12, 0.35, 16), chromeMat);
      spk.rotation.x = Math.PI / 2;
      spk.position.set(spx, 2.84, 1.45);
      roofSpeakers.add(spk);
    });
    roofSpeakers.visible = false;
    danfoGroup.add(roofSpeakers);

    // 12. Illuminated Front Route Signboard Lightbox (Above front windscreen)
    const signBoxTex = createSignboardTexture('OSHODI ➔ CMS EXPRESS', 'NO KING AS GOD • ENTER WITH CHANGE', '#ca8a04');
    const signBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.92, 0.3, 0.18),
      new THREE.MeshStandardMaterial({ map: signBoxTex, roughness: 0.25, emissive: 0x451a03, emissiveIntensity: 0.35 })
    );
    signBox.position.set(0, 2.48, 2.66);
    danfoGroup.add(signBox);

    // 13. Framed Front Windshield & Dual Wipers
    const wsFrame = new THREE.Mesh(new THREE.BoxGeometry(2.18, 1.0, 0.04), darkMat);
    wsFrame.position.set(0, 1.96, 2.61);
    wsFrame.rotation.x = -0.22;
    danfoGroup.add(wsFrame);

    const frontWindshield = new THREE.Mesh(new THREE.PlaneGeometry(2.08, 0.92), glassMat);
    frontWindshield.position.set(0, 1.96, 2.64);
    frontWindshield.rotation.x = -0.22;
    danfoGroup.add(frontWindshield);

    const wipersGroup = new THREE.Group();
    [-0.45, 0.45].forEach((wx) => {
      const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.48, 0.025), darkMat);
      wiper.position.set(wx, 1.72, 2.68);
      wiper.rotation.x = -0.22;
      wipersGroup.add(wiper);
    });
    danfoGroup.add(wipersGroup);

    // 14. Panoramic Side Windows, Red/Gold Interior Curtain Valance & Rear Window
    const sideGlassL = new THREE.Mesh(new THREE.PlaneGeometry(4.75, 0.84), glassMat);
    sideGlassL.position.set(1.15, 1.96, 0.08);
    sideGlassL.rotation.y = Math.PI / 2;
    danfoGroup.add(sideGlassL);

    const sideGlassR = new THREE.Mesh(new THREE.PlaneGeometry(4.75, 0.84), glassMat);
    sideGlassR.position.set(-1.15, 1.96, 0.08);
    sideGlassR.rotation.y = -Math.PI / 2;
    danfoGroup.add(sideGlassR);

    const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.88, 0.76), glassMat);
    rearGlass.position.set(0, 1.96, -2.48);
    rearGlass.rotation.y = Math.PI;
    danfoGroup.add(rearGlass);

    // 15. Sculpted Rear Tailgate, Multi-Lens Taillights, Exhaust Tip & Bumper
    const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.24, 0.28), darkMat);
    rearBumper.position.set(0, 0.72, -2.52);
    danfoGroup.add(rearBumper);

    const rearBumperChrome = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.05, 0.3), chromeMat);
    rearBumperChrome.position.set(0, 0.78, -2.52);
    danfoGroup.add(rearBumperChrome);

    // Chrome Exhaust Pipe Tip
    const exhaustPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.38, 12), chromeMat);
    exhaustPipe.rotation.x = Math.PI / 2;
    exhaustPipe.position.set(-0.85, 0.56, -2.58);
    danfoGroup.add(exhaustPipe);

    const lBrake = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.32, 0.09),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.9 })
    );
    lBrake.position.set(-0.96, 1.18, -2.48);
    danfoGroup.add(lBrake);

    const rBrake = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.32, 0.09),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.9 })
    );
    rBrake.position.set(0.96, 1.18, -2.48);
    danfoGroup.add(rBrake);

    // Rear Amber Indicator Accents above Brake Lenses
    [-0.96, 0.96].forEach((tx) => {
      const rearTurn = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.1, 0.095),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      rearTurn.position.set(tx, 1.38, -2.48);
      danfoGroup.add(rearTurn);
    });

    // Yellow-accented Mudflaps behind rear wheels
    [-0.96, 0.96].forEach((mx) => {
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.025), darkMat);
      flap.position.set(mx, 0.32, -2.02);
      const flapStripe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.03), yellowMat);
      flapStripe.position.set(mx, 0.2, -2.02);
      danfoGroup.add(flap, flapStripe);
    });

    // Rear boot door (animated trunk)
    const bootDoor = new THREE.Group();
    bootDoor.position.set(0, 2.32, -2.46);
    const bootDoorPanel = new THREE.Mesh(new THREE.BoxGeometry(2.12, 1.48, 0.08), yellowMat);
    bootDoorPanel.position.set(0, -0.74, 0);
    const bootDoorStripe = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.12, 0.09), blackStripeMat);
    bootDoorStripe.position.set(0, -1.0, 0);
    bootDoor.add(bootDoorPanel, bootDoorStripe);
    danfoGroup.add(bootDoor);

    const bootLuggage = new THREE.Group();
    bootLuggage.position.set(0, 0.85, -2.05);
    danfoGroup.add(bootLuggage);

    // 16. Passenger Sliding Door (animated with window & stripes)
    const slidingDoor = new THREE.Group();
    slidingDoor.position.set(1.16, 0, 0);
    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.62, 1.32), yellowMat);
    doorPanel.position.set(0, 1.46, 0.42);
    const doorStripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.13, 1.34), blackStripeMat);
    doorStripe1.position.set(0, 1.32, 0.42);
    const doorStripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.13, 1.34), blackStripeMat);
    doorStripe2.position.set(0, 1.02, 0.42);
    const doorHandle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.18), chromeMat);
    doorHandle.position.set(0.03, 1.48, 0.92);
    slidingDoor.add(doorPanel, doorStripe1, doorStripe2, doorHandle);
    danfoGroup.add(slidingDoor);

    // 17. Conductor at doorway
    const conductor = new THREE.Group();
    conductor.position.set(1.2, 0.85, 0.42);
    const condBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.8, 12), new THREE.MeshStandardMaterial({ color: 0x2563eb }));
    const condHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), new THREE.MeshStandardMaterial({ color: 0x3e2723 }));
    condHead.position.y = 0.55;
    const condCap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 12), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
    condCap.position.y = 0.68;
    const condLegs = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.2), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
    condLegs.position.y = -0.55;
    const condArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.1), new THREE.MeshStandardMaterial({ color: 0x3e2723 }));
    condArm.position.set(0.2, 0.2, 0);
    conductor.add(condBody, condHead, condCap, condLegs, condArm);
    conductor.visible = false;
    danfoGroup.add(conductor);

    // 18. Heavy Steel Front Bull Bar upgrade
    const bullBar = new THREE.Group();
    const bullTube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.25, 12), chromeMat);
    bullTube.rotation.z = Math.PI / 2;
    bullTube.position.set(0, 0.88, 3.38);
    const bullUpL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.58, 12), chromeMat);
    bullUpL.position.set(-0.62, 1.04, 3.36);
    const bullUpR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.58, 12), chromeMat);
    bullUpR.position.set(0.62, 1.04, 3.36);
    bullBar.add(bullTube, bullUpL, bullUpR);
    bullBar.visible = false;
    danfoGroup.add(bullBar);

    // 19. Custom Underglow light
    const underglow = new THREE.PointLight(0xf59e0b, 0, 8);
    underglow.position.set(0, 0.25, 0);
    danfoGroup.add(underglow);

    // 20. Cockpit Dashboard & Working Needles
    const dashboard = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.45, 0.55), darkMat);
    dashboard.position.set(0, 1.45, 2.45);
    danfoGroup.add(dashboard);

    const makeNeedle = (nx: number, ny: number) => {
      const group = new THREE.Group();
      group.position.set(nx, ny, 2.25);
      const needle = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, 0.08, 0.01),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      needle.position.y = 0.035;
      group.add(needle);
      danfoGroup.add(group);
      return group as any;
    };

    const speedNeedle = makeNeedle(-0.6, 1.5);
    const tachNeedle = makeNeedle(-0.4, 1.5);
    const fuelNeedle = makeNeedle(-0.25, 1.5);
    const accelNeedle = makeNeedle(-0.75, 1.5);

    const dashLeftBlinker = new THREE.Mesh(
      new THREE.CircleGeometry(0.02, 12),
      new THREE.MeshBasicMaterial({ color: 0x14532d })
    );
    dashLeftBlinker.position.set(-0.68, 1.56, 2.24);
    danfoGroup.add(dashLeftBlinker);

    const dashRightBlinker = new THREE.Mesh(
      new THREE.CircleGeometry(0.02, 12),
      new THREE.MeshBasicMaterial({ color: 0x14532d })
    );
    dashRightBlinker.position.set(-0.32, 1.56, 2.24);
    danfoGroup.add(dashRightBlinker);

    // 21. 3-Spoke Bus Steering Wheel with Woodgrain Top Rim & Exterior Side Mirrors
    const steeringWheel = new THREE.Group();
    const rimLeatherMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45, metalness: 0.2 });
    const woodArcMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.22, metalness: 0.3 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.032, 16, 36), rimLeatherMat);
    const woodArc = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.034, 16, 24, Math.PI * 0.65), woodArcMat);
    woodArc.rotation.z = Math.PI * 0.175;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.055, 20), darkMat);
    hub.rotation.x = Math.PI / 2;
    const spokeL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.035, 0.02), chromeMat);
    spokeL.position.set(-0.12, -0.02, 0);
    spokeL.rotation.z = 0.22;
    const spokeR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.035, 0.02), chromeMat);
    spokeR.position.set(0.12, -0.02, 0);
    spokeR.rotation.z = -0.22;
    const spokeB = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.17, 0.02), chromeMat);
    spokeB.position.set(0, -0.12, 0);
    steeringWheel.add(rim, woodArc, spokeL, spokeR, spokeB, hub);
    steeringWheel.position.set(0.55, 1.5, 2.15);
    steeringWheel.rotation.x = -Math.PI * 0.28;
    danfoGroup.add(steeringWheel);

    // 3D Exterior Dual Chrome-Trimmed Side Mirrors (Mounted on Front Cab Pillars)
    [-1.26, 1.26].forEach((mx) => {
      const mirrorGroup = new THREE.Group();
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.28, 10), chromeMat);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(mx > 0 ? -0.11 : 0.11, 0, 0);
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.09), yellowMat);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.31, 0.04), darkMat);
      trim.position.z = -0.025;
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(0.11, 0.26),
        new THREE.MeshStandardMaterial({ color: 0x93c5fd, metalness: 0.95, roughness: 0.04 })
      );
      glass.position.z = -0.048;
      glass.rotation.y = Math.PI;
      mirrorGroup.add(arm, housing, trim, glass);
      mirrorGroup.position.set(mx, 1.9, 2.4);
      busBody.add(mirrorGroup);
    });

    // Central rearview mirror with dangling holy rosary
    const rosary = new THREE.Group();
    rosary.position.set(0, 2.25, 2.45);
    const rosaryString = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 8), darkMat);
    rosaryString.position.y = -0.11;
    const rosaryCross = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.015), chromeMat);
    rosaryCross.position.y = -0.24;
    rosary.add(rosaryString, rosaryCross);
    danfoGroup.add(rosary);

    // Driver Seat, Wooden Passenger Benches & Seated Commuters Inside Cabin
    const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.15, 0.65), darkMat);
    driverSeat.position.set(-0.55, 0.95, 1.7);
    danfoGroup.add(driverSeat);

    const paxShirtColors = [0x1d4ed8, 0xdc2626, 0x15803d, 0x9333ea, 0xd97706, 0x0284c7];
    [1.65, 0.5, -0.65, -1.75].forEach((pz, rIdx) => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.07, 0.46), woodBenchMat);
      bench.position.set(0, 1.05, pz);
      danfoGroup.add(bench);

      const benchBack = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.45, 0.06), woodBenchMat);
      benchBack.position.set(0, 1.35, pz - 0.22);
      danfoGroup.add(benchBack);

      // Add seated commuters inside the Danfo cabin so the bus looks alive!
      if (rIdx > 0) {
        [-0.58, 0.05, 0.62].forEach((px, cIdx) => {
          const paxTorso = new THREE.Mesh(
            new THREE.BoxGeometry(0.34, 0.42, 0.24),
            new THREE.MeshStandardMaterial({ color: paxShirtColors[(rIdx + cIdx) % paxShirtColors.length], roughness: 0.6 })
          );
          paxTorso.position.set(px, 1.32, pz - 0.04);
          const paxHead = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 10, 10),
            new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.7 })
          );
          paxHead.position.set(px, 1.64, pz - 0.04);
          danfoGroup.add(paxTorso, paxHead);
        });
      }
    });

    // 22. 4 Deep-Dish Chrome Rim Wheels & Commercial Tires
    const createDanfoWheel = (wx: number, wz: number) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(wx, 0.4, wz);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.28, 28), tireMat);
      tire.rotation.z = Math.PI / 2;
      const chromeRing = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.29, 24), chromeMat);
      chromeRing.rotation.z = Math.PI / 2;
      const innerDish = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.295, 20), rimMat);
      innerDish.rotation.z = Math.PI / 2;
      const centerCap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.31, 16), darkMat);
      centerCap.rotation.z = Math.PI / 2;
      wGroup.add(tire, chromeRing, innerDish, centerCap);
      danfoGroup.add(wGroup);
      return wGroup;
    };

    const lfWheel = createDanfoWheel(1.13, 1.6);
    const rfWheel = createDanfoWheel(-1.13, 1.6);
    const rearWheels = [
      createDanfoWheel(1.13, -1.6),
      createDanfoWheel(-1.13, -1.6),
    ];

    danfoGroup.visible = true;

    return {
      busRoot,
      busBody,
      steeringWheel,
      speedNeedle,
      tachNeedle,
      fuelNeedle,
      accelNeedle,
      dashLeftBlinker,
      dashRightBlinker,
      slidingDoor,
      bootDoor,
      bootLuggage,
      conductor,
      lfWheel,
      rfWheel,
      rearWheels,
      lBlinker,
      rBlinker,
      lBrake,
      rBrake,
      wipers: wipersGroup,
      rosary,
      bullBar,
      speakers: roofSpeakers,
      underglow,
    } as any;
  }

  /**
   * Builds roadside Junction Bus Stops with shelters, signboards, and 3D waiting passengers on BOTH left and right sides!
   */
  public syncJunctionShelters(junctions: JunctionStop[]) {
    if (this.junctionMeshes.length > 0) return;

    const charLoader = new GLTFLoader();
    const characterGlbs = [
      '/models/free_download_athletic_african_man_walking_223.glb',
      '/models/free_download_attractive_african_woman_236.glb',
      '/models/african_female_model.glb'
    ];

    junctions.forEach((junc, jIdx) => {
      const group = new THREE.Group();
      group.position.set(0, 0, junc.distanceMarkerMeters);

      // Support bus stops on BOTH sides: Left side, Right side, or Dual (Both)
      const effectiveSide = junc.side || (jIdx % 2 === 0 ? 'RIGHT' : 'LEFT');
      const sidesToBuild: Array<'LEFT' | 'RIGHT'> = 
        effectiveSide === 'BOTH' ? ['LEFT', 'RIGHT'] : [effectiveSide];

      const passengers: THREE.Group[] = [];

      sidesToBuild.forEach((side) => {
        const isLeft = side === 'LEFT';
        const sideMult = isLeft ? -1 : 1;
        const shoulderX = 10.5 * sideMult;
        const benchX = 12 * sideMult;
        const signX = 8.2 * sideMult;
        const stopBoxX = 5.8 * sideMult;

        // Bus Stop Shelter Roof
        const shelterRoof = new THREE.Mesh(
          new THREE.BoxGeometry(7, 0.25, 10),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 })
        );
        shelterRoof.position.set(shoulderX, 3.8, 0);
        shelterRoof.rotation.z = isLeft ? 0.05 : -0.05;
        group.add(shelterRoof);

        [-4, 4].forEach((sz) => {
          const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, 3.8),
            new THREE.MeshStandardMaterial({ color: 0x57534e })
          );
          pillar.position.set(shoulderX, 1.9, sz);
          group.add(pillar);
        });

        const bench = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.5, 6),
          new THREE.MeshStandardMaterial({ color: 0x78350f })
        );
        bench.position.set(benchX, 0.45, 0);
        group.add(bench);

        // Bus Stop Signboard facing incoming traffic
        const signTex = createBusStopSignTexture(junc.name, junc.destinationTag);
        const signMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 2.2, 4.4),
          new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 })
        );
        signMesh.position.set(signX, 3.2, 5.2);
        if (isLeft) {
          signMesh.rotation.y = Math.PI;
        }
        group.add(signMesh);

        // Yellow striped road curb stop-box on road edge
        const stopBox = new THREE.Mesh(
          new THREE.PlaneGeometry(3.5, 12),
          new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.35 })
        );
        stopBox.rotation.x = -Math.PI / 2;
        stopBox.position.set(stopBoxX, 0.02, 0);
        group.add(stopBox);

        // High-Graphic 3D Waiting Commuters on Sidewalk
        const commuterCount = Math.min(3, Math.max(1, Math.round(junc.waitingPassengersCount / sidesToBuild.length)));
        for (let p = 0; p < commuterCount; p++) {
          const pGroup = new THREE.Group();
          (pGroup as any)._isNpc = true;

          const pX = shoulderX + sideMult * ((p % 2) * 1.5);
          const pZ = -2.5 + p * 2.2;
          pGroup.position.set(pX, 0.25, pZ);
          pGroup.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
          pGroup.userData = { origX: pX, origZ: pZ, isLeft, boarded: false };

          const charPath = characterGlbs[(p + (isLeft ? 1 : 0)) % characterGlbs.length];

          const applyCharModel = (prototype: THREE.Group) => {
            const clone = prototype.clone(true);
            pGroup.add(clone);
          };

          if (ThreeDrivingEngine.modelCache.has(charPath)) {
            applyCharModel(ThreeDrivingEngine.modelCache.get(charPath)!);
          } else {
            charLoader.load(charPath, (gltf) => {
              const humanBox = new THREE.Box3().setFromObject(gltf.scene);
              const lowestY = humanBox.min.y;
              gltf.scene.children.forEach(child => {
                child.position.y -= lowestY;
              });

              const charScene = gltf.scene;
              const bbox = new THREE.Box3().setFromObject(charScene);
              const size = bbox.getSize(new THREE.Vector3());
              const maxDim = Math.max(size.x, size.y, size.z);
              if (maxDim > 0) {
                const targetHeight = 1.75;
                const rawHeight = size.y > 0.5 ? size.y : maxDim;
                charScene.scale.setScalar(targetHeight / rawHeight);
                const postBox = new THREE.Box3().setFromObject(charScene);
                const postLowest = postBox.min.y;
                charScene.children.forEach(child => {
                  child.position.y -= postLowest;
                });
              }
              ThreeDrivingEngine.modelCache.set(charPath, charScene);
              applyCharModel(charScene);
            }, undefined, (err) => console.warn('Char cache load error:', err));
          }

          group.add(pGroup);
          passengers.push(pGroup);
        }
      });

      // 3D Delivery Waybill Floating Beacon above stop
      const waybillBeacon = new THREE.Group();
      waybillBeacon.position.set(sidesToBuild[0] === 'LEFT' ? -10.5 : 10.5, 5.8, 0);
      waybillBeacon.visible = false;

      const crateMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.9, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.35, metalness: 0.2 })
      );
      crateMesh.rotation.y = 0.4;
      waybillBeacon.add(crateMesh);

      const arrowMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 0.75, 8),
        new THREE.MeshBasicMaterial({ color: 0x4ade80 })
      );
      arrowMesh.position.y = -0.9;
      arrowMesh.rotation.x = Math.PI;
      waybillBeacon.add(arrowMesh);

      group.add(waybillBeacon);

      this.scene.add(group);
      this.junctionMeshes.push({ group, junction: junc, passengers, waybillBeacon: waybillBeacon as any } as any);
    });
  }

  /**
  /**
   * PROCEDURAL VEHICLE FACTORY FUNCTIONS FOR HYPER-REALISTIC LAGOS TRAFFIC
   * Spawns Keke Maruwa, Blue BRT Long Buses, Luxury SUVs, Executive Luxury Sedans,
   * Dispatch Courier Bikes with delivery boxes, Police Patrol cars, and Danfo Vans.
   */

  // 1. KEKE NAPEP (BAJAJ TRICYCLE)
  public createProceduralKeke(slogan: string = 'GOD DEY'): THREE.Group {
    const keke = new THREE.Group();
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.3 });
    const blackCanvasMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.1, metalness: 0.9 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x222224, roughness: 0.8 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x050810, roughness: 0.05, transparent: true, opacity: 0.65 });
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff1e1e });

    // Lower cabin body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.65, 2.3), yellowMat);
    body.position.set(0, 0.55, 0);
    keke.add(body);

    // Canvas roof canopy
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.08, 2.25), blackCanvasMat);
    roof.position.set(0, 1.62, -0.05);
    keke.add(roof);

    // Canopy frame pillars
    [-0.62, 0.62].forEach((px) => {
      [-0.95, 0.1, 0.95].forEach((pz) => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.75), chromeMat);
        pillar.position.set(px, 1.25, pz);
        keke.add(pillar);
      });
    });

    // Front Windshield
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.65), glassMat);
    ws.position.set(0, 1.28, 0.96);
    ws.rotation.x = -0.15;
    keke.add(ws);

    // Front single tire (Tricycle layout)
    const frontWheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.14, 16);
    frontWheelGeo.rotateZ(Math.PI / 2);
    const frontTire = new THREE.Mesh(frontWheelGeo, tireMat);
    frontTire.position.set(0, 0.24, 1.05);
    keke.add(frontTire);

    // Front chrome fork
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55), chromeMat);
    fork.position.set(0, 0.48, 1.02);
    keke.add(fork);

    // Dual rear tires
    [-0.58, 0.58].forEach((rx) => {
      const rearTire = new THREE.Mesh(frontWheelGeo, tireMat);
      rearTire.position.set(rx, 0.24, -0.75);
      keke.add(rearTire);
    });

    // Front single headlight
    const headlight = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 12), headlightMat);
    headlight.rotateX(Math.PI / 2);
    headlight.position.set(0, 0.72, 1.16);
    keke.add(headlight);

    // Rear taillights
    [-0.48, 0.48].forEach((lx) => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), taillightMat);
      tl.position.set(lx, 0.65, -1.16);
      keke.add(tl);
    });

    // Slogan Plate on Rear
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.02), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    plate.position.set(0, 0.45, -1.16);
    keke.add(plate);

    return keke;
  }

  // 2. BRT LONG BUS (LAGOS BLUE HIGH-CAPACITY COMMUTER BUS)
  public createProceduralBRTLongBus(): THREE.Group {
    const bus = new THREE.Group();
    const brtBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, metalness: 0.3 });
    const whiteRoofMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x081528, roughness: 0.05, transparent: true, opacity: 0.7 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1f2124, roughness: 0.8 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.15, metalness: 0.85 });
    const ledSignMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff1e1e });

    const busW = 2.6;
    const busL = 11.5;
    const busH = 2.4;
    const tireR = 0.52;

    // Lower Main Blue Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(busW, busH * 0.55, busL), brtBlueMat);
    body.position.set(0, tireR + (busH * 0.55) / 2 + 0.1, 0);
    bus.add(body);

    // White High Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(busW * 0.98, 0.25, busL * 0.98), whiteRoofMat);
    roof.position.set(0, tireR + busH + 0.15, 0);
    bus.add(roof);

    // AC Unit Pods on Roof
    [-2.2, 2.2].forEach((pz) => {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 1.6), whiteRoofMat);
      ac.position.set(0, tireR + busH + 0.34, pz);
      bus.add(ac);
    });

    // Panoramic Side Windows (Full length)
    [-busW / 2 - 0.01, busW / 2 + 0.01].forEach((px) => {
      const windowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, busL * 0.92), glassMat);
      windowStrip.position.set(px, tireR + busH * 0.65, 0);
      bus.add(windowStrip);
    });

    // Massive Front Windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(busW * 0.94, 1.25, 0.06), glassMat);
    windshield.position.set(0, tireR + busH * 0.58, busL / 2 + 0.02);
    windshield.rotation.x = -0.14;
    bus.add(windshield);

    // Front Illuminated LED Route Sign ("BRT EXPRESS")
    const ledSign = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 0.06), ledSignMat);
    ledSign.position.set(0, tireR + busH + 0.02, busL / 2 + 0.01);
    bus.add(ledSign);

    // 6 Large Wheels (2 front, 4 dual-rear axle)
    const wheelGeo = new THREE.CylinderGeometry(tireR, tireR, 0.32, 18);
    wheelGeo.rotateZ(Math.PI / 2);
    const hubGeo = new THREE.CylinderGeometry(tireR * 0.45, tireR * 0.45, 0.34, 12);
    hubGeo.rotateZ(Math.PI / 2);

    const wheelZs = [
      busL / 2 - 1.8,   // Front axle
      -busL / 2 + 3.2,  // Rear axle 1
      -busL / 2 + 1.8,  // Rear axle 2
    ];

    wheelZs.forEach((wz) => {
      [-busW / 2 - 0.02, busW / 2 + 0.02].forEach((wx) => {
        const wheel = new THREE.Mesh(wheelGeo, tireMat);
        wheel.position.set(wx, tireR, wz);
        const hub = new THREE.Mesh(hubGeo, chromeMat);
        wheel.add(hub);
        bus.add(wheel);
      });
    });

    // Headlights
    [-0.95, 0.95].forEach((lx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.05), headlightMat);
      hl.position.set(lx, tireR + 0.4, busL / 2 + 0.03);
      bus.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.35, 0.05), taillightMat);
      tl.position.set(lx, tireR + 0.65, -busL / 2 - 0.03);
      bus.add(tl);
    });

    return bus;
  }

  // 3. LUXURY SUV (PRADO / G-WAGON / LAND CRUISER)
  public createProceduralLuxurySUV(colorHex: number = 0x09090b): THREE.Group {
    const suv = new THREE.Group();
    const paintMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.12, metalness: 0.75 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.05, transparent: true, opacity: 0.8 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.1, metalness: 0.95 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1f2124, roughness: 0.85 });
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff1e1e });

    const suvW = 2.15;
    const suvL = 4.9;
    const tireR = 0.42;

    // High Clearance Chunky Lower Body
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(suvW, 0.72, suvL), paintMat);
    lowerBody.position.set(0, tireR + 0.45, 0);
    suv.add(lowerBody);

    // High Cabin & Squared Off Roof
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(suvW * 0.88, 0.78, suvL * 0.62), paintMat);
    cabin.position.set(0, tireR + 1.15, -0.35);
    suv.add(cabin);

    // Chrome Grille & Bull Accent
    const grille = new THREE.Mesh(new THREE.BoxGeometry(suvW * 0.75, 0.38, 0.12), chromeMat);
    grille.position.set(0, tireR + 0.52, suvL / 2 + 0.02);
    suv.add(grille);

    // Roof Rails
    [-suvW * 0.42, suvW * 0.42].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, suvL * 0.55), chromeMat);
      rail.rotateX(Math.PI / 2);
      rail.position.set(rx, tireR + 1.58, -0.35);
      suv.add(rail);
    });

    // Dark Tint Windows
    const ws = new THREE.Mesh(new THREE.BoxGeometry(suvW * 0.84, 0.68, 0.05), glassMat);
    ws.position.set(0, tireR + 1.15, 1.12);
    ws.rotation.x = -0.28;
    suv.add(ws);

    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(suvW * 0.82, 0.6, 0.05), glassMat);
    rearGlass.position.set(0, tireR + 1.15, -1.82);
    rearGlass.rotation.x = 0.12;
    suv.add(rearGlass);

    // Spare tire cover on rear trunk (iconic Prado/G-Wagon)
    const spare = new THREE.Mesh(new THREE.CylinderGeometry(tireR * 0.85, tireR * 0.85, 0.22, 16), paintMat);
    spare.rotateX(Math.PI / 2);
    spare.position.set(0, tireR + 0.65, -suvL / 2 - 0.1);
    suv.add(spare);

    // 4 Chunky Wheels
    const wheelGeo = new THREE.CylinderGeometry(tireR, tireR, 0.28, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const hubGeo = new THREE.CylinderGeometry(tireR * 0.5, tireR * 0.5, 0.3, 12);
    hubGeo.rotateZ(Math.PI / 2);

    [
      [-suvW / 2 - 0.02, 1.45],
      [suvW / 2 + 0.02, 1.45],
      [-suvW / 2 - 0.02, -1.45],
      [suvW / 2 + 0.02, -1.45],
    ].forEach(([wx, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      wheel.position.set(wx, tireR, wz);
      const hub = new THREE.Mesh(hubGeo, chromeMat);
      wheel.add(hub);
      suv.add(wheel);
    });

    // Modern LED Headlights & Taillights
    [-0.75, 0.75].forEach((lx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.06), headlightMat);
      hl.position.set(lx, tireR + 0.58, suvL / 2 + 0.03);
      suv.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 0.06), taillightMat);
      tl.position.set(lx, tireR + 0.68, -suvL / 2 - 0.02);
      suv.add(tl);
    });

    return suv;
  }

  // 4. EXECUTIVE LUXURY SEDAN / COUPE (MERCEDES / LEXUS / KIA FORTE)
  public createProceduralLuxuryCar(colorHex: number = 0x1e3a8a): THREE.Group {
    const car = new THREE.Group();
    const paintMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.1, metalness: 0.85 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x050812, roughness: 0.05, transparent: true, opacity: 0.75 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.1, metalness: 0.95 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1f2124, roughness: 0.8 });
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff1e1e });

    const carW = 1.95;
    const carL = 4.7;
    const tireR = 0.34;

    // Sleek Lower Body
    const lower = new THREE.Mesh(new THREE.BoxGeometry(carW, 0.48, carL), paintMat);
    lower.position.set(0, tireR + 0.28, 0);
    car.add(lower);

    // Aerodynamic Sloped Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(carW * 0.82, 0.52, carL * 0.52), paintMat);
    cabin.position.set(0, tireR + 0.72, -0.2);
    car.add(cabin);

    // Front Windshield
    const ws = new THREE.Mesh(new THREE.BoxGeometry(carW * 0.78, 0.52, 0.04), glassMat);
    ws.position.set(0, tireR + 0.68, 0.95);
    ws.rotation.x = -0.42;
    car.add(ws);

    // Rear Windshield
    const rw = new THREE.Mesh(new THREE.BoxGeometry(carW * 0.78, 0.48, 0.04), glassMat);
    rw.position.set(0, tireR + 0.68, -1.38);
    rw.rotation.x = 0.38;
    car.add(rw);

    // 4 Sports Alloy Wheels
    const wheelGeo = new THREE.CylinderGeometry(tireR, tireR, 0.24, 18);
    wheelGeo.rotateZ(Math.PI / 2);
    const hubGeo = new THREE.CylinderGeometry(tireR * 0.55, tireR * 0.55, 0.26, 14);
    hubGeo.rotateZ(Math.PI / 2);

    [
      [-carW / 2 - 0.01, 1.4],
      [carW / 2 + 0.01, 1.4],
      [-carW / 2 - 0.01, -1.4],
      [carW / 2 + 0.01, -1.4],
    ].forEach(([wx, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      wheel.position.set(wx, tireR, wz);
      const hub = new THREE.Mesh(hubGeo, chromeMat);
      wheel.add(hub);
      car.add(wheel);
    });

    // Headlights & Tail Light Bar
    [-0.72, 0.72].forEach((lx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.05), headlightMat);
      hl.position.set(lx, tireR + 0.38, carL / 2 + 0.02);
      car.add(hl);
    });

    // Sleek continuous LED taillight bar
    const tailBar = new THREE.Mesh(new THREE.BoxGeometry(carW * 0.88, 0.08, 0.05), taillightMat);
    tailBar.position.set(0, tireR + 0.42, -carL / 2 - 0.02);
    car.add(tailBar);

    // Dual chrome exhaust tips
    [-0.55, 0.55].forEach((ex) => {
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 10), chromeMat);
      exhaust.rotateX(Math.PI / 2);
      exhaust.position.set(ex, tireR + 0.12, -carL / 2 - 0.06);
      car.add(exhaust);
    });

    return car;
  }

  // 5. DISPATCH BIKE (OKADA / COURIER RIDER WITH DELIVERY BOX)
  public createProceduralDispatchBike(boxColor: number = 0xea580c, brand: string = 'CHOWDECK'): THREE.Group {
    const bike = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.1, metalness: 0.95 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
    const boxMat = new THREE.MeshStandardMaterial({ color: boxColor, roughness: 0.25 });
    const riderPantsMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const riderVestMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4 }); // High-vis vest
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2 });
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff1e1e });

    const wheelR = 0.32;

    // Bike Frame spine
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 1.4), frameMat);
    frame.position.set(0, wheelR + 0.22, 0);
    bike.add(frame);

    // Engine block & exhaust pipe
    const engine = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.45), chromeMat);
    engine.position.set(0, wheelR + 0.12, 0.05);
    bike.add(engine);

    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.95), chromeMat);
    exhaust.rotateX(Math.PI / 2);
    exhaust.position.set(0.2, wheelR + 0.08, -0.35);
    bike.add(exhaust);

    // Two Spoked Wheels (Front & Rear)
    const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.1, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    const frontTire = new THREE.Mesh(wheelGeo, tireMat);
    frontTire.position.set(0, wheelR, 0.92);
    bike.add(frontTire);

    const rearTire = new THREE.Mesh(wheelGeo, tireMat);
    rearTire.position.set(0, wheelR, -0.78);
    bike.add(rearTire);

    // Handlebars
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.75), chromeMat);
    bar.rotateZ(Math.PI / 2);
    bar.position.set(0, wheelR + 0.65, 0.65);
    bike.add(bar);

    // Front Headlight
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12), headlightMat);
    hl.rotateX(Math.PI / 2);
    hl.position.set(0, wheelR + 0.58, 0.95);
    bike.add(hl);

    // Courier Rider (Human 3D figure seated on bike)
    // Torso with high-vis vest
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.26), riderVestMat);
    torso.position.set(0, wheelR + 0.78, 0.05);
    torso.rotation.x = 0.15; // Leaning forward slightly
    bike.add(torso);

    // Helmet & Head
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), helmetMat);
    helmet.position.set(0, wheelR + 1.15, 0.12);
    bike.add(helmet);

    // Large Insulated Delivery Courier Box on Rear Luggage Rack
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.62, 0.62), boxMat);
    box.position.set(0, wheelR + 0.75, -0.65);
    bike.add(box);

    // Tail light under box
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), taillightMat);
    tl.position.set(0, wheelR + 0.42, -0.92);
    bike.add(tl);

    return bike;
  }

  // 6. POLICE PATROL CAR (LAGOS RAPID RESPONSE SQUAD - RRS)
  public createProceduralPoliceCar(): THREE.Group {
    const police = new THREE.Group();
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.5 });
    const blueStripeMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x050812, roughness: 0.05, transparent: true, opacity: 0.7 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.1, metalness: 0.95 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1f2124, roughness: 0.8 });
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff1e1e });

    const carW = 1.95;
    const carL = 4.6;
    const tireR = 0.35;

    // Body & Cabin
    const body = new THREE.Mesh(new THREE.BoxGeometry(carW, 0.52, carL), whiteMat);
    body.position.set(0, tireR + 0.3, 0);
    police.add(body);

    // Police Blue Side Stripes
    [-carW / 2 - 0.01, carW / 2 + 0.01].forEach((sx) => {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, carL * 0.92), blueStripeMat);
      stripe.position.set(sx, tireR + 0.32, 0);
      police.add(stripe);
    });

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(carW * 0.82, 0.54, carL * 0.52), whiteMat);
    cabin.position.set(0, tireR + 0.75, -0.15);
    police.add(cabin);

    // Windshields
    const ws = new THREE.Mesh(new THREE.BoxGeometry(carW * 0.78, 0.52, 0.04), glassMat);
    ws.position.set(0, tireR + 0.72, 0.92);
    ws.rotation.x = -0.35;
    police.add(ws);

    // ROOF EMERGENCY STROBE LIGHTBAR (Flashing Red & Blue)
    const lightbarBase = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.22), chromeMat);
    lightbarBase.position.set(0, tireR + 1.05, -0.15);
    police.add(lightbarBase);

    const blueStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.18), new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
    blueStrobe.position.set(-0.24, tireR + 1.12, -0.15);
    police.add(blueStrobe);

    const redStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.18), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    redStrobe.position.set(0.24, tireR + 1.12, -0.15);
    police.add(redStrobe);

    // 4 Wheels
    const wheelGeo = new THREE.CylinderGeometry(tireR, tireR, 0.24, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    [
      [-carW / 2 - 0.01, 1.35],
      [carW / 2 + 0.01, 1.35],
      [-carW / 2 - 0.01, -1.35],
      [carW / 2 + 0.01, -1.35],
    ].forEach(([wx, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      wheel.position.set(wx, tireR, wz);
      police.add(wheel);
    });

    // Lights
    [-0.7, 0.7].forEach((lx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.05), headlightMat);
      hl.position.set(lx, tireR + 0.38, carL / 2 + 0.02);
      police.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.05), taillightMat);
      tl.position.set(lx, tireR + 0.4, -carL / 2 - 0.02);
      police.add(tl);
    });

    return police;
  }

  // 7. CIVILIAN COMMUTER SEDAN
  public createProceduralSedan(colorHex: number = 0x2563eb): THREE.Group {
    return this.createProceduralLuxuryCar(colorHex);
  }

  // 8. PROCEDURAL DANFO BUS (RIVAL TRANSPORTER)
  public createProceduralDanfo(colorHex: number = 0xfacc15, slogan: string = 'No King as God'): THREE.Group {
    const bus = new THREE.Group();
    const yellowMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.2, metalness: 0.25 });
    const blackStripeMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.35 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0c192c, roughness: 0.05, transparent: true, opacity: 0.62 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x141417, roughness: 0.85 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.12, metalness: 0.9 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.6 });
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff1e1e });

    const tireR = 0.36;
    const bodyW = 2.18;
    const bodyL = 4.9;
    const bodyH = 1.08;
    const cabinH = 0.86;

    // Lower van body & bumpers
    const lower = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyL), yellowMat);
    lower.position.set(0, tireR + bodyH / 2 + 0.04, 0);
    bus.add(lower);

    const fBumper = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.08, 0.2, 0.22), darkMat);
    fBumper.position.set(0, tireR + 0.14, bodyL / 2 + 0.06);
    const rBumper = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.08, 0.2, 0.22), darkMat);
    rBumper.position.set(0, tireR + 0.14, -bodyL / 2 - 0.06);
    bus.add(fBumper, rBumper);

    // Front radiator grille
    const grille = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.76, 0.34, 0.06), darkMat);
    grille.position.set(0, tireR + 0.52, bodyL / 2 + 0.02);
    bus.add(grille);

    // Iconic twin matte-black Danfo stripes
    [-0.12, 0.14].forEach((sy) => {
      const stripeWrap = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.04, 0.11, bodyL + 0.02), blackStripeMat);
      stripeWrap.position.set(0, tireR + bodyH / 2 + sy, 0);
      bus.add(stripeWrap);
    });

    // Upper high roof cabin & side windows
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.96, cabinH, bodyL * 0.94), yellowMat);
    cabin.position.set(0, tireR + bodyH + cabinH / 2, -0.04);
    bus.add(cabin);

    const sideWin = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.98, 0.62, bodyL * 0.82), glassMat);
    sideWin.position.set(0, tireR + bodyH + 0.42, -0.05);
    bus.add(sideWin);

    // Front windshield
    const ws = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.9, 0.72, 0.06), glassMat);
    ws.position.set(0, tireR + bodyH + 0.38, bodyL * 0.47);
    ws.rotation.x = -0.22;
    bus.add(ws);

    // Roof Slogan Lightbox & Luggage Rack
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.26), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    sign.position.set(0, tireR + bodyH + cabinH + 0.1, 1.55);
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.12, 2.8), chromeMat);
    rack.position.set(0, tireR + bodyH + cabinH + 0.08, -0.25);
    bus.add(sign, rack);

    // 4 Chrome-Hubbed Wheels
    const wheelGeo = new THREE.CylinderGeometry(tireR, tireR, 0.24, 20);
    wheelGeo.rotateZ(Math.PI / 2);
    const hubGeo = new THREE.CylinderGeometry(tireR * 0.56, tireR * 0.56, 0.26, 16);
    hubGeo.rotateZ(Math.PI / 2);
    [
      [-bodyW / 2 - 0.02, 1.45],
      [bodyW / 2 + 0.02, 1.45],
      [-bodyW / 2 - 0.02, -1.45],
      [bodyW / 2 + 0.02, -1.45],
    ].forEach(([wx, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      wheel.position.set(wx, tireR, wz);
      const hub = new THREE.Mesh(hubGeo, chromeMat);
      wheel.add(hub);
      bus.add(wheel);
    });

    // Round Headlights & Rear Taillights
    [-0.76, 0.76].forEach((lx) => {
      const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 16), headlightMat);
      hl.rotation.x = Math.PI / 2;
      hl.position.set(lx, tireR + 0.52, bodyL / 2 + 0.03);
      bus.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.05), taillightMat);
      tl.position.set(lx, tireR + 0.5, -bodyL / 2 - 0.02);
      bus.add(tl);
    });

    return bus;
  }

  /**
   * SETUP DIVERSE LAGOS HIGHWAY TRAFFIC FLEET (24 WELL-SPACED VEHICLES)
   * Every vehicle has accurate physical half-width (halfW) and half-length (halfL)
   * so NPCs never collide or phase through each other or the player!
   */
  private getVehicleDimensions(type: string): { halfW: number; halfL: number } {
    switch (type) {
      case 'BRT':
        return { halfW: 1.35, halfL: 5.85 };
      case 'DANFO':
        return { halfW: 1.15, halfL: 2.55 };
      case 'SUV':
        return { halfW: 1.12, halfL: 2.5 };
      case 'LUXURY_CAR':
      case 'POLICE':
        return { halfW: 1.0, halfL: 2.4 };
      case 'KEKE':
        return { halfW: 0.72, halfL: 1.25 };
      case 'DISPATCH_BIKE':
        return { halfW: 0.42, halfL: 1.05 };
      default:
        return { halfW: 1.05, halfL: 2.45 };
    }
  }

  private setupTrafficAndHazards() {
    this.trafficMeshes = [];

    // Well-spaced across the 4 lanes (-5.8, -2.0, 2.0, 5.8) starting at z >= 65 (past the Motor Park exit)
    const trafficFleetConfig = [
      // Lane -5.8 (Right Outer Commuter Lane: ~10.5 - 11.5 m/s)
      { type: 'KEKE', lane: -5.8, z: 65, speed: 10.5, name: 'Maruwa Boy', slogan: 'GOD DEY' },
      { type: 'DANFO', lane: -5.8, z: 135, speed: 11.2, name: 'Jagaban Express', slogan: 'No King as God' },
      { type: 'BRT', lane: -5.8, z: 215, speed: 11.0, name: 'BRT Ketu Express' },
      { type: 'KEKE', lane: -5.8, z: 295, speed: 10.8, name: 'Obalende Trike', slogan: 'NO CONDITION PERMANENT' },
      { type: 'SUV', lane: -5.8, z: 375, speed: 11.5, color: 0xd4af37, name: 'Champagne Prado TX' },
      { type: 'POLICE', lane: -5.8, z: 455, speed: 11.4, name: 'Alausa Task Force' },

      // Lane -2.0 (Right Fast Inner Lane: ~14.5 - 15.8 m/s)
      { type: 'LUXURY_CAR', lane: -2.0, z: 80, speed: 14.8, color: 0x1e3a8a, name: 'Royal Blue Benz C300' },
      { type: 'DISPATCH_BIKE', lane: -2.0, z: 150, speed: 15.2, boxColor: 0x16a34a, brand: 'GOKADA' },
      { type: 'SUV', lane: -2.0, z: 225, speed: 15.0, color: 0x334155, name: 'Gunmetal Land Cruiser' },
      { type: 'DANFO', lane: -2.0, z: 305, speed: 14.5, name: 'Lekki Hustler', slogan: 'Eko Oni Baje' },
      { type: 'POLICE', lane: -2.0, z: 385, speed: 15.4, name: 'RRS Rapid Response' },
      { type: 'LUXURY_CAR', lane: -2.0, z: 465, speed: 15.5, color: 0x0f172a, name: 'Midnight Executive Benz' },

      // Lane 2.0 (Left Fast Inner Lane: ~15.0 - 16.5 m/s)
      { type: 'SUV', lane: 2.0, z: 70, speed: 15.5, color: 0x09090b, name: 'Black Prado V8' },
      { type: 'DANFO', lane: 2.0, z: 145, speed: 15.0, name: 'Alhaji Agbaje', slogan: 'Face Your Front' },
      { type: 'LUXURY_CAR', lane: 2.0, z: 220, speed: 16.0, color: 0xd4af37, name: 'Champagne Gold Lexus ES' },
      { type: 'BRT', lane: 2.0, z: 300, speed: 14.8, name: 'BRT CMS Terminal' },
      { type: 'DISPATCH_BIKE', lane: 2.0, z: 380, speed: 15.8, boxColor: 0xea580c, brand: 'CHOWDECK' },
      { type: 'LUXURY_CAR', lane: 2.0, z: 460, speed: 16.2, color: 0x064e3b, name: 'Emerald Benz E-Class' },

      // Lane 5.8 (Left Outer Commuter Lane: ~11.5 - 12.8 m/s)
      { type: 'KEKE', lane: 5.8, z: 90, speed: 11.5, name: 'Oshodi Keke', slogan: 'NO TELESCOPE' },
      { type: 'BRT', lane: 5.8, z: 170, speed: 11.8, name: 'BRT TBS Line 1' },
      { type: 'DANFO', lane: 5.8, z: 255, speed: 12.2, name: 'Rasaki Turbo', slogan: 'Destiny Child' },
      { type: 'SUV', lane: 5.8, z: 335, speed: 12.5, color: 0xf8fafc, name: 'Pearl White G-Wagon' },
      { type: 'DISPATCH_BIKE', lane: 5.8, z: 410, speed: 12.4, boxColor: 0xdc2626, brand: 'MAX.NG' },
      { type: 'POLICE', lane: 5.8, z: 490, speed: 12.6, name: 'Highway Patrol 04' },
    ];

    trafficFleetConfig.forEach((veh) => {
      const dims = this.getVehicleDimensions(veh.type);
      const trafficGroup = new THREE.Group();
      trafficGroup.userData = {
        type: veh.type,
        driverName: veh.name || veh.type,
        slogan: veh.slogan || '',
        targetLaneX: veh.lane,
        baseRotY: 0,
        currentSpeed: veh.speed,
        baseSpeed: veh.speed,
        halfW: dims.halfW,
        halfL: dims.halfL,
        laneChangeCooldown: Math.random() * 2.5 + 1.5,
      };

      trafficGroup.position.set(veh.lane, 0, veh.z);
      this.scene.add(trafficGroup);
      this.trafficMeshes.push(trafficGroup);

      // Build model based on vehicle type
      let modelMesh: THREE.Group;
      if (veh.type === 'KEKE') {
        modelMesh = this.createProceduralKeke(veh.slogan);
      } else if (veh.type === 'BRT') {
        modelMesh = this.createProceduralBRTLongBus();
      } else if (veh.type === 'SUV') {
        modelMesh = this.createProceduralLuxurySUV((veh as any).color || 0x09090b);
      } else if (veh.type === 'LUXURY_CAR') {
        modelMesh = this.createProceduralLuxuryCar((veh as any).color || 0x1e3a8a);
      } else if (veh.type === 'DISPATCH_BIKE') {
        modelMesh = this.createProceduralDispatchBike((veh as any).boxColor || 0xea580c, (veh as any).brand || 'CHOWDECK');
      } else if (veh.type === 'POLICE') {
        modelMesh = this.createProceduralPoliceCar();
      } else {
        modelMesh = this.createProceduralDanfo(0xfacc15, veh.slogan);
      }

      trafficGroup.add(modelMesh);
    });
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

    // ========================================================
    // 2. CANNON-ES RAYCAST VEHICLE DRIVING CONTROLS & PHYSICS
    // ========================================================
    const maxSteerRad = 0.52; // ~30 deg responsive max wheel lock
    // steeringWheelAngleDeg: -90 (left) to +90 (right)
    const steerNorm = Math.max(-1.0, Math.min(1.0, (steeringWheelAngleDeg || 0) / 90));

    // In Cannon RaycastVehicle with axleLocal=(1,0,0) and forward=+Z:
    // Negative steer rotates wheels right (+X), positive rotates left (-X).
    const vehicleSteer = -steerNorm * maxSteerRad;
    this.vehicle.setSteeringValue(vehicleSteer, 0);
    this.vehicle.setSteeringValue(vehicleSteer, 1);

    if (isEngineRunning && !isSteppedDown) {
      if (gear === 'D' || gear === 'L') {
        const topSpeedMps = gear === 'L' ? 16 : 28; // ~58 km/h or ~100 km/h
        const forceMult = gear === 'L' ? 1.4 : 1.0;
        const driveForce = throttle > 0 ? (-4200 * throttle * forceMult) : 0;
        for (let i = 0; i < 4; i++) {
          this.vehicle.applyEngineForce(driveForce, i);
        }
        // Direct snappy arcade throttle assist to guarantee instant acceleration response
        if (throttle > 0) {
          const currentFwdSpeed = this.chassisBody.velocity.z;
          if (currentFwdSpeed < topSpeedMps) {
            this.chassisBody.velocity.z = Math.min(topSpeedMps, currentFwdSpeed + 18 * dt * throttle * forceMult);
          }
        }
      } else if (gear === 'R') {
        const revForce = throttle > 0 ? (3500 * throttle) : 0;
        for (let i = 0; i < 4; i++) {
          this.vehicle.applyEngineForce(revForce, i);
        }
        if (throttle > 0) {
          const currentRevSpeed = this.chassisBody.velocity.z;
          if (currentRevSpeed > -9) {
            this.chassisBody.velocity.z = Math.max(-9, currentRevSpeed - 14 * dt * throttle);
          }
        }
      } else {
        for (let i = 0; i < 4; i++) {
          this.vehicle.applyEngineForce(0, i);
        }
      }
    } else {
      for (let i = 0; i < 4; i++) {
        this.vehicle.applyEngineForce(0, i);
      }
    }

    // Responsive braking & deceleration physics
    if (isBraking || gear === 'P' || !isEngineRunning) {
      const brakeForce = isBraking ? 200 : (gear === 'P' ? 450 : 60);
      for (let i = 0; i < 4; i++) {
        this.vehicle.setBrake(brakeForce, i);
      }
      this.chassisBody.velocity.z *= Math.pow(0.06, dt);
      this.chassisBody.velocity.x *= Math.pow(0.06, dt);
    } else {
      const rollingResistance = throttle > 0 ? 0 : 5;
      for (let i = 0; i < 4; i++) {
        this.vehicle.setBrake(rollingResistance, i);
      }
      if (throttle <= 0) {
        this.chassisBody.velocity.z *= Math.pow(0.92, dt);
      }
    }

    // NATURAL ACKERMANN / BICYCLE VEHICLE TURNING KINEMATICS (Zero Lateral Sliding!)
    // At the start of the shift (z < 48m), allow driving inside and out of the Danfo Bus Park (x down to -26.5m)!
    const turnDir = gear === 'R' ? -1 : 1;
    const minRoadX = roadDistanceTraveled < 48 ? -26.5 : -8.8;
    const targetX = Math.max(minRoadX, Math.min(8.8, laneOffsetMeters));

    // Direct synchronization of physics chassis & visual 3D bus
    this.chassisBody.position.x = targetX;
    this.busRoot.position.x = targetX;
    this.chassisBody.position.z = roadDistanceTraveled;
    this.busRoot.position.z = roadDistanceTraveled;
    this.chassisBody.velocity.z = speedMps * Math.cos(this.busHeadingYaw);
    this.chassisBody.velocity.x = speedMps * Math.sin(this.busHeadingYaw);

    // Strict upright stabilization for chassis height
    if (this.chassisBody.position.y < 0.4 || isNaN(this.chassisBody.position.y)) {
      this.chassisBody.position.y = 0.85;
      this.chassisBody.velocity.y = 0;
    }
    this.busRoot.position.y = this.chassisBody.position.y;

    // Smoothly apply true integrated vehicle heading yaw (bus only turns its nose as it drives forward!)
    if (params.headingYaw !== undefined) {
      this.busHeadingYaw = THREE.MathUtils.lerp(this.busHeadingYaw, params.headingYaw, Math.min(1.0, dt * 16));
    } else if (speedMps > 0.05 && !isSteppedDown) {
      const wheelAngleRad = -steerNorm * 0.46;
      const yawRate = turnDir * (speedMps / 3.6) * Math.tan(wheelAngleRad) * 1.15;
      const selfAlign = (1 - Math.abs(steerNorm) * 0.65) * (0.85 + speedMps * 0.1);
      this.busHeadingYaw += (yawRate - this.busHeadingYaw * selfAlign) * dt;
      this.busHeadingYaw = Math.max(-0.46, Math.min(0.46, this.busHeadingYaw));
    }

    // Natural suspension banking roll proportional to actual forward speed & turn rate (zero roll when stopped!)
    const speedFactorForRoll = Math.min(1.0, speedMps / 11.0);
    const targetBodyRoll = steerNorm * speedFactorForRoll * 0.042;
    this.busRoot.rotation.order = 'YXZ';
    this.busRoot.rotation.y = this.busHeadingYaw;
    this.busRoot.rotation.z = targetBodyRoll;
    this.busRoot.rotation.x = 0;

    const uprightQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.busHeadingYaw, targetBodyRoll, 'YXZ'));
    this.chassisBody.quaternion.set(uprightQuat.x, uprightQuat.y, uprightQuat.z, uprightQuat.w);
    this.chassisBody.angularVelocity.set(0, 0, 0);

    // Update wheel transforms and front steering wheel angles (Left turns Left, Right turns Right)
    for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
      this.vehicle.updateWheelTransform(i);
    }
    this.leftFrontWheel.rotation.y = -steerNorm * 0.52;
    this.rightFrontWheel.rotation.y = -steerNorm * 0.52;

    const currentPhysSpeedMps = speedMps;
    this.wheelRotationRad += (gear === 'R' ? -1 : 1) * currentPhysSpeedMps * dt * 2.8;
    this.leftFrontWheel.rotation.x = this.wheelRotationRad;
    this.rightFrontWheel.rotation.x = this.wheelRotationRad;
    this.rearWheels.forEach((w) => {
      w.rotation.x = this.wheelRotationRad;
    });

    // 3. Cockpit 3D Steering Wheel: Fixed rotation direction & hidden in FIRST_PERSON (unless stepped down)
    const show3DCockpitWheel = params.cameraMode !== 'FIRST_PERSON' || isSteppedDown;
    this.steeringWheelMesh.visible = show3DCockpitWheel;
    this.speedNeedle.visible = show3DCockpitWheel;
    this.tachNeedle.visible = show3DCockpitWheel;
    this.fuelNeedle.visible = show3DCockpitWheel;
    this.accelNeedle.visible = show3DCockpitWheel;
    this.steeringWheelMesh.rotation.z = THREE.MathUtils.degToRad(steeringWheelAngleDeg);

    // 4. Working Dashboard Needles (All 4 Working Gauges)
    const dashSpeedRatio = Math.min(1.0, speedKmH / 140);
    this.speedNeedle.rotation.z = -Math.PI * 0.75 + dashSpeedRatio * (Math.PI * 1.5);

    const rpm = isEngineRunning ? 800 + (speedKmH / 85) * 3500 + (throttle > 0 ? 1200 : 0) : 0;
    const rpmRatio = Math.min(1.0, rpm / 5500);
    this.tachNeedle.rotation.z = -Math.PI * 0.75 + rpmRatio * (Math.PI * 1.5);

    const fuelRatio = Math.min(1.0, Math.max(0, fuelPercent / 100));
    this.fuelNeedle.rotation.z = -Math.PI * 0.75 + fuelRatio * (Math.PI * 1.4);

    const accelRatio = isEngineRunning ? (throttle > 0 ? Math.min(1.0, 0.25 + throttle * 0.75) : 0.04) : 0;
    this.accelNeedle.rotation.z = -Math.PI * 0.75 + accelRatio * (Math.PI * 1.4);

    // Road Bump & Suspension Spring Bounce Physics
    const bumpInterval = 140; // bump every 140 meters along highway
    const distMod = (roadDistanceTraveled + 30) % bumpInterval;
    const isCrossingBump = distMod < 2.8 && speedKmH > 6;

    if (isCrossingBump && this.bumpCooldown <= 0) {
      this.bumpCooldown = 0.9;
      this.bumpImpulse = Math.min(1.0, speedKmH / 38);
      this.bumpTimer = 0;
      if (speedKmH > 22) {
        soundEngine.playPotholeThud();
      }
    }

    if (this.bumpCooldown > 0) {
      this.bumpCooldown -= dt;
    }

    if (this.bumpImpulse > 0.01) {
      this.bumpTimer += dt * 14;
      const decay = Math.exp(-this.bumpTimer * 0.45);
      const bounceY = Math.abs(Math.sin(this.bumpTimer)) * this.bumpImpulse * 0.22 * decay;
      const pitchWobble = Math.sin(this.bumpTimer * 1.2) * this.bumpImpulse * 0.07 * decay;
      const rollWobble = Math.cos(this.bumpTimer * 0.9) * this.bumpImpulse * 0.035 * decay;

      this.busBody.position.y = -0.85 + bounceY;
      this.busBody.rotation.x = pitchWobble;
      this.busBody.rotation.z = rollWobble;

      this.bumpImpulse *= Math.pow(0.12, dt);
    } else {
      this.busBody.position.y = -0.85;
      this.busBody.rotation.x = 0;
      this.busBody.rotation.z = 0;
    }

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
      if (this.conductorMesh.children.length >= 5) { this.conductorMesh.children[4].rotation.z = slapSwing; }
    } else {
      this.conductorMesh.visible = false;
    }

    // 8. Dangling Rosary Physics Swing
    const targetRosary = -steerNorm * 0.45 + (isBraking ? 0.35 : 0);
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
    // 11. STRICT CAMERA MODES & ON-FOOT WALK MODE LOGIC
    // ========================================================
    const activeWalk3P = params.walkThirdPerson !== false;
    const modeKey = isSteppedDown ? (activeWalk3P ? 'WALK_3P' : 'WALK_1P') : params.cameraMode;
    const modeJustChanged = modeKey !== this.lastCameraModeKey;
    this.lastCameraModeKey = modeKey;

    if (isSteppedDown) {
      this.camera.up.set(0, 1, 0);
      const busX = this.busRoot.position.x;
      const busZ = this.busRoot.position.z;

      if (!this.wasSteppedDown) {
        // Spawn 3.6m to the side and 1.8m in front of the Danfo bus, looking directly at the Danfo bus!
        const sideSign = busX > 3.5 ? -1 : 1;
        this.driverWalkPos.set(busX + sideSign * 3.6, 0, busZ + 1.8);
        this.walkBaseYaw = Math.atan2(
          this.driverWalkPos.x - busX,
          this.driverWalkPos.z - busZ
        );
        this.driverFacingYaw = this.walkBaseYaw + Math.PI;
      }
      this.wasSteppedDown = true;

      const yaw = this.walkBaseYaw + (params.cameraLookYaw || 0);
      const pitch = Math.max(-0.55, Math.min(0.55, params.cameraLookPitch || 0));

      const joyX = params.walkMoveX || 0;
      const joyZ = params.walkMoveZ || 0;
      const joyMag = Math.hypot(joyX, joyZ);

      if (joyMag > 0.04) {
        const walkSpeed = 5.2;
        const fwdX = -Math.sin(yaw);
        const fwdZ = -Math.cos(yaw);
        const rightX = Math.cos(yaw);
        const rightZ = -Math.sin(yaw);

        const moveX = (fwdX * (-joyZ) + rightX * joyX) * walkSpeed * dt;
        const moveZ = (fwdZ * (-joyZ) + rightZ * joyX) * walkSpeed * dt;

        this.driverWalkPos.x += moveX;
        this.driverWalkPos.z += moveZ;

        // Rotate 3D Driver Character to face walking direction
        this.driverFacingYaw = Math.atan2(moveX, moveZ);

        // Solid collision with the parked Danfo bus so the player walks around the bus instead of inside it
        const dxBus = this.driverWalkPos.x - busX;
        const dzBus = this.driverWalkPos.z - busZ;
        const minBusX = 1.68;
        const minBusZ = 3.25;
        if (Math.abs(dxBus) < minBusX && Math.abs(dzBus) < minBusZ) {
          const overlapX = minBusX - Math.abs(dxBus);
          const overlapZ = minBusZ - Math.abs(dzBus);
          if (overlapX < overlapZ) {
            this.driverWalkPos.x = busX + (dxBus >= 0 ? minBusX : -minBusX);
          } else {
            this.driverWalkPos.z = busZ + (dzBus >= 0 ? minBusZ : -minBusZ);
          }
        }

        this.driverWalkPos.x = Math.max(-26, Math.min(16, this.driverWalkPos.x));
        this.driverWalkPos.z = Math.max(busZ - 35, Math.min(busZ + 35, this.driverWalkPos.z));

        // Animate 3D Driver Character walking stride
        this.driverWalkAnimTimer += dt * 11 * Math.min(1.0, joyMag);
      } else {
        this.driverWalkAnimTimer = 0;
      }

      // Update 3D Driver Character position & limb swing
      if (this.driverCharacterGroup) {
        this.driverCharacterGroup.visible = activeWalk3P;
        this.driverCharacterGroup.position.set(this.driverWalkPos.x, 0, this.driverWalkPos.z);
        this.driverCharacterGroup.rotation.y = this.driverFacingYaw;
        const limbs = this.driverCharacterGroup.userData;
        const swing = joyMag > 0.04 ? Math.sin(this.driverWalkAnimTimer) * 0.55 : 0;
        if (limbs?.leftLeg) limbs.leftLeg.rotation.x = swing;
        if (limbs?.rightLeg) limbs.rightLeg.rotation.x = -swing;
        if (limbs?.leftArm) limbs.leftArm.rotation.x = -swing * 0.8;
        if (limbs?.rightArm) limbs.rightArm.rotation.x = swing * 0.8;
      }

      if (activeWalk3P) {
        // 3RD-PERSON ON-FOOT VIEW: Shows both the 3D Driver Character AND the parked yellow Danfo bus!
        const followDist = 3.6;
        const followHeight = 2.15;
        const camX = this.driverWalkPos.x + Math.sin(yaw) * followDist;
        const camZ = this.driverWalkPos.z + Math.cos(yaw) * followDist;
        const camY = Math.max(0.9, followHeight + Math.sin(pitch) * 1.8);
        this.camera.position.set(camX, camY, camZ);
        this.camera.lookAt(
          new THREE.Vector3(
            this.driverWalkPos.x - Math.sin(yaw) * 2.2,
            1.35 - Math.sin(pitch) * 1.2,
            this.driverWalkPos.z - Math.cos(yaw) * 2.2
          )
        );
        this.camera.fov = 65;
        this.camera.updateProjectionMatrix();
      } else {
        // 1ST-PERSON ON-FOOT EYE VIEW
        const headBob = joyMag > 0.06 ? Math.sin(this.driverWalkAnimTimer * 1.4) * 0.035 : 0;
        this.camera.position.set(this.driverWalkPos.x, 1.68 + headBob, this.driverWalkPos.z);
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = yaw;
        this.camera.rotation.x = pitch;
        this.camera.rotation.z = 0;
        this.camera.fov = 68;
        this.camera.updateProjectionMatrix();
      }
    } else {
      this.wasSteppedDown = false;
      if (this.driverCharacterGroup) {
        this.driverCharacterGroup.visible = false;
      }

      if (params.cameraMode === 'TOP_DOWN' || (params.cameraMode as any) === 'BIRD') {
        const targetX = this.busRoot.position.x;
        const targetZ = this.busRoot.position.z;
        const camPos = new THREE.Vector3(targetX, this.busRoot.position.y + 23, targetZ - 1.8);
        if (modeJustChanged) {
          this.camera.position.copy(camPos);
        } else {
          this.camera.position.lerp(camPos, 0.25);
        }
        const lookTarget = new THREE.Vector3(targetX, this.busRoot.position.y + 0.8, targetZ + 2.0);
        this.camera.up.set(0, 0, 1);
        this.camera.lookAt(lookTarget);
        this.camera.fov = 52;
        this.camera.updateProjectionMatrix();
      } else if (params.cameraMode === 'THIRD_PERSON') {
        this.camera.up.set(0, 1, 0);
        const isReversing = gear === 'R';
        const speedRatio = Math.min(1.0, speedKmH / 95);

        const targetFov = THREE.MathUtils.lerp(64, 76, speedRatio);
        this.dynamicFov = THREE.MathUtils.lerp(this.dynamicFov, targetFov, dt * 5.0);
        this.camera.fov = this.dynamicFov;

        const accelOffsetZ = throttle > 0.1 ? throttle * 0.7 : 0;
        const brakeOffsetZ = isBraking ? 0.8 : 0;
        const followDist = isReversing ? -9.2 : (8.8 + accelOffsetZ - brakeOffsetZ);
        const baseHeightY = isReversing ? 3.55 : (3.45 - accelOffsetZ * 0.15 + (isBraking ? 0.25 : 0));

        const userYaw = params.cameraLookYaw || 0;
        const userPitch = params.cameraLookPitch || 0;
        const totalCameraAngle = this.busHeadingYaw * 0.65 - userYaw;

        const camTargetPos = new THREE.Vector3(
          this.busRoot.position.x - Math.sin(totalCameraAngle) * followDist,
          Math.max(1.4, this.busRoot.position.y + baseHeightY + userPitch * 3.0),
          this.busRoot.position.z - Math.cos(totalCameraAngle) * followDist
        );

        const lookAheadDist = isReversing ? -10.0 : (5.0 + speedRatio * 4.5);
        const lookPos = new THREE.Vector3(
          this.busRoot.position.x + Math.sin(this.busHeadingYaw) * lookAheadDist,
          this.busRoot.position.y + 1.45 - (isBraking ? 0.15 : 0),
          this.busRoot.position.z + Math.cos(this.busHeadingYaw) * lookAheadDist
        );

        if (modeJustChanged) {
          this.currentChaseCamPos.copy(camTargetPos);
          this.currentChaseLookTarget.copy(lookPos);
        } else {
          this.currentChaseCamPos.lerp(camTargetPos, Math.min(1.0, dt * 10.0));
          this.currentChaseLookTarget.lerp(lookPos, Math.min(1.0, dt * 12.0));
        }

        this.camera.position.copy(this.currentChaseCamPos);
        this.camera.lookAt(this.currentChaseLookTarget);
        this.camera.updateProjectionMatrix();
      } else if (params.cameraMode === 'ORBIT') {
        this.camera.up.set(0, 1, 0);
        const orbitDist = 8.6;
        const orbitHeight = 3.2;
        const yaw = -(params.cameraLookYaw || 0) + Math.PI + this.busHeadingYaw;
        const pitch = Math.max(-0.55, Math.min(0.55, params.cameraLookPitch || 0));
        const cx = this.busRoot.position.x + Math.sin(yaw) * orbitDist;
        const cy = this.busRoot.position.y + orbitHeight + Math.sin(pitch) * 3.8;
        const cz = this.busRoot.position.z - Math.cos(yaw) * orbitDist;
        this.camera.position.set(cx, Math.max(1.1, cy), cz);
        this.camera.lookAt(new THREE.Vector3(this.busRoot.position.x, this.busRoot.position.y + 1.35, this.busRoot.position.z));
        this.camera.fov = 62;
        this.camera.updateProjectionMatrix();
      } else {
        this.camera.up.set(0, 1, 0);
        // FIRST PERSON / DR. DRIVING BUS COCKPIT VIEW:
        const headBob = speedKmH > 10 ? Math.sin(Date.now() * 0.02) * 0.005 : 0;

        const cx = 0.0;   // Centered commanding windscreen view for Dr. Driving bus cockpit
        const cy = 2.02;  // Natural Danfo bus driver eye height looking cleanly down the road
        const cz = 2.35;  // Positioned right at the front windshield glass

        const localCamPos = new THREE.Vector3(cx, cy + headBob, cz);
        localCamPos.applyQuaternion(this.busRoot.quaternion);
        localCamPos.add(this.busRoot.position);
        this.camera.position.copy(localCamPos);

        const isReversing = gear === 'R';
        const baseYaw = isReversing ? 0 : Math.PI;
        const pitchG = isBraking ? 0.018 : (speedKmH > 20 ? -0.006 : 0);

        const clampedLookYaw = Math.max(-0.65, Math.min(0.65, params.cameraLookYaw || 0));
        const clampedLookPitch = Math.max(-0.30, Math.min(0.22, params.cameraLookPitch || 0));

        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = baseYaw + this.busHeadingYaw + clampedLookYaw;
        this.camera.rotation.x = -0.035 + pitchG + clampedLookPitch;
        this.camera.rotation.z = 0;
        this.camera.fov = 68;
        this.camera.updateProjectionMatrix();
      }
    }

    // ========================================================
    // 12. CONTINUOUS ROAD STREAMING AROUND DANFO BUS POSITION
    // ========================================================
    const busZ = this.busRoot.position.z;
    this.roadSegments.forEach((seg) => {
      while (seg.position.z < busZ - 120) {
        seg.position.z += 480;
      }
      while (seg.position.z > busZ + 360) {
        seg.position.z -= 480;
      }
      // Keep right-side props hidden around z = 0 so the starting Danfo Bus Park apron stays clear!
      if (seg.userData && seg.userData.rightSideProps) {
        seg.userData.rightSideProps.visible = seg.position.z > 60 || seg.position.z < -60;
      }
    });

    // 13. Junction Bus Stops Positioning & Commuter Boarding Animation (Both Sides & Waybill Beacon)
    this.junctionMeshes.forEach((jMesh) => {
      jMesh.group.position.z = jMesh.junction.distanceMarkerMeters;
      const relZ = jMesh.junction.distanceMarkerMeters - busZ;

      const isAtThisStop = Math.abs(relZ) < 18;
      const isCleared = jMesh.junction.cleared;

      const isDeliveryTarget = params.activeDelivery && (
        params.activeDelivery.destinationJunctionUid === jMesh.junction.uid ||
        params.activeDelivery.destinationName.toLowerCase().includes(jMesh.junction.name.toLowerCase())
      );
      if ((jMesh as any).waybillBeacon) {
        const beacon = (jMesh as any).waybillBeacon as THREE.Group;
        beacon.visible = !!isDeliveryTarget;
        if (beacon.visible) {
          beacon.rotation.y += dt * 3.0;
          beacon.position.y = 5.8 + Math.sin(Date.now() * 0.005) * 0.4;
        }
      }

      if (isCleared) {
        jMesh.passengers.forEach((p) => {
          p.visible = false;
        });
      } else if (isAtThisStop && isBoardingPassengers && doorState === 'OPEN') {
        jMesh.passengers.forEach((p, idx) => {
          const isLeft = p.userData && p.userData.isLeft;
          if (isLeft) {
            if (p.position.x < -2.2) {
              p.position.x += dt * (2.4 + idx * 0.4);
              p.position.z = THREE.MathUtils.lerp(p.position.z, busZ, dt * 2.5);
            } else {
              p.visible = false;
              if (p.userData) p.userData.boarded = true;
            }
          } else {
            if (p.position.x > 2.2) {
              p.position.x -= dt * (2.4 + idx * 0.4);
              p.position.z = THREE.MathUtils.lerp(p.position.z, busZ, dt * 2.5);
            } else {
              p.visible = false;
              if (p.userData) p.userData.boarded = true;
            }
          }
        });
      } else {
        jMesh.passengers.forEach((p) => {
          if (p.userData && !p.userData.boarded) {
            p.position.x = p.userData.origX || 10.5;
            p.position.z = p.userData.origZ || 0;
            p.visible = true;
          }
        });
      }
    });

    // 14. Gas Station Positioning along Road
    const gasDistances = [520, 1750];
    this.gasStationMeshes.forEach((gMesh, idx) => {
      gMesh.position.z = gasDistances[idx];
    });

    // 14b. Overhead Highway Billboards Positioning
    this.billboardMeshes.forEach((bMesh) => {
      bMesh.group.position.z = bMesh.ad.distanceMarkerMeters;
    });

    // ========================================================
    // 15. SOLID ANTI-PHASING TRAFFIC AI & COLLISION PHYSICS
    // ========================================================
    const lanes = [-5.8, -2.0, 2.0, 5.8];
    const playerHalfW = 1.25;
    const playerHalfL = 2.95;

    // Helper: check if a target lane (laneX, targetZ) is clear of all other NPC vehicles and the player
    const isLaneSpotClear = (laneX: number, targetZ: number, selfIdx: number, clearanceZ: number = 15): boolean => {
      if (Math.abs(laneX - this.busRoot.position.x) < 2.3 && Math.abs(targetZ - busZ) < clearanceZ) {
        return false;
      }
      for (let k = 0; k < this.trafficMeshes.length; k++) {
        if (k === selfIdx) continue;
        const other = this.trafficMeshes[k];
        if (
          Math.abs(other.position.x - laneX) < 2.2 &&
          Math.abs(other.position.z - targetZ) < clearanceZ
        ) {
          return false;
        }
      }
      return true;
    };

    for (let i = 0; i < this.trafficMeshes.length; i++) {
      const t = this.trafficMeshes[i];
      const u = t.userData;
      if (!u) continue;

      const halfW = u.halfW || 1.15;
      const halfL = u.halfL || 2.4;

      u.laneChangeCooldown = Math.max(0, (u.laneChangeCooldown || 0) - dt);
      let desiredSpeed = u.baseSpeed || 10.5;

      // 1. Check Player Ahead in Same/Adjacent Lane (so NPCs never rear-end the player!)
      const distToPlayerAhead = busZ - t.position.z;
      const latDistToPlayer = Math.abs(t.position.x - this.busRoot.position.x);
      const minSafePlayerGap = halfL + playerHalfL + 3.2;

      if (latDistToPlayer < (halfW + playerHalfW + 0.5) && distToPlayerAhead > 0 && distToPlayerAhead < 28) {
        // Player is directly ahead of this NPC!
        if (u.laneChangeCooldown <= 0 && distToPlayerAhead > minSafePlayerGap + 2) {
          // Try switching to an adjacent clear lane
          const currLaneIdx = lanes.reduce((best, l, idx) => Math.abs(l - u.targetLaneX) < Math.abs(lanes[best] - u.targetLaneX) ? idx : best, 0);
          const candidateIndices = [currLaneIdx - 1, currLaneIdx + 1].filter(idx => idx >= 0 && idx < lanes.length);
          for (const cIdx of candidateIndices) {
            if (isLaneSpotClear(lanes[cIdx], t.position.z + 4, i, 16)) {
              u.targetLaneX = lanes[cIdx];
              u.laneChangeCooldown = 3.0;
              break;
            }
          }
        }
        // Match or brake behind player so NPC never rams the player from behind
        const safeFollowSpeed = distToPlayerAhead < minSafePlayerGap + 3.0 ? Math.max(0, speedMps - 4.0) : Math.max(0, speedMps * 0.92);
        desiredSpeed = Math.min(desiredSpeed, safeFollowSpeed);
      }

      // 2. Check Other NPC Vehicles Ahead in Same or Target Lane
      let closestLeader: THREE.Group | null = null;
      let closestLeaderDz = Infinity;

      for (let j = 0; j < this.trafficMeshes.length; j++) {
        if (i === j) continue;
        const other = this.trafficMeshes[j];
        const otherU = other.userData;
        const dz = other.position.z - t.position.z;
        const latGap = Math.abs(t.position.x - other.position.x);
        const targetLatGap = Math.abs((u.targetLaneX ?? t.position.x) - (otherU?.targetLaneX ?? other.position.x));
        const combinedHalfW = halfW + (otherU?.halfW || 1.15) + 0.55;

        if (dz > 0 && dz < 32 && (latGap < combinedHalfW || targetLatGap < combinedHalfW)) {
          if (dz < closestLeaderDz) {
            closestLeaderDz = dz;
            closestLeader = other;
          }
        }
      }

      if (closestLeader) {
        const leaderU = closestLeader.userData;
        const minSafeGap = halfL + (leaderU?.halfL || 2.4) + 3.5;

        if (u.laneChangeCooldown <= 0 && closestLeaderDz > minSafeGap + 2.0) {
          const currLaneIdx = lanes.reduce((best, l, idx) => Math.abs(l - u.targetLaneX) < Math.abs(lanes[best] - u.targetLaneX) ? idx : best, 0);
          const candidateIndices = [currLaneIdx - 1, currLaneIdx + 1].filter(idx => idx >= 0 && idx < lanes.length);
          for (const cIdx of candidateIndices) {
            if (isLaneSpotClear(lanes[cIdx], t.position.z + 3, i, 16)) {
              u.targetLaneX = lanes[cIdx];
              u.laneChangeCooldown = 3.2;
              break;
            }
          }
        }

        const leaderSpeed = leaderU?.currentSpeed ?? 8.5;
        if (closestLeaderDz < minSafeGap + 2.0) {
          desiredSpeed = 0;
        } else if (closestLeaderDz < minSafeGap + 8.0) {
          desiredSpeed = Math.min(desiredSpeed, leaderSpeed * 0.75);
        } else {
          desiredSpeed = Math.min(desiredSpeed, leaderSpeed * 0.95);
        }
      }

      // Smooth Speed Lerp (faster braking response when obstacle ahead)
      const accelRate = desiredSpeed < (u.currentSpeed || 0) ? 8.5 : 2.8;
      u.currentSpeed = THREE.MathUtils.lerp(u.currentSpeed || desiredSpeed, desiredSpeed, Math.min(1.0, dt * accelRate));

      // Smooth Lane Steer (only steer into targetLaneX if side is clear of immediate overlap)
      const targetLaneX = u.targetLaneX !== undefined ? u.targetLaneX : t.position.x;
      const laneDiff = targetLaneX - t.position.x;
      if (Math.abs(laneDiff) > 0.05) {
        t.position.x += laneDiff * Math.min(1.0, dt * 3.0);
      }
      t.rotation.y = (u.baseRotY || 0) + Math.max(-0.16, Math.min(0.16, -laneDiff * 0.12));

      // Advance traffic along expressway (+Z direction)
      t.position.z += u.currentSpeed * dt;

      // Hard clamp behind closest leader so NPCs NEVER phase through each other
      if (closestLeader) {
        const minAllowedGap = halfL + (closestLeader.userData?.halfL || 2.4) + 1.8;
        if (closestLeader.position.z - t.position.z < minAllowedGap) {
          t.position.z = closestLeader.position.z - minAllowedGap;
          u.currentSpeed = Math.min(u.currentSpeed, closestLeader.userData?.currentSpeed || 0);
        }
      }

      // Recycle Ahead / Behind Player onto a guaranteed clear spot!
      if (t.position.z < busZ - 75) {
        let spawnZ = Math.max(55, busZ + 210 + (i % 6) * 28);
        let chosenLane = lanes[i % lanes.length];
        for (let attempt = 0; attempt < 8; attempt++) {
          const testLane = lanes[(i + attempt) % lanes.length];
          const testZ = spawnZ + Math.floor(attempt / 2) * 22;
          if (isLaneSpotClear(testLane, testZ, i, 18)) {
            chosenLane = testLane;
            spawnZ = testZ;
            break;
          }
        }
        t.position.z = spawnZ;
        t.position.x = chosenLane;
        u.targetLaneX = chosenLane;
        u.currentSpeed = u.baseSpeed || 10.5;
        u.laneChangeCooldown = 2.5;
      } else if (t.position.z > busZ + 480) {
        let spawnZ = Math.max(55, busZ + 180 + (i % 6) * 26);
        let chosenLane = lanes[i % lanes.length];
        if (isLaneSpotClear(chosenLane, spawnZ, i, 18)) {
          t.position.z = spawnZ;
          t.position.x = chosenLane;
          u.targetLaneX = chosenLane;
        }
      }
    }

    // 15b. Pairwise Solid NPC-vs-NPC Anti-Phasing Separation Pass
    for (let i = 0; i < this.trafficMeshes.length; i++) {
      const a = this.trafficMeshes[i];
      const ua = a.userData;
      const aHalfW = ua?.halfW || 1.15;
      const aHalfL = ua?.halfL || 2.4;

      for (let j = i + 1; j < this.trafficMeshes.length; j++) {
        const b = this.trafficMeshes[j];
        const ub = b.userData;
        const bHalfW = ub?.halfW || 1.15;
        const bHalfL = ub?.halfL || 2.4;

        const minX = aHalfW + bHalfW + 0.35;
        const minZ = aHalfL + bHalfL + 1.2;
        const dx = a.position.x - b.position.x;
        const dz = a.position.z - b.position.z;

        if (Math.abs(dx) < minX && Math.abs(dz) < minZ) {
          // Separate along longitudinal Z axis so trailing vehicle backs off cleanly
          if (dz >= 0) {
            b.position.z = a.position.z - minZ;
            if (ub) ub.currentSpeed = Math.min(ub.currentSpeed || 8, (ua?.currentSpeed || 8) * 0.85);
          } else {
            a.position.z = b.position.z - minZ;
            if (ua) ua.currentSpeed = Math.min(ua.currentSpeed || 8, (ub?.currentSpeed || 8) * 0.85);
          }
        }
      }
    }

    // 15c. Solid Player-vs-NPC Anti-Phasing Collision Resolution
    for (let i = 0; i < this.trafficMeshes.length; i++) {
      const npc = this.trafficMeshes[i];
      const un = npc.userData;
      const npcHalfW = un?.halfW || 1.15;
      const npcHalfL = un?.halfL || 2.4;

      const minX = playerHalfW + npcHalfW + 0.15;
      const minZ = playerHalfL + npcHalfL + 0.25;

      const dx = this.busRoot.position.x - npc.position.x;
      const dz = this.busRoot.position.z - npc.position.z;
      const overlapX = minX - Math.abs(dx);
      const overlapZ = minZ - Math.abs(dz);

      if (overlapX > 0 && overlapZ > 0) {
        // Determine primary impact axis (lateral sideswipe vs longitudinal rear-end)
        if (overlapX < overlapZ * 0.85) {
          // Lateral sideswipe: push player and NPC apart horizontally so they never phase!
          const pushSign = dx >= 0 ? 1 : -1;
          const playerPushX = pushSign * (overlapX * 0.7 + 0.08);
          const npcPushX = -pushSign * (overlapX * 0.3 + 0.05);
          this.busRoot.position.x = Math.max(minRoadX, Math.min(8.8, this.busRoot.position.x + playerPushX));
          this.chassisBody.position.x = this.busRoot.position.x;
          npc.position.x = Math.max(-7.8, Math.min(7.8, npc.position.x + npcPushX));
          this.chassisBody.velocity.z *= 0.82;
        } else {
          // Longitudinal impact (front/rear bumper)
          if (dz < 0) {
            // Player hit rear of NPC ahead: clamp player behind NPC and transfer momentum
            this.busRoot.position.z = npc.position.z - minZ;
            this.chassisBody.position.z = this.busRoot.position.z;
            const npcSpd = un?.currentSpeed || 8.0;
            this.chassisBody.velocity.z = Math.min(this.chassisBody.velocity.z, npcSpd * 0.75);
            if (un) un.currentSpeed = Math.max(un.currentSpeed || 8, speedMps * 0.9 + 2.0);
          } else {
            // NPC behind player: push NPC back behind player
            npc.position.z = this.busRoot.position.z - minZ;
            if (un) un.currentSpeed = Math.max(0, speedMps * 0.7);
          }
        }

        // Trigger suspension thud and collision alert cooldown
        const now = performance.now();
        if (now - this.lastCollisionAlertTime > 1400) {
          this.lastCollisionAlertTime = now;
          this.bumpImpulse = 0.75;
          this.bumpTimer = 0;
          soundEngine.playPotholeThud();
          this.pendingCollisionMessage = '💥 GBOSA! Bumper contact with traffic! Keep your lane clear!';
        }
      }
    }

    // 16. Dynamic Lagos Danfo Exhaust Particles
    if (isEngineRunning) {
      this.exhaustParticles.visible = true;
      const smokeFlow = (speedMps * 0.45 + (throttle > 0 ? 3.5 : 0.8)) * dt;
      for (let i = 0; i < this.exhaustPositions.length; i += 3) {
        this.exhaustPositions[i + 2] -= smokeFlow;
        this.exhaustPositions[i] += (Math.random() - 0.5) * 0.04;
        this.exhaustPositions[i + 1] += dt * 0.22;
        if (this.exhaustPositions[i + 2] < busZ - 15 || this.exhaustPositions[i + 2] > busZ + 15) {
          this.exhaustPositions[i] = this.busRoot.position.x - 0.95 + (Math.random() - 0.5) * 0.22;
          this.exhaustPositions[i + 1] = this.busRoot.position.y + 0.38 + Math.random() * 0.18;
          this.exhaustPositions[i + 2] = this.busRoot.position.z - 2.6;
        }
      }
      this.exhaustParticles.geometry.attributes.position.needsUpdate = true;
    } else {
      this.exhaustParticles.visible = false;
    }

    // ========================================================
    // 17. LIVE REAR-VIEW SIDE MIRRORS & MAIN VIEWPORT RENDER
    // ========================================================
    const fullW = this.container.clientWidth || window.innerWidth;
    const fullH = this.container.clientHeight || window.innerHeight;

    if (
      !isSteppedDown &&
      (this.leftMirrorCanvas || this.rightMirrorCanvas) &&
      fullW > 240 &&
      fullH > 180
    ) {
      const mW = 220;
      const mH = 130;
      const dpr = this.renderer.getPixelRatio();
      const srcW = Math.round(mW * dpr);
      const srcH = Math.round(mH * dpr);
      const srcY = Math.max(0, Math.round(fullH * dpr) - srcH);

      // Position Left & Right Side Mirror Cameras on exterior mirror brackets looking backward (-Z)
      const leftPos = new THREE.Vector3(1.28, 2.15, 2.05).applyQuaternion(this.busRoot.quaternion).add(this.busRoot.position);
      const leftTarget = new THREE.Vector3(1.65, 1.85, -35.0).applyQuaternion(this.busRoot.quaternion).add(this.busRoot.position);
      this.leftMirrorCamera.position.copy(leftPos);
      this.leftMirrorCamera.up.set(0, 1, 0);
      this.leftMirrorCamera.lookAt(leftTarget);

      const rightPos = new THREE.Vector3(-1.28, 2.15, 2.05).applyQuaternion(this.busRoot.quaternion).add(this.busRoot.position);
      const rightTarget = new THREE.Vector3(-1.65, 1.85, -35.0).applyQuaternion(this.busRoot.quaternion).add(this.busRoot.position);
      this.rightMirrorCamera.position.copy(rightPos);
      this.rightMirrorCamera.up.set(0, 1, 0);
      this.rightMirrorCamera.lookAt(rightTarget);

      this.renderer.setScissorTest(true);

      if (this.leftMirrorCanvas) {
        this.renderer.setViewport(0, 0, mW, mH);
        this.renderer.setScissor(0, 0, mW, mH);
        this.renderer.render(this.scene, this.leftMirrorCamera);
        const ctxL = this.leftMirrorCanvas.getContext('2d');
        if (ctxL) {
          ctxL.save();
          ctxL.scale(-1, 1); // Mirror horizontal reflection
          ctxL.drawImage(
            this.renderer.domElement,
            0,
            srcY,
            srcW,
            srcH,
            -this.leftMirrorCanvas.width,
            0,
            this.leftMirrorCanvas.width,
            this.leftMirrorCanvas.height
          );
          ctxL.restore();
        }
      }

      if (this.rightMirrorCanvas) {
        this.renderer.setViewport(0, 0, mW, mH);
        this.renderer.setScissor(0, 0, mW, mH);
        this.renderer.render(this.scene, this.rightMirrorCamera);
        const ctxR = this.rightMirrorCanvas.getContext('2d');
        if (ctxR) {
          ctxR.save();
          ctxR.scale(-1, 1); // Mirror horizontal reflection
          ctxR.drawImage(
            this.renderer.domElement,
            0,
            srcY,
            srcW,
            srcH,
            -this.rightMirrorCanvas.width,
            0,
            this.rightMirrorCanvas.width,
            this.rightMirrorCanvas.height
          );
          ctxR.restore();
        }
      }

      this.renderer.setScissorTest(false);
    }

    // Restore full viewport & render main camera scene
    // In FIRST_PERSON driving mode, hide the 3D bus exterior mesh during the main forward render pass
    // so the 3D roof/signboard/tinted glass NEVER blocks or darkens the road view!
    const hide3DBusInCockpit = params.cameraMode === 'FIRST_PERSON' && !isSteppedDown;
    if (hide3DBusInCockpit) {
      this.busBody.visible = false;
    } else {
      this.busBody.visible = true;
    }
    this.renderer.setViewport(0, 0, fullW, fullH);
    this.renderer.render(this.scene, this.camera);
    this.busBody.visible = true;
  }

  /**
   * Physics getters for HUD telemetry and simulation synchronization
   */
  public getPhysicalSpeedKmH(): number {
    if (!this.chassisBody || !this.chassisBody.velocity || isNaN(this.chassisBody.velocity.length())) return 0;
    return Math.round(this.chassisBody.velocity.length() * 3.6);
  }

  public getPhysicsChassis(): { position: THREE.Vector3; speedKmH: number } {
    if (!this.chassisBody) {
      return { position: new THREE.Vector3(), speedKmH: 0 };
    }
    const x = isNaN(this.chassisBody.position.x) ? 0 : this.chassisBody.position.x;
    const y = isNaN(this.chassisBody.position.y) ? 0.85 : this.chassisBody.position.y;
    const z = isNaN(this.chassisBody.position.z) ? 0 : this.chassisBody.position.z;
    const spd = (this.chassisBody.velocity && !isNaN(this.chassisBody.velocity.length()))
      ? Math.round(this.chassisBody.velocity.length() * 3.6)
      : 0;
    return {
      position: new THREE.Vector3(x, y, z),
      speedKmH: spd,
    };
  }

  public getBusPosition(): { x: number; y: number; z: number } {
    return {
      x: this.busRoot ? this.busRoot.position.x : 0,
      y: this.busRoot ? this.busRoot.position.y : 0,
      z: this.busRoot ? this.busRoot.position.z : 0,
    };
  }

  public getYawOffsetToBus(): number {
    if (!this.busRoot) return 0;
    const targetYaw = Math.atan2(
      this.driverWalkPos.x - this.busRoot.position.x,
      this.driverWalkPos.z - this.busRoot.position.z
    );
    return targetYaw - this.walkBaseYaw;
  }

  public dispose() {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.container && this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
