import * as THREE from 'three';
import { AssetManager } from '../../assets/AssetManager';

export class PlayerModel {
  /** Root object that matches physical player translation and facing direction */
  public playerRoot = new THREE.Group();
  /** Visual container that holds the mesh and applies model-specific axis corrections */
  public characterVisual = new THREE.Group();
  /** Camera target anchor point on upper torso/shoulder */
  public cameraTarget = new THREE.Object3D();

  public mixer?: THREE.AnimationMixer;
  public animations = new Map<string, THREE.AnimationAction>();
  public isGLTFLoaded = false;

  /** Model-specific yaw correction offset (in radians) */
  public modelRotationOffset = 0; // Set to 0 because Soldier.glb and procedural survivor both face +Z forward

  constructor() {
    this.playerRoot.name = 'PlayerRoot';
    this.characterVisual.name = 'CharacterVisual';
    this.cameraTarget.name = 'CameraTarget';

    // Camera target at shoulder/chest height (1.45m above feet)
    this.cameraTarget.position.set(0, 1.45, 0);

    this.playerRoot.add(this.characterVisual);
    this.playerRoot.add(this.cameraTarget);
  }

  public async load(): Promise<void> {
    try {
      const assetManager = AssetManager.getInstance();
      const gltf = await assetManager.loadGLTF('/assets/characters/Soldier.glb');
      const model = gltf.scene;

      // Ensure proper scale and shadow casting on all skinned meshes
      model.scale.set(1.15, 1.15, 1.15);
      model.position.set(0, 0, 0);

      model.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat) {
            mat.roughness = Math.min(0.85, Math.max(0.3, mat.roughness));
            mat.metalness = Math.min(0.2, mat.metalness);
          }
        }
      });

      this.characterVisual.add(model);
      this.characterVisual.rotation.y = this.modelRotationOffset;

      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach((clip) => {
          const name = clip.name.toLowerCase();
          const action = this.mixer!.clipAction(clip);
          this.animations.set(name, action);

          // Standardized animation aliases
          if (name.includes('idle')) this.animations.set('idle', action);
          if (name.includes('walk')) this.animations.set('walk', action);
          if (name.includes('run')) this.animations.set('run', action);
        });
      }

      this.isGLTFLoaded = true;
      console.log('[PlayerModel] Humanoid Soldier.glb loaded with animations:', Array.from(this.animations.keys()));
    } catch (e) {
      console.warn('[PlayerModel] Loading fallback tactical survivor model:', e);
      this.createProceduralSurvivor();
    }
  }

  private createProceduralSurvivor(): void {
    const survivor = new THREE.Group();

    // High quality PBR materials with proper sRGB colors
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd6a07a, roughness: 0.65, metalness: 0.0 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x4d664c, roughness: 0.80, metalness: 0.05 });
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x2b3329, roughness: 0.75, metalness: 0.1 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x615243, roughness: 0.88, metalness: 0.0 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x261d17, roughness: 0.75, metalness: 0.15 });
    const packMat = new THREE.MeshStandardMaterial({ color: 0x755639, roughness: 0.82, metalness: 0.05 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x24180e, roughness: 0.90, metalness: 0.0 });

    // Torso & Tactical Vest (Forward is +Z)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.68, 0.32), shirtMat);
    torso.position.y = 1.25;
    torso.castShadow = true;
    survivor.add(torso);

    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.52, 0.36), vestMat);
    vest.position.set(0, 1.30, 0);
    vest.castShadow = true;
    survivor.add(vest);

    // Survival Backpack on back (-Z)
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.58, 0.28), packMat);
    pack.position.set(0, 1.32, -0.28);
    pack.castShadow = true;
    survivor.add(pack);

    // Bedroll attached on top of pack
    const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.52, 8), vestMat);
    bedroll.rotation.z = Math.PI / 2;
    bedroll.position.set(0, 1.68, -0.28);
    bedroll.castShadow = true;
    survivor.add(bedroll);

    // Head, Neck & Hair (Front face +Z)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.18, 8), skinMat);
    neck.position.y = 1.66;
    neck.castShadow = true;
    survivor.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), skinMat);
    head.position.y = 1.84;
    head.castShadow = true;
    survivor.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.23, 8, 6), hairMat);
    hair.position.set(0, 1.88, -0.04);
    hair.scale.set(1.02, 0.95, 1.05);
    hair.castShadow = true;
    survivor.add(hair);

    // Arms
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), shirtMat);
      shoulder.position.set(side * 0.35, 1.50, 0);
      survivor.add(shoulder);

      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.65, 8), skinMat);
      arm.position.set(side * 0.38, 1.15, 0);
      arm.castShadow = true;
      survivor.add(arm);
    }

    // Legs & Hiking Boots
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.10, 0.72, 8), pantsMat);
      leg.position.set(side * 0.16, 0.65, 0);
      leg.castShadow = true;
      survivor.add(leg);

      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.32), bootMat);
      boot.position.set(side * 0.16, 0.11, 0.06);
      boot.castShadow = true;
      survivor.add(boot);
    }

    this.characterVisual.add(survivor);
    this.characterVisual.rotation.y = this.modelRotationOffset;
    console.log('[PlayerModel] Procedural tactical survivor created');
  }
}
