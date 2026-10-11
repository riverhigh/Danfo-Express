import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Bed,
  Eye,
  EyeOff,
  Home,
  Lock,
  RotateCcw,
  Smartphone,
  Sparkles,
  Tv,
  Unlock,
  Utensils,
  Zap,
} from 'lucide-react';
import { GameState } from '../types/game';

interface PlayerHome2DProps {
  gameState: GameState;
  onUpdateWalletAndCred: (walletDelta: number, credDelta?: number, staminaSet?: number) => void;
  onGoToDrive: () => void;
  onOpenPhone: () => void;
  onBackToMenu: () => void;
  onOpenPosOrBank?: (mode: 'POS_KIOSK' | 'BANK_HALL') => void;
}

const HOME_UPGRADE_TIERS = [
  {
    id: 'starter_minor',
    name: 'Mushin Starter Room & Bath',
    location: 'Minor Bedroom + Minor Bath',
    purchaseCostNaira: 0,
  },
  {
    id: 'living_kitchen',
    name: 'Oshodi Pool Lounge & Dining Flat',
    location: 'Unlocks Main Living Room + Kitchen/Dining',
    purchaseCostNaira: 35000,
  },
  {
    id: 'studio_master',
    name: 'Ikeja Full 7-Room Studio Penthouse',
    location: 'Unlocks Major Studio Bedroom + Master Bath',
    purchaseCostNaira: 95000,
  },
];

type RoomId =
  | 'bedroom_minor'
  | 'bathroom_minor'
  | 'entrance_area'
  | 'kitchen_dining_area'
  | 'main_living_recreation_room'
  | 'bedroom_major_studio'
  | 'bathroom_major';

interface RoomDef {
  id: RoomId;
  name: string;
  tierRequired: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  center: { x: number; z: number };
  description: string;
}

const APARTMENT_ROOMS: RoomDef[] = [
  {
    id: 'bedroom_minor',
    name: 'Minor Bedroom (Starter Room)',
    tierRequired: 0,
    bounds: { minX: -11, maxX: -4, minZ: 2.5, maxZ: 9.5 },
    center: { x: -7.5, z: 6.0 },
    description: 'Single bed with simplified bedding, nightstand & wall globe light',
  },
  {
    id: 'bathroom_minor',
    name: 'Minor Bathroom',
    tierRequired: 0,
    bounds: { minX: -11, maxX: -6, minZ: -2.5, maxZ: 2.5 },
    center: { x: -8.5, z: 0.0 },
    description: 'Standing toilet, sink & small trash bin on patterned square tile',
  },
  {
    id: 'entrance_area',
    name: 'Entrance Foyer',
    tierRequired: 0,
    bounds: { minX: -6, maxX: -2, minZ: -2.5, maxZ: 2.5 },
    center: { x: -4.0, z: 0.0 },
    description: 'Simplified welcome mat & clean wall hooks',
  },
  {
    id: 'kitchen_dining_area',
    name: 'Kitchen & Dining Area',
    tierRequired: 1,
    bounds: { minX: -11, maxX: -2, minZ: -9.5, maxZ: -2.5 },
    center: { x: -6.5, z: -6.0 },
    description: 'Circular dining table with 4 chairs & microwave on stand',
  },
  {
    id: 'main_living_recreation_room',
    name: 'Main Living & Recreation Room',
    tierRequired: 1,
    bounds: { minX: -2, maxX: 11, minZ: -9.5, maxZ: 1.5 },
    center: { x: 4.5, z: -4.0 },
    description: 'Pool table with green felt, black multi-seater sofa, flat-screen TV & concentric round rug',
  },
  {
    id: 'bedroom_major_studio',
    name: 'Major Studio Bedroom',
    tierRequired: 2,
    bounds: { minX: -4, maxX: 6.5, minZ: 1.5, maxZ: 9.5 },
    center: { x: 1.2, z: 5.5 },
    description: 'Double bed with purple bedding, modern PC work desk & standing circular ring light',
  },
  {
    id: 'bathroom_major',
    name: 'Master Bathroom',
    tierRequired: 2,
    bounds: { minX: 6.5, maxX: 11, minZ: 1.5, maxZ: 9.5 },
    center: { x: 8.75, z: 5.5 },
    description: 'White bathtub, standing toilet & sink unit on patterned square tile',
  },
];

function createCheckeredTexture(
  colorA: string,
  colorB: string,
  repeatsX: number,
  repeatsY: number,
  withSubtleGrid = false
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = colorA;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = colorB;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillRect(64, 64, 64, 64);

  if (withSubtleGrid) {
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 64, 64);
    ctx.strokeRect(64, 0, 64, 64);
    ctx.strokeRect(0, 64, 64, 64);
    ctx.strokeRect(64, 64, 64, 64);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.repeat.set(repeatsX, repeatsY);
  tex.needsUpdate = true;
  return tex;
}

function createConcentricRugTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const cx = 128;
  const cy = 128;
  const rings = [
    { r: 126, color: '#4a3525' },
    { r: 108, color: '#2d6a4f' },
    { r: 86, color: '#7f5539' },
    { r: 64, color: '#40916c' },
    { r: 42, color: '#9c6644' },
    { r: 22, color: '#52b788' },
  ];
  rings.forEach((ring) => {
    ctx.beginPath();
    ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
    ctx.fillStyle = ring.color;
    ctx.fill();
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export const PlayerHome2D: React.FC<PlayerHome2DProps> = ({
  gameState,
  onUpdateWalletAndCred,
  onGoToDrive,
  onOpenPhone,
  onOpenPosOrBank,
}) => {
  const walletNaira = gameState.walletNaira || 0;
  const bankBalanceNaira = gameState.bankBalanceNaira ?? 250000;
  const energy = gameState.needs?.energy ?? 85;
  const maxEnergy = 100;

  const mountRef = useRef<HTMLDivElement | null>(null);
  const [cleanModelOnly, setCleanModelOnly] = useState<boolean>(false);
  // Default to false so player STARTS IN SINGLE ROOM (Face-Me-I-Face-You), with luxury rooms locked!
  const [showAllRoomsUnveiled, setShowAllRoomsUnveiled] = useState<boolean>(false);
  const [activeRoom, setActiveRoom] = useState<RoomId>('bedroom_minor');
  const [statusToast, setStatusToast] = useState<string>(
    '🏠 Welcome home! Drag to orbit the 3D isometric apartment or click any room floor to walk.'
  );
  const [showUpgradeDrawer, setShowUpgradeDrawer] = useState<boolean>(false);
  const [unlockedTierIndex, setUnlockedTierIndex] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('danfo_home_3d_tier') || '0') || 0;
    } catch {
      return 0;
    }
  });

  const playerTargetRef = useRef<{ x: number; z: number }>({ x: -7.5, z: 6.0 });
  const playerPosRef = useRef<{ x: number; z: number; yaw: number }>({ x: -7.5, z: 6.0, yaw: 0 });
  const orbitRef = useRef<{ azimuth: number; polar: number; zoom: number }>({
    azimuth: Math.PI / 4, // 45 deg true isometric angle
    polar: 0.88, // high-angle 3/4 top-down dimetric tilt
    zoom: 1.05,
  });
  const roomVeilMeshesRef = useRef<Record<string, THREE.Mesh>>({});

  // Sync room lock veils when showAllRoomsUnveiled or unlockedTierIndex changes
  useEffect(() => {
    Object.entries(roomVeilMeshesRef.current).forEach(([roomId, mesh]) => {
      const roomDef = APARTMENT_ROOMS.find((r) => r.id === roomId);
      if (!roomDef) return;
      const isLocked = roomDef.tierRequired > unlockedTierIndex;
      mesh.visible = !showAllRoomsUnveiled && isLocked;
    });
  }, [showAllRoomsUnveiled, unlockedTierIndex]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. SCENE & VOID BACKGROUND
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090b10'); // Clean, dark, non-descript void background

    // 2. HIGH-ANGLE DIMETRIC / ISOMETRIC ORTHOGRAPHIC CAMERA (3/4 Top-Down)
    const aspect = width / height;
    const frustumSize = 27;
    const camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      -100,
      200
    );

    const updateCameraTransform = () => {
      const { azimuth, polar, zoom } = orbitRef.current;
      const radius = 36;
      camera.position.set(
        Math.sin(azimuth) * Math.sin(polar) * radius,
        Math.cos(polar) * radius,
        Math.cos(azimuth) * Math.sin(polar) * radius
      );
      camera.lookAt(0, 0.8, 0);
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    };
    updateCameraTransform();

    // 3. RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. LIGHTING SETUP: Dim stylized night-time indoor ambient base + focused room point lights
    const ambientLight = new THREE.AmbientLight('#273045', 0.95);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight('#3b4968', '#141a24', 0.55);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight('#64748b', 0.45);
    dirLight.position.set(16, 28, 18);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    scene.add(dirLight);

    const flatMat = (color: string, roughness = 0.85, metalness = 0.05) =>
      new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        flatShading: true,
      });

    // 5. MODEL BASE: Simplified flat green circular grass patch directly below the model
    const grassGroup = new THREE.Group();
    const grassGeo = new THREE.CylinderGeometry(16.8, 17.3, 0.5, 48);
    const grassMat = flatMat('#2d6a3e', 0.95, 0);
    const grassMesh = new THREE.Mesh(grassGeo, grassMat);
    grassMesh.position.y = -0.35;
    grassMesh.receiveShadow = true;
    grassGroup.add(grassMesh);

    const soilRimGeo = new THREE.CylinderGeometry(17.3, 17.5, 0.25, 48);
    const soilRimMesh = new THREE.Mesh(soilRimGeo, flatMat('#1e293b', 0.9, 0));
    soilRimMesh.position.y = -0.62;
    grassGroup.add(soilRimMesh);

    // Concrete foundation slab under the apartment
    const slabGeo = new THREE.BoxGeometry(22.4, 0.22, 19.4);
    const slabMesh = new THREE.Mesh(slabGeo, flatMat('#334155', 0.9, 0));
    slabMesh.position.set(0, -0.09, 0);
    slabMesh.receiveShadow = true;
    grassGroup.add(slabMesh);
    scene.add(grassGroup);

    // 6. PROCEDURAL CHECKERED FLOOR TILES (Matching JSON Spec)
    const texturesToDispose: THREE.Texture[] = [];
    const bwCheckerLiving = createCheckeredTexture('#1e1e24', '#e4e4e7', 6.5, 5.5);
    const bwCheckerEntrance = createCheckeredTexture('#1e1e24', '#e4e4e7', 2, 2.5);
    const brownCheckerKitchen = createCheckeredTexture('#a67c52', '#d4b483', 4.5, 3.5);
    const brownCheckerMajorBed = createCheckeredTexture('#a67c52', '#d4b483', 5.2, 4);
    const brownCheckerMinorBed = createCheckeredTexture('#a67c52', '#d4b483', 3.5, 3.5);
    const bathTileMajor = createCheckeredTexture('#94a3b8', '#cbd5e1', 3, 5, true);
    const bathTileMinor = createCheckeredTexture('#94a3b8', '#cbd5e1', 3, 3, true);
    const rugTex = createConcentricRugTexture();
    texturesToDispose.push(
      bwCheckerLiving,
      bwCheckerEntrance,
      brownCheckerKitchen,
      brownCheckerMajorBed,
      brownCheckerMinorBed,
      bathTileMajor,
      bathTileMinor,
      rugTex
    );

    const floorMeshes: THREE.Mesh[] = [];
    const addRoomFloor = (
      minX: number,
      maxX: number,
      minZ: number,
      maxZ: number,
      tex: THREE.CanvasTexture,
      roomId: RoomId
    ) => {
      const w = maxX - minX;
      const d = maxZ - minZ;
      const geo = new THREE.PlaneGeometry(w, d);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.8,
        metalness: 0.05,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set((minX + maxX) / 2, 0.02, (minZ + maxZ) / 2);
      mesh.receiveShadow = true;
      mesh.userData = { roomId };
      scene.add(mesh);
      floorMeshes.push(mesh);
    };

    // Build all 7 room floors
    addRoomFloor(-2, 11, -9.5, 1.5, bwCheckerLiving, 'main_living_recreation_room');
    addRoomFloor(-6, -2, -2.5, 2.5, bwCheckerEntrance, 'entrance_area');
    addRoomFloor(-11, -2, -9.5, -2.5, brownCheckerKitchen, 'kitchen_dining_area');
    addRoomFloor(-4, 6.5, 1.5, 9.5, brownCheckerMajorBed, 'bedroom_major_studio');
    addRoomFloor(-11, -4, 2.5, 9.5, brownCheckerMinorBed, 'bedroom_minor');
    addRoomFloor(6.5, 11, 1.5, 9.5, bathTileMajor, 'bathroom_major');
    addRoomFloor(-11, -6, -2.5, 2.5, bathTileMinor, 'bathroom_minor');

    // 7. CLEAN SIMPLIFIED WALL DIVISIONS (Unroofed for full interior visibility)
    const wallHeight = 3.1;
    const wallThickness = 0.24;
    const wallMat = flatMat('#64748b', 0.85, 0.05);
    const wallTopCapMat = flatMat('#334155', 0.9, 0.05);

    const addWallSegment = (x1: number, z1: number, x2: number, z2: number, height = wallHeight) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      const angle = Math.atan2(dx, dz);

      const group = new THREE.Group();
      const wallGeo = new THREE.BoxGeometry(wallThickness, height, len + wallThickness * 0.5);
      const wallMesh = new THREE.Mesh(wallGeo, wallMat);
      wallMesh.position.y = height / 2;
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      group.add(wallMesh);

      // Crisp clean top trim edge
      const capGeo = new THREE.BoxGeometry(wallThickness + 0.04, 0.08, len + wallThickness * 0.6);
      const capMesh = new THREE.Mesh(capGeo, wallTopCapMat);
      capMesh.position.y = height + 0.04;
      group.add(capMesh);

      group.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
      group.rotation.y = angle;
      scene.add(group);
    };

    // Outer Perimeter Walls
    addWallSegment(-11, -9.5, 11, -9.5); // North wall
    addWallSegment(11, -9.5, 11, 9.5); // East wall
    addWallSegment(-11, 9.5, 11, 9.5); // South wall
    addWallSegment(-11, -9.5, -11, -1.2); // West wall upper
    addWallSegment(-11, 0.8, -11, 9.5); // West wall lower

    // Interior Partition Walls with Doorway Gaps
    // Between Kitchen (-11..-2) and Entrance/Minor Bath (z = -2.5)
    addWallSegment(-11, -2.5, -5.2, -2.5);
    addWallSegment(-3.4, -2.5, -2, -2.5);

    // Between Kitchen/Entrance and Main Living Room (x = -2, z = -9.5..1.5)
    addWallSegment(-2, -9.5, -2, -5.8);
    addWallSegment(-2, -3.8, -2, -1.2);
    addWallSegment(-2, 0.6, -2, 1.5);

    // Between Minor Bath (-11..-6) and Entrance (-6..-2) at x = -6
    addWallSegment(-6, -2.5, -6, -0.7);
    addWallSegment(-6, 0.7, -6, 2.5);

    // Between Minor Bedroom and Entrance/Minor Bath (z = 2.5, x = -11..-4)
    addWallSegment(-11, 2.5, -5.8, 2.5);

    // Between Minor Bedroom and Major Studio Bedroom (x = -4, z = 2.5..9.5)
    addWallSegment(-4, 1.5, -4, 9.5);

    // Between Main Living Room and Major Studio / Master Bath (z = 1.5, x = -4..11)
    addWallSegment(-4, 1.5, 0.2, 1.5);
    addWallSegment(2.2, 1.5, 7.6, 1.5);
    addWallSegment(9.2, 1.5, 11, 1.5);

    // Between Major Studio Bedroom and Master Bathroom (x = 6.5, z = 1.5..9.5)
    addWallSegment(6.5, 1.5, 6.5, 4.6);
    addWallSegment(6.5, 6.2, 6.5, 9.5);

    // 8. WALL-MOUNTED POINT LIGHT FIXTURES (Globes on arm in all rooms)
    const addWallGlobeLight = (
      x: number,
      z: number,
      armDirX: number,
      armDirZ: number,
      color = '#ffedd5',
      intensity = 6.5,
      distance = 11
    ) => {
      const fixtureGroup = new THREE.Group();
      fixtureGroup.position.set(x, 2.35, z);

      // Wall backplate
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.18), flatMat('#1e293b'));
      fixtureGroup.add(plate);

      // Horizontal arm
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.38, 8),
        flatMat('#0f172a', 0.4, 0.6)
      );
      arm.rotation.z = armDirX !== 0 ? Math.PI / 2 : 0;
      arm.rotation.x = armDirZ !== 0 ? Math.PI / 2 : 0;
      arm.position.set(armDirX * 0.2, 0.05, armDirZ * 0.2);
      fixtureGroup.add(arm);

      // Glowing Low-Poly Globe Bulb
      const bulbMat = new THREE.MeshStandardMaterial({
        color: '#fffbeb',
        emissive: color,
        emissiveIntensity: 2.2,
        roughness: 0.2,
        flatShading: true,
      });
      const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), bulbMat);
      bulb.position.set(armDirX * 0.38, 0.05, armDirZ * 0.38);
      fixtureGroup.add(bulb);

      const ptLight = new THREE.PointLight(color, intensity, distance, 1.5);
      ptLight.position.set(armDirX * 0.45, -0.05, armDirZ * 0.45);
      fixtureGroup.add(ptLight);

      scene.add(fixtureGroup);
    };

    // Place wall-mounted point lights in every room per JSON specification
    addWallGlobeLight(4.5, -9.3, 0, 1, '#fde68a', 9.5, 14); // Main living room north wall
    addWallGlobeLight(10.8, -3.5, -1, 0, '#fef3c7', 7.5, 12); // Main living room east wall
    addWallGlobeLight(-6.5, -9.3, 0, 1, '#fde68a', 7.5, 11); // Kitchen dining area
    addWallGlobeLight(-10.8, 6.0, 1, 0, '#fde68a', 6.5, 10); // Minor bedroom
    addWallGlobeLight(-10.8, 0.0, 1, 0, '#e0f2fe', 5.0, 8); // Minor bathroom
    addWallGlobeLight(-4.0, 2.35, 0, -1, '#fef3c7', 5.0, 8); // Entrance area
    addWallGlobeLight(1.5, 9.3, 0, -1, '#f3e8ff', 7.5, 12); // Major studio bedroom
    addWallGlobeLight(10.8, 5.5, -1, 0, '#e0f2fe', 6.5, 9); // Major bathroom

    // 9. ROOM 1: ENTRANCE AREA (Simplified welcome mat + clean wall hooks)
    {
      const matMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.04, 1.6),
        flatMat('#78350f')
      );
      matMesh.position.set(-5.2, 0.03, 0);
      scene.add(matMesh);

      // Wall hook rack
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 0.08), flatMat('#451a03'));
      rack.position.set(-3.8, 1.65, 2.34);
      scene.add(rack);
      [-4.2, -3.8, -3.4].forEach((hx) => {
        const hook = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.12), flatMat('#94a3b8'));
        hook.position.set(hx, 1.6, 2.28);
        scene.add(hook);
      });
    }

    // 10. ROOM 2: MAIN LIVING & RECREATION ROOM
    {
      // (a) Full-sized Pool Table with green felt, cues, and balls
      const poolGroup = new THREE.Group();
      poolGroup.position.set(2.2, 0, -5.6);

      // Wooden Cabinet Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.38, 2.1), flatMat('#5c3a21'));
      body.position.y = 0.68;
      body.castShadow = true;
      poolGroup.add(body);

      // 4 sturdy low-poly legs
      [
        [-1.6, -0.8],
        [1.6, -0.8],
        [-1.6, 0.8],
        [1.6, 0.8],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.1, 0.55, 6),
          flatMat('#3b2313')
        );
        leg.position.set(lx, 0.28, lz);
        leg.castShadow = true;
        poolGroup.add(leg);
      });

      // Green Felt Playing Surface
      const felt = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.06, 1.8), flatMat('#15803d', 0.9));
      felt.position.y = 0.89;
      poolGroup.add(felt);

      // Wooden Cushions / Rails
      const railH = new THREE.Mesh(new THREE.BoxGeometry(3.84, 0.12, 0.16), flatMat('#451a03'));
      const railNorth = railH.clone();
      railNorth.position.set(0, 0.93, -0.98);
      const railSouth = railH.clone();
      railSouth.position.set(0, 0.93, 0.98);
      const railV = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 1.84), flatMat('#451a03'));
      const railWest = railV.clone();
      railWest.position.set(-1.84, 0.93, 0);
      const railEast = railV.clone();
      railEast.position.set(1.84, 0.93, 0);
      poolGroup.add(railNorth, railSouth, railWest, railEast);

      // 6 Corner/Side Pockets
      [
        [-1.72, -0.88],
        [0, -0.9],
        [1.72, -0.88],
        [-1.72, 0.88],
        [0, 0.9],
        [1.72, 0.88],
      ].forEach(([px, pz]) => {
        const pocket = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.11, 0.14, 8),
          flatMat('#09090b')
        );
        pocket.position.set(px, 0.94, pz);
        poolGroup.add(pocket);
      });

      // Billiard Balls (Cue ball + colorful rack)
      const ballColors = ['#f8fafc', '#facc15', '#ef4444', '#3b82f6', '#a855f7', '#f97316', '#10b981', '#18181b'];
      const ballPositions = [
        [-0.9, 0.05],
        [0.55, 0],
        [0.7, -0.09],
        [0.7, 0.09],
        [0.85, -0.17],
        [0.85, 0],
        [0.85, 0.17],
        [0.1, -0.35],
      ];
      ballPositions.forEach(([bx, bz], i) => {
        const ball = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.065, 1),
          flatMat(ballColors[i % ballColors.length], 0.3, 0.1)
        );
        ball.position.set(bx, 0.98, bz);
        poolGroup.add(ball);
      });

      // 2 Pool Cues resting on table
      const cueGeo = new THREE.CylinderGeometry(0.015, 0.028, 2.1, 6);
      const cue1 = new THREE.Mesh(cueGeo, flatMat('#d97706'));
      cue1.rotation.z = Math.PI / 2;
      cue1.rotation.y = 0.18;
      cue1.position.set(-0.3, 0.99, 0.45);
      const cue2 = new THREE.Mesh(cueGeo, flatMat('#b45309'));
      cue2.rotation.z = Math.PI / 2;
      cue2.rotation.y = -0.12;
      cue2.position.set(-0.2, 0.99, -0.52);
      poolGroup.add(cue1, cue2);

      scene.add(poolGroup);

      // (b) Concentric Patterned Round Rug (Green & Brown)
      const rugMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(2.35, 2.35, 0.03, 32),
        new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.95 })
      );
      rugMesh.position.set(7.2, 0.035, -3.6);
      rugMesh.receiveShadow = true;
      scene.add(rugMesh);

      // (c) Large Black Multi-Seater Sofa (L-Shaped Modern Low-Poly)
      const sofaGroup = new THREE.Group();
      sofaGroup.position.set(6.8, 0, -1.1);
      const sofaMat = flatMat('#18181b', 0.85, 0.05);
      const cushionMat = flatMat('#27272a', 0.8, 0.05);

      const baseMain = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.38, 1.25), sofaMat);
      baseMain.position.set(0, 0.22, 0);
      baseMain.castShadow = true;
      sofaGroup.add(baseMain);

      const backMain = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.65, 0.28), sofaMat);
      backMain.position.set(0, 0.62, 0.48);
      backMain.castShadow = true;
      sofaGroup.add(backMain);

      // Chaise lounge extension
      const chaise = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.38, 1.3), sofaMat);
      chaise.position.set(-1.27, 0.22, -1.15);
      chaise.castShadow = true;
      sofaGroup.add(chaise);

      // Seat cushions
      [-1.2, 0, 1.2].forEach((cx) => {
        const cush = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.14, 0.95), cushionMat);
        cush.position.set(cx, 0.45, -0.05);
        sofaGroup.add(cush);
      });
      scene.add(sofaGroup);

      // (d) Large Flat-Screen TV on Modern Wooden Console Unit (against East wall)
      const tvGroup = new THREE.Group();
      tvGroup.position.set(10.25, 0, -3.6);

      const consoleUnit = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 3.2), flatMat('#78350f'));
      consoleUnit.position.y = 0.3;
      consoleUnit.castShadow = true;
      tvGroup.add(consoleUnit);

      const tvPanel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.35, 2.5), flatMat('#09090b', 0.3, 0.4));
      tvPanel.position.set(-0.05, 1.4, 0);
      tvGroup.add(tvPanel);

      const tvScreen = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 1.22, 2.36),
        new THREE.MeshStandardMaterial({
          color: '#1e293b',
          emissive: '#0ea5e9',
          emissiveIntensity: 0.35,
          roughness: 0.2,
        })
      );
      tvScreen.position.set(-0.1, 1.4, 0);
      tvGroup.add(tvScreen);
      scene.add(tvGroup);

      // (e) Open Wall Shelving with Simplified Props (North Wall)
      const shelfGroup = new THREE.Group();
      shelfGroup.position.set(7.5, 1.5, -9.15);
      [0, 0.55].forEach((sy) => {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.35), flatMat('#78350f'));
        plank.position.y = sy;
        shelfGroup.add(plank);
      });
      const propA = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.35, 0.22), flatMat('#10b981'));
      propA.position.set(-0.6, 0.22, 0);
      const propB = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.34, 7), flatMat('#f59e0b'));
      propB.position.set(0.4, 0.75, 0);
      shelfGroup.add(propA, propB);
      scene.add(shelfGroup);
    }

    // 11. ROOM 3: KITCHEN & DINING AREA (Circular dining table with 4 chairs + microwave on stand)
    {
      const diningGroup = new THREE.Group();
      diningGroup.position.set(-5.8, 0, -6.2);

      // Circular Dining Table
      const tableTop = new THREE.Mesh(
        new THREE.CylinderGeometry(1.35, 1.35, 0.1, 20),
        flatMat('#e2e8f0', 0.7)
      );
      tableTop.position.y = 0.82;
      tableTop.castShadow = true;
      diningGroup.add(tableTop);

      const tablePedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.22, 0.78, 10),
        flatMat('#334155')
      );
      tablePedestal.position.y = 0.4;
      diningGroup.add(tablePedestal);

      // 4 Low-Poly Dining Chairs around the table
      [
        [0, -1.75, 0],
        [0, 1.75, Math.PI],
        [-1.75, 0, Math.PI / 2],
        [1.75, 0, -Math.PI / 2],
      ].forEach(([cx, cz, rotY]) => {
        const chair = new THREE.Group();
        chair.position.set(cx, 0, cz);
        chair.rotation.y = rotY;
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.62), flatMat('#475569'));
        seat.position.y = 0.48;
        seat.castShadow = true;
        chair.add(seat);
        const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 0.08), flatMat('#334155'));
        backrest.position.set(0, 0.78, -0.27);
        chair.add(backrest);
        const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.22, 0.46, 6), flatMat('#1e293b'));
        chairBase.position.y = 0.23;
        chair.add(chairBase);
        diningGroup.add(chair);
      });
      scene.add(diningGroup);

      // Microwave on a Separate Stand (North-West Kitchen Corner)
      const mwGroup = new THREE.Group();
      mwGroup.position.set(-9.6, 0, -8.4);
      const stand = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.88, 0.85), flatMat('#475569'));
      stand.position.y = 0.44;
      stand.castShadow = true;
      mwGroup.add(stand);

      const microwave = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.46, 0.55), flatMat('#e2e8f0'));
      microwave.position.set(0, 1.12, 0);
      mwGroup.add(microwave);

      const mwWindow = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.3, 0.04),
        new THREE.MeshStandardMaterial({ color: '#0f172a', emissive: '#38bdf8', emissiveIntensity: 0.4 })
      );
      mwWindow.position.set(-0.1, 1.12, 0.27);
      mwGroup.add(mwWindow);
      scene.add(mwGroup);
    }

    // 12. ROOM 4: BEDROOM MAJOR STUDIO (Double bed with purple bedding, PC work desk, circular ring light)
    {
      // (a) Double Bed with Specific Purple Bedding and Brown Frame
      const bedGroup = new THREE.Group();
      bedGroup.position.set(-1.3, 0, 6.7);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.38, 3.2), flatMat('#5c3a21'));
      frame.position.y = 0.22;
      frame.castShadow = true;
      bedGroup.add(frame);

      const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.15, 0.22), flatMat('#451a03'));
      headboard.position.set(0, 0.65, 1.5);
      bedGroup.add(headboard);

      // Purple mattress & duvet
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.28, 2.95), flatMat('#9333ea'));
      mattress.position.set(0, 0.52, -0.02);
      bedGroup.add(mattress);

      const blanket = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.3, 2.05), flatMat('#6b21a8'));
      blanket.position.set(0, 0.54, -0.45);
      bedGroup.add(blanket);

      // Two pillows
      [-0.62, 0.62].forEach((px) => {
        const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 0.55), flatMat('#e9d5ff'));
        pillow.position.set(px, 0.72, 1.05);
        bedGroup.add(pillow);
      });
      scene.add(bedGroup);

      // (b) Modern Work Desk with Office Chair, Computer, Monitor & Small Details
      const deskGroup = new THREE.Group();
      deskGroup.position.set(4.1, 0, 7.8);

      const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.1), flatMat('#78350f'));
      deskTop.position.y = 0.82;
      deskTop.castShadow = true;
      deskGroup.add(deskTop);

      const deskLegL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 1.0), flatMat('#1e293b'));
      deskLegL.position.set(-1.08, 0.4, 0);
      const deskLegR = deskLegL.clone();
      deskLegR.position.set(1.08, 0.4, 0);
      deskGroup.add(deskLegL, deskLegR);

      // Monitor
      const monitor = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 0.62, 0.08),
        new THREE.MeshStandardMaterial({ color: '#0f172a', emissive: '#38bdf8', emissiveIntensity: 0.65 })
      );
      monitor.position.set(-0.15, 1.28, 0.25);
      deskGroup.add(monitor);

      // PC Tower
      const pcTower = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.58, 0.55), flatMat('#09090b'));
      pcTower.position.set(0.82, 1.16, 0.15);
      deskGroup.add(pcTower);

      // Office Chair
      const officeChair = new THREE.Group();
      officeChair.position.set(-0.15, 0, -0.85);
      const cSeat = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.1, 0.68), flatMat('#1e293b'));
      cSeat.position.y = 0.5;
      const cBack = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.72, 0.1), flatMat('#1e293b'));
      cBack.position.set(0, 0.88, -0.3);
      const cPost = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.28, 0.48, 6), flatMat('#09090b'));
      cPost.position.y = 0.24;
      officeChair.add(cSeat, cBack, cPost);
      deskGroup.add(officeChair);
      scene.add(deskGroup);

      // (c) Large Professional Circular Ring Light on a Black Tripod Stand
      const ringGroup = new THREE.Group();
      ringGroup.position.set(2.3, 0, 5.2);

      // 3 Black Tripod Legs
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3;
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 0.95, 6),
          flatMat('#09090b')
        );
        leg.position.set(Math.cos(angle) * 0.28, 0.4, Math.sin(angle) * 0.28);
        leg.rotation.z = -Math.cos(angle) * 0.35;
        leg.rotation.x = Math.sin(angle) * 0.35;
        ringGroup.add(leg);
      }

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.45, 8), flatMat('#09090b'));
      stem.position.y = 1.15;
      ringGroup.add(stem);

      const ringTorus = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.055, 8, 24),
        new THREE.MeshStandardMaterial({
          color: '#ffffff',
          emissive: '#e0f2fe',
          emissiveIntensity: 3.0,
          roughness: 0.1,
        })
      );
      ringTorus.position.y = 2.15;
      ringTorus.rotation.y = -0.5;
      ringGroup.add(ringTorus);

      const ringPointLight = new THREE.PointLight('#e0f2fe', 8.0, 10, 1.4);
      ringPointLight.position.set(0, 2.15, 0);
      ringGroup.add(ringPointLight);
      scene.add(ringGroup);
    }

    // 13. ROOM 5: BEDROOM MINOR (Starter Room: Single bed with simplified bedding + nightstand)
    {
      const minorBedGroup = new THREE.Group();
      minorBedGroup.position.set(-8.8, 0, 7.2);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.34, 2.8), flatMat('#5c3a21'));
      frame.position.y = 0.2;
      frame.castShadow = true;
      minorBedGroup.add(frame);

      const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.24, 2.65), flatMat('#cbd5e1'));
      mattress.position.y = 0.46;
      minorBedGroup.add(mattress);

      const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.26, 1.75), flatMat('#3b82f6'));
      blanket.position.set(0, 0.48, -0.4);
      minorBedGroup.add(blanket);

      const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.5), flatMat('#f8fafc'));
      pillow.position.set(0, 0.62, 0.92);
      minorBedGroup.add(pillow);
      scene.add(minorBedGroup);

      // Nightstand
      const nightstand = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.62, 0.75), flatMat('#78350f'));
      nightstand.position.set(-6.8, 0.32, 8.2);
      nightstand.castShadow = true;
      scene.add(nightstand);
    }

    // 14. ROOM 6: BATHROOM MAJOR (White bathtub + standing toilet & sink unit)
    {
      // White Bathtub
      const tubGroup = new THREE.Group();
      tubGroup.position.set(9.7, 0, 6.8);
      const tubOuter = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.68, 2.9), flatMat('#f8fafc', 0.4));
      tubOuter.position.y = 0.35;
      tubOuter.castShadow = true;
      tubGroup.add(tubOuter);

      const tubWater = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.1, 2.55), flatMat('#38bdf8', 0.2));
      tubWater.position.y = 0.66;
      tubGroup.add(tubWater);
      scene.add(tubGroup);

      // Standing Toilet & Sink Unit
      const sinkUnit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.82, 1.2), flatMat('#e2e8f0'));
      sinkUnit.position.set(7.2, 0.41, 3.2);
      scene.add(sinkUnit);

      const toilet = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 0.75), flatMat('#f8fafc'));
      toilet.position.set(7.2, 0.38, 8.2);
      scene.add(toilet);
    }

    // 15. ROOM 7: BATHROOM MINOR (Standing toilet & sink + small trash bin)
    {
      const minorSink = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.9), flatMat('#f1f5f9'));
      minorSink.position.set(-10.2, 0.4, -1.3);
      scene.add(minorSink);

      const minorToilet = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.72, 0.7), flatMat('#f8fafc'));
      minorToilet.position.set(-10.2, 0.36, 1.3);
      scene.add(minorToilet);

      const trashBin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.18, 0.45, 10),
        flatMat('#475569')
      );
      trashBin.position.set(-7.2, 0.23, -1.6);
      scene.add(trashBin);
    }

    // 16. ROOM LOCK VEIL MESHES (When viewing in Starter Room Progression Mode)
    const veilMap: Record<string, THREE.Mesh> = {};
    APARTMENT_ROOMS.forEach((r) => {
      const w = r.bounds.maxX - r.bounds.minX;
      const d = r.bounds.maxZ - r.bounds.minZ;
      const veilGeo = new THREE.BoxGeometry(w - 0.15, 3.05, d - 0.15);
      const veilMat = new THREE.MeshStandardMaterial({
        color: '#090d16',
        transparent: true,
        opacity: 0.84,
        roughness: 1,
      });
      const veilMesh = new THREE.Mesh(veilGeo, veilMat);
      veilMesh.position.set(r.center.x, 1.55, r.center.z);
      veilMesh.visible = !showAllRoomsUnveiled && r.tierRequired > unlockedTierIndex;
      scene.add(veilMesh);
      veilMap[r.id] = veilMesh;
    });
    roomVeilMeshesRef.current = veilMap;

    // 17. LOW-POLY 3D DRIVER AVATAR IN THE APARTMENT
    const avatarGroup = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.32), flatMat('#facc15')); // Danfo yellow shirt
    torso.position.y = 0.88;
    torso.castShadow = true;
    avatarGroup.add(torso);

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), flatMat('#78350f'));
    head.position.y = 1.44;
    head.castShadow = true;
    avatarGroup.add(head);

    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.52, 0.28), flatMat('#1e293b'));
    legs.position.y = 0.26;
    avatarGroup.add(legs);

    // Selection ring under player
    const ringGeo = new THREE.RingGeometry(0.36, 0.48, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#34d399', side: THREE.DoubleSide });
    const footRing = new THREE.Mesh(ringGeo, ringMat);
    footRing.rotation.x = -Math.PI / 2;
    footRing.position.y = 0.04;
    avatarGroup.add(footRing);

    avatarGroup.position.set(playerPosRef.current.x, 0, playerPosRef.current.z);
    scene.add(avatarGroup);

    // 18. POINTER INTERACTION: Click floor to walk OR drag to orbit 3D isometric model
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let downX = 0;
    let downY = 0;
    let movedDist = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      downX = e.clientX;
      downY = e.clientY;
      movedDist = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      movedDist += Math.hypot(dx, dy);
      downX = e.clientX;
      downY = e.clientY;

      orbitRef.current.azimuth -= dx * 0.0065;
      orbitRef.current.polar = Math.max(0.45, Math.min(1.22, orbitRef.current.polar - dy * 0.005));
      updateCameraTransform();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;

      // If click (not drag), raycast floor to move avatar to that room
      if (movedDist < 8) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(floorMeshes, false);
        if (hits.length > 0) {
          const hit = hits[0];
          const roomId = hit.object.userData.roomId as RoomId;
          const roomDef = APARTMENT_ROOMS.find((r) => r.id === roomId);
          if (roomDef) {
            playerTargetRef.current = {
              x: Math.max(roomDef.bounds.minX + 0.8, Math.min(roomDef.bounds.maxX - 0.8, hit.point.x)),
              z: Math.max(roomDef.bounds.minZ + 0.8, Math.min(roomDef.bounds.maxZ - 0.8, hit.point.z)),
            };
            setActiveRoom(roomId);
            setStatusToast(`🚶 Walking to ${roomDef.name}: ${roomDef.description}`);
          }
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbitRef.current.zoom = Math.max(0.65, Math.min(2.1, orbitRef.current.zoom - e.deltaY * 0.001));
      updateCameraTransform();
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    domElem.addEventListener('wheel', onWheel, { passive: false });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const asp = w / h;
      camera.left = (-frustumSize * asp) / 2;
      camera.right = (frustumSize * asp) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = -frustumSize / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 19. ANIMATION LOOP
    let reqId = 0;
    let lastTime = performance.now();
    const animate = (now: number) => {
      reqId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // Move avatar smoothly toward target
      const pos = playerPosRef.current;
      const tgt = playerTargetRef.current;
      const dx = tgt.x - pos.x;
      const dz = tgt.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.08) {
        const speed = 5.5;
        const step = Math.min(dist, speed * dt);
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;
        pos.yaw = Math.atan2(dx, dz);
        avatarGroup.position.set(pos.x, Math.abs(Math.sin(now * 0.012)) * 0.08, pos.z);
        avatarGroup.rotation.y = pos.yaw;
      } else {
        avatarGroup.position.set(pos.x, 0, pos.z);
      }

      renderer.render(scene, camera);
    };
    reqId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(reqId);
      domElem.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      domElem.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);

      texturesToDispose.forEach((t) => t.dispose());
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
          else mesh.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, []);

  const currentRoomDef = APARTMENT_ROOMS.find((r) => r.id === activeRoom) || APARTMENT_ROOMS[0];

  const jumpToRoom = (roomId: RoomId) => {
    const def = APARTMENT_ROOMS.find((r) => r.id === roomId);
    if (!def) return;
    playerTargetRef.current = { x: def.center.x, z: def.center.z };
    setActiveRoom(roomId);
    setStatusToast(`📍 Moved to ${def.name}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090b10] flex flex-col overflow-hidden select-none">
      {/* 3D LOW-POLY ISOMETRIC APARTMENT VIEWPORT */}
      <div ref={mountRef} className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* FLOATING TOGGLE FOR PURE 3D ASSET VIEW (WITHOUT GAME UI OVERLAYS) */}
      <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
        <button
          onClick={() => setCleanModelOnly((v) => !v)}
          className="px-3 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-amber-400/60 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow-xl backdrop-blur"
          title="Toggle pure 3D isometric model without game UI overlays"
        >
          {cleanModelOnly ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{cleanModelOnly ? 'SHOW GAME UI' : 'PURE 3D MODEL (NO UI)'}</span>
        </button>

        {!cleanModelOnly && (
          <>
            <button
              onClick={onOpenPhone}
              className="px-3 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-mono font-bold flex items-center gap-1 shadow-xl"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>PHONE</span>
            </button>
            <button
              onClick={onGoToDrive}
              className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-['Bungee'] text-xs shadow-xl active:scale-95"
            >
              🚌 BACK TO BUS
            </button>
          </>
        )}
      </div>

      {/* GAME UI OVERLAYS (HIDDEN WHEN IN PURE 3D MODEL MODE) */}
      {!cleanModelOnly && (
        <>
          {/* TOP-LEFT COMPACT HEADER & CAMERA / ROOM MODE CONTROLS */}
          <div className="absolute top-3 left-3 z-40 flex flex-wrap items-center gap-2 pointer-events-auto">
            <div className="bg-stone-950/90 border border-stone-700/80 rounded-xl px-3 py-1.5 flex items-center gap-3 shadow-xl backdrop-blur">
              <div className="flex items-center gap-1.5">
                <Home className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-['Bungee'] text-white">3D HOME</span>
              </div>
              <button
                onClick={() => onOpenPosOrBank?.('POS_KIOSK')}
                className="flex items-center gap-1 text-xs font-mono font-black text-emerald-400 hover:text-emerald-300 cursor-pointer tabular-nums"
                title="Wallet Cash (Click for POS Kiosk)"
              >
                <span>₦{walletNaira.toLocaleString()}</span>
              </button>
              <span className="text-stone-700">·</span>
              <button
                onClick={() => onOpenPosOrBank?.('BANK_HALL')}
                className="flex items-center gap-1 text-xs font-mono font-black text-sky-400 hover:text-sky-300 cursor-pointer tabular-nums"
                title="Bank Account (Click for Bank Hall)"
              >
                <span>🏦 ₦{bankBalanceNaira.toLocaleString()}</span>
              </button>
              <div className="flex items-center gap-1 text-xs font-mono text-sky-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {Math.round(energy)}/{maxEnergy}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowAllRoomsUnveiled((v) => !v)}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-mono font-bold flex items-center gap-1 shadow-lg ${
                showAllRoomsUnveiled
                  ? 'bg-emerald-950/90 border-emerald-400/60 text-emerald-300'
                  : 'bg-stone-900/90 border-stone-700 text-stone-300'
              }`}
            >
              {showAllRoomsUnveiled ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{showAllRoomsUnveiled ? 'ALL 7 ROOMS UNROOFED' : 'STARTER ROOM LOCK MODE'}</span>
            </button>

            <button
              onClick={() => {
                orbitRef.current = { azimuth: Math.PI / 4, polar: 0.88, zoom: 1.05 };
              }}
              className="px-2.5 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-700 text-stone-300 text-[11px] font-mono font-bold flex items-center gap-1 shadow-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ISO VIEW</span>
            </button>

            <button
              onClick={() => setShowUpgradeDrawer((v) => !v)}
              className="px-2.5 py-1.5 rounded-xl bg-purple-950/90 hover:bg-purple-900 border border-purple-400/60 text-purple-200 text-[11px] font-mono font-bold flex items-center gap-1 shadow-lg"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>EXPAND ROOMS ({unlockedTierIndex + 1}/{HOME_UPGRADE_TIERS.length})</span>
            </button>
          </div>

          {/* REAL ESTATE UPGRADE DRAWER */}
          {showUpgradeDrawer && (
            <div className="absolute top-16 left-3 z-50 w-80 max-w-[92vw] bg-stone-950/95 border border-stone-700 rounded-2xl p-3 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-['Bungee'] text-amber-400">EXPAND APARTMENT ROOMS</span>
                <button
                  onClick={() => setShowUpgradeDrawer(false)}
                  className="text-xs font-mono text-stone-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {HOME_UPGRADE_TIERS.map((tier, idx) => {
                  const isOwned = idx <= unlockedTierIndex;
                  return (
                    <div
                      key={tier.id}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                        isOwned
                          ? 'bg-emerald-500/10 border-emerald-500/40'
                          : 'bg-stone-900/80 border-stone-800'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{tier.name}</div>
                        <div className="text-[10px] font-mono text-stone-400">{tier.location}</div>
                      </div>
                      {isOwned ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                          UNLOCKED
                        </span>
                      ) : (
                        <button
                          disabled={walletNaira < tier.purchaseCostNaira}
                          onClick={() => {
                            if (walletNaira < tier.purchaseCostNaira) return;
                            onUpdateWalletAndCred(-tier.purchaseCostNaira, 25);
                            setUnlockedTierIndex(idx);
                            try {
                              localStorage.setItem('danfo_home_3d_tier', String(idx));
                            } catch {}
                            setStatusToast(`🎉 Unlocked ${tier.name}!`);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-400 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 text-[10px] font-mono font-black"
                        >
                          ₦{tier.purchaseCostNaira.toLocaleString()}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* BOTTOM COMPACT ROOM TELEPORT & HOME ACTIONS BAR */}
          <div className="absolute bottom-3 left-3 right-3 z-40 flex flex-col sm:flex-row items-center justify-between gap-2 pointer-events-auto">
            {/* Room Selector Pills */}
            <div className="flex flex-wrap items-center gap-1 bg-stone-950/90 border border-stone-700/80 rounded-2xl p-1.5 shadow-xl backdrop-blur">
              {APARTMENT_ROOMS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => jumpToRoom(r.id)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold transition-all ${
                    activeRoom === r.id
                      ? 'bg-amber-400 text-stone-950 shadow'
                      : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  {r.name.split(' (')[0]}
                </button>
              ))}
            </div>

            {/* Quick Home Actions (Sleep, Cook, Pool Table) */}
            <div className="flex items-center gap-1.5 bg-stone-950/90 border border-stone-700/80 rounded-2xl p-1.5 shadow-xl backdrop-blur">
              <button
                onClick={() => {
                  jumpToRoom(unlockedTierIndex >= 2 ? 'bedroom_major_studio' : 'bedroom_minor');
                  onUpdateWalletAndCred(0, 5, 100);
                  setStatusToast('😴 Slept soundly! Driver Energy restored to 100%.');
                }}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-mono font-bold flex items-center gap-1 active:scale-95"
              >
                <Bed className="w-3.5 h-3.5" />
                <span>SLEEP (100% ⚡)</span>
              </button>

              <button
                onClick={() => {
                  if (walletNaira < 1500) {
                    setStatusToast('⚠️ Need ₦1,500 to cook Jollof Rice & Plantain!');
                    return;
                  }
                  jumpToRoom('kitchen_dining_area');
                  onUpdateWalletAndCred(-1500, 3, Math.min(100, energy + 35));
                  setStatusToast('🍛 Ate hot Jollof at the circular dining table (+35 Energy).');
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-mono font-bold flex items-center gap-1 active:scale-95"
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>EAT (₦1.5k)</span>
              </button>

              <button
                onClick={() => {
                  jumpToRoom('main_living_recreation_room');
                  onUpdateWalletAndCred(0, 4, Math.min(100, energy + 15));
                  setStatusToast('🎱 Racked a frame on the green-felt pool table (+15 Energy)!');
                }}
                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-mono font-bold flex items-center gap-1 active:scale-95"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>POOL & TV</span>
              </button>
            </div>
          </div>

          {/* SUBTLE STATUS CAPTION */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-stone-950/80 border border-stone-800 px-3 py-1 rounded-full text-[11px] font-mono text-stone-300 shadow">
            {statusToast} • <span className="text-amber-300">{currentRoomDef.name}</span>
          </div>
        </>
      )}
    </div>
  );
};
export default PlayerHome2D;
