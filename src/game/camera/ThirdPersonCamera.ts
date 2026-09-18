import * as THREE from 'three';
import { PhysicsWorld } from '../physics/PhysicsWorld';

export class ThirdPersonCamera {
  public camera: THREE.PerspectiveCamera;
  public yaw = 0.0; // Radians around Y axis
  public pitch = -0.15; // Radians vertical elevation (negative = looking slightly down)
  public distance = 4.8;
  public minDistance = 1.8;
  public maxDistance = 8.5;
  public currentPosition = new THREE.Vector3();
  public currentLookAt = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  public handleMouseMove(movementX: number, movementY: number): void {
    this.yaw -= movementX * 0.0024;
    this.pitch = Math.max(-0.75, Math.min(0.65, this.pitch - movementY * 0.0020));
  }

  public handleMouseWheel(deltaY: number): void {
    this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance + deltaY * 0.003));
  }

  public getHorizontalForward(): THREE.Vector3 {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() > 0.0001) {
      forward.normalize();
    } else {
      forward.set(0, 0, -1);
    }
    return forward;
  }

  public getHorizontalRight(): THREE.Vector3 {
    const forward = this.getHorizontalForward();
    const right = new THREE.Vector3();
    // forward x worldUp = right vector
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    return right;
  }

  public update(targetWorldPos: THREE.Vector3, dt: number): void {
    const anchor = targetWorldPos.clone();

    // Spherical offset relative to target
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    const desiredOffset = new THREE.Vector3(
      Math.sin(this.yaw) * cp * this.distance,
      -sp * this.distance,
      Math.cos(this.yaw) * cp * this.distance
    );

    let actualDistance = this.distance;

    // Raycast from anchor to desired camera position to prevent wall/terrain clipping
    const rayDir = desiredOffset.clone().normalize();
    const rayHit = PhysicsWorld.getInstance().castRay(anchor, rayDir, this.distance);
    if (rayHit.hit && rayHit.toi !== undefined && rayHit.toi > 0.35) {
      actualDistance = Math.max(1.2, rayHit.toi - 0.25);
    }

    const targetPos = anchor.clone().add(rayDir.multiplyScalar(actualDistance));

    // Smooth camera damping
    const lerpFactor = Math.min(1.0, dt * 16.0);
    this.currentPosition.lerp(targetPos, lerpFactor);
    this.currentLookAt.lerp(anchor, lerpFactor);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }
}
