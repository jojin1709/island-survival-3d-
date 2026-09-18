import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

export class PhysicsWorld {
  private static instance: PhysicsWorld;
  public world!: RAPIER.World;
  private initialized = false;

  private constructor() {}

  public static getInstance(): PhysicsWorld {
    if (!PhysicsWorld.instance) {
      PhysicsWorld.instance = new PhysicsWorld();
    }
    return PhysicsWorld.instance;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    await RAPIER.init();
    // Gravity: -20 m/s^2 for crisp survival game jumping/falling feel
    this.world = new RAPIER.World({ x: 0, y: -22.0, z: 0 });
    this.initialized = true;
    console.log('[PhysicsWorld] Rapier3D initialized successfully');
  }

  public step(dt: number): void {
    if (!this.initialized || !this.world) return;
    // Step simulation with clamped delta
    const clampedDt = Math.min(dt, 0.05);
    this.world.timestep = clampedDt;
    this.world.step();
  }

  public createTerrainCollider(vertices: Float32Array, indices: Uint32Array): RAPIER.Collider {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed();
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);
    return this.world.createCollider(colliderDesc, body);
  }

  public createStaticBox(
    position: THREE.Vector3,
    size: THREE.Vector3,
    rotation: THREE.Quaternion = new THREE.Quaternion()
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
    bodyDesc.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
    const collider = this.world.createCollider(colliderDesc, body);
    return { body, collider };
  }

  public createStaticCylinder(
    position: THREE.Vector3,
    radius: number,
    halfHeight: number
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cylinder(halfHeight, radius);
    const collider = this.world.createCollider(colliderDesc, body);
    return { body, collider };
  }

  public createStaticSphere(
    position: THREE.Vector3,
    radius: number
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.ball(radius);
    const collider = this.world.createCollider(colliderDesc, body);
    return { body, collider };
  }

  public castRay(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxToi: number = 10,
    filterCallback?: (collider: RAPIER.Collider) => boolean
  ): { hit: boolean; point?: THREE.Vector3; normal?: THREE.Vector3; toi?: number; collider?: RAPIER.Collider } {
    if (!this.world) return { hit: false };

    const ray = new RAPIER.Ray(
      { x: origin.x, y: origin.y, z: origin.z },
      { x: direction.x, y: direction.y, z: direction.z }
    );

    const hit = this.world.castRayAndGetNormal(
      ray,
      maxToi,
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      filterCallback as any
    );

    if (hit) {
      const toi = (hit as any).timeOfImpact ?? (hit as any).toi ?? 0;
      const point = new THREE.Vector3(
        origin.x + direction.x * toi,
        origin.y + direction.y * toi,
        origin.z + direction.z * toi
      );
      const normal = hit.normal ? new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z) : new THREE.Vector3(0, 1, 0);
      return { hit: true, point, normal, toi, collider: hit.collider };
    }

    return { hit: false };
  }
}
