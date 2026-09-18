import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { HumanSurvivorModel } from './HumanSurvivorModel';
import { AnimationController, type MovementState } from './AnimationController';
import { ThirdPersonCamera } from '../camera/ThirdPersonCamera';
import { TerrainGenerator } from '../terrain/TerrainGenerator';
import { WaterVolume, type WaterLocomotionState } from '../environment/WaterVolume';

export class CharacterController {
  public body!: RAPIER.RigidBody;
  public collider!: RAPIER.Collider;
  public playerModel: HumanSurvivorModel;
  public animationController: AnimationController;

  public position = new THREE.Vector3(0, 5, 48);
  public velocity = new THREE.Vector3();
  public movementDirection = new THREE.Vector3();
  public isGrounded = false;
  public isSprinting = false;
  public waterLocomotion: WaterLocomotionState = 'NONE';
  public submergedDepth = 0;
  public facingRotation = 0; // Yaw in radians
  private targetRotation = 0;

  // Debug visualizers (F3)
  public isDebugMode = false;
  private debugGroup = new THREE.Group();
  private arrowCamForward!: THREE.ArrowHelper;
  private arrowPlayerForward!: THREE.ArrowHelper;
  private arrowMovement!: THREE.ArrowHelper;

  // Input states
  public input = {
    forward: 0, // +1 for W, -1 for S
    right: 0,   // +1 for D, -1 for A
    sprint: false,
    jump: false,
    dive: false // KeyC or Ctrl
  };

  constructor(playerModel: HumanSurvivorModel) {
    this.playerModel = playerModel;
    this.animationController = new AnimationController(playerModel);
    this.setupDebugHelpers();
  }

