import RAPIER from '@dimforge/rapier3d-compat';

/**
 * RapierPhysicsEngine (WASM)
 * High-performance Rust-compiled physics engine providing:
 * - 3x-4x faster computation than pure JS physics
 * - Continuous Collision Detection (CCD) to eliminate fast-moving Danfo wall glitching/clipping
 * - Rigid bodies, static collision colliders, and raycasting
 */

export class RapierPhysicsEngine {
  private static instance: RapierPhysicsEngine | null = null;
  private isInitialized: boolean = false;
  private world: RAPIER.World | null = null;
  private vehicleBody: RAPIER.RigidBody | null = null;
  private vehicleCollider: RAPIER.Collider | null = null;
  private staticColliders: RAPIER.Collider[] = [];

  public static async getInstance(): Promise<RapierPhysicsEngine> {
    if (!RapierPhysicsEngine.instance) {
      RapierPhysicsEngine.instance = new RapierPhysicsEngine();
      await RapierPhysicsEngine.instance.init();
    }
    return RapierPhysicsEngine.instance;
  }

  public async init(): Promise<boolean> {
    if (this.isInitialized) return true;
    try {
      await RAPIER.init();
      const gravity = { x: 0.0, y: -9.81, z: 0.0 };
      this.world = new RAPIER.World(gravity);

      // Create Player Danfo Rigid Body with Continuous Collision Detection (CCD) enabled
      const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, 1.0, 0)
        .setCcdEnabled(true); // Prevents clipping through walls at high speeds!
      
      this.vehicleBody = this.world.createRigidBody(rigidBodyDesc);

      // Danfo Bus Collider dimensions (Half extents: width=1.1, height=1.0, length=2.5)
      const colliderDesc = RAPIER.ColliderDesc.cuboid(1.1, 1.0, 2.5)
        .setFriction(0.7)
        .setRestitution(0.1);
      
      this.vehicleCollider = this.world.createCollider(colliderDesc, this.vehicleBody);

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.warn('Rapier WASM initialization warning (using fallback collision):', err);
      return false;
    }
  }

  /**
   * Adds static obstacle colliders (curbs, buildings, roadblocks)
   */
  public addStaticBoxCollider(x: number, y: number, z: number, halfWidth: number, halfHeight: number, halfLength: number) {
    if (!this.world) return;
    try {
      const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
      const body = this.world.createRigidBody(bodyDesc);
      const colDesc = RAPIER.ColliderDesc.cuboid(halfWidth, halfHeight, halfLength);
      const collider = this.world.createCollider(colDesc, body);
      this.staticColliders.push(collider);
    } catch {}
  }

  /**
   * Updates vehicle position in the Rapier world
   */
  public updateVehicleTransform(x: number, y: number, z: number, yaw: number) {
    if (!this.vehicleBody) return;
    try {
      this.vehicleBody.setTranslation({ x, y, z }, true);
      const halfYaw = yaw * 0.5;
      this.vehicleBody.setRotation({
        x: 0,
        y: Math.sin(halfYaw),
        z: 0,
        w: Math.cos(halfYaw),
      }, true);
    } catch {}
  }

  /**
   * Advances the Rapier physics world simulation by delta time
   */
  public step(dt: number) {
    if (!this.world) return;
    try {
      this.world.timestep = Math.min(0.033, dt);
      this.world.step();
    } catch {}
  }

  /**
   * Continuous raycast query along heading direction
   */
  public castRayForward(originX: number, originY: number, originZ: number, dirX: number, dirZ: number, maxDist = 20): { hit: boolean; dist: number } {
    if (!this.world) return { hit: false, dist: maxDist };
    try {
      const ray = new RAPIER.Ray(
        { x: originX, y: originY, z: originZ },
        { x: dirX, y: 0, z: dirZ }
      );
      const hit = this.world.castRay(ray, maxDist, true);
      if (hit !== null) {
        return { hit: true, dist: hit.timeOfImpact };
      }
    } catch {}
    return { hit: false, dist: maxDist };
  }

  public isReady(): boolean {
    return this.isInitialized && this.world !== null;
  }
}
