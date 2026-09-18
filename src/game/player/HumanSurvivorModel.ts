import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const CHARACTER_MODEL_FORWARD_OFFSET = 0;

export class HumanSurvivorModel {
  public playerRoot = new THREE.Group();
  public characterVisual = new THREE.Group();
  public cameraTarget = new THREE.Object3D();

  public mixer?: THREE.AnimationMixer;
  public animations = new Map<string, THREE.AnimationAction>();
  public isLoaded = false;

  // Skeletal references
  public bones: Record<string, THREE.Bone> = {};
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
    console.log('[HumanSurvivorModel] Loading human survivor GLB & generating native animation clips...');
    const loader = new GLTFLoader();

    try {
      // 1. Load Human Survivor Character Model
      const survivorGltf = await loader.loadAsync('/assets/characters/human_survivor.glb');
      this.gltfScene = survivorGltf.scene;

      // Enable shadows and gather all bones
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
        }
      });

      // Scale model to natural human height (~1.75m)
      this.gltfScene.scale.set(1.0, 1.0, 1.0);
      this.gltfScene.position.set(0, 0, 0);
      this.characterVisual.add(this.gltfScene);

      // Attach survival backpack
      this.attachSurvivalBackpack();

      // 2. Initialize AnimationMixer on GLB scene
      this.mixer = new THREE.AnimationMixer(this.gltfScene);

      // 3. Build Pure Biomechanical Skeletal Animation Clips
      this.createNativeSkeletalAnimations();

      this.isLoaded = true;
      console.log('[HumanSurvivorModel] Human survivor loaded with 100% stable upright kinematics!');
    } catch (err) {
      console.error('[HumanSurvivorModel] Failed to load human model:', err);
    }
  }

  private createNativeSkeletalAnimations(): void {
    if (!this.mixer) return;

    const deg2rad = Math.PI / 180;
    const legRest = new THREE.Quaternion(0, 0, 1, 0); // Native 180 deg Z leg bind pose

    // Helper to create quaternion from Euler
    const makeQ = (xDeg: number, yDeg: number, zDeg: number): THREE.Quaternion => {
      const euler = new THREE.Euler(xDeg * deg2rad, yDeg * deg2rad, zDeg * deg2rad, 'YXZ');
      return new THREE.Quaternion().setFromEuler(euler);
    };

    // Helper for upper body tracks (relative to identity)
    const upperQArr = (...rotations: [number, number, number][]): number[] => {
      const arr: number[] = [];
      rotations.forEach(([x, y, z]) => {
        const q = makeQ(x, y, z);
        arr.push(q.x, q.y, q.z, q.w);
      });
      return arr;
    };

    // Helper for leg tracks (multiplies relative to native [0,0,1,0] leg rest)
    const legQArr = (...rotations: [number, number, number][]): number[] => {
      const arr: number[] = [];
      rotations.forEach(([xDeg, yDeg, zDeg]) => {
        // Because of the 180 deg Z roll, local X rotation is inverted
        const swingQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -xDeg * deg2rad);
        const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yDeg * deg2rad);
        const rollQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), zDeg * deg2rad);
        
        const finalQ = swingQ.clone().multiply(yawQ).multiply(rollQ).multiply(legRest).normalize();
        arr.push(finalQ.x, finalQ.y, finalQ.z, finalQ.w);
      });
      return arr;
    };

    const qTrack = (boneName: string, times: number[], qArray: number[]): THREE.QuaternionKeyframeTrack => {
      return new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, times, qArray);
    };

    // ==========================================
    // 1. IDLE CLIP (Natural upright breathing)
    // ==========================================
    const idleDuration = 2.4;
    const idleTimes = [0, 1.2, 2.4];
    const idleTracks: THREE.KeyframeTrack[] = [
      qTrack('Hips', idleTimes, upperQArr([0, 0, 0], [0, 0, 0], [0, 0, 0])),
      qTrack('Spine', idleTimes, upperQArr([0, 0, 0], [2, 0, 0], [0, 0, 0])),
      qTrack('Spine1', idleTimes, upperQArr([0, 0, 0], [1.5, 0, 0], [0, 0, 0])),
      qTrack('Spine2', idleTimes, upperQArr([0, 0, 0], [2, 0, 0], [0, 0, 0])),
      qTrack('Head', idleTimes, upperQArr([0, 0, 0], [-1.5, 0, 0], [0, 0, 0])),
      qTrack('LeftArm', idleTimes, upperQArr([75, 5, -5], [76, 5, -5], [75, 5, -5])),
      qTrack('LeftForeArm', idleTimes, upperQArr([0, 0, -10], [0, 0, -12], [0, 0, -10])),
      qTrack('RightArm', idleTimes, upperQArr([75, -5, 5], [76, -5, 5], [75, -5, 5])),
      qTrack('RightForeArm', idleTimes, upperQArr([0, 0, 10], [0, 0, 12], [0, 0, 10])),
      qTrack('LeftUpLeg', idleTimes, legQArr([0, 0, 0], [0, 0, 0], [0, 0, 0])),
      qTrack('RightUpLeg', idleTimes, legQArr([0, 0, 0], [0, 0, 0], [0, 0, 0])),
      qTrack('LeftLeg', idleTimes, upperQArr([0, 0, 0], [0, 0, 0], [0, 0, 0])),
      qTrack('RightLeg', idleTimes, upperQArr([0, 0, 0], [0, 0, 0], [0, 0, 0]))
    ];
    const idleClip = new THREE.AnimationClip('idle', idleDuration, idleTracks);

    // ==========================================
    // 2. WALK CLIP (Forward bipedal locomotion)
    // ==========================================
    const walkDuration = 1.0;
    const walkTimes = [0, 0.25, 0.5, 0.75, 1.0];
    const walkTracks: THREE.KeyframeTrack[] = [
      qTrack('Spine', walkTimes, upperQArr([4, -3, 0], [4, 0, 0], [4, 3, 0], [4, 0, 0], [4, -3, 0])),
      // Left leg swings forward (+24 deg), back (-24 deg)
      qTrack('LeftUpLeg', walkTimes, legQArr([24, 0, 0], [0, 0, 0], [-24, 0, 0], [0, 0, 0], [24, 0, 0])),
      qTrack('LeftLeg', walkTimes, upperQArr([5, 0, 0], [25, 0, 0], [5, 0, 0], [0, 0, 0], [5, 0, 0])),
      // Right leg swings opposite
      qTrack('RightUpLeg', walkTimes, legQArr([-24, 0, 0], [0, 0, 0], [24, 0, 0], [0, 0, 0], [-24, 0, 0])),
      qTrack('RightLeg', walkTimes, upperQArr([5, 0, 0], [0, 0, 0], [5, 0, 0], [25, 0, 0], [5, 0, 0])),
      // Arms swing naturally opposite to legs
      qTrack('LeftArm', walkTimes, upperQArr([75, 5, 18], [75, 5, -5], [75, 5, -24], [75, 5, -5], [75, 5, 18])),
      qTrack('LeftForeArm', walkTimes, upperQArr([0, 0, -8], [0, 0, -15], [0, 0, -25], [0, 0, -15], [0, 0, -8])),
      qTrack('RightArm', walkTimes, upperQArr([75, -5, -18], [75, -5, 5], [75, -5, 24], [75, -5, 5], [75, -5, -18])),
      qTrack('RightForeArm', walkTimes, upperQArr([0, 0, 8], [0, 0, 15], [0, 0, 25], [0, 0, 15], [0, 0, 8]))
    ];
    const walkClip = new THREE.AnimationClip('walk', walkDuration, walkTracks);

    // ==========================================
    // 3. RUN CLIP (Dynamic forward run stride)
    // ==========================================
    const runDuration = 0.65;
    const runTimes = [0, 0.1625, 0.325, 0.4875, 0.65];
    const runTracks: THREE.KeyframeTrack[] = [
      qTrack('Spine', runTimes, upperQArr([12, -4, 0], [12, 0, 0], [12, 4, 0], [12, 0, 0], [12, -4, 0])),
      qTrack('LeftUpLeg', runTimes, legQArr([42, 0, 0], [0, 0, 0], [-42, 0, 0], [0, 0, 0], [42, 0, 0])),
      qTrack('LeftLeg', runTimes, upperQArr([10, 0, 0], [55, 0, 0], [10, 0, 0], [5, 0, 0], [10, 0, 0])),
      qTrack('RightUpLeg', runTimes, legQArr([-42, 0, 0], [0, 0, 0], [42, 0, 0], [0, 0, 0], [-42, 0, 0])),
      qTrack('RightLeg', runTimes, upperQArr([10, 0, 0], [5, 0, 0], [10, 0, 0], [55, 0, 0], [10, 0, 0])),
      qTrack('LeftArm', runTimes, upperQArr([75, 5, 32], [75, 5, -5], [75, 5, -42], [75, 5, -5], [75, 5, 32])),
      qTrack('LeftForeArm', runTimes, upperQArr([0, 0, -25], [0, 0, -45], [0, 0, -65], [0, 0, -45], [0, 0, -25])),
      qTrack('RightArm', runTimes, upperQArr([75, -5, -32], [75, -5, 5], [75, -5, 42], [75, -5, 5], [75, -5, -32])),
      qTrack('RightForeArm', runTimes, upperQArr([0, 0, 25], [0, 0, 45], [0, 0, 65], [0, 0, 45], [0, 0, 25]))
    ];
    const runClip = new THREE.AnimationClip('run', runDuration, runTracks);

    // ==========================================
    // 4. JUMP & FALL CLIPS
    // ==========================================
    const jumpClip = new THREE.AnimationClip('jump', 0.8, [
      qTrack('Spine', [0, 0.4, 0.8], upperQArr([-8, 0, 0], [-12, 0, 0], [-5, 0, 0])),
      qTrack('LeftUpLeg', [0, 0.4, 0.8], legQArr([30, 0, 0], [40, 0, 0], [20, 0, 0])),
      qTrack('RightUpLeg', [0, 0.4, 0.8], legQArr([30, 0, 0], [40, 0, 0], [20, 0, 0])),
      qTrack('LeftArm', [0, 0.4, 0.8], upperQArr([60, 5, -35], [50, 5, -50], [60, 5, -35])),
      qTrack('RightArm', [0, 0.4, 0.8], upperQArr([60, -5, 35], [50, -5, 50], [60, -5, 35]))
    ]);

    const fallClip = new THREE.AnimationClip('fall', 0.5, [
      qTrack('Spine', [0, 0.5], upperQArr([-5, 0, 0], [-5, 0, 0])),
      qTrack('LeftUpLeg', [0, 0.5], legQArr([15, 0, 0], [15, 0, 0])),
      qTrack('RightUpLeg', [0, 0.5], legQArr([15, 0, 0], [15, 0, 0])),
      qTrack('LeftArm', [0, 0.5], upperQArr([65, 5, -25], [65, 5, -25])),
      qTrack('RightArm', [0, 0.5], upperQArr([65, -5, 25], [65, -5, 25]))
    ]);

    // ==========================================
    // 5. SWIMMING CLIPS
    // ==========================================
    const swimTimes = [0, 0.3, 0.6, 0.9, 1.2];
    const swimClip = new THREE.AnimationClip('swim', 1.2, [
      qTrack('Spine', swimTimes, upperQArr([-10, 0, 0], [-10, 0, 0], [-10, 0, 0], [-10, 0, 0], [-10, 0, 0])),
      qTrack('Head', swimTimes, upperQArr([-35, 0, 0], [-35, 8, 0], [-35, 0, 0], [-35, -8, 0], [-35, 0, 0])),
      qTrack('LeftArm', swimTimes, upperQArr([120, -30, -20], [60, -45, -30], [-20, 0, -15], [80, 0, -35], [120, -30, -20])),
      qTrack('RightArm', swimTimes, upperQArr([-20, 0, 15], [80, 0, 35], [120, 30, 20], [60, 45, 30], [-20, 0, 15])),
      qTrack('LeftUpLeg', swimTimes, legQArr([18, 0, 0], [-15, 0, 0], [18, 0, 0], [-15, 0, 0], [18, 0, 0])),
      qTrack('RightUpLeg', swimTimes, legQArr([-15, 0, 0], [18, 0, 0], [-15, 0, 0], [18, 0, 0], [-15, 0, 0]))
    ]);

    const swimIdleClip = new THREE.AnimationClip('swim_idle', 1.6, [
      qTrack('Spine', [0, 0.8, 1.6], upperQArr([-8, 0, 0], [-10, 0, 0], [-8, 0, 0])),
      qTrack('LeftArm', [0, 0.8, 1.6], upperQArr([25, 0, -45], [45, 0, -25], [25, 0, -45])),
      qTrack('RightArm', [0, 0.8, 1.6], upperQArr([25, 0, 45], [45, 0, 25], [25, 0, 45])),
      qTrack('LeftUpLeg', [0, 0.8, 1.6], legQArr([12, 0, 0], [-12, 0, 0], [12, 0, 0])),
      qTrack('RightUpLeg', [0, 0.8, 1.6], legQArr([-12, 0, 0], [12, 0, 0], [-12, 0, 0]))
    ]);

    // Register all animation actions in mixer
    const clips = [idleClip, walkClip, runClip, jumpClip, fallClip, swimClip, swimIdleClip];
    clips.forEach((clip) => {
      const action = this.mixer!.clipAction(clip);
      this.animations.set(clip.name, action);
    });

    // Aliases
    this.animations.set('sprint', this.animations.get('run')!);
    this.animations.set('land', this.animations.get('idle')!);
    this.animations.set('water_enter', this.animations.get('swim')!);
    this.animations.set('water_exit', this.animations.get('walk')!);
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
