import * as THREE from 'three';
import {
  createAsphaltTexture,
  createSignboardTexture,
  createHighwayGantrySignTexture,
  createRoundaboutSignTexture,
  createCurbTexture,
} from './textures';
import { TrafficLightSystem, TrafficLightTelemetry } from './TrafficLightSystem';
import { WaypointGraph } from './WaypointGraph';

export type RoadTileType =
  | 'STRAIGHT_EXPRESSWAY'
  | 'T_JUNCTION_RIGHT'
  | 'T_JUNCTION_LEFT'
  | 'FOUR_WAY_INTERSECTION'
  | 'ROUNDABOUT'
  | 'EXPRESSWAY_INTERCHANGE'
  | 'MARKET_SIDE_STREET'
  | 'BUS_STOP_BAY';

export type StreetCorridor = 'MAIN_EXPRESSWAY' | 'RIGHT_MARKET_STREET' | 'LEFT_MARKET_STREET';

export interface RoadTileRecord {
  key: string;
  gridX: number; // 0 = Main Expressway, -1 = Right Side-Street (-18.5m), +1 = Left Side-Street (+18.5m)
  gridZ: number; // 50m tile index along Z
  worldX: number;
  worldZ: number; // Center Z of this 50m tile
  type: RoadTileType;
  streetName: string;
  group: THREE.Group;
  roadSurfaceMesh: THREE.Mesh;
  turnoffBoxes: Array<{
    targetCorridor: StreetCorridor;
    direction: 'LEFT' | 'RIGHT' | 'STRAIGHT' | 'MERGE_MAIN';
    label: string;
    box: THREE.Box3;
  }>;
  inMirrorBuffer: boolean;
}

export interface StreetNavigationTelemetry {
  currentTileKey: string;
  currentTileType: RoadTileType;
  currentCorridor: StreetCorridor;
  currentStreetName: string;
  gridX: number;
  gridZ: number;
  activeTilesCount: number;
  mirrorBufferedTilesCount: number;
  despawnedTilesTotal: number;
  upcomingTurnDirection: 'LEFT' | 'RIGHT' | 'BOTH' | 'MERGE_MAIN' | 'STRAIGHT';
  upcomingTurnLabel: string;
  upcomingTurnDistanceM: number;
  raycastGroundHit: boolean;
  trafficLightAhead?: TrafficLightTelemetry | null;
}

/**
 * 4-Part Full Modular Street & Turnoff System (`RoadManager.ts`):
 * [ FRONT SPAWNER (+250m) ] ➔ [ Active Driving Zone ] ➔ [ 150m Mirror Buffer ] ➔ [ Safe Despawn ]
 */
export class RoadManager {
  public static readonly TILE_SIZE = 50; // 50m x 50m modular grid square
  public static readonly FRONT_SPAWN_DISTANCE = 250; // Spawn 250m ahead
  public static readonly MIRROR_BUFFER_DISTANCE = 150; // Keep 150m behind bus alive for Side Mirrors!

  private scene: THREE.Scene;
  private tiles: Map<string, RoadTileRecord> = new Map();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private downVector: THREE.Vector3 = new THREE.Vector3(0, -1, 0);
  private rayOrigin: THREE.Vector3 = new THREE.Vector3();

  // Shared materials & textures for fast tile instantiation (disposed only when manager disposes)
  private sharedAsphaltMat: THREE.MeshStandardMaterial;
  private sharedSideStreetMat: THREE.MeshStandardMaterial;
  private sharedGutterWallMat: THREE.MeshStandardMaterial;
  private sharedGutterWaterMat: THREE.MeshStandardMaterial;
  private sharedRustedZincMat: THREE.MeshStandardMaterial;
  private sharedWeatheredWallMat: THREE.MeshStandardMaterial;
  private sharedWoodTableMat: THREE.MeshStandardMaterial;
  private sharedConcreteDividerMat: THREE.MeshStandardMaterial;
  private sharedTarpMats: THREE.MeshStandardMaterial[];
  private sharedAbegShopMats: THREE.MeshStandardMaterial[];

