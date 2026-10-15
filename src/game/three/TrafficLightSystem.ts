import * as THREE from 'three';

export type TrafficLightState = 'GREEN' | 'YELLOW' | 'RED';

export interface TrafficLightJunction {
  id: string;
  name: string;
  worldZ: number;
  // Durations in seconds
  greenDuration: number;
  yellowDuration: number;
  redDuration: number;
  allRedDuration: number;
  // Dynamic state
  timer: number;
  state: TrafficLightState;
  stopLineZ: number; // Stop line Z coordinate for vehicles heading in +Z
  // 3D Visual Meshes
  gantryGroup?: THREE.Group;
  redLens?: THREE.Mesh;
  yellowLens?: THREE.Mesh;
  greenLens?: THREE.Mesh;
}

export interface TrafficLightTelemetry {
  hasLightAhead: boolean;
  junctionId: string;
  junctionName: string;
  state: TrafficLightState;
  timeRemainingSec: number;
  distanceToStopLineM: number;
}

/**
 * TrafficLightSystem
 * Governs all signalized 4-way crossroads and T-junctions along the Lagos corridor.
 * Enforces strict stopping rules for AI traffic NPCs and displays live HUD telemetry.
 */
export class TrafficLightSystem {
  private junctions: Map<string, TrafficLightJunction> = new Map();
  private scene: THREE.Scene;

  // Shared Materials for Light Lenses
  private redOnMat: THREE.MeshBasicMaterial;
  private redOffMat: THREE.MeshBasicMaterial;
  private yellowOnMat: THREE.MeshBasicMaterial;
  private yellowOffMat: THREE.MeshBasicMaterial;
  private greenOnMat: THREE.MeshBasicMaterial;
  private greenOffMat: THREE.MeshBasicMaterial;
  private gantryMetalMat: THREE.MeshStandardMaterial;
  private hoodMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.redOnMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    this.redOffMat = new THREE.MeshBasicMaterial({ color: 0x3f1212 });

    this.yellowOnMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    this.yellowOffMat = new THREE.MeshBasicMaterial({ color: 0x3f2f0a });

    this.greenOnMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    this.greenOffMat = new THREE.MeshBasicMaterial({ color: 0x063319 });

