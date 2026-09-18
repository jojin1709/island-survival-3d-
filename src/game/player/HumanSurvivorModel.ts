import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const CHARACTER_MODEL_FORWARD_OFFSET = Math.PI;

export class HumanSurvivorModel {
  public playerRoot = new THREE.Group();
  public characterVisual = new THREE.Group();
  public cameraTarget = new THREE.Object3D();

  public mixer?: THREE.AnimationMixer;
  public animations = new Map<string, THREE.AnimationAction>();
  public isLoaded = false;

  // Skeletal references & bind pose quaternions
  public bones: Record<string, THREE.Bone> = {};
  public targetBindQuats: Record<string, THREE.Quaternion> = {};
  public gltfScene?: THREE.Group;

  constructor() {
    this.playerRoot.name = 'PlayerRoot';
    this.characterVisual.name = 'CharacterVisual';
    this.cameraTarget.name = 'CameraTarget';

    // Camera target at chest/neck height (1.45m above feet)
    this.cameraTarget.position.set(0, 1.45, 0);

    this.playerRoot.add(this.characterVisual);
    this.playerRoot.add(this.cameraTarget);

    this.characterVisual.rotation.y = CHARACTER_MODEL_FORWARD_OFFSET;
  }

  public async load(): Promise<void> {
    console.log('[HumanSurvivorModel] Loading human survivor GLB & relative retargeting suite...');
    const loader = new GLTFLoader();

    try {
      // 1. Load Human Survivor Character Model
      const survivorGltf = await loader.loadAsync('/assets/characters/human_survivor.glb');
      this.gltfScene = survivorGltf.scene;

      // Enable shadows and capture native bind pose quaternions
      this.gltfScene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
          const mesh = obj as THREE.Mesh;
          if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => {
              if ('roughness' in m) (m as THREE.MeshStandardMaterial).roughness = Math.max(0.35, (m as THREE.MeshStandardMaterial).roughness);
            });
          }
        }
        if ((obj as THREE.Bone).isBone) {
          const bone = obj as THREE.Bone;
          this.bones[bone.name] = bone;
          this.targetBindQuats[bone.name] = bone.quaternion.clone();
        }
      });

      // Scale model to human height (~1.75m)
      this.gltfScene.scale.set(1.0, 1.0, 1.0);
      this.gltfScene.position.set(0, 0, 0);
      this.characterVisual.add(this.gltfScene);

      // Attach survival backpack
      this.attachSurvivalBackpack();

      // 2. Initialize AnimationMixer on GLB scene
      this.mixer = new THREE.AnimationMixer(this.gltfScene);

      // 3. Load Mocap Animation Clips and capture source bind pose quaternions
      const animGltf = await loader.loadAsync('/assets/characters/Soldier.glb');
      const animClips = animGltf.animations;

      const sourceBindQuats: Record<string, THREE.Quaternion> = {};
      animGltf.scene.traverse((obj) => {
        if ((obj as THREE.Bone).isBone) {
          const b = obj as THREE.Bone;
          const cleanName = b.name.replace(/^mixamorig:/i, '').replace(/^mixamorig/i, '');
          sourceBindQuats[cleanName] = b.quaternion.clone();
        }
      });

      // Relative Quaternion Retargeting
      const retargetClip = (sourceClip: THREE.AnimationClip, newName: string): THREE.AnimationClip => {
        const tracks: THREE.KeyframeTrack[] = [];
        for (const track of sourceClip.tracks) {
          const cleanedName = track.name
            .replace(/^mixamorig:/i, '')
            .replace(/^mixamorig/i, '')
            .replace(/\.rotation$/i, '.quaternion');

          const parts = cleanedName.split('.');
          const boneName = parts[0];
          const property = parts[1];

          // Ignore scale and translation tracks
          if (property === 'scale' || property === 'position') continue;

          // Retarget quaternion rotations relative to each bone's bind pose
          if (property === 'quaternion' && this.bones[boneName]) {
            const sourceRest = sourceBindQuats[boneName] || new THREE.Quaternion(0, 0, 0, 1);
            const targetRest = this.targetBindQuats[boneName] || new THREE.Quaternion(0, 0, 0, 1);
            const invSourceRest = sourceRest.clone().invert();

            const rotValues = [...track.values];
            const keyQ = new THREE.Quaternion();

            for (let i = 0; i < rotValues.length; i += 4) {
              keyQ.set(rotValues[i], rotValues[i + 1], rotValues[i + 2], rotValues[i + 3]);
              
              // Delta rotation in source local bone space
              const deltaQ = keyQ.clone().multiply(invSourceRest);

              // Apply delta rotation to target bone bind pose
              const targetQ = deltaQ.multiply(targetRest).normalize();

              rotValues[i] = targetQ.x;
              rotValues[i + 1] = targetQ.y;
              rotValues[i + 2] = targetQ.z;
              rotValues[i + 3] = targetQ.w;
            }

            const rotTrack = new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, track.times, rotValues);
            tracks.push(rotTrack);
          }
        }
        return new THREE.AnimationClip(newName, sourceClip.duration, tracks);
      };

      const idleSource = animClips.find((c) => c.name.toLowerCase().includes('idle')) || animClips[0];
      const walkSource = animClips.find((c) => c.name.toLowerCase().includes('walk')) || animClips[3];
      const runSource = animClips.find((c) => c.name.toLowerCase().includes('run')) || animClips[1];

      const idleClip = retargetClip(idleSource, 'idle');
      const walkClip = retargetClip(walkSource, 'walk');
      const runClip = retargetClip(runSource, 'run');

      const actionIdle = this.mixer.clipAction(idleClip);
      const actionWalk = this.mixer.clipAction(walkClip);
      const actionRun = this.mixer.clipAction(runClip);

      this.animations.set('idle', actionIdle);
      this.animations.set('walk', actionWalk);
      this.animations.set('run', actionRun);
      this.animations.set('sprint', actionRun);
      this.animations.set('land', actionIdle);

      // Swimming & airborne animations
      this.animations.set('swim', actionWalk);
      this.animations.set('swim_idle', actionIdle);
      this.animations.set('water_enter', actionWalk);
      this.animations.set('water_exit', actionWalk);
      this.animations.set('jump', actionRun);
      this.animations.set('fall', actionRun);

      this.isLoaded = true;
      console.log('[HumanSurvivorModel] Relative quaternion retargeting completed with clean pelvis & legs!');
    } catch (err) {
      console.error('[HumanSurvivorModel] Failed to load human model:', err);
    }
  }

  private attachSurvivalBackpack(): void {
    const spineBone = this.bones['Spine2'] || this.bones['Spine1'] || this.bones['Spine'];
    if (!spineBone) return;

    const packGroup = new THREE.Group();
    packGroup.name = 'SurvivalBackpack';

    const packMat = new THREE.MeshStandardMaterial({
      color: 0x3a4833, // Olive canvas
      roughness: 0.85,
      metalness: 0.05
    });

    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x4a2e1d, // Leather straps
      roughness: 0.7,
      metalness: 0.1
    });

    const matMat = new THREE.MeshStandardMaterial({
      color: 0x1f3c5a, // Rolled sleeping mat
      roughness: 0.9
    });

    // Main backpack pouch
    const mainPouch = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.36, 0.16), packMat);
    mainPouch.position.set(0, 0.05, -0.15);
    mainPouch.castShadow = true;
    packGroup.add(mainPouch);

    // Front pouch
    const frontPocket = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.18, 0.08), packMat);
    frontPocket.position.set(0, -0.04, -0.25);
    frontPocket.castShadow = true;
    packGroup.add(frontPocket);

    // Top bedroll
    const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.32, 10), matMat);
    bedroll.rotation.z = Math.PI / 2;
    bedroll.position.set(0, 0.24, -0.15);
    bedroll.castShadow = true;
    packGroup.add(bedroll);

    spineBone.add(packGroup);
  }
}
