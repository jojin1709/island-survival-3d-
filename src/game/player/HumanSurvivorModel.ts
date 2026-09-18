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
  public skeleton?: THREE.Skeleton;
  public gltfScene?: THREE.Group;

  constructor() {
    this.playerRoot.name = 'PlayerRoot';
    this.characterVisual.name = 'CharacterVisual';
    this.cameraTarget.name = 'CameraTarget';

    // Camera target at shoulder/chest height (1.45m above feet)
    this.cameraTarget.position.set(0, 1.45, 0);

    this.playerRoot.add(this.characterVisual);
    this.playerRoot.add(this.cameraTarget);

    this.characterVisual.rotation.y = CHARACTER_MODEL_FORWARD_OFFSET;
  }

  public async load(): Promise<void> {
    console.log('[HumanSurvivorModel] Loading rigged human survivor GLB asset...');
    const loader = new GLTFLoader();

    try {
      const gltf = await loader.loadAsync('/assets/characters/human_survivor.glb');
      this.gltfScene = gltf.scene;

      // Enable shadows and gather bones
      this.gltfScene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
          const mesh = obj as THREE.Mesh;
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => {
                if ('roughness' in m) (m as THREE.MeshStandardMaterial).roughness = Math.max(0.3, (m as THREE.MeshStandardMaterial).roughness);
              });
            } else if ('roughness' in mesh.material) {
              (mesh.material as THREE.MeshStandardMaterial).roughness = Math.max(0.3, (mesh.material as THREE.MeshStandardMaterial).roughness);
            }
          }
        }
        if ((obj as THREE.Bone).isBone) {
          const bone = obj as THREE.Bone;
          this.bones[bone.name] = bone;
        }
      });

      // Scale model to natural human proportions (~1.75m tall)
      this.gltfScene.scale.set(1.0, 1.0, 1.0);
      this.gltfScene.position.set(0, 0, 0);
      this.characterVisual.add(this.gltfScene);

      // Attach survival backpack
      this.attachSurvivalBackpack();

      // Initialize AnimationMixer on GLB scene
      this.mixer = new THREE.AnimationMixer(this.gltfScene);
      this.createSkeletalAnimations();

      this.isLoaded = true;
      console.log('[HumanSurvivorModel] Human survivor GLB loaded and rigged successfully!');
    } catch (err) {
      console.error('[HumanSurvivorModel] Failed to load human_survivor.glb:', err);
    }
  }

  private attachSurvivalBackpack(): void {
    const spineBone = this.bones['Spine2'] || this.bones['Spine1'] || this.bones['Spine'] || this.bones['Chest'];
    if (!spineBone) return;

    const packGroup = new THREE.Group();
    packGroup.name = 'SurvivalBackpack';

    const packMat = new THREE.MeshStandardMaterial({
      color: 0x3d4a36, // Olive military / canvas survival pack
      roughness: 0.85,
      metalness: 0.05
    });

    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x5a3825, // Brown leather straps
      roughness: 0.7,
      metalness: 0.1
    });

    const matMat = new THREE.MeshStandardMaterial({
      color: 0x2b4c6f, // Blue roll mat
      roughness: 0.9
    });

    // Main pack pouch
    const mainPouch = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.38, 0.18), packMat);
    mainPouch.position.set(0, 0.05, -0.16);
    mainPouch.castShadow = true;
    packGroup.add(mainPouch);

    // Front pocket
    const frontPocket = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.20, 0.08), packMat);
    frontPocket.position.set(0, -0.04, -0.27);
    frontPocket.castShadow = true;
    packGroup.add(frontPocket);

    // Top bedroll / sleeping mat
    const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.34, 12), matMat);
    bedroll.rotation.z = Math.PI / 2;
    bedroll.position.set(0, 0.26, -0.16);
    bedroll.castShadow = true;
    packGroup.add(bedroll);

    // Bedroll leather straps
    const strapGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.03, 12);
    const strapL = new THREE.Mesh(strapGeo, leatherMat);
    strapL.rotation.z = Math.PI / 2;
    strapL.position.set(0.1, 0.26, -0.16);
    const strapR = new THREE.Mesh(strapGeo, leatherMat);
    strapR.rotation.z = Math.PI / 2;
    strapR.position.set(-0.1, 0.26, -0.16);
    packGroup.add(strapL);
    packGroup.add(strapR);

    // Side canteen / flask
    const canteen = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.14, 8), leatherMat);
    canteen.position.set(0.16, 0.02, -0.16);
    packGroup.add(canteen);

    spineBone.add(packGroup);
  }

  private createSkeletalAnimations(): void {
    if (!this.mixer) return;

    // Helper functions for tracks
    const deg2rad = Math.PI / 180;
    const qTrack = (boneName: string, times: number[], qArray: number[]): THREE.QuaternionKeyframeTrack => {
      return new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, times, qArray);
    };
    const pTrack = (boneName: string, times: number[], pArray: number[]): THREE.VectorKeyframeTrack => {
      return new THREE.VectorKeyframeTrack(`${boneName}.position`, times, pArray);
    };

    const makeQ = (xDeg: number, yDeg: number, zDeg: number): [number, number, number, number] => {
      const euler = new THREE.Euler(xDeg * deg2rad, yDeg * deg2rad, zDeg * deg2rad, 'YXZ');
      const q = new THREE.Quaternion().setFromEuler(euler);
      return [q.x, q.y, q.z, q.w];
    };

    const qArr = (...rotations: [number, number, number][]): number[] => {
      const arr: number[] = [];
      rotations.forEach(([x, y, z]) => {
        arr.push(...makeQ(x, y, z));
      });
      return arr;
    };

    // 1. IDLE CLIP (Natural breathing, posture shift)
    const idleDuration = 3.0;
    const idleTimes = [0, 1.5, 3.0];
    const idleTracks: THREE.KeyframeTrack[] = [
      pTrack('Hips', idleTimes, [0, 0.95, 0, 0, 0.94, 0, 0, 0.95, 0]),
      qTrack('Spine', idleTimes, qArr([0, 0, 0], [2, 0, 0], [0, 0, 0])),
      qTrack('Spine1', idleTimes, qArr([0, 0, 0], [2, 0, 0], [0, 0, 0])),
      qTrack('Spine2', idleTimes, qArr([0, 0, 0], [3, 0, 0], [0, 0, 0])),
      qTrack('Head', idleTimes, qArr([0, 0, 0], [-2, 0, 0], [0, 0, 0])),
      qTrack('LeftArm', idleTimes, qArr([0, 0, -8], [0, 0, -10], [0, 0, -8])),
      qTrack('LeftForeArm', idleTimes, qArr([15, 0, 0], [18, 0, 0], [15, 0, 0])),
      qTrack('RightArm', idleTimes, qArr([0, 0, 8], [0, 0, 10], [0, 0, 8])),
      qTrack('RightForeArm', idleTimes, qArr([15, 0, 0], [18, 0, 0], [15, 0, 0])),
      qTrack('LeftUpLeg', idleTimes, qArr([0, 0, 0], [0, 0, 0], [0, 0, 0])),
      qTrack('RightUpLeg', idleTimes, qArr([0, 0, 0], [0, 0, 0], [0, 0, 0]))
    ];
    const idleClip = new THREE.AnimationClip('idle', idleDuration, idleTracks);

    // 2. WALK CLIP (Realistic bipedal stride with alternating limbs)
    const walkDuration = 1.0;
    const walkTimes = [0, 0.25, 0.5, 0.75, 1.0];
    const walkTracks: THREE.KeyframeTrack[] = [
      pTrack('Hips', walkTimes, [
        0, 0.95, 0,
        0, 0.92, 0,
        0, 0.95, 0,
        0, 0.92, 0,
        0, 0.95, 0
      ]),
      qTrack('Spine', walkTimes, qArr([0, -3, 0], [0, 0, 0], [0, 3, 0], [0, 0, 0], [0, -3, 0])),
      // Left leg swing forward
      qTrack('LeftUpLeg', walkTimes, qArr([-25, 0, 0], [0, 0, 0], [25, 0, 0], [0, 0, 0], [-25, 0, 0])),
      qTrack('LeftLeg', walkTimes, qArr([5, 0, 0], [30, 0, 0], [5, 0, 0], [0, 0, 0], [5, 0, 0])),
      // Right leg swing opposite
      qTrack('RightUpLeg', walkTimes, qArr([25, 0, 0], [0, 0, 0], [-25, 0, 0], [0, 0, 0], [25, 0, 0])),
      qTrack('RightLeg', walkTimes, qArr([5, 0, 0], [0, 0, 0], [5, 0, 0], [30, 0, 0], [5, 0, 0])),
      // Opposite arm swings
      qTrack('LeftArm', walkTimes, qArr([22, 0, -8], [0, 0, -8], [-22, 0, -8], [0, 0, -8], [22, 0, -8])),
      qTrack('LeftForeArm', walkTimes, qArr([20, 0, 0], [10, 0, 0], [35, 0, 0], [15, 0, 0], [20, 0, 0])),
      qTrack('RightArm', walkTimes, qArr([-22, 0, 8], [0, 0, 8], [22, 0, 8], [0, 0, 8], [-22, 0, 8])),
      qTrack('RightForeArm', walkTimes, qArr([35, 0, 0], [15, 0, 0], [20, 0, 0], [10, 0, 0], [35, 0, 0]))
    ];
    const walkClip = new THREE.AnimationClip('walk', walkDuration, walkTracks);

    // 3. RUN CLIP (Dynamic forward run stride, forward torso lean)
    const runDuration = 0.65;
    const runTimes = [0, 0.1625, 0.325, 0.4875, 0.65];
    const runTracks: THREE.KeyframeTrack[] = [
      pTrack('Hips', runTimes, [
        0, 0.94, 0,
        0, 0.88, 0,
        0, 0.94, 0,
        0, 0.88, 0,
        0, 0.94, 0
      ]),
      qTrack('Spine', runTimes, qArr([12, -5, 0], [12, 0, 0], [12, 5, 0], [12, 0, 0], [12, -5, 0])),
      qTrack('LeftUpLeg', runTimes, qArr([-45, 0, 0], [10, 0, 0], [45, 0, 0], [0, 0, 0], [-45, 0, 0])),
      qTrack('LeftLeg', runTimes, qArr([10, 0, 0], [65, 0, 0], [15, 0, 0], [5, 0, 0], [10, 0, 0])),
      qTrack('RightUpLeg', runTimes, qArr([45, 0, 0], [0, 0, 0], [-45, 0, 0], [10, 0, 0], [45, 0, 0])),
      qTrack('RightLeg', runTimes, qArr([15, 0, 0], [5, 0, 0], [10, 0, 0], [65, 0, 0], [15, 0, 0])),
      qTrack('LeftArm', runTimes, qArr([45, 0, -8], [0, 0, -8], [-45, 0, -8], [0, 0, -8], [45, 0, -8])),
      qTrack('LeftForeArm', runTimes, qArr([55, 0, 0], [30, 0, 0], [70, 0, 0], [35, 0, 0], [55, 0, 0])),
      qTrack('RightArm', runTimes, qArr([-45, 0, 8], [0, 0, 8], [45, 0, 8], [0, 0, 8], [-45, 0, 8])),
      qTrack('RightForeArm', runTimes, qArr([70, 0, 0], [35, 0, 0], [55, 0, 0], [30, 0, 0], [70, 0, 0]))
    ];
    const runClip = new THREE.AnimationClip('run', runDuration, runTracks);

    // 4. JUMP & FALL CLIPS
    const jumpDuration = 0.8;
    const jumpTimes = [0, 0.4, 0.8];
    const jumpTracks: THREE.KeyframeTrack[] = [
      pTrack('Hips', jumpTimes, [0, 0.98, 0, 0, 1.05, 0, 0, 1.0, 0]),
      qTrack('Spine', jumpTimes, qArr([-10, 0, 0], [-15, 0, 0], [-5, 0, 0])),
      qTrack('LeftUpLeg', jumpTimes, qArr([-30, 0, 0], [-40, 0, 0], [-20, 0, 0])),
      qTrack('RightUpLeg', jumpTimes, qArr([-35, 0, 0], [-45, 0, 0], [-25, 0, 0])),
      qTrack('LeftLeg', jumpTimes, qArr([45, 0, 0], [60, 0, 0], [30, 0, 0])),
      qTrack('RightLeg', jumpTimes, qArr([50, 0, 0], [65, 0, 0], [35, 0, 0])),
      qTrack('LeftArm', jumpTimes, qArr([80, 0, -20], [110, 0, -25], [60, 0, -15])),
      qTrack('RightArm', jumpTimes, qArr([80, 0, 20], [110, 0, 25], [60, 0, 15]))
    ];
    const jumpClip = new THREE.AnimationClip('jump', jumpDuration, jumpTracks);

    const fallTracks: THREE.KeyframeTrack[] = [
      qTrack('Spine', [0, 0.5], qArr([-8, 0, 0], [-8, 0, 0])),
      qTrack('LeftUpLeg', [0, 0.5], qArr([-15, 0, 0], [-15, 0, 0])),
      qTrack('RightUpLeg', [0, 0.5], qArr([-20, 0, 0], [-20, 0, 0])),
      qTrack('LeftArm', [0, 0.5], qArr([65, 0, -30], [65, 0, -30])),
      qTrack('RightArm', [0, 0.5], qArr([65, 0, 30], [65, 0, 30]))
    ];
    const fallClip = new THREE.AnimationClip('fall', 0.5, fallTracks);

    // 5. REAL SWIMMING CLIPS (Horizontal swimming & water treading)
    const swimDuration = 1.2;
    const swimTimes = [0, 0.3, 0.6, 0.9, 1.2];
    const swimTracks: THREE.KeyframeTrack[] = [
      // Rotate entire body horizontally for swimming posture
      pTrack('Hips', swimTimes, [0, 0.50, 0, 0, 0.52, 0, 0, 0.50, 0, 0, 0.52, 0, 0, 0.50, 0]),
      qTrack('Hips', swimTimes, qArr([75, 0, 0], [75, 8, 0], [75, 0, 0], [75, -8, 0], [75, 0, 0])),
      qTrack('Spine', swimTimes, qArr([-15, 0, 0], [-15, 0, 0], [-15, 0, 0], [-15, 0, 0], [-15, 0, 0])),
      qTrack('Head', swimTimes, qArr([-55, 0, 0], [-55, 10, 0], [-55, 0, 0], [-55, -10, 0], [-55, 0, 0])),
      // Freestyle / Breaststroke Arm Reach & Pull
      qTrack('LeftArm', swimTimes, qArr([130, -30, -20], [60, -45, -30], [-20, 0, -15], [80, 0, -35], [130, -30, -20])),
      qTrack('LeftForeArm', swimTimes, qArr([40, 0, 0], [85, 0, 0], [25, 0, 0], [30, 0, 0], [40, 0, 0])),
      qTrack('RightArm', swimTimes, qArr([-20, 0, 15], [80, 0, 35], [130, 30, 20], [60, 45, 30], [-20, 0, 15])),
      qTrack('RightForeArm', swimTimes, qArr([25, 0, 0], [30, 0, 0], [40, 0, 0], [85, 0, 0], [25, 0, 0])),
      // Flutter Kick Legs
      qTrack('LeftUpLeg', swimTimes, qArr([-20, 0, 0], [15, 0, 0], [-20, 0, 0], [15, 0, 0], [-20, 0, 0])),
      qTrack('LeftLeg', swimTimes, qArr([20, 0, 0], [10, 0, 0], [20, 0, 0], [10, 0, 0], [20, 0, 0])),
      qTrack('RightUpLeg', swimTimes, qArr([15, 0, 0], [-20, 0, 0], [15, 0, 0], [-20, 0, 0], [15, 0, 0])),
      qTrack('RightLeg', swimTimes, qArr([10, 0, 0], [20, 0, 0], [10, 0, 0], [20, 0, 0], [10, 0, 0]))
    ];
    const swimClip = new THREE.AnimationClip('swim', swimDuration, swimTracks);

    // 6. SWIM IDLE / WATER TREADING CLIP
    const swimIdleDuration = 1.6;
    const swimIdleTimes = [0, 0.8, 1.6];
    const swimIdleTracks: THREE.KeyframeTrack[] = [
      pTrack('Hips', swimIdleTimes, [0, 0.65, 0, 0, 0.60, 0, 0, 0.65, 0]),
      qTrack('Hips', swimIdleTimes, qArr([25, 0, 0], [30, 0, 0], [25, 0, 0])),
      qTrack('Spine', swimIdleTimes, qArr([-10, 0, 0], [-12, 0, 0], [-10, 0, 0])),
      qTrack('Head', swimIdleTimes, qArr([-15, 0, 0], [-18, 0, 0], [-15, 0, 0])),
      qTrack('LeftArm', swimIdleTimes, qArr([25, 0, -45], [45, 0, -25], [25, 0, -45])),
      qTrack('RightArm', swimIdleTimes, qArr([25, 0, 45], [45, 0, 25], [25, 0, 45])),
      qTrack('LeftForeArm', swimIdleTimes, qArr([50, 0, 0], [30, 0, 0], [50, 0, 0])),
      qTrack('RightForeArm', swimIdleTimes, qArr([50, 0, 0], [30, 0, 0], [50, 0, 0])),
      qTrack('LeftUpLeg', swimIdleTimes, qArr([15, 0, -15], [-20, 0, -10], [15, 0, -15])),
      qTrack('RightUpLeg', swimIdleTimes, qArr([-20, 0, 10], [15, 0, 15], [-20, 0, 10]))
    ];
    const swimIdleClip = new THREE.AnimationClip('swim_idle', swimIdleDuration, swimIdleTracks);

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
}
