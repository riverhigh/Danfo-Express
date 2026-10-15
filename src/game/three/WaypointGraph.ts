import * as THREE from 'three';

export type WaypointNodeType =
  | 'EXPRESSWAY_LANE'
  | 'JUNCTION_ENTRY'
  | 'JUNCTION_TURN_RIGHT'
  | 'JUNCTION_TURN_LEFT'
  | 'ROUNDABOUT_CIRCULATION'
  | 'BUS_STOP_DIVERGE'
  | 'BUS_STOP_BAY'
  | 'BUS_STOP_MERGE';

export interface WaypointNode {
  id: string;
  x: number;
  z: number;
  type: WaypointNodeType;
  nextIds: string[];
  speedLimitMps: number;
  laneIndex?: number;
}

/**
 * WaypointGraph
 * Graph-based navigation system for Danfo Express.
 * Provides lane tracking, junction routing, roundabout circulation, and bus-stop pull-off waypoints.
 */
export class WaypointGraph {
  private nodes: Map<string, WaypointNode> = new Map();
  public static readonly LANES = [-5.8, -2.0, 2.0, 5.8];

  constructor() {
    this.buildCoreGridWaypoints();
  }

  private buildCoreGridWaypoints() {
    // Generate highway baseline waypoints every 50 meters
    for (let z = 0; z <= 4000; z += 50) {
      WaypointGraph.LANES.forEach((laneX, lIdx) => {
        const id = `lane_${lIdx}_z${z}`;
        const nextId = `lane_${lIdx}_z${z + 50}`;
        const node: WaypointNode = {
          id,
          x: laneX,
          z,
          type: 'EXPRESSWAY_LANE',
          nextIds: z < 4000 ? [nextId] : [],
          speedLimitMps: lIdx === 1 || lIdx === 2 ? 18.0 : 12.5,
          laneIndex: lIdx,
        };
        this.nodes.set(id, node);
      });
    }

    // Connect special junction turnoffs & bus stop pull-off bay waypoints
    this.registerBusStopBayWaypoints(200, 'bus_bay_cement');
    this.registerBusStopBayWaypoints(750, 'bus_bay_maryland');
    this.registerBusStopBayWaypoints(1250, 'bus_bay_anthony');
    this.registerBusStopBayWaypoints(1750, 'bus_bay_oshodi');
    this.registerBusStopBayWaypoints(2500, 'bus_bay_yaba');

    // Register Chaotic Lagos Market Roundabout circulation waypoints
    this.registerRoundaboutWaypoints(900, 'roundabout_maryland');
    this.registerRoundaboutWaypoints(1900, 'roundabout_oshodi');
    this.registerRoundaboutWaypoints(3600, 'roundabout_costain');

    // Register Major Expressway Interchange flyover ramp waypoints
    this.registerInterchangeWaypoints(1400, 'interchange_anthony');
    this.registerInterchangeWaypoints(3100, 'interchange_ojuelegba');
  }

  /**
   * Registers circulating waypoints around a Lagos market roundabout ring
   */
  public registerRoundaboutWaypoints(centerZ: number, rbName: string) {
    const r = 11.5;
    const entryNode: WaypointNode = {
      id: `${rbName}_entry`,
      x: 5.8,
      z: centerZ - 20,
      type: 'ROUNDABOUT_CIRCULATION',
      nextIds: [`${rbName}_east`],
      speedLimitMps: 6.5,
    };
    const eastNode: WaypointNode = {
      id: `${rbName}_east`,
      x: r,
      z: centerZ,
      type: 'ROUNDABOUT_CIRCULATION',
      nextIds: [`${rbName}_north`],
      speedLimitMps: 5.5,
    };
    const northNode: WaypointNode = {
      id: `${rbName}_north`,
      x: 2.0,
      z: centerZ + 20,
      type: 'ROUNDABOUT_CIRCULATION',
      nextIds: [`lane_2_z${centerZ + 50}`],
      speedLimitMps: 7.0,
    };

    this.nodes.set(entryNode.id, entryNode);
    this.nodes.set(eastNode.id, eastNode);
    this.nodes.set(northNode.id, northNode);
  }