    this.gantryMetalMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.6,
      metalness: 0.7,
    });

    this.hoodMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.8,
    });
  }

  /**
   * Registers a signalized junction along the road corridor
   */
  public registerJunction(
    id: string,
    name: string,
    worldZ: number,
    greenDuration = 16,
    yellowDuration = 3,
    redDuration = 14
  ): TrafficLightJunction {
    if (this.junctions.has(id)) {
      return this.junctions.get(id)!;
    }

    const junction: TrafficLightJunction = {
      id,
      name,
      worldZ,
      greenDuration,
      yellowDuration,
      redDuration,
      allRedDuration: 1.5,
      timer: (Math.abs(worldZ) * 0.1) % (greenDuration + yellowDuration + redDuration),
      state: 'GREEN',
      stopLineZ: worldZ - 13.5, // 13.5m before junction center
    };

    // Build 3D Traffic Light Overhanging Gantry
    const gantry = this.buildTrafficLightGantry(junction);
    junction.gantryGroup = gantry;
    this.scene.add(gantry);

    this.junctions.set(id, junction);
    return junction;
  }

  /**
   * Creates a realistic Nigerian overhead mast-arm traffic light gantry
   */
  private buildTrafficLightGantry(junction: TrafficLightJunction): THREE.Group {
    const group = new THREE.Group();
    group.position.set(0, 0, junction.worldZ - 12);

    // 1. Vertical Steel Pole on right sidewalk (x = 10.5m)
    const poleHeight = 6.4;
    const mastPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, poleHeight, 12),
      this.gantryMetalMat
    );
    mastPole.position.set(10.2, poleHeight / 2, 0);
    group.add(mastPole);

    // 2. Horizontal Cantilever Mast-Arm extending over lanes (from X = 10.2 to X = -4.5)
    const armLength = 14.8;
    const mastArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, armLength, 10),
      this.gantryMetalMat
    );
    mastArm.rotation.z = Math.PI / 2;
    mastArm.position.set(10.2 - armLength / 2, poleHeight - 0.2, 0);
    group.add(mastArm);

    // 3. Traffic Light Signal Heads suspended over lanes:
    // One over Outer Commuter Lane (+5.8m), one over Fast Lane (+2.0m), one over Left lanes (-2.0m)
    const headXPositions = [5.8, 2.0, -2.0];
    let primaryHead: THREE.Group | null = null;

    headXPositions.forEach((hx, idx) => {
      const headGroup = this.buildSignalHead();
      headGroup.position.set(hx, poleHeight - 1.2, 0);
      group.add(headGroup);

      if (idx === 0) {
        primaryHead = headGroup;
      }
    });

    // 4. White Solid Stop Line across the 4 lanes on tarmac
    const stopLine = new THREE.Mesh(
      new THREE.PlaneGeometry(18.5, 0.8),
      new THREE.MeshBasicMaterial({ color: 0xf8fafc })
    );
    stopLine.rotation.x = -Math.PI / 2;
    stopLine.position.set(0, 0.045, -1.5);
    group.add(stopLine);

    if (primaryHead) {
      junction.redLens = (primaryHead as any).userData?.redLens;
      junction.yellowLens = (primaryHead as any).userData?.yellowLens;
      junction.greenLens = (primaryHead as any).userData?.greenLens;
    }

    return group;
  }

  /**
   * Builds an individual 3-lens signal head (Red, Yellow, Green)
   */
  private buildSignalHead(): THREE.Group {
    const head = new THREE.Group();

    // Black Signal Housing Box
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.85, 0.45), this.hoodMat);
    head.add(housing);

    // Backplate border
    const backplate = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.15, 0.05), this.hoodMat);
    backplate.position.set(0, 0, 0.22);
    head.add(backplate);

    // 3 Circular Lenses with sun hoods
    const lensRadius = 0.22;
    const lensYOffsets = [0.55, 0.0, -0.55]; // Red (top), Yellow (mid), Green (bot)

    const lenses: THREE.Mesh[] = [];

    lensYOffsets.forEach((ly, i) => {
      // Visor hood
      const visor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.22, 10, 1, true, 0, Math.PI),
        this.hoodMat
      );
      visor.rotation.x = Math.PI / 2;
      visor.rotation.z = Math.PI;
      visor.position.set(0, ly + 0.08, -0.25);
      head.add(visor);

      // Lens Mesh (facing -Z towards oncoming traffic)
      const mat = i === 0 ? this.redOffMat : i === 1 ? this.yellowOffMat : this.greenOnMat;
      const lens = new THREE.Mesh(new THREE.CircleGeometry(lensRadius, 16), mat);
      lens.position.set(0, ly, -0.23);
      head.add(lens);
      lenses.push(lens);
    });

    head.userData = {
      redLens: lenses[0],
      yellowLens: lenses[1],
      greenLens: lenses[2],
    };

    return head;
  }

  /**
   * Updates all traffic light cycles and visuals
   */
  public update(dt: number) {
    this.junctions.forEach((junction) => {
      junction.timer += dt;
      const totalCycle = junction.greenDuration + junction.yellowDuration + junction.redDuration;
      const cycleTime = junction.timer % totalCycle;

      let newState: TrafficLightState = 'GREEN';
      if (cycleTime < junction.greenDuration) {
        newState = 'GREEN';
      } else if (cycleTime < junction.greenDuration + junction.yellowDuration) {
        newState = 'YELLOW';
      } else {
        newState = 'RED';
      }

      if (junction.state !== newState) {
        junction.state = newState;
        this.updateVisuals(junction);
      }
    });
  }

  private updateVisuals(junction: TrafficLightJunction) {
    if (!junction.gantryGroup) return;

    junction.gantryGroup.traverse((child: any) => {
      if (child.userData?.redLens && child.userData?.yellowLens && child.userData?.greenLens) {
        const { redLens, yellowLens, greenLens } = child.userData;
        if (junction.state === 'RED') {
          redLens.material = this.redOnMat;
          yellowLens.material = this.yellowOffMat;
          greenLens.material = this.greenOffMat;
        } else if (junction.state === 'YELLOW') {
          redLens.material = this.redOffMat;
          yellowLens.material = this.yellowOnMat;
          greenLens.material = this.greenOffMat;
        } else {
          redLens.material = this.redOffMat;
          yellowLens.material = this.yellowOffMat;
          greenLens.material = this.greenOnMat;
        }
      }
    });
  }

  /**
   * Checks if an approaching NPC or player vehicle must stop for a red/amber light
   * Returns: { mustStop: boolean, targetStopZ: number, junction: TrafficLightJunction | null }
   */
  public getStoppingInstruction(
    vehicleZ: number,
    headingFwd = true
  ): { mustStop: boolean; targetStopZ: number; junction: TrafficLightJunction | null } {
    if (!headingFwd) return { mustStop: false, targetStopZ: 0, junction: null };

    for (const junction of this.junctions.values()) {
      const distToStopLine = junction.stopLineZ - vehicleZ;

      // Strict enforcement window: from 50m approach distance all the way until vehicle is 1.8m past the stop line.
      // Vehicles stopped right at the stop line (-1.8m <= distToStopLine <= 2.5m) MUST stay stopped!
      if (distToStopLine >= -1.8 && distToStopLine <= 50) {
        if (junction.state === 'RED' || junction.state === 'YELLOW') {
          return {
            mustStop: true,
            targetStopZ: junction.stopLineZ - 2.0, // Stop cleanly 2m before the white stop line
            junction,
          };
        }
      }
    }

    return { mustStop: false, targetStopZ: 0, junction: null };
  }

  /**
   * Retrieves telemetry for HUD display based on player position
   */
  public getPlayerTelemetry(playerZ: number): TrafficLightTelemetry | null {
    let nearest: TrafficLightJunction | null = null;
    let nearestDist = Infinity;

    for (const junction of this.junctions.values()) {
      const dist = junction.stopLineZ - playerZ;
      if (dist > -8 && dist < 85 && dist < nearestDist) {
        nearestDist = dist;
        nearest = junction;
      }
    }

    if (!nearest) return null;

    const totalCycle = nearest.greenDuration + nearest.yellowDuration + nearest.redDuration;
    const cycleTime = nearest.timer % totalCycle;
    let timeRemaining = 0;

    if (nearest.state === 'GREEN') {
      timeRemaining = Math.max(0, nearest.greenDuration - cycleTime);
    } else if (nearest.state === 'YELLOW') {
      timeRemaining = Math.max(0, nearest.greenDuration + nearest.yellowDuration - cycleTime);
    } else {
      timeRemaining = Math.max(0, totalCycle - cycleTime);
    }

    return {
      hasLightAhead: true,
      junctionId: nearest.id,
      junctionName: nearest.name,
      state: nearest.state,
      timeRemainingSec: Math.ceil(timeRemaining),
      distanceToStopLineM: Math.round(nearestDist),
    };
  }

  /**
   * Safely clears junctions outside active range
   */
  public removeJunction(id: string) {
    const j = this.junctions.get(id);
    if (j) {
      if (j.gantryGroup) {
        this.scene.remove(j.gantryGroup);
      }
      this.junctions.delete(id);
    }
  }

  public dispose() {
    this.junctions.forEach((j) => {
      if (j.gantryGroup) this.scene.remove(j.gantryGroup);
    });
    this.junctions.clear();
  }
}