  private setupDebugHelpers(): void {
    // Blue: Camera Forward
    this.arrowCamForward = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 2.0, 0),
      1.6,
      0x0088ff,
      0.35,
      0.18
    );
    // Green: Player Facing Forward
    this.arrowPlayerForward = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 1.8, 0),
      1.6,
      0x00ff44,
      0.35,
      0.18
    );
    // Red: Actual Movement Vector
    this.arrowMovement = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1.6, 0),
      1.6,
      0xff2222,
      0.35,
      0.18
    );

    this.debugGroup.add(this.arrowCamForward);
    this.debugGroup.add(this.arrowPlayerForward);
    this.debugGroup.add(this.arrowMovement);
    this.debugGroup.visible = false;
  }

  public init(scene: THREE.Scene, startPos: THREE.Vector3 = new THREE.Vector3(0, 5, 48)): void {
    this.position.copy(startPos);
    const spawnY = TerrainGenerator.sampleHeight(startPos.x, startPos.z) + 1.8;
    this.position.y = spawnY;

    const pw = PhysicsWorld.getInstance();
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(this.position.x, this.position.y, this.position.z)
      .setLinearDamping(4.5)
      .setAngularDamping(10.0)
      .lockRotations();

    this.body = pw.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.capsule(0.55, 0.40)
      .setFriction(0.2)
      .setRestitution(0.0);

    this.collider = pw.world.createCollider(colliderDesc, this.body);

    scene.add(this.playerModel.playerRoot);
    this.playerModel.playerRoot.add(this.debugGroup);
    this.playerModel.playerRoot.position.copy(this.position);

    this.animationController.setState('IDLE');
    console.log('[CharacterController] Human survivor physics controller initialized');
  }

  public toggleDebug(): boolean {
    this.isDebugMode = !this.isDebugMode;
    this.debugGroup.visible = this.isDebugMode;
    return this.isDebugMode;
  }

  public update(
    dt: number,
    tpCamera: ThirdPersonCamera,
    stamina: number,
    gameTime = 0
  ): { staminaUsed: number; state: MovementState; waterState: WaterLocomotionState } {
    if (!this.body) return { staminaUsed: 0, state: 'IDLE', waterState: 'NONE' };

    const t = this.body.translation();
    const linvel = this.body.linvel();
    this.position.set(t.x, t.y, t.z);
    this.velocity.set(linvel.x, linvel.y, linvel.z);

    // 1. Check Water Submersion & State
    const submersion = WaterVolume.getSubmersionInfo(this.position, gameTime);
    this.waterLocomotion = submersion.waterState;
    this.submergedDepth = submersion.submergedDepth;
    const isSwimming = this.waterLocomotion === 'SWIMMING' || this.waterLocomotion === 'DIVING';

    // 2. Ground raycast check (only active when not swimming)
    let rayGrounded = false;
    if (!isSwimming) {
      const rayHit = PhysicsWorld.getInstance().castRay(
        new THREE.Vector3(t.x, t.y, t.z),
        new THREE.Vector3(0, -1, 0),
        1.05
      );
      rayGrounded = rayHit.hit && Math.abs(linvel.y) < 2.2;
    }
    this.isGrounded = rayGrounded;

    // 3. Camera-Relative Horizontal Vectors (strictly horizontal, zero pitch)
    const camForward = tpCamera.getHorizontalForward();
    const camRight = tpCamera.getHorizontalRight();

    const moveVec = new THREE.Vector3();
    if (this.input.forward !== 0) moveVec.addScaledVector(camForward, this.input.forward);
    if (this.input.right !== 0) moveVec.addScaledVector(camRight, this.input.right);

    const hasInput = moveVec.lengthSq() > 0.001;
    let speed = 0;
    let staminaUsed = 0;
    let animState: MovementState = 'IDLE';

    if (isSwimming) {
      // ==========================================
      // SWIMMING PHYSICS & LOCOMOTION
      // ==========================================
      this.body.setLinearDamping(7.0);

      // Buoyant upward force counteracting gravity near water surface
      const floatTargetY = submersion.waterHeight - 0.40;
      const depthError = floatTargetY - t.y;
      let buoyantVelocityY = linvel.y * 0.8;

      if (this.input.jump) {
        // Swim upward to surface
        buoyantVelocityY = 3.2;
      } else if (this.input.dive) {
        // Swim downward underwater
        buoyantVelocityY = -3.2;
      } else {
        // Float naturally at water surface
        buoyantVelocityY = depthError * 4.5;
      }

      const swimSpeed = this.input.sprint && stamina > 5 ? 5.2 : 3.4;
      if (this.input.sprint && hasInput) {
        staminaUsed = dt * 14.0;
      }

      if (hasInput) {
        moveVec.normalize();
        this.movementDirection.copy(moveVec);
        this.targetRotation = Math.atan2(moveVec.x, moveVec.z);

        // Smooth rotation toward movement vector
        let diff = this.targetRotation - this.facingRotation;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.facingRotation += diff * Math.min(1.0, dt * 10.0);

        this.body.setLinvel(
          { x: moveVec.x * swimSpeed, y: buoyantVelocityY, z: moveVec.z * swimSpeed },
          true
        );
        animState = 'SWIM';
      } else {
        this.movementDirection.set(0, 0, 0);
        this.body.setLinvel({ x: linvel.x * 0.7, y: buoyantVelocityY, z: linvel.z * 0.7 }, true);
        animState = 'SWIM_IDLE';
      }
    } else {
      // ==========================================
      // GROUND LOCOMOTION
      // ==========================================
      this.body.setLinearDamping(4.5);

      const isShallow = this.waterLocomotion === 'SHALLOW';
      const maxGroundSpeed = isShallow
        ? 3.0
        : (this.input.sprint && stamina > 2 && this.isGrounded ? 7.6 : 4.4);

      if (hasInput) {
        moveVec.normalize();
        this.movementDirection.copy(moveVec);
        speed = maxGroundSpeed;

        if (this.input.sprint && this.isGrounded && !isShallow) {
          this.isSprinting = true;
          staminaUsed = dt * 16.0;
        } else {
          this.isSprinting = false;
        }

        // Face the exact direction of travel
        this.targetRotation = Math.atan2(moveVec.x, moveVec.z);
        let diff = this.targetRotation - this.facingRotation;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.facingRotation += diff * Math.min(1.0, dt * 14.0);

        this.body.setLinvel({ x: moveVec.x * speed, y: linvel.y, z: moveVec.z * speed }, true);
      } else {
        this.isSprinting = false;
        this.movementDirection.set(0, 0, 0);
        this.body.setLinvel({ x: linvel.x * 0.65, y: linvel.y, z: linvel.z * 0.65 }, true);
      }

      // Jump impulse on land
      if (this.input.jump && this.isGrounded) {
        this.body.applyImpulse({ x: 0, y: 7.2, z: 0 }, true);
        this.input.jump = false;
        this.isGrounded = false;
        animState = 'JUMP';
      } else if (!this.isGrounded) {
        animState = linvel.y > 0.4 ? 'JUMP' : 'FALL';
      } else if (speed > 5.5) {
        animState = 'SPRINT';
      } else if (speed > 2.0) {
        animState = 'RUN';
      } else if (speed > 0.2) {
        animState = 'WALK';
      } else {
        animState = 'IDLE';
      }
    }

    // 4. Update Animation State & Mixer
    this.animationController.setState(animState);
    this.animationController.update(dt);

    // 5. Synchronize PlayerRoot visual position & facing orientation
    this.playerModel.playerRoot.position.set(t.x, t.y - 0.85, t.z);
    this.playerModel.playerRoot.rotation.y = this.facingRotation;

    // 6. Update Debug Direction Arrows (F3)
    if (this.isDebugMode) {
      this.arrowCamForward.setDirection(camForward);
      const playerFwd = new THREE.Vector3(Math.sin(this.facingRotation), 0, Math.cos(this.facingRotation));
      this.arrowPlayerForward.setDirection(playerFwd);
      if (hasInput) {
        this.arrowMovement.setDirection(moveVec);
        this.arrowMovement.visible = true;
      } else {
        this.arrowMovement.visible = false;
      }
    }

    // 7. Safety Bounds Check
    if (t.y < -30 || Math.hypot(t.x, t.z) > TerrainGenerator.ISLAND_RADIUS + 50) {
      const respawnH = TerrainGenerator.sampleHeight(0, 48) + 2.0;
      this.body.setTranslation({ x: 0, y: respawnH, z: 48 }, true);
      this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    return { staminaUsed, state: animState, waterState: this.waterLocomotion };
  }
}