  /**
   * Registers on-ramp and off-ramp slipway waypoints for a major flyover interchange
   */
  public registerInterchangeWaypoints(centerZ: number, icName: string) {
    const offRampNode: WaypointNode = {
      id: `${icName}_offramp`,
      x: 14.5,
      z: centerZ,
      type: 'BUS_STOP_DIVERGE',
      nextIds: [`${icName}_merge`],
      speedLimitMps: 8.0,
    };
    const mergeNode: WaypointNode = {
      id: `${icName}_merge`,
      x: 5.8,
      z: centerZ + 35,
      type: 'BUS_STOP_MERGE',
      nextIds: [`lane_3_z${centerZ + 50}`],
      speedLimitMps: 11.0,
    };

    this.nodes.set(offRampNode.id, offRampNode);
    this.nodes.set(mergeNode.id, mergeNode);
  }

  /**
   * Registers a dedicated side-lane pull-off bus stop bay with smooth deceleration taper,
   * dwell zone, and acceleration merge taper.
   */
  public registerBusStopBayWaypoints(startZ: number, bayName: string) {
    const mainLaneX = 5.8;
    const bayIndentedX = 10.5;

    // 1. Diverge Taper Node (tapers outward from main lane into bus bay)
    const divergeNode: WaypointNode = {
      id: `${bayName}_diverge`,
      x: (mainLaneX + bayIndentedX) * 0.5,
      z: startZ + 8,
      type: 'BUS_STOP_DIVERGE',
      nextIds: [`${bayName}_dwell`],
      speedLimitMps: 7.0,
    };

    // 2. Dwell Bay Node (completely outside the active highway traffic stream!)
    const dwellNode: WaypointNode = {
      id: `${bayName}_dwell`,
      x: bayIndentedX,
      z: startZ + 22,
      type: 'BUS_STOP_BAY',
      nextIds: [`${bayName}_merge`],
      speedLimitMps: 4.0,
    };

    // 3. Merge Taper Node (smoothly returns into outer commuter lane)
    const mergeNode: WaypointNode = {
      id: `${bayName}_merge`,
      x: (mainLaneX + bayIndentedX) * 0.5,
      z: startZ + 38,
      type: 'BUS_STOP_MERGE',
      nextIds: [`lane_3_z${Math.ceil((startZ + 45) / 50) * 50}`],
      speedLimitMps: 8.5,
    };

    this.nodes.set(divergeNode.id, divergeNode);
    this.nodes.set(dwellNode.id, dwellNode);
    this.nodes.set(mergeNode.id, mergeNode);

    // Link previous main lane node to allow branching into the bay
    const prevLaneNodeId = `lane_3_z${Math.floor(startZ / 50) * 50}`;
    const prevNode = this.nodes.get(prevLaneNodeId);
    if (prevNode) {
      prevNode.nextIds.push(divergeNode.id);
    }
  }

  /**
   * Returns the nearest waypoint to a position
   */
  public findNearestWaypoint(x: number, z: number): WaypointNode | null {
    let nearest: WaypointNode | null = null;
    let minDistSq = Infinity;

    for (const node of this.nodes.values()) {
      const dx = node.x - x;
      const dz = node.z - z;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        nearest = node;
      }
    }
    return nearest;
  }

  /**
   * Calculates a smooth look-ahead steering target along the waypoint graph
   */
  public getTargetSteeringPoint(
    currentX: number,
    currentZ: number,
    targetLaneX: number,
    lookAheadDist = 14
  ): { x: number; z: number } {
    return {
      x: targetLaneX,
      z: currentZ + lookAheadDist,
    };
  }
}
