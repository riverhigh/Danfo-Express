import * as THREE from 'three';
import { createAsphaltTexture, createSignboardTexture } from './textures';

export type RoadTileType =
  | 'STRAIGHT_EXPRESSWAY'
  | 'T_JUNCTION_RIGHT'
  | 'T_JUNCTION_LEFT'
  | 'FOUR_WAY_INTERSECTION'
  | 'ROUNDABOUT'
  | 'MARKET_SIDE_STREET';

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
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
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
            ? 'Maryland Independence Roundabout'
            : gridZ === 38
            ? 'Oshodi / Anthony Roundabout Node'
            : 'Costain Roundabout',
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
  public update(playerX: number, playerZ: number): StreetNavigationTelemetry {
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
        (centerZ >= 300 && centerZ <= 900) ||
        (centerZ >= 1250 && centerZ <= 1850);

      const onLeftCorridor =
        playerX > 7.5 ||
        this.currentCorridor === 'LEFT_MARKET_STREET' ||
        mainSpec.type === 'T_JUNCTION_LEFT' ||
        mainSpec.type === 'FOUR_WAY_INTERSECTION' ||
        mainSpec.type === 'ROUNDABOUT' ||
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
    };

    return this.lastTelemetry;
  }

  public getTelemetry(): StreetNavigationTelemetry {
    return this.lastTelemetry;
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
      spec.type === 'ROUNDABOUT';
    const hasLeftTile =
      this.tiles.has(`1:${gz}`) ||
      spec.type === 'T_JUNCTION_LEFT' ||
      spec.type === 'FOUR_WAY_INTERSECTION' ||
      spec.type === 'ROUNDABOUT';
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
      } else if (type === 'FOUR_WAY_INTERSECTION') {
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
        // Circular Lagos Roundabout Feature with Green Kerb Island & Monument
        const curbRing = new THREE.Mesh(
          new THREE.CylinderGeometry(2.6, 2.8, 0.32, 20),
          new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 })
        );
        curbRing.position.set(0, 0.16, 0);
        group.add(curbRing);

        const obelisk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.65, 3.8, 8),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 })
        );
        obelisk.position.set(0, 2.0, 0);
        group.add(obelisk);
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
        ['ABEG POS & AIRTIME', 'CASH OUT • DATA • RECHARGE'],
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
              if (m.map) m.map.dispose();
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
