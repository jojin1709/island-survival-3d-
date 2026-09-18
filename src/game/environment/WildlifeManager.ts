import * as THREE from 'three';
import { TerrainGenerator } from '../terrain/TerrainGenerator';

interface Crab {
  group: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetYaw: number;
  currentYaw: number;
  legPhase: number;
  state: 'wander' | 'flee';
  changeTimer: number;
  legs: THREE.Mesh[];
  claws: THREE.Mesh[];
}

interface Fish {
  group: THREE.Group;
  position: THREE.Vector3;
  center: THREE.Vector3;
  angle: number;
  radius: number;
  speed: number;
  tailMesh: THREE.Mesh;
}

export class WildlifeManager {
  public group = new THREE.Group();
  private crabs: Crab[] = [];
  private fishes: Fish[] = [];

  public create(scene: THREE.Scene): void {
    this.group.name = 'WildlifeGroup';

    // Materials
    const crabShellMat = new THREE.MeshStandardMaterial({ color: 0xdd4422, roughness: 0.6, metalness: 0.1 });
    const crabEyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const crabLegMat = new THREE.MeshStandardMaterial({ color: 0xcc6633, roughness: 0.7 });

    const fishMat1 = new THREE.MeshStandardMaterial({ color: 0x00bbff, roughness: 0.3, metalness: 0.2 });
    const fishMat2 = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.4, metalness: 0.1 });

    // 1. Spawn Beach Crabs (Shoreline coordinates)
    const beachCrabSpawns = [
      new THREE.Vector2(12, 45),
      new THREE.Vector2(-15, 46),
      new THREE.Vector2(-25, 42),
      new THREE.Vector2(28, 38),
      new THREE.Vector2(-35, 20),
      new THREE.Vector2(45, 12),
      new THREE.Vector2(-48, -10),
      new THREE.Vector2(42, -25)
    ];

    for (const spawn of beachCrabSpawns) {
      const crabGroup = new THREE.Group();
      const crabY = TerrainGenerator.sampleHeight(spawn.x, spawn.y) + 0.08;
      crabGroup.position.set(spawn.x, crabY, spawn.y);

      // Body Carapace
      const shellGeo = new THREE.SphereGeometry(0.18, 8, 6);
      shellGeo.scale(1.2, 0.5, 0.9);
      const shell = new THREE.Mesh(shellGeo, crabShellMat);
      shell.castShadow = true;
      crabGroup.add(shell);

      // Eyes
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), crabEyeMat);
      eyeL.position.set(0.08, 0.12, 0.14);
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), crabEyeMat);
      eyeR.position.set(-0.08, 0.12, 0.14);
      crabGroup.add(eyeL);
      crabGroup.add(eyeR);

      // Claws
      const claws: THREE.Mesh[] = [];
      const clawGeo = new THREE.BoxGeometry(0.08, 0.06, 0.14);
      const clawL = new THREE.Mesh(clawGeo, crabShellMat);
      clawL.position.set(0.18, 0.05, 0.16);
      clawL.castShadow = true;
      const clawR = new THREE.Mesh(clawGeo, crabShellMat);
      clawR.position.set(-0.18, 0.05, 0.16);
      clawR.castShadow = true;
      crabGroup.add(clawL);
      crabGroup.add(clawR);
      claws.push(clawL, clawR);

      // Walking Legs (3 per side)
      const legs: THREE.Mesh[] = [];
      const legGeo = new THREE.CylinderGeometry(0.015, 0.012, 0.18, 5);
      for (let i = 0; i < 3; i++) {
        const offsetZ = (i - 1) * 0.08;
        // Left leg
        const legL = new THREE.Mesh(legGeo, crabLegMat);
        legL.rotation.z = Math.PI / 3;
        legL.position.set(0.20, -0.02, offsetZ);
        crabGroup.add(legL);
        legs.push(legL);

        // Right leg
        const legR = new THREE.Mesh(legGeo, crabLegMat);
        legR.rotation.z = -Math.PI / 3;
        legR.position.set(-0.20, -0.02, offsetZ);
        crabGroup.add(legR);
        legs.push(legR);
      }

      this.group.add(crabGroup);
      this.crabs.push({
        group: crabGroup,
        position: crabGroup.position,
        velocity: new THREE.Vector3(),
        targetYaw: Math.random() * Math.PI * 2,
        currentYaw: 0,
        legPhase: Math.random() * 10,
        state: 'wander',
        changeTimer: 2.0 + Math.random() * 3.0,
        legs,
        claws
      });
    }

    // 2. Spawn Lagoon Tropical Fish
    const lagoonCenter = new THREE.Vector3(32, -0.4, -8);
    for (let i = 0; i < 6; i++) {
      const fishGroup = new THREE.Group();
      const radius = 2.5 + Math.random() * 4.0;
      const angle = (i / 6) * Math.PI * 2;
      const mat = i % 2 === 0 ? fishMat1 : fishMat2;

      // Fish Body
      const bodyGeo = new THREE.ConeGeometry(0.1, 0.35, 6);
      bodyGeo.rotateX(Math.PI / 2);
      const body = new THREE.Mesh(bodyGeo, mat);
      fishGroup.add(body);

      // Tail
      const tailGeo = new THREE.BoxGeometry(0.02, 0.16, 0.12);
      const tail = new THREE.Mesh(tailGeo, mat);
      tail.position.set(0, 0, -0.22);
      fishGroup.add(tail);

      this.group.add(fishGroup);
      this.fishes.push({
        group: fishGroup,
        position: fishGroup.position,
        center: lagoonCenter,
        angle,
        radius,
        speed: 0.8 + Math.random() * 0.5,
        tailMesh: tail
      });
    }

    scene.add(this.group);
  }

  public update(dt: number, playerPos: THREE.Vector3, elapsedTime: number): void {
    // 1. Update Crabs
    for (const crab of this.crabs) {
      const distToPlayer = crab.position.distanceTo(playerPos);

      crab.changeTimer -= dt;
      if (distToPlayer < 4.5) {
        crab.state = 'flee';
        // Run directly away from player
        const awayVec = new THREE.Vector3().subVectors(crab.position, playerPos);
        crab.targetYaw = Math.atan2(awayVec.x, awayVec.z);
      } else if (crab.changeTimer <= 0) {
        crab.state = 'wander';
        crab.changeTimer = 2.0 + Math.random() * 4.0;
        crab.targetYaw += (Math.random() - 0.5) * 2.0;
      }

      // Smooth turn
      crab.currentYaw = THREE.MathUtils.lerp(crab.currentYaw, crab.targetYaw, dt * 5.0);
      crab.group.rotation.y = crab.currentYaw;

      // Move forward/sideways
      const speed = crab.state === 'flee' ? 1.6 : 0.4;
      const moveX = Math.sin(crab.currentYaw) * speed * dt;
      const moveZ = Math.cos(crab.currentYaw) * speed * dt;

      crab.position.x += moveX;
      crab.position.z += moveZ;

      // Stick to terrain height
      const targetY = TerrainGenerator.sampleHeight(crab.position.x, crab.position.z) + 0.08;
      crab.position.y = THREE.MathUtils.lerp(crab.position.y, targetY, dt * 10.0);

      // Leg wiggle
      crab.legPhase += dt * (speed * 12.0);
      crab.legs.forEach((leg, idx) => {
        leg.rotation.x = Math.sin(crab.legPhase + idx) * 0.35;
      });

      // Claw pinch
      crab.claws.forEach((claw, idx) => {
        claw.rotation.y = Math.sin(elapsedTime * 4.0 + idx) * 0.2;
      });
    }

    // 2. Update Lagoon Fish
    for (const fish of this.fishes) {
      fish.angle += (fish.speed / fish.radius) * dt;
      fish.position.x = fish.center.x + Math.cos(fish.angle) * fish.radius;
      fish.position.z = fish.center.z + Math.sin(fish.angle) * fish.radius;
      fish.position.y = -0.4 + Math.sin(elapsedTime * 2.0 + fish.angle) * 0.15;

      // Face velocity tangent
      fish.group.rotation.y = -fish.angle;

      // Tail swish
      fish.tailMesh.rotation.y = Math.sin(elapsedTime * 12.0) * 0.45;
    }
  }
}
