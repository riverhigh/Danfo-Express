import * as THREE from 'three';
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
    this.conductorMesh = busComponents.conductor;
    this.leftFrontWheel = busComponents.lfWheel;
    this.rightFrontWheel = busComponents.rfWheel;
    this.rearWheels = busComponents.rearWheels;
    this.leftBlinker = busComponents.lBlinker;
    this.rightBlinker = busComponents.rBlinker;
    this.leftBrakeLight = busComponents.lBrake;
    this.rightBrakeLight = busComponents.rBrake;
    this.wipersGroup = busComponents.wipers;
    this.danglingRosary = busComponents.rosary;
    this.bullBarMesh = busComponents.bullBar;
    this.roofSpeakersMesh = busComponents.speakers;
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
    const segmentCount = 3;

    for (let i = 0; i < segmentCount; i++) {
      const group = new THREE.Group();
      group.position.z = i * roadLength;

      // 1. Asphalt Roadway
      const roadGeo = new THREE.PlaneGeometry(16, roadLength);
      const roadMat = new THREE.MeshStandardMaterial({
        map: asphaltTex,
        roughness: 0.85,
        metalness: 0.1,
      });
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.receiveShadow = true;
      group.add(roadMesh);

      // Yellow Center Line
      const centerLineGeo = new THREE.PlaneGeometry(0.24, roadLength);
      const centerLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const centerLine = new THREE.Mesh(centerLineGeo, centerLineMat);
      centerLine.rotation.x = -Math.PI / 2;
      centerLine.position.y = 0.01;
      group.add(centerLine);

      // White Lane Dashes (-4m and +4m)
      [-4, 4].forEach((laneX) => {
        for (let s = -roadLength / 2; s < roadLength / 2; s += 8) {
          const dashGeo = new THREE.PlaneGeometry(0.18, 4);
          const dashMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });
          const dash = new THREE.Mesh(dashGeo, dashMat);
          dash.rotation.x = -Math.PI / 2;
          dash.position.set(laneX, 0.01, s);
          group.add(dash);
        }
      });

      // 2. Curbs & Sidewalks
      [-8.5, 8.5].forEach((curbX, idx) => {
        const curbGeo = new THREE.BoxGeometry(1.2, 0.35, roadLength);
        const curbMat = new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.7 });
        const curbMesh = new THREE.Mesh(curbGeo, curbMat);
        curbMesh.position.set(curbX, 0.18, 0);
        curbMesh.receiveShadow = true;
        group.add(curbMesh);

        // Pavement Walkway
        const walkGeo = new THREE.BoxGeometry(6, 0.3, roadLength);
        const walkMat = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.9 });
        const walkMesh = new THREE.Mesh(walkGeo, walkMat);
        walkMesh.position.set(idx === 0 ? -12 : 12, 0.15, 0);
        group.add(walkMesh);
      });

      // 3. Buildings & Lamp Posts
      const shopNames: [string, string][] = [
        ['EKO PHARMACY & CHEMIST', '#0284c7'],
        ['MAMA PUT AMALA BUKKA', '#dc2626'],
        ['COMPUTER VILLAGE TECH MART', '#16a34a'],
        ['TOTAL PETROL PLAZA', '#9333ea'],
      ];

      for (let s = -roadLength / 2 + 15; s < roadLength / 2; s += 30) {
        // Left Building
        const shopLeft = shopNames[Math.floor(Math.random() * shopNames.length)];
        const bTexL = createBuildingFacadeTexture(shopLeft[0], shopLeft[1]);
        const bMeshL = new THREE.Mesh(new THREE.BoxGeometry(10, 18, 22), new THREE.MeshStandardMaterial({ map: bTexL, roughness: 0.8 }));
        bMeshL.position.set(-18, 9, s);
        group.add(bMeshL);

        // Right Building
        const shopRight = shopNames[Math.floor(Math.random() * shopNames.length)];
        const bTexR = createBuildingFacadeTexture(shopRight[0], shopRight[1]);
        const bMeshR = new THREE.Mesh(new THREE.BoxGeometry(10, 20, 22), new THREE.MeshStandardMaterial({ map: bTexR, roughness: 0.8 }));
        bMeshR.position.set(18, 10, s);
        group.add(bMeshR);

        // Street light pole
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.14, 7),
          new THREE.MeshStandardMaterial({ color: 0x78716c, metalness: 0.7 })
        );
        pole.position.set(8.8, 3.5, s);
        group.add(pole);
      }

      // Overhead Gantry Signboard on segment 1
      if (i === 1) {
        const signTex = createSignboardTexture('THIRD MAINLAND EXPRESSWAY', 'IKEJA / OSHODI / CMS MARINA', '#047857');
        const sign = new THREE.Mesh(new THREE.BoxGeometry(15, 2.8, 0.3), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 }));
        sign.position.set(0, 7.2, 0);
        group.add(sign);

        [-8, 8].forEach((px) => {
          const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 7.5), new THREE.MeshStandardMaterial({ color: 0x57534e, metalness: 0.6 }));
          pillar.position.set(px, 3.75, 0);
          group.add(pillar);
        });
      }

      this.scene.add(group);
      this.roadSegments.push(group);
    }
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

    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.2 });
    const blackStripeMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.6 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.85 });
    const darkInteriorMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
    const seatLeatherMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.1, transmission: 0.85, transparent: true, opacity: 0.65 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });

    // Lower Chassis
    const lower = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.15, 5.2), yellowMat);
    lower.position.y = 0.95;
    lower.castShadow = true;
    busBody.add(lower);

    // Double Black Racing Stripes
    [-0.18, 0.18].forEach((offset) => {
      const sMesh = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.16, 5.0), blackStripeMat);
      sMesh.position.set(0, 0.95 + offset, 0);
      busBody.add(sMesh);
    });

    // Yellow Roof & Pillar Frames
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.22, 5.0), yellowMat);
    roof.position.set(0, 2.52, -0.1);
    busBody.add(roof);

    // Windshield Pillars
    [-1.02, 1.02].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, 0.12), yellowMat);
      pillar.position.set(px, 1.9, 2.3);
      busBody.add(pillar);
    });

    // Glass Windows
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.15, 4.8), glassMat);
    cabin.position.set(0, 1.9, -0.1);
    busBody.add(cabin);
    // Windscreen (Front Glass)
    const windscreen = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.8), glassMat);
    windscreen.position.set(0, 1.95, 2.31);
    busBody.add(windscreen);


    // Sun Visor Banner across top of windshield
    const visor = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.32, 0.05), blackStripeMat);
    visor.position.set(0, 2.36, 2.35);
    busBody.add(visor);

    // Crisp ₦1000 Naira Note clipped to the sun visor!
    const nairaTex = createNairaNoteTexture();
    const nairaNote = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.14),
      new THREE.MeshStandardMaterial({ map: nairaTex, roughness: 0.5, side: THREE.DoubleSide })
    );
    nairaNote.position.set(-0.55, 2.32, 2.32);
    nairaNote.rotation.set(-0.1, 0, 0.05);
    busBody.add(nairaNote);

    // ==========================================
    // 1ST-PERSON DRIVER COCKPIT & DASHBOARD
    // ==========================================
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 0.95), darkInteriorMat);
    dash.position.set(0, 1.48, 1.8);
    busBody.add(dash);

    // Working Instrument Cluster Screen (Graphic Speedometer & Tachometer)
    const clusterTex = createDashboardClusterTexture();
    const clusterMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.68, 0.34),
      new THREE.MeshBasicMaterial({ map: clusterTex })
    );
    clusterMesh.position.set(-0.5, 1.58, 1.38);
    clusterMesh.rotation.set(-Math.PI / 4, 0, 0);
    busBody.add(clusterMesh);

    // 1. Far Left: Analog Tachometer Needle (x = -0.66)
    const needleGeo = new THREE.BoxGeometry(0.014, 0.10, 0.005);
    needleGeo.translate(0, 0.045, 0);
    const tachNeedle = new THREE.Mesh(needleGeo, new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    tachNeedle.position.set(-0.66, 1.58, 1.38);
    tachNeedle.rotation.set(-Math.PI / 4, 0, 0);
    busBody.add(tachNeedle);

    // 2. Center-Left: Graphic Fuel Needle [E --- F] (x = -0.54)
    const fuelNeedleGeo = new THREE.BoxGeometry(0.012, 0.07, 0.005);
    fuelNeedleGeo.translate(0, 0.03, 0);
    const fuelNeedle = new THREE.Mesh(fuelNeedleGeo, new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    fuelNeedle.position.set(-0.54, 1.58, 1.38);
    fuelNeedle.rotation.set(-Math.PI / 4, 0, 0);
    busBody.add(fuelNeedle);

    // 3. Center-Right: Acceleration / Torque Needle [0% - 100%] (x = -0.42)
    const accelNeedle = new THREE.Mesh(fuelNeedleGeo.clone(), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    accelNeedle.position.set(-0.42, 1.58, 1.38);
    accelNeedle.rotation.set(-Math.PI / 4, 0, 0);
    busBody.add(accelNeedle);

    // 4. Far Right: Analog Speedometer Needle (x = -0.30)
    const speedNeedle = new THREE.Mesh(needleGeo.clone(), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    speedNeedle.position.set(-0.30, 1.58, 1.38);
    speedNeedle.rotation.set(-Math.PI / 4, 0, 0);
    busBody.add(speedNeedle);

    // Dashboard Blinker Indicators (Green LED arrows)
    const dashLeftBlinker = new THREE.Mesh(
      new THREE.CircleGeometry(0.018, 12),
      new THREE.MeshBasicMaterial({ color: 0x14532d })
    );
    dashLeftBlinker.position.set(-0.58, 1.66, 1.32);
    dashLeftBlinker.rotation.set(-Math.PI / 4, 0, 0);
    busBody.add(dashLeftBlinker);

    const dashRightBlinker = new THREE.Mesh(
      new THREE.CircleGeometry(0.018, 12),
      new THREE.MeshBasicMaterial({ color: 0x14532d })
    );
    dashRightBlinker.position.set(-0.42, 1.66, 1.32);
    dashRightBlinker.rotation.set(-Math.PI / 4, 0, 0);
    busBody.add(dashRightBlinker);

    // ==========================================
    // 3D STEERING WHEEL WITH REAL DRIVER HANDS!
    // ==========================================
    const steeringWheel = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.028, 16, 36), new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.6 }));
    steeringWheel.add(rim);
    // Center Hub with Lagos Yellow Horn Button
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16), yellowMat);
    hub.rotation.x = Math.PI / 2;
    steeringWheel.add(hub);
    // Spokes
    [-0.14, 0.14].forEach((sx) => {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.02), chromeMat);
      spoke.position.set(sx / 2, -0.05, 0);
      spoke.rotation.z = sx > 0 ? -0.4 : 0.4;
      steeringWheel.add(spoke);
    });

    // 3D Sculpted Driver Hands gripping the wheel rim at 9 o'clock and 3 o'clock!
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x6d381e, roughness: 0.8 }); // Nigerian skin tone
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.6 }); // Green Lagos polo shirt sleeve

    // Left Hand (at 9 o'clock)
    const lHand = new THREE.Group();
    const lPalm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.05), skinMat);
    const lFingers = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.07, 8), skinMat);
    lFingers.rotation.x = Math.PI / 2;
    lHand.add(lPalm);
    lHand.add(lFingers);
    lHand.position.set(-0.24, 0, 0.02);
    const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.35, 8), sleeveMat);
    lArm.rotation.x = Math.PI / 3;
    lArm.rotation.z = -0.4;
    lArm.position.set(-0.35, -0.15, -0.12);
    lHand.add(lArm);
    steeringWheel.add(lHand);

    // Right Hand (at 3 o'clock)
    const rHand = new THREE.Group();
    const rPalm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.05), skinMat);
    const rFingers = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.07, 8), skinMat);
    rFingers.rotation.x = Math.PI / 2;
    rHand.add(rPalm);
    rHand.add(rFingers);
    rHand.position.set(0.24, 0, 0.02);
    const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.35, 8), sleeveMat);
    rArm.rotation.x = Math.PI / 3;
    rArm.rotation.z = 0.4;
    rArm.position.set(0.35, -0.15, -0.12);
    rHand.add(rArm);
    steeringWheel.add(rHand);

    steeringWheel.position.set(-0.5, 1.48, 1.15);
    steeringWheel.rotation.x = -Math.PI / 6;
    busBody.add(steeringWheel);

    // Driver Seat
    const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.55), seatLeatherMat);
    driverSeat.position.set(-0.5, 1.15, 0.45);
    busBody.add(driverSeat);

    // Passenger Bench Seats
    [-0.5, 0.5].forEach((zPos) => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.45), seatLeatherMat);
      bench.position.set(0.45, 1.15, zPos);
      busBody.add(bench);
    });

    // ==========================================
    // DUAL SIDE MIRRORS (LEFT & RIGHT)
    // ==========================================
    // Left Side Mirror
    const lMirror = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.45), chromeMat);
    lMirror.position.set(-1.24, 1.85, 2.15);
    busBody.add(lMirror);
    const lMirrorArm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25), chromeMat);
    lMirrorArm.rotation.z = Math.PI / 2;
    lMirrorArm.position.set(-1.12, 1.85, 2.15);
    busBody.add(lMirrorArm);

    // Right Side Mirror
    const rMirror = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.45), chromeMat);
    rMirror.position.set(1.24, 1.85, 2.15);
    busBody.add(rMirror);
    const rMirrorArm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25), chromeMat);
    rMirrorArm.rotation.z = -Math.PI / 2;
    rMirrorArm.position.set(1.12, 1.85, 2.15);
    busBody.add(rMirrorArm);

    // Overhead Rearview Mirror & Rosary
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.05), chromeMat);
    mirror.position.set(0, 2.28, 2.05);
    busBody.add(mirror);

    const rosary = new THREE.Group();
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.24), chromeMat);
    cord.position.y = -0.12;
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.02), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 }));
    cross.position.y = -0.26;
    rosary.add(cord);
    rosary.add(cross);
    rosary.position.set(0, 2.22, 2.03);
    busBody.add(rosary);

    // Windshield Wipers
    const wipers = new THREE.Group();
    [-0.55, 0.25].forEach((wx) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.48, 0.02), blackStripeMat);
      arm.position.set(wx, 1.68, 2.42);
      wipers.add(arm);
    });
    busBody.add(wipers);

    // ==========================================
    // ANIMATED PASSENGER SLIDING SIDE DOOR (RIGHT)
    // ==========================================
    const slidingDoor = new THREE.Group();
    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.45, 1.15), yellowMat);
    slidingDoor.add(doorPanel);
    const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.95), glassMat);
    doorGlass.position.set(0, 0.35, 0);
    slidingDoor.add(doorGlass);
    const doorStripe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 1.15), blackStripeMat);
    doorStripe.position.set(0, -0.45, 0);
    slidingDoor.add(doorStripe);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), chromeMat);
    handle.position.set(0.05, -0.05, -0.45);
    slidingDoor.add(handle);

    slidingDoor.position.set(1.1, 1.65, 0.85);
    busBody.add(slidingDoor);

    // Conductor Mesh at Doorway
    const conductor = new THREE.Group();
    const cHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshStandardMaterial({ color: 0x78350f }));
    cHead.position.set(0, 1.6, 0);
    conductor.add(cHead);
    const cCap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 12), yellowMat);
    cCap.position.set(0, 1.7, 0);
    conductor.add(cCap);
    const cTorso = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.45, 0.22), new THREE.MeshStandardMaterial({ color: 0x047857 }));
    cTorso.position.set(0, 1.25, 0);
    conductor.add(cTorso);
    const cPouch = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: 0x09090b }));
    cPouch.position.set(0, 1.05, 0.12);
    conductor.add(cPouch);
    const cLegs = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.7, 0.2), new THREE.MeshStandardMaterial({ color: 0x1e3a8a }));
    cLegs.position.set(0, 0.65, 0);
    conductor.add(cLegs);
    const cArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), new THREE.MeshStandardMaterial({ color: 0x78350f }));
    cArm.position.set(0.18, 1.35, 0.15);
    conductor.add(cArm);

    conductor.position.set(1.15, 0.2, 0.55);
    conductor.rotation.y = -Math.PI / 2;
    conductor.visible = false;
    busBody.add(conductor);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.38, 24);
    wheelGeo.rotateZ(Math.PI / 2);

    const lfWheel = new THREE.Mesh(wheelGeo, rubberMat);
    lfWheel.position.set(-1.1, 0.44, 1.7);
    busRoot.add(lfWheel);

    const rfWheel = new THREE.Mesh(wheelGeo, rubberMat);
    rfWheel.position.set(1.1, 0.44, 1.7);
    busRoot.add(rfWheel);

    const lrWheel = new THREE.Mesh(wheelGeo, rubberMat);
    lrWheel.position.set(-1.1, 0.44, -1.7);
    busRoot.add(lrWheel);

    const rrWheel = new THREE.Mesh(wheelGeo, rubberMat);
    rrWheel.position.set(1.1, 0.44, -1.7);
    busRoot.add(rrWheel);

    // Headlights
    [-0.8, 0.8].forEach((hx) => {
      const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), chromeMat);
      lamp.position.set(hx, 0.98, 2.61);
      busBody.add(lamp);

      const spot = new THREE.SpotLight(0xfef08a, 4.5, 60, Math.PI / 6, 0.35);
      spot.position.set(hx, 1.05, 2.7);
      spot.target.position.set(hx, 0, 22);
      busBody.add(spot);
      busBody.add(spot.target);
      this.headLights.push(spot);
    });

    // Blinkers & Brakes
    const lBlinker = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.05), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    lBlinker.position.set(-1.0, 0.98, 2.61);
    busBody.add(lBlinker);

    const rBlinker = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.05), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    rBlinker.position.set(1.0, 0.98, 2.61);
    busBody.add(rBlinker);

    const lBrake = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.05), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    lBrake.position.set(-0.9, 0.98, -2.61);
    busBody.add(lBrake);

    const rBrake = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.05), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    rBrake.position.set(0.9, 0.98, -2.61);
    busBody.add(rBrake);

    // Bull Bar Upgrade
    const bullBar = new THREE.Group();
    bullBar.add(new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.65, 0.35), chromeMat));
    bullBar.position.set(0, 0.88, 2.75);
    bullBar.visible = false;
    busBody.add(bullBar);

    // Rooftop Mega-Speakers
    const speakers = new THREE.Group();
    [-0.5, 0.5].forEach((sx) => {
      const hornCone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 16), chromeMat);
      hornCone.rotation.x = -Math.PI / 2;
      hornCone.position.set(sx, 2.85, 0);
      speakers.add(hornCone);
    });
    speakers.visible = false;
    busBody.add(speakers);

    // Lagos Neon Underglow
    const underglow = new THREE.PointLight(0x10b981, 0, 8);
    underglow.position.set(0, 0.25, 0);
    busBody.add(underglow);

    // ==========================================
    // REAR BOOT (TRUNK) DOOR & LUGGAGE COMPARTMENT
    // ==========================================
    // Boot Door Pivot Hinge at Top of Rear
    const bootDoor = new THREE.Group();
    bootDoor.position.set(0, 2.35, -2.55); // Top hinge pivot

    // Boot Door Panel (Swings Upwards when open)
    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.35, 0.08), yellowMat);
    doorPanel.position.set(0, -0.67, 0);
    bootDoor.add(doorPanel);

    // Boot Door Window
    const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.09), glassMat);
    rearWindow.position.set(0, -0.35, 0);
    bootDoor.add(rearWindow);

    // Black Stripe across bottom of boot door
    const rearStripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.16, 0.09), blackStripeMat);
    rearStripe.position.set(0, -0.85, 0);
    bootDoor.add(rearStripe);

    // Chrome Boot Handle & Keylock
    const bootHandle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.06), chromeMat);
    bootHandle.position.set(0, -1.15, -0.06);
    bootDoor.add(bootHandle);

    // Lagos License Plate ("LAGOS • EKY-420-XA")
    const plateMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.18), new THREE.MeshBasicMaterial({ color: 0xf1f5f9 }));
    plateMesh.rotation.y = Math.PI;
    plateMesh.position.set(0, -1.02, -0.05);
    bootDoor.add(plateMesh);

    busBody.add(bootDoor);

    // Luggage items inside boot compartment
    const bootLuggage = new THREE.Group();
    bootLuggage.position.set(0, 0.95, -2.1);

    // Ghana-Must-Go Bag (Large checkered woven bag)
    const ghanaBag = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.45), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.9 }));
    ghanaBag.position.set(-0.45, 0.22, 0);
    bootLuggage.add(ghanaBag);

    // Carton of Indomie / Yam Tuber Sack
    const yamSack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.55), new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 }));
    yamSack.position.set(0.42, 0.2, 0.05);
    bootLuggage.add(yamSack);

    const indomieBox = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.35, 0.4), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 }));
    indomieBox.position.set(0, 0.4, -0.1);
    bootLuggage.add(indomieBox);

    busBody.add(bootLuggage);

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
      rearWheels: [lrWheel, rrWheel],
      lBlinker,
      rBlinker,
      lBrake,
      rBrake,
      wipers,
      rosary,
      bullBar,
      speakers,
      underglow,
    };
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

    for (let i = 0; i < 7; i++) {
      const traffic = new THREE.Group();
      const carMat = new THREE.MeshStandardMaterial({
        color: trafficColors[i % trafficColors.length],
        roughness: 0.4,
      });

      if (i % 2 === 0) {
        // Yellow Rival Danfo Bus
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.8, 4.8), carMat);
        body.position.y = 1.3;
        traffic.add(body);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.2, 4.7), new THREE.MeshStandardMaterial({ color: 0x09090b }));
        stripe.position.y = 1.1;
        traffic.add(stripe);
      } else {
        // Lagos Civilian Sedan / Taxi
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 3.8), carMat);
        body.position.y = 0.75;
        traffic.add(body);
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.0), carMat);
        top.position.set(0, 1.35, -0.2);
        traffic.add(top);
      }

      traffic.position.set((i % 2 === 0 ? -4 : 4), 0, 40 + i * 35);
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
      const eyeZ = 0.5;

      this.camera.position.set(eyeX, eyeY, eyeZ);

      // Pitch and yaw responding to acceleration and steering
      const pitchG = isBraking ? -0.04 : (speedKmH > 20 ? 0.015 : 0);
      const targetLookX = eyeX + steerFactor * 2.8; // Looks naturally into the steered direction!
      const targetLookY = eyeY - 0.04 + pitchG;
      const targetLookZ = eyeZ + 35; // Looking forward towards +Z down the expressway!

      this.camera.lookAt(targetLookX, targetLookY, targetLookZ);
      this.camera.rotation.z = -steerFactor * 0.02; // subtle chassis roll into turn
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