  private currentCorridor: StreetCorridor = 'MAIN_EXPRESSWAY';
  private despawnedTilesTotal: number = 0;
  private trafficLights: TrafficLightSystem;
  private waypointGraph: WaypointGraph;
  private lastTelemetry: StreetNavigationTelemetry = {
    currentTileKey: '0:0',
    currentTileType: 'STRAIGHT_EXPRESSWAY',
    currentCorridor: 'MAIN_EXPRESSWAY',
    currentStreetName: 'Ikeja–Oshodi Expressway',
    gridX: 0,
    gridZ: 0,
    activeTilesCount: 0,
    mirrorBufferedTilesCount: 0,
    despawnedTilesTotal: 0,
    upcomingTurnDirection: 'STRAIGHT',
    upcomingTurnLabel: 'Continue Straight on Expressway',
    upcomingTurnDistanceM: 100,
    raycastGroundHit: true,
    trafficLightAhead: null,
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.trafficLights = new TrafficLightSystem(this.scene);
    this.waypointGraph = new WaypointGraph();
    const asphaltTex = createAsphaltTexture();

    this.sharedAsphaltMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.82,
      metalness: 0.08,
    });
    this.sharedSideStreetMat = new THREE.MeshStandardMaterial({
      color: 0x26231f,
      roughness: 0.92,
      metalness: 0.04,
    });
    this.sharedGutterWallMat = new THREE.MeshStandardMaterial({
      color: 0x57534e,
      roughness: 0.9,
    });
    this.sharedGutterWaterMat = new THREE.MeshStandardMaterial({
      color: 0x1c2826,
      roughness: 0.25,
      metalness: 0.4,
    });
    this.sharedRustedZincMat = new THREE.MeshStandardMaterial({
      color: 0x7c2d12,
      roughness: 0.65,
      metalness: 0.45,
    });
    this.sharedWeatheredWallMat = new THREE.MeshStandardMaterial({
      color: 0xa8a29e,
      roughness: 0.92,
    });
    this.sharedWoodTableMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.88,
    });
    this.sharedConcreteDividerMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.78,
    });

    const tarpColors = [0xdc2626, 0x2563eb, 0xfacc15, 0x16a34a, 0x9333ea, 0xea580c];
    this.sharedTarpMats = tarpColors.map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, side: THREE.DoubleSide })
    );

    const shopColors = [0x0284c7, 0x15803d, 0xb45309, 0xbe123c, 0x4338ca];
    this.sharedAbegShopMats = shopColors.map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 })
    );

    // Initial pre-warm of tiles around starting point (including -150m mirror buffer behind z=0)
    this.update(0, 0);
  }

  /**
   * Determines the deterministic tile type for a given (gridX, gridZ) coordinate
   * so intersections, T-junctions, roundabouts, and market side streets align with our world!
   */
  private getTileSpec(gridX: number, gridZ: number): { type: RoadTileType; streetName: string } {
    const centerZ = gridZ * RoadManager.TILE_SIZE;

    if (gridX < 0) {
      // Right-hand parallel market side street (-X)
      if (centerZ >= 300 && centerZ <= 900) {
        return { type: 'MARKET_SIDE_STREET', streetName: 'Allen / Computer Village Market Alley' };
      }
      if (centerZ >= 1250 && centerZ <= 1850) {
        return { type: 'MARKET_SIDE_STREET', streetName: 'Ladipo / Mushin Olosa Market Street' };
      }
      return { type: 'MARKET_SIDE_STREET', streetName: 'Lagos Inner Abeg Market Street (Right)' };
    }

    if (gridX > 0) {
      // Left-hand parallel market side street (+X)
      if (centerZ >= 600 && centerZ <= 1150) {
        return { type: 'MARKET_SIDE_STREET', streetName: 'Toyin St / Opebi Market Alley' };
      }
      if (centerZ >= 2250 && centerZ <= 2950) {
        return { type: 'MARKET_SIDE_STREET', streetName: 'Surulere / Bode Thomas Market Street' };
      }
      return { type: 'MARKET_SIDE_STREET', streetName: 'Lagos Inner Abeg Market Street (Left)' };
    }

    // Dedicated Bus Stop Pull-Off Bays with indented side-lane geometry & passenger platforms
    if (gridZ === 4 || gridZ === 15 || gridZ === 25 || gridZ === 35 || gridZ === 45 || gridZ === 55 || gridZ === 65) {
      const bayNames: Record<number, string> = {
        4: 'Cement / Mangoro Bus Stop Bay',
        15: 'Maryland Terminal Bus Stop Bay',
        25: 'Anthony Village Bus Stop Bay',
        35: 'Oshodi Interchange Bus Stop Bay',
        45: 'Palmgrove Bus Stop Bay',
        55: 'Yaba Tech Bus Stop Bay',
        65: 'Costain Commercial Bus Stop Bay',
      };
      return {
        type: 'BUS_STOP_BAY',
        streetName: bayNames[gridZ] || 'Lagos BRT & Danfo Bus Stop Bay',
      };
    }

    // Main Corridor (gridX === 0): Mix of Straight Expressway, T-Junctions, 4-Way Intersections & Roundabouts
    if (gridZ === 7 || gridZ === 16 || gridZ === 26 || gridZ === 36) {
      return {
        type: 'T_JUNCTION_RIGHT',
        streetName:
          gridZ <= 16 ? 'Ikeja–Maryland T-Junction (Right Turnoff)' : 'Mushin–Oshodi T-Junction (Right Turnoff)',
      };
    }
    if (gridZ === 13 || gridZ === 22 || gridZ === 46 || gridZ === 57) {
      return {
        type: 'T_JUNCTION_LEFT',
        streetName:
          gridZ <= 22 ? 'Alausa–Opebi T-Junction (Left Turnoff)' : 'Surulere–Yaba T-Junction (Left Turnoff)',
      };
    }
    if (gridZ === 11 || gridZ === 30 || gridZ === 50 || gridZ === 66) {
      return {
        type: 'FOUR_WAY_INTERSECTION',
        streetName:
          gridZ === 11
            ? 'Allen 4-Way Crossroad Junction'
            : gridZ === 30
            ? 'Obanikoro / Palmgrove 4-Way Intersection'
            : gridZ === 50
            ? 'Onipanu / Fadeyi 4-Way Crossroad'
            : 'Ojuelegba 4-Way Crossroad',
      };
    }
    if (gridZ === 18 || gridZ === 38 || gridZ === 72) {
      return {
        type: 'ROUNDABOUT',
        streetName:
          gridZ === 18
            ? 'Maryland Independence Market Roundabout'
            : gridZ === 38
            ? 'Oshodi Central Interchange & Market Roundabout'
            : 'Costain Commercial Roundabout',
      };
    }
    if (gridZ === 28 || gridZ === 62) {
      return {
        type: 'EXPRESSWAY_INTERCHANGE',
        streetName:
          gridZ === 28
            ? 'Anthony Village / Gbagada Expressway Flyover Interchange'
            : 'Ojuelegba / Stadium Major Flyover Interchange',
      };
    }

    // District naming along straight expressway tiles
    const districtName =
      centerZ < 450
        ? 'Agege Motor Rd / Ikeja Expressway'
        : centerZ < 1100
        ? 'Mobolaji Bank Anthony Way (Maryland)'
        : centerZ < 1950
        ? 'Oshodi–Apapa / Ikorodu Expressway'
        : centerZ < 3100
        ? 'Ikorodu Road (Palmgrove–Yaba Corridor)'
        : 'Western Avenue / Costain–CMS Highway';

    return { type: 'STRAIGHT_EXPRESSWAY', streetName: districtName };
  }

  /**
   * 1. FRONT SPAWNER & 3. 150-METER REAR MIRROR BUFFER LOOP
   */
  public update(playerX: number, playerZ: number, dt: number = 0.016): StreetNavigationTelemetry {
    // 0. Update 3D Traffic Light system & retrieve light telemetry ahead of player
    this.trafficLights.update(dt);
    const trafficLightAhead = this.trafficLights.getPlayerTelemetry(playerZ);

    const currentGridZ = Math.round(playerZ / RoadManager.TILE_SIZE);

    // Calculate grid Z range: keep [-3 tiles (-150m mirror buffer) .. +5 tiles (+250m front spawner)]
    const minGridZ = Math.floor((playerZ - RoadManager.MIRROR_BUFFER_DISTANCE) / RoadManager.TILE_SIZE);
    const maxGridZ = Math.ceil((playerZ + RoadManager.FRONT_SPAWN_DISTANCE) / RoadManager.TILE_SIZE);

    // 1. Spawn tiles ahead & within the 150m mirror buffer
    for (let gz = minGridZ; gz <= maxGridZ; gz++) {
      // Always maintain Main Corridor tile (gridX = 0)
      this.ensureTile(0, gz);

      // Spawn Right Market Side-Street tiles (-1) and Left Market Side-Street tiles (+1)
      // where intersections/shortcuts exist or when player is driving on or near side streets!
      const mainSpec = this.getTileSpec(0, gz);
      const centerZ = gz * RoadManager.TILE_SIZE;
      const onRightCorridor =
        playerX < -7.5 ||
        this.currentCorridor === 'RIGHT_MARKET_STREET' ||
        mainSpec.type === 'T_JUNCTION_RIGHT' ||
        mainSpec.type === 'FOUR_WAY_INTERSECTION' ||
        mainSpec.type === 'ROUNDABOUT' ||
        mainSpec.type === 'EXPRESSWAY_INTERCHANGE' ||
        (centerZ >= 300 && centerZ <= 900) ||
        (centerZ >= 1250 && centerZ <= 2200);

      const onLeftCorridor =
        playerX > 7.5 ||
        this.currentCorridor === 'LEFT_MARKET_STREET' ||
        mainSpec.type === 'T_JUNCTION_LEFT' ||
        mainSpec.type === 'FOUR_WAY_INTERSECTION' ||
        mainSpec.type === 'ROUNDABOUT' ||
        mainSpec.type === 'EXPRESSWAY_INTERCHANGE' ||
        (centerZ >= 600 && centerZ <= 1150) ||
        (centerZ >= 2250 && centerZ <= 2950);

      if (onRightCorridor) {
        this.ensureTile(-1, gz);
      }
      if (onLeftCorridor) {
        this.ensureTile(1, gz);
      }
    }

    // 2. Active Driving Zone: Raycasting + Bounding-Box Turnoff Detection
    let activeGridX = 0;
    if (playerX < -10.2) {
      activeGridX = -1;
      this.currentCorridor = 'RIGHT_MARKET_STREET';
    } else if (playerX > 10.2) {
      activeGridX = 1;
      this.currentCorridor = 'LEFT_MARKET_STREET';
    } else {
      activeGridX = 0;
      this.currentCorridor = 'MAIN_EXPRESSWAY';
    }

    const activeKey = `${activeGridX}:${currentGridZ}`;
    const activeTile = this.tiles.get(activeKey) || this.tiles.get(`0:${currentGridZ}`);

    // Downward Raycast check from vehicle chassis to active tile road surface
    let raycastHit = false;
    if (activeTile) {
      this.rayOrigin.set(playerX, 4.0, playerZ);
      this.raycaster.set(this.rayOrigin, this.downVector);
      const hits = this.raycaster.intersectObject(activeTile.roadSurfaceMesh, false);
      raycastHit = hits.length > 0;

      // Check bounding-box turnoff triggers on current tile
      const playerPoint = new THREE.Vector3(playerX, 0.5, playerZ);
      for (const trigger of activeTile.turnoffBoxes) {
        if (trigger.box.containsPoint(playerPoint)) {
          this.currentCorridor = trigger.targetCorridor;
          break;
        }
      }
    }

    // 3. 150-Meter Mirror Buffer Tagging & 4. Safe Despawn Beyond 150m Rear Threshold
    let mirrorBufferCount = 0;
    const keysToDelete: string[] = [];

    this.tiles.forEach((tile, key) => {
      const tileFrontEdgeZ = tile.worldZ + RoadManager.TILE_SIZE * 0.5;
      const distBehindPlayer = playerZ - tileFrontEdgeZ;

      if (distBehindPlayer > RoadManager.MIRROR_BUFFER_DISTANCE + 10) {
        // Passed the 150m Rear Mirror Buffer! Safe to despawn and free RAM.
        keysToDelete.push(key);
      } else if (tile.worldZ < playerZ) {
        tile.inMirrorBuffer = true;
        mirrorBufferCount++;
      } else {
        tile.inMirrorBuffer = false;
      }
    });

    for (const key of keysToDelete) {
      const tile = this.tiles.get(key);
      if (tile) {
        this.disposeTileSafely(tile);
        this.tiles.delete(key);
        this.despawnedTilesTotal++;
      }
    }

    // 5. Compute upcoming intersection / turnoff arrow for Top-Left GPS Minimap
    let upcomingTurnDirection: StreetNavigationTelemetry['upcomingTurnDirection'] = 'STRAIGHT';
    let upcomingTurnLabel = 'Expressway Clear Ahead';
    let upcomingTurnDistanceM = 150;

    if (this.currentCorridor === 'RIGHT_MARKET_STREET' || this.currentCorridor === 'LEFT_MARKET_STREET') {
      upcomingTurnDirection = 'MERGE_MAIN';
      upcomingTurnLabel =
        this.currentCorridor === 'RIGHT_MARKET_STREET'
          ? 'Merge Left ↩ Rejoin Expressway'
          : 'Merge Right ↪ Rejoin Expressway';
      upcomingTurnDistanceM = Math.max(10, Math.round(RoadManager.TILE_SIZE - (playerZ % RoadManager.TILE_SIZE)));
    } else {
      for (let lookGz = currentGridZ; lookGz <= currentGridZ + 4; lookGz++) {
        const spec = this.getTileSpec(0, lookGz);
        const dist = Math.round(lookGz * RoadManager.TILE_SIZE - playerZ);
        if (dist >= -10 && spec.type !== 'STRAIGHT_EXPRESSWAY') {
          upcomingTurnDistanceM = Math.max(0, dist);
          if (spec.type === 'T_JUNCTION_RIGHT') {
            upcomingTurnDirection = 'RIGHT';
            upcomingTurnLabel = 'T-Junction Ahead ↪ Right Turnoff Open';
          } else if (spec.type === 'T_JUNCTION_LEFT') {
            upcomingTurnDirection = 'LEFT';
            upcomingTurnLabel = 'T-Junction Ahead ↩ Left Turnoff Open';
          } else if (spec.type === 'FOUR_WAY_INTERSECTION') {
            upcomingTurnDirection = 'BOTH';
            upcomingTurnLabel = '4-Way Crossroad ☩ Left & Right Side Streets';
          } else if (spec.type === 'ROUNDABOUT') {
            upcomingTurnDirection = 'BOTH';
            upcomingTurnLabel = `${spec.streetName} ⟲`;
          }
          break;
        }
      }
    }

    this.lastTelemetry = {
      currentTileKey: activeKey,
      currentTileType: activeTile ? activeTile.type : 'STRAIGHT_EXPRESSWAY',
      currentCorridor: this.currentCorridor,
      currentStreetName: activeTile ? activeTile.streetName : 'Lagos Mainland Expressway',
      gridX: activeGridX,
      gridZ: currentGridZ,
      activeTilesCount: this.tiles.size,
      mirrorBufferedTilesCount: mirrorBufferCount,
      despawnedTilesTotal: this.despawnedTilesTotal,
      upcomingTurnDirection,
      upcomingTurnLabel,
      upcomingTurnDistanceM,
      raycastGroundHit: raycastHit,
      trafficLightAhead,
    };

    return this.lastTelemetry;
  }

  public getTelemetry(): StreetNavigationTelemetry {
    return this.lastTelemetry;
  }

  public getTrafficLightSystem(): TrafficLightSystem {
    return this.trafficLights;
  }

  public getWaypointGraph(): WaypointGraph {
    return this.waypointGraph;
  }

  /**
   * Returns true if a 50m tile at (playerZ) has an open left or right turnoff or side street
   */
  public getCorridorBoundsAtZ(z: number): { canTurnRight: boolean; canTurnLeft: boolean } {
    const gz = Math.round(z / RoadManager.TILE_SIZE);
    const spec = this.getTileSpec(0, gz);
    const hasRightTile =
      this.tiles.has(`-1:${gz}`) ||
      spec.type === 'T_JUNCTION_RIGHT' ||
      spec.type === 'FOUR_WAY_INTERSECTION' ||
      spec.type === 'ROUNDABOUT' ||
      spec.type === 'EXPRESSWAY_INTERCHANGE';
    const hasLeftTile =
      this.tiles.has(`1:${gz}`) ||
      spec.type === 'T_JUNCTION_LEFT' ||
      spec.type === 'FOUR_WAY_INTERSECTION' ||
      spec.type === 'ROUNDABOUT' ||
      spec.type === 'EXPRESSWAY_INTERCHANGE';
    return { canTurnRight: hasRightTile, canTurnLeft: hasLeftTile };
  }

  private ensureTile(gridX: number, gridZ: number) {
    const key = `${gridX}:${gridZ}`;
    if (this.tiles.has(key)) return;

    const spec = this.getTileSpec(gridX, gridZ);
    const worldX = gridX * 18.5;
    const worldZ = gridZ * RoadManager.TILE_SIZE;

    const tileRecord = this.buildTilePrefab(key, gridX, gridZ, worldX, worldZ, spec.type, spec.streetName);
    this.tiles.set(key, tileRecord);
    this.scene.add(tileRecord.group);
  }

  /**
   * Builds a 50m x 50m Modular Tile Prefab:
   * - STRAIGHT_EXPRESSWAY (Concrete jersey dividers, high-speed markings)
   * - T_JUNCTION_RIGHT / T_JUNCTION_LEFT (Branching turnoffs with arrows & triggers)
   * - FOUR_WAY_INTERSECTION (Crossroad junction opening both left & right side streets)
   * - ROUNDABOUT (Circular Lagos roundabout island with reflective chevrons)
   * - MARKET_SIDE_STREET (Lagos Environment Dressing: open concrete gutters, rusted zinc roofs,
   *   roadside Abeg shops, wooden market tables with colored tarps, and weathered compound walls)
   */
  private buildTilePrefab(
    key: string,
    gridX: number,
    gridZ: number,
    worldX: number,
    worldZ: number,
    type: RoadTileType,
    streetName: string
  ): RoadTileRecord {
    const group = new THREE.Group();
    group.position.set(worldX, 0, worldZ);

    const turnoffBoxes: RoadTileRecord['turnoffBoxes'] = [];
    const tileLen = RoadManager.TILE_SIZE;
    const seed = Math.abs(gridZ * 37 + gridX * 13);

    // Base raycastable road surface mesh
    const roadWidth = gridX === 0 ? 19.6 : 10.5;
    const roadSurfaceMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(roadWidth, tileLen),
      gridX === 0 ? this.sharedAsphaltMat : this.sharedSideStreetMat
    );
    roadSurfaceMesh.rotation.x = -Math.PI / 2;
    roadSurfaceMesh.position.y = gridX === 0 ? 0.008 : 0.032;
    group.add(roadSurfaceMesh);

    if (gridX === 0) {
      // ==========================================================
      // MAIN CORRIDOR TILES (EXPRESSWAY, T-JUNCTIONS, 4-WAY, ROUNDABOUT)
      // ==========================================================
      if (type === 'STRAIGHT_EXPRESSWAY') {
        // Center Concrete Jersey Divider Blocks along expressway median (leaving gaps at Oshodi park z=0)
        if (worldZ > 60) {
          for (let dz = -20; dz <= 20; dz += 10) {
            const divider = new THREE.Mesh(
              new THREE.BoxGeometry(0.42, 0.65, 8.2),
              this.sharedConcreteDividerMat
            );
            divider.position.set(0, 0.32, dz);
            group.add(divider);
          }
        }
      } else if (type === 'T_JUNCTION_RIGHT' || type === 'T_JUNCTION_LEFT') {
        const dirSign = type === 'T_JUNCTION_RIGHT' ? -1 : 1;
        // Intersecting Side-Street Apron Slab
        const connector = new THREE.Mesh(
          new THREE.PlaneGeometry(16, 22),
          this.sharedSideStreetMat
        );
        connector.rotation.x = -Math.PI / 2;
        connector.position.set(dirSign * 14.5, 0.035, 0);
        group.add(connector);

        // Satellite Mini-Map Layer-1 Turnoff Strip
        const mmConnector = new THREE.Mesh(
          new THREE.PlaneGeometry(15, 6),
          new THREE.MeshBasicMaterial({ color: 0x22c55e })
        );
        mmConnector.rotation.x = -Math.PI / 2;
        mmConnector.position.set(dirSign * 14.5, 0.28, 0);
        mmConnector.layers.set(1);
        group.add(mmConnector);

        // Glowing Turn Arrows on road
        const arrowMesh = new THREE.Mesh(
          new THREE.ConeGeometry(0.85, 2.2, 3),
          new THREE.MeshBasicMaterial({ color: 0xfacc15 })
        );
        arrowMesh.rotation.x = Math.PI / 2;
        arrowMesh.rotation.z = -dirSign * (Math.PI / 3);
        arrowMesh.position.set(dirSign * 10.8, 0.08, 0);
        group.add(arrowMesh);

        // Bounding Box Trigger for Turnoff
        turnoffBoxes.push({
          targetCorridor: dirSign < 0 ? 'RIGHT_MARKET_STREET' : 'LEFT_MARKET_STREET',
          direction: dirSign < 0 ? 'RIGHT' : 'LEFT',
          label: streetName,
          box: new THREE.Box3(
            new THREE.Vector3(dirSign < 0 ? -24 : 8, -1, worldZ - 18),
            new THREE.Vector3(dirSign < 0 ? -8 : 24, 6, worldZ + 18)
          ),
        });
        // Register with active 3D Traffic Light System
        this.trafficLights.registerJunction(key, streetName, worldZ, 16, 3, 14);
      } else if (type === 'FOUR_WAY_INTERSECTION') {
        // Register with active 3D Traffic Light System
        this.trafficLights.registerJunction(key, streetName, worldZ, 14, 3, 14);

        // 4-Way Crossroad Aprons on BOTH Left (+X) and Right (-X)
        [-1, 1].forEach((dirSign) => {
          const crossArm = new THREE.Mesh(
            new THREE.PlaneGeometry(18, 24),
            this.sharedSideStreetMat
          );
          crossArm.rotation.x = -Math.PI / 2;
          crossArm.position.set(dirSign * 15.0, 0.035, 0);
          group.add(crossArm);

          const mmCross = new THREE.Mesh(
            new THREE.PlaneGeometry(16, 6.5),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
          );
          mmCross.rotation.x = -Math.PI / 2;
          mmCross.position.set(dirSign * 15.0, 0.28, 0);
          mmCross.layers.set(1);
          group.add(mmCross);

          turnoffBoxes.push({
            targetCorridor: dirSign < 0 ? 'RIGHT_MARKET_STREET' : 'LEFT_MARKET_STREET',
            direction: dirSign < 0 ? 'RIGHT' : 'LEFT',
            label: streetName,
            box: new THREE.Box3(
              new THREE.Vector3(dirSign < 0 ? -25 : 8, -1, worldZ - 20),
              new THREE.Vector3(dirSign < 0 ? -8 : 25, 6, worldZ + 20)
            ),
          });
        });

        // White Zebra Crossing Stripes across intersection
        for (let zx = -8; zx <= 8; zx += 1.6) {
          const stripe = new THREE.Mesh(
            new THREE.PlaneGeometry(0.75, 3.2),
            new THREE.MeshBasicMaterial({ color: 0xf8fafc })
          );
          stripe.rotation.x = -Math.PI / 2;
          stripe.position.set(zx, 0.04, -12);
          group.add(stripe);
        }
      } else if (type === 'ROUNDABOUT') {
        // ==========================================================
        // 🌀 CHAOTIC LAGOS MARKET ROUNDABOUT PREFAB
        // Wide circular asphalt ring, yellow/black hazard curbs, central monument
        // & clocktower, rotating 3-sided high-rise billboard pylons, street vendors
        // with colorful tarps, hawkers carrying Gala/Lacasera trays, parked yellow
        // Keke Marwas, and signalized approach entry slip lanes!
        // ==========================================================
        this.trafficLights.registerJunction(key, streetName, worldZ, 14, 3, 14);

        // 1. Broad Circular Roundabout Asphalt Apron Slab
        const ringApron = new THREE.Mesh(
          new THREE.PlaneGeometry(38.0, 48.0),
          this.sharedAsphaltMat
        );
        ringApron.rotation.x = -Math.PI / 2;
        ringApron.position.y = 0.012;
        group.add(ringApron);

        // 2. Center Green Grass Island
        const islandRadius = 7.2;
        const grassIsland = new THREE.Mesh(
          new THREE.CylinderGeometry(islandRadius, islandRadius + 0.3, 0.42, 28),
          new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.85 })
        );
        grassIsland.position.set(0, 0.21, 0);
        group.add(grassIsland);

        // 3. Lagos Hazard Curb Ring (Yellow and Black Checkers)
        const curbTex = createCurbTexture();
        const curbMat = new THREE.MeshStandardMaterial({
          map: curbTex,
          roughness: 0.7,
        });
        const curbCylinder = new THREE.Mesh(
          new THREE.CylinderGeometry(islandRadius + 0.12, islandRadius + 0.35, 0.45, 28, 1, true),
          curbMat
        );
        curbCylinder.position.set(0, 0.23, 0);
        group.add(curbCylinder);

        // 4. Central Lagos Landmark: 3-Tiered Monument & Clocktower
        const monumentBase = new THREE.Mesh(
          new THREE.BoxGeometry(4.2, 0.8, 4.2),
          this.sharedWeatheredWallMat
        );
        monumentBase.position.set(0, 0.6, 0);
        group.add(monumentBase);

        const clockTower = new THREE.Mesh(
          new THREE.BoxGeometry(2.4, 4.6, 2.4),
          new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 })
        );
        clockTower.position.set(0, 3.2, 0);
        group.add(clockTower);

        // Clock Faces on 4 sides
        const clockMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        [-1.22, 1.22].forEach((cx) => {
          const face = new THREE.Mesh(new THREE.CircleGeometry(0.65, 16), clockMat);
          face.position.set(cx, 4.4, 0);
          face.rotation.y = cx > 0 ? Math.PI / 2 : -Math.PI / 2;
          group.add(face);
        });
        [-1.22, 1.22].forEach((cz) => {
          const face = new THREE.Mesh(new THREE.CircleGeometry(0.65, 16), clockMat);
          face.position.set(0, 4.4, cz);
          face.rotation.y = cz > 0 ? 0 : Math.PI;
          group.add(face);
        });

        // Golden Obelisk Spire & Green-White-Green Nigerian Flag Ribbon
        const spire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.9, 4.8, 4),
          new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.6 })
        );
        spire.position.set(0, 7.8, 0);
        group.add(spire);

        const flagRibbon = new THREE.Mesh(
          new THREE.BoxGeometry(2.5, 0.35, 2.5),
          new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 })
        );
        flagRibbon.position.set(0, 5.7, 0);
        group.add(flagRibbon);

        // 5. Overhead High-Rise 3-Sided Advertising Billboard Pylon
        const billboardTex = createSignboardTexture('PEAK MILK • STRONGER EVERY DAY', '#1e3a8a');
        const billboardPanel = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 2.2, 4.5),
          new THREE.MeshBasicMaterial({ map: billboardTex })
        );
        billboardPanel.position.set(0, 10.6, 0);
        billboardPanel.rotation.y = Math.PI / 4;
        group.add(billboardPanel);

        // 6. Roundabout Blue Directional Signposts
        const rSignTex = createRoundaboutSignTexture(streetName);
        const rSignMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 1.8, 3.2),
          new THREE.MeshBasicMaterial({ map: rSignTex })
        );
        rSignMesh.position.set(10.5, 2.2, -18.0);
        group.add(rSignMesh);

        // 7. Market Hustle & Chaotic Stalls along Perimeter
        const stallOffsets = [
          { x: -14.5, z: -12.0, colorIdx: 0 },
          { x: -15.2, z: 8.0, colorIdx: 1 },
          { x: 14.8, z: -10.0, colorIdx: 2 },
          { x: 15.5, z: 12.0, colorIdx: 3 },
          { x: -13.8, z: 18.0, colorIdx: 4 },
          { x: 14.0, z: 19.0, colorIdx: 5 },
        ];

        stallOffsets.forEach((st) => {
          // Table
          const table = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.8, 2.2),
            this.sharedWoodTableMat
          );
          table.position.set(st.x, 0.4, st.z);
          group.add(table);

          // Colorful Tarp Canopy
          const tarp = new THREE.Mesh(
            new THREE.ConeGeometry(1.8, 0.9, 4),
            this.sharedTarpMats[st.colorIdx % this.sharedTarpMats.length]
          );
          tarp.position.set(st.x, 2.1, st.z);
          group.add(tarp);

          // Plantain / fruit crates on table
          const crate = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.35, 0.8),
            new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.9 })
          );
          crate.position.set(st.x, 0.95, st.z);
          group.add(crate);
        });

        // 8. Parked Yellow Bajaj Keke Marwa Waiting Staging Bay
        const kekeGroup = new THREE.Group();
        kekeGroup.position.set(-11.5, 0, -2.5);
        kekeGroup.rotation.y = -Math.PI / 6;
        const kekeBody = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 1.3, 2.4),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 })
        );
        kekeBody.position.y = 0.85;
        const kekeCanopy = new THREE.Mesh(
          new THREE.BoxGeometry(1.35, 0.2, 2.2),
          new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.8 })
        );
        kekeCanopy.position.y = 1.6;
        kekeGroup.add(kekeBody, kekeCanopy);
        group.add(kekeGroup);

        // 9. Street Hawkers near pedestrian crossings
        [-8.5, 8.5].forEach((hx, idx) => {
          const hawker = new THREE.Group();
          hawker.position.set(hx, 0, idx === 0 ? -14 : 14);
          const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.3, 1.4, 8),
            new THREE.MeshStandardMaterial({ color: idx === 0 ? 0xd97706 : 0x2563eb })
          );
          body.position.y = 0.7;
          const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x451a03 })
          );
          head.position.y = 1.5;
          // Gala Sausage roll & drink tray on head
          const tray = new THREE.Mesh(
            new THREE.CylinderGeometry(0.48, 0.48, 0.08, 12),
            new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 })
          );
          tray.position.y = 1.72;
          hawker.add(body, head, tray);
          group.add(hawker);
        });

        // 10. Turnoff Triggers linking to Left & Right Market Corridors
        [-1, 1].forEach((dirSign) => {
          turnoffBoxes.push({
            targetCorridor: dirSign < 0 ? 'RIGHT_MARKET_STREET' : 'LEFT_MARKET_STREET',
            direction: dirSign < 0 ? 'RIGHT' : 'LEFT',
            label: streetName,
            box: new THREE.Box3(
              new THREE.Vector3(dirSign < 0 ? -25 : 8, -1, worldZ - 20),
              new THREE.Vector3(dirSign < 0 ? -8 : 25, 6, worldZ + 20)
            ),
          });
        });
      } else if (type === 'EXPRESSWAY_INTERCHANGE') {
        // ==========================================================
        // 🌉 MAJOR EXPRESSWAY FLYOVER INTERCHANGE PREFAB
        // Heavy reinforced concrete bridge overpass (height 7.5m), support piers
        // with hazard chevrons, curving on/off ramps, giant green highway
        // directional gantry ("THIRD MAINLAND BRIDGE • CMS • AIRPORT"),
        // overhead traffic lights for each lane, and strict stop lines!
        // ==========================================================
        this.trafficLights.registerJunction(key, streetName, worldZ, 16, 3, 14);

        // 1. Reinforced Concrete Support Piers on Sidewalks (x = -10.5m & +10.5m)
        [-10.4, 10.4].forEach((px) => {
          const pier = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 7.6, 3.4),
            this.sharedWeatheredWallMat
          );
          pier.position.set(px, 3.8, 0);
          group.add(pier);

          // Yellow/Black Hazard Warning Stripe at pier base
          const pierCurb = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 1.2, 3.6),
            new THREE.MeshStandardMaterial({ map: createCurbTexture(), roughness: 0.6 })
          );
          pierCurb.position.set(px, 0.6, 0);
          group.add(pierCurb);
        });

        // 2. Heavy Flyover Bridge Deck crossing perpendicular across the expressway
        const bridgeWidth = 11.5;
        const bridgeLength = 44.0;
        const bridgeHeight = 7.4;

        const bridgeSlab = new THREE.Mesh(
          new THREE.BoxGeometry(bridgeLength, 1.1, bridgeWidth),
          this.sharedWeatheredWallMat
        );
        bridgeSlab.position.set(0, bridgeHeight, 0);
        group.add(bridgeSlab);

        // Flyover Deck Tarmac Surface
        const flyoverTarmac = new THREE.Mesh(
          new THREE.PlaneGeometry(bridgeLength, bridgeWidth - 0.8),
          this.sharedAsphaltMat
        );
        flyoverTarmac.rotation.x = -Math.PI / 2;
        flyoverTarmac.position.set(0, bridgeHeight + 0.56, 0);
        group.add(flyoverTarmac);

        // Flyover Concrete Jersey Parapet Barriers
        [-bridgeWidth / 2 + 0.2, bridgeWidth / 2 - 0.2].forEach((pz) => {
          const parapet = new THREE.Mesh(
            new THREE.BoxGeometry(bridgeLength, 0.95, 0.35),
            this.sharedConcreteDividerMat
          );
          parapet.position.set(0, bridgeHeight + 0.98, pz);
          group.add(parapet);
        });

        // 3. Overhead Static Vehicles on Flyover Bridge
        // Commercial Trailer Truck on top deck
        const truckGroup = new THREE.Group();
        truckGroup.position.set(-6.0, bridgeHeight + 0.56, -2.5);
        const truckCab = new THREE.Mesh(
          new THREE.BoxGeometry(2.4, 2.2, 2.0),
          new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 })
        );
        truckCab.position.set(-2.0, 1.1, 0);
        const truckTrailer = new THREE.Mesh(
          new THREE.BoxGeometry(6.5, 2.8, 2.2),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 })
        );
        truckTrailer.position.set(2.8, 1.4, 0);
        truckGroup.add(truckCab, truckTrailer);
        group.add(truckGroup);

        // Commuter Express Car on top deck
        const carMesh = new THREE.Mesh(
          new THREE.BoxGeometry(3.6, 1.2, 1.6),
          new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 })
        );
        carMesh.position.set(8.5, bridgeHeight + 1.2, 2.2);
        group.add(carMesh);

        // 4. Ground-Level Curving On-Ramps and Off-Ramps (Connecting to service lanes)
        [-1, 1].forEach((dirSign) => {
          const rampApron = new THREE.Mesh(
            new THREE.PlaneGeometry(16.5, 26.0),
            this.sharedSideStreetMat
          );
          rampApron.rotation.x = -Math.PI / 2;
          rampApron.position.set(dirSign * 15.2, 0.035, 0);
          group.add(rampApron);

          turnoffBoxes.push({
            targetCorridor: dirSign < 0 ? 'RIGHT_MARKET_STREET' : 'LEFT_MARKET_STREET',
            direction: dirSign < 0 ? 'RIGHT' : 'LEFT',
            label: dirSign < 0 ? 'Exit to Service Lane / Alausa' : 'Merge to Flyover On-Ramp',
            box: new THREE.Box3(
              new THREE.Vector3(dirSign < 0 ? -25 : 8, -1, worldZ - 20),
              new THREE.Vector3(dirSign < 0 ? -8 : 25, 6, worldZ + 20)
            ),
          });
        });

        // 5. Massive Green Lagos State Highway Overhead Gantry (spanning 4 lanes)
        const gantryGroup = new THREE.Group();
        gantryGroup.position.set(0, 0, -14.5);

        // Gantry Steel Pylons
        [-10.2, 10.2].forEach((gx) => {
          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.22, 6.6, 10),
            this.sharedConcreteDividerMat
          );
          pole.position.set(gx, 3.3, 0);
          gantryGroup.add(pole);
        });

        // Gantry Crossbar
        const crossbar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 21.0, 10),
          this.sharedConcreteDividerMat
        );
        crossbar.rotation.z = Math.PI / 2;
        crossbar.position.set(0, 6.3, 0);
        gantryGroup.add(crossbar);

        // Green Highway Directional Signboard
        const gantrySignTex = createHighwayGantrySignTexture(
          'THIRD MAINLAND BRIDGE • CMS • VI',
          'IKORODU / GBAGADA',
          'AIRPORT ROAD / IKEJA'
        );
        const gantrySignBoard = new THREE.Mesh(
          new THREE.BoxGeometry(18.0, 2.5, 0.14),
          new THREE.MeshBasicMaterial({ map: gantrySignTex })
        );
        gantrySignBoard.position.set(0, 4.8, 0);
        gantryGroup.add(gantrySignBoard);

        group.add(gantryGroup);

        // 6. White Stop Line across the 4 lanes on tarmac
        const stopLine = new THREE.Mesh(
          new THREE.PlaneGeometry(18.8, 0.8),
          new THREE.MeshBasicMaterial({ color: 0xf8fafc })
        );
        stopLine.rotation.x = -Math.PI / 2;
        stopLine.position.set(0, 0.045, -13.5);
        group.add(stopLine);
        // ==========================================================
        // DEDICATED BUS-STOP PULL-OFF BAY PREFAB
        // Indented side-lane tarmac, deceleration taper, shelter terminal,
        // hazard curbs, route map, and waiting commuter benches
        // ==========================================================
        const bayWidth = 5.2;
        const bayLength = 34.0;
        const bayCenterX = 12.4;

        // 1. Indented Bus Bay Asphalt Slab
        const baySlab = new THREE.Mesh(
          new THREE.PlaneGeometry(bayWidth, bayLength),
          this.sharedAsphaltMat
        );
        baySlab.rotation.x = -Math.PI / 2;
        baySlab.position.set(bayCenterX, 0.015, 0);
        group.add(baySlab);

        // 2. Deceleration Entry Taper (tapering from 9.8m to 15.0m)
        const entryTaper = new THREE.Mesh(
          new THREE.PlaneGeometry(bayWidth, 10.0),
          this.sharedAsphaltMat
        );
        entryTaper.rotation.x = -Math.PI / 2;
        entryTaper.rotation.z = -0.32;
        entryTaper.position.set(11.2, 0.014, -20.0);
        group.add(entryTaper);

        // 3. Acceleration Merge Exit Taper
        const exitTaper = new THREE.Mesh(
          new THREE.PlaneGeometry(bayWidth, 10.0),
          this.sharedAsphaltMat
        );
        exitTaper.rotation.x = -Math.PI / 2;
        exitTaper.rotation.z = 0.32;
        exitTaper.position.set(11.2, 0.014, 20.0);
        group.add(exitTaper);

        // 4. Yellow Diagonal Hazard Hatch Markings on Bay Tarmac
        for (let hz = -12; hz <= 12; hz += 4.5) {
          const hatch = new THREE.Mesh(
            new THREE.PlaneGeometry(0.35, 4.2),
            new THREE.MeshBasicMaterial({ color: 0xfacc15 })
          );
          hatch.rotation.x = -Math.PI / 2;
          hatch.rotation.z = 0.65;
          hatch.position.set(bayCenterX, 0.038, hz);
          group.add(hatch);
        }

        // 5. Modern LAMATA / BRT Sheltered Commuter Terminal
        const shelterGroup = new THREE.Group();
        shelterGroup.position.set(15.8, 0, 0);

        const platform = new THREE.Mesh(
          new THREE.BoxGeometry(3.2, 0.35, 20.0),
          this.sharedWeatheredWallMat
        );
        platform.position.set(0, 0.175, 0);
        shelterGroup.add(platform);

        const canopyRoof = new THREE.Mesh(
          new THREE.CylinderGeometry(2.4, 2.4, 16.0, 16, 1, false, 0, Math.PI),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, side: THREE.DoubleSide })
        );
        canopyRoof.rotation.z = Math.PI / 2;
        canopyRoof.rotation.y = Math.PI / 2;
        canopyRoof.position.set(0, 2.6, 0);
        shelterGroup.add(canopyRoof);

        [-6.0, 0, 6.0].forEach((pz) => {
          const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8),
            this.sharedConcreteDividerMat
          );
          pillar.position.set(0.9, 1.3, pz);
          shelterGroup.add(pillar);
        });

        const bench = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.45, 8.5),
          this.sharedWoodTableMat
        );
        bench.position.set(0.3, 0.5, 0);
        shelterGroup.add(bench);

        // Lagos Bus Stop Pole Sign
        const busStopPole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8),
          this.sharedConcreteDividerMat
        );
        busStopPole.position.set(-1.2, 1.6, -8.5);
        const busSign = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 1.1, 0.8),
          new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 })
        );
        busSign.position.set(-1.2, 2.8, -8.5);
        shelterGroup.add(busStopPole, busSign);

        group.add(shelterGroup);

        // Mini-map layer-1 beacon
        const mmBay = new THREE.Mesh(
          new THREE.PlaneGeometry(bayWidth, bayLength),
          new THREE.MeshBasicMaterial({ color: 0x22c55e })
        );
        mmBay.rotation.x = -Math.PI / 2;
        mmBay.position.set(bayCenterX, 0.35, 0);
        mmBay.layers.set(1);
        group.add(mmBay);
      }
    } else {
      // ==========================================================
      // 4. LAGOS-THEMED SIDE STREET DRESSING (MARKET_SIDE_STREET)
      // Open concrete gutters, rusted zinc roofs, roadside Abeg shops,
      // wooden market tables, colored tarps, and weathered compound walls!
      // ==========================================================
      const outerSide = gridX < 0 ? -1 : 1; // Outer edge of side street away from highway

      // 4a. Open Concrete Drainage Gutters on Both Edges of the Side Street
      [-4.8, 4.8].forEach((gx) => {
        // Dark open gutter channel trench
        const gutterChannel = new THREE.Mesh(
          new THREE.PlaneGeometry(0.95, tileLen),
          this.sharedGutterWaterMat
        );
        gutterChannel.rotation.x = -Math.PI / 2;
        gutterChannel.position.set(gx, 0.04, 0);
        group.add(gutterChannel);

        // Concrete gutter lip walls
        const lipLeft = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.26, tileLen),
          this.sharedGutterWallMat
        );
        lipLeft.position.set(gx - 0.45, 0.13, 0);
        const lipRight = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.26, tileLen),
          this.sharedGutterWallMat
        );
        lipRight.position.set(gx + 0.45, 0.13, 0);
        group.add(lipLeft, lipRight);

        // Wooden plank / concrete slab foot-crossings over the open gutter
        for (let sz = -18; sz <= 18; sz += 18) {
          const crossingSlab = new THREE.Mesh(
            new THREE.BoxGeometry(1.25, 0.08, 1.8),
            this.sharedWoodTableMat
          );
          crossingSlab.position.set(gx, 0.25, sz);
          group.add(crossingSlab);
        }
      });

      // 4b. Weathered Compound Wall along outer perimeter of the Market Side Street
      const compoundWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 2.5, tileLen - 2),
        this.sharedWeatheredWallMat
      );
      compoundWall.position.set(outerSide * 9.2, 1.25, 0);
      group.add(compoundWall);

      // 4c. Roadside "Abeg" Kiosk Shops with Rusted Corrugated Zinc Roofs & Wooden Market Tables with Colored Tarps
      const shopLabels = [
        ['ALABA TECH & SOUND', 'WOOFERS • CHARGERS • FLASH DRIVE'],
        ['MAMA RISI BUKKA', 'HOT AMALA • GBEGIRI • ASSORTED'],
        ['IYA BASIRA PROVISIONS', 'COLD MINERALS • BREAD • INDOMIE'],
        ['CHUKWUDI PHONE CHARGE', 'GEN DEY ON • ACCESSORIES'],
      ];

      for (let sz = -17; sz <= 17; sz += 17) {
        const itemSeed = Math.abs(seed + Math.round(sz));
        const shopMat = this.sharedAbegShopMats[itemSeed % this.sharedAbegShopMats.length];
        const tarpMat = this.sharedTarpMats[(itemSeed + 2) % this.sharedTarpMats.length];
        const labelPair = shopLabels[itemSeed % shopLabels.length];

        // Roadside "Abeg" Shop Kiosk Body
        const abegShop = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 4.2), shopMat);
        abegShop.position.set(outerSide * 7.2, 1.2, sz);
        group.add(abegShop);

        // Slanted Rusted Corrugated Zinc Roof overhanging the shop
        const zincRoof = new THREE.Mesh(
          new THREE.BoxGeometry(3.9, 0.14, 4.8),
          this.sharedRustedZincMat
        );
        zincRoof.position.set(outerSide * 7.0, 2.52, sz);
        zincRoof.rotation.z = -outerSide * 0.12;
        group.add(zincRoof);

        // Shopfront Signboard
        const signTex = createSignboardTexture(labelPair[0], labelPair[1], '#b45309');
        const signBoard = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.65, 3.4),
          new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.5 })
        );
        signBoard.position.set(outerSide * 5.52, 2.15, sz);
        group.add(signBoard);

        // Wooden Market Stall Table in front of shop (just behind the open concrete gutter)
        const tableTop = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 0.12, 2.4),
          this.sharedWoodTableMat
        );
        tableTop.position.set(outerSide * 5.9, 0.85, sz + 4.8);
        group.add(tableTop);

        const tableSupport = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 0.8, 2.0),
          this.sharedWoodTableMat
        );
        tableSupport.position.set(outerSide * 5.9, 0.4, sz + 4.8);
        group.add(tableSupport);

        // Colored Tarp Canopy pitched over the wooden market table
        const tarpCanopy = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 2.8), tarpMat);
        tarpCanopy.position.set(outerSide * 5.9, 2.18, sz + 4.8);
        tarpCanopy.rotation.z = -outerSide * 0.15;
        group.add(tarpCanopy);

        // Bamboo support poles for tarp
        [-1.1, 1.1].forEach((pz) => {
          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.04, 1.35, 6),
            this.sharedWoodTableMat
          );
          pole.position.set(outerSide * 5.3, 1.5, sz + 4.8 + pz);
          group.add(pole);
        });
      }
    }

    return {
      key,
      gridX,
      gridZ,
      worldX,
      worldZ,
      type,
      streetName,
      group,
      roadSurfaceMesh,
      turnoffBoxes,
      inMirrorBuffer: false,
    };
  }

  /**
   * 3. 150-METER MIRROR BUFFER SAFE DESPAWN:
   * Only called when a tile is strictly >150m behind the player's bus.
   * Disposes unique per-tile geometries & sign textures while preserving shared materials.
   */
  private disposeTileSafely(tile: RoadTileRecord) {
    this.scene.remove(tile.group);

    const sharedMats = new Set<THREE.Material>([
      this.sharedAsphaltMat,
      this.sharedSideStreetMat,
      this.sharedGutterWallMat,
      this.sharedGutterWaterMat,
      this.sharedRustedZincMat,
      this.sharedWeatheredWallMat,
      this.sharedWoodTableMat,
      this.sharedConcreteDividerMat,
      ...this.sharedTarpMats,
      ...this.sharedAbegShopMats,
    ]);

    tile.group.traverse((obj: any) => {
      if (obj.isMesh) {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if (!sharedMats.has(m)) {
              m.dispose();
            }
          }
        }
      }
    });
  }

  public dispose() {
    this.tiles.forEach((tile) => this.disposeTileSafely(tile));
    this.tiles.clear();
  }
}
