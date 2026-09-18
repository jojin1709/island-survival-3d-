import * as THREE from 'three';

/**
 * Model-specific forward axis offset.
 * In standard Three.js coordinate system, Math.atan2(mx, mz) produces an angle where 0 is +Z.
 * Our human model is constructed with its front face pointing towards +Z,
 * so the forward offset is 0.
 */
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
  public skeleton!: THREE.Skeleton;
  public skinnedMesh!: THREE.SkinnedMesh;

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
    console.log('[HumanSurvivorModel] Building realistic rigged human survivor...');
    this.createRiggedHumanSurvivor();
    this.createHumanSkeletalAnimations();
    this.isLoaded = true;
    console.log('[HumanSurvivorModel] Rigged human survivor and animation clips created successfully!');
  }

  private createRiggedHumanSurvivor(): void {
    const survivorGroup = new THREE.Group();

    // 1. Build Humanoid Bone Hierarchy
    const rootBone = new THREE.Bone(); rootBone.name = 'Root'; rootBone.position.set(0, 0, 0);
    const hips = new THREE.Bone(); hips.name = 'Hips'; hips.position.set(0, 0.95, 0);
    const spine = new THREE.Bone(); spine.name = 'Spine'; spine.position.set(0, 0.22, 0);
    const chest = new THREE.Bone(); chest.name = 'Chest'; chest.position.set(0, 0.25, 0);
    const neck = new THREE.Bone(); neck.name = 'Neck'; neck.position.set(0, 0.18, 0);
    const head = new THREE.Bone(); head.name = 'Head'; head.position.set(0, 0.16, 0);

    // Arms
    const lClavicle = new THREE.Bone(); lClavicle.name = 'LeftShoulder'; lClavicle.position.set(0.18, 0.08, 0);
    const lUpperArm = new THREE.Bone(); lUpperArm.name = 'LeftArm'; lUpperArm.position.set(0.16, -0.04, 0);
    const lForeArm = new THREE.Bone(); lForeArm.name = 'LeftForeArm'; lForeArm.position.set(0, -0.28, 0);
    const lHand = new THREE.Bone(); lHand.name = 'LeftHand'; lHand.position.set(0, -0.25, 0);

    const rClavicle = new THREE.Bone(); rClavicle.name = 'RightShoulder'; rClavicle.position.set(-0.18, 0.08, 0);
    const rUpperArm = new THREE.Bone(); rUpperArm.name = 'RightArm'; rUpperArm.position.set(-0.16, -0.04, 0);
    const rForeArm = new THREE.Bone(); rForeArm.name = 'RightForeArm'; rForeArm.position.set(0, -0.28, 0);
    const rHand = new THREE.Bone(); rHand.name = 'RightHand'; rHand.position.set(0, -0.25, 0);

    // Legs
    const lThigh = new THREE.Bone(); lThigh.name = 'LeftUpLeg'; lThigh.position.set(0.12, -0.06, 0);
    const lShin = new THREE.Bone(); lShin.name = 'LeftLeg'; lShin.position.set(0, -0.42, 0);
    const lFoot = new THREE.Bone(); lFoot.name = 'LeftFoot'; lFoot.position.set(0, -0.42, 0.06);

    const rThigh = new THREE.Bone(); rThigh.name = 'RightUpLeg'; rThigh.position.set(-0.12, -0.06, 0);
    const rShin = new THREE.Bone(); rShin.name = 'RightLeg'; rShin.position.set(0, -0.42, 0);
    const rFoot = new THREE.Bone(); rFoot.name = 'RightFoot'; rFoot.position.set(0, -0.42, 0.06);

    // Hierarchy Assembly
    rootBone.add(hips);
    hips.add(spine);
    hips.add(lThigh);
    hips.add(rThigh);
    lThigh.add(lShin);
    lShin.add(lFoot);
    rThigh.add(rShin);
    rShin.add(rFoot);

    spine.add(chest);
    chest.add(neck);
    chest.add(lClavicle);
    chest.add(rClavicle);
    neck.add(head);

    lClavicle.add(lUpperArm);
    lUpperArm.add(lForeArm);
    lForeArm.add(lHand);

    rClavicle.add(rUpperArm);
    rUpperArm.add(rForeArm);
    rForeArm.add(rHand);

    const bonesList = [
      rootBone, hips, spine, chest, neck, head,
      lClavicle, lUpperArm, lForeArm, lHand,
      rClavicle, rUpperArm, rForeArm, rHand,
      lThigh, lShin, lFoot,
      rThigh, rShin, rFoot
    ];

    bonesList.forEach((b, idx) => {
      this.bones[b.name] = b;
      b.userData.boneIndex = idx;
    });

    this.skeleton = new THREE.Skeleton(bonesList);
    survivorGroup.add(rootBone);

    // 2. High Quality Realistic Human Survivor Mesh & PBR Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xdca882, // Natural warm human skin tone
      roughness: 0.62,
      metalness: 0.0
    });

    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0x486b52, // Tropical olive green adventure t-shirt
      roughness: 0.85,
      metalness: 0.02
    });

    const shortsMat = new THREE.MeshStandardMaterial({
      color: 0x6e5c46, // Weathered khaki cargo survival shorts
      roughness: 0.88,
      metalness: 0.0
    });

    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x2e241c, // Dark leather hiking boots
      roughness: 0.72,
      metalness: 0.15
    });

    const packMat = new THREE.MeshStandardMaterial({
      color: 0x825e3c, // Canvas survivor backpack
      roughness: 0.80,
      metalness: 0.05
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x24170d, // Dark brown natural human hair
      roughness: 0.90,
      metalness: 0.0
    });

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x1a2634, // Dark eyes
      roughness: 0.15,
      metalness: 0.0
    });

    // Torso (Shirt) attached to Spine/Chest
    const torsoGeo = new THREE.BoxGeometry(0.52, 0.45, 0.28);
    const torsoMesh = new THREE.Mesh(torsoGeo, shirtMat);
    torsoMesh.position.set(0, 0.12, 0);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    spine.add(torsoMesh);

    // Survival Backpack attached to Chest (Back is -Z, Front is +Z)
    const packGeo = new THREE.BoxGeometry(0.44, 0.50, 0.24);
    const packMesh = new THREE.Mesh(packGeo, packMat);
    packMesh.position.set(0, 0.05, -0.24);
    packMesh.castShadow = true;
    chest.add(packMesh);

    // Bedroll attached on top of backpack
    const bedrollGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.48, 8);
    const bedroll = new THREE.Mesh(bedrollGeo, shirtMat);
    bedroll.rotation.z = Math.PI / 2;
    bedroll.position.set(0, 0.35, -0.24);
    bedroll.castShadow = true;
    chest.add(bedroll);

    // Neck & Head with realistic human facial features (Front is +Z)
    const neckGeo = new THREE.CylinderGeometry(0.10, 0.11, 0.16, 8);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.set(0, 0.06, 0);
    neckMesh.castShadow = true;
    neck.add(neckMesh);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.10, 0);

    // Human Head
    const headGeo = new THREE.SphereGeometry(0.18, 12, 10);
    headGeo.scale(0.92, 1.15, 1.02);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Human Hair
    const hairGeo = new THREE.SphereGeometry(0.19, 10, 8);
    hairGeo.scale(0.96, 1.12, 1.05);
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.set(0, 0.05, -0.02);
    hairMesh.castShadow = true;
    headGroup.add(hairMesh);

    // Nose
    const noseGeo = new THREE.ConeGeometry(0.035, 0.07, 5);
    const noseMesh = new THREE.Mesh(noseGeo, skinMat);
    noseMesh.rotation.x = Math.PI / 2;
    noseMesh.position.set(0, 0, 0.19);
    headGroup.add(noseMesh);

    // Eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.022, 6, 6);
      const eyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
      eyeMesh.position.set(side * 0.065, 0.035, 0.165);
      headGroup.add(eyeMesh);
    }

    head.add(headGroup);

    // Left Arm (Upper Arm, Forearm, Hand with skin)
    const upperArmGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.28, 8);
    const lUpperArmMesh = new THREE.Mesh(upperArmGeo, shirtMat);
    lUpperArmMesh.position.set(0, -0.14, 0);
    lUpperArmMesh.castShadow = true;
    lUpperArm.add(lUpperArmMesh);

    const foreArmGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.26, 8);
    const lForeArmMesh = new THREE.Mesh(foreArmGeo, skinMat);
    lForeArmMesh.position.set(0, -0.13, 0);
    lForeArmMesh.castShadow = true;
    lForeArm.add(lForeArmMesh);

    const handGeo = new THREE.BoxGeometry(0.07, 0.10, 0.04);
    const lHandMesh = new THREE.Mesh(handGeo, skinMat);
    lHandMesh.position.set(0, -0.05, 0);
    lHandMesh.castShadow = true;
    lHand.add(lHandMesh);

    // Right Arm (Upper Arm, Forearm, Hand with skin)
    const rUpperArmMesh = new THREE.Mesh(upperArmGeo, shirtMat);
    rUpperArmMesh.position.set(0, -0.14, 0);
    rUpperArmMesh.castShadow = true;
    rUpperArm.add(rUpperArmMesh);

    const rForeArmMesh = new THREE.Mesh(foreArmGeo, skinMat);
    rForeArmMesh.position.set(0, -0.13, 0);
    rForeArmMesh.castShadow = true;
    rForeArm.add(rForeArmMesh);

    const rHandMesh = new THREE.Mesh(handGeo, skinMat);
    rHandMesh.position.set(0, -0.05, 0);
    rHandMesh.castShadow = true;
    rHand.add(rHandMesh);

    // Hips / Cargo Shorts Pelvis
    const pelvisGeo = new THREE.BoxGeometry(0.46, 0.26, 0.28);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, shortsMat);
    pelvisMesh.position.set(0, -0.08, 0);
    pelvisMesh.castShadow = true;
    hips.add(pelvisMesh);

    // Left Leg (Thigh Shorts, Lower Leg Skin, Hiking Boot)
    const thighGeo = new THREE.CylinderGeometry(0.10, 0.085, 0.42, 8);
    const lThighMesh = new THREE.Mesh(thighGeo, shortsMat);
    lThighMesh.position.set(0, -0.21, 0);
    lThighMesh.castShadow = true;
    lThigh.add(lThighMesh);

    const shinGeo = new THREE.CylinderGeometry(0.08, 0.065, 0.40, 8);
    const lShinMesh = new THREE.Mesh(shinGeo, skinMat);
    lShinMesh.position.set(0, -0.20, 0);
    lShinMesh.castShadow = true;
    lShin.add(lShinMesh);

    const bootGeo = new THREE.BoxGeometry(0.13, 0.16, 0.26);
    const lBootMesh = new THREE.Mesh(bootGeo, bootMat);
    lBootMesh.position.set(0, -0.06, 0.05); // Boot toes point forward (+Z)
    lBootMesh.castShadow = true;
    lFoot.add(lBootMesh);

    // Right Leg (Thigh Shorts, Lower Leg Skin, Hiking Boot)
    const rThighMesh = new THREE.Mesh(thighGeo, shortsMat);
    rThighMesh.position.set(0, -0.21, 0);
    rThighMesh.castShadow = true;
    rThigh.add(rThighMesh);

    const rShinMesh = new THREE.Mesh(shinGeo, skinMat);
    rShinMesh.position.set(0, -0.20, 0);
    rShinMesh.castShadow = true;
    rShin.add(rShinMesh);

    const rBootMesh = new THREE.Mesh(bootGeo, bootMat);
    rBootMesh.position.set(0, -0.06, 0.05); // Boot toes point forward (+Z)
    rBootMesh.castShadow = true;
    rFoot.add(rBootMesh);

    this.characterVisual.add(survivorGroup);
    this.mixer = new THREE.AnimationMixer(survivorGroup);
  }

  private createHumanSkeletalAnimations(): void {
    if (!this.mixer) return;

    // Helper to generate quaternion track for a bone
    const qTrack = (boneName: string, times: number[], quats: number[]) => {
      return new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, times, quats);
    };

    const pTrack = (boneName: string, times: number[], pos: number[]) => {
      return new THREE.VectorKeyframeTrack(`${boneName}.position`, times, pos);
    };

    const eulerToQuat = (xDeg: number, yDeg: number, zDeg: number): THREE.Quaternion => {
      const e = new THREE.Euler(
        THREE.MathUtils.degToRad(xDeg),
        THREE.MathUtils.degToRad(yDeg),
        THREE.MathUtils.degToRad(zDeg),
        'XYZ'
      );
      return new THREE.Quaternion().setFromEuler(e);
    };

    const qArr = (...rotations: [number, number, number][]): number[] => {
      const res: number[] = [];
      rotations.forEach(([x, y, z]) => {
        const q = eulerToQuat(x, y, z);
        res.push(q.x, q.y, q.z, q.w);
      });
      return res;
    };

    // 1. IDLE CLIP (Natural human breathing and subtle arm relaxation)
    const idleDuration = 2.4;
    const idleTimes = [0, 1.2, 2.4];
    const idleTracks: THREE.KeyframeTrack[] = [
      pTrack('Hips', idleTimes, [0, 0.95, 0, 0, 0.94, 0, 0, 0.95, 0]),
      qTrack('Spine', idleTimes, qArr([0, 0, 0], [2, 0, 0], [0, 0, 0])),
      qTrack('Chest', idleTimes, qArr([0, 0, 0], [-2, 0, 0], [0, 0, 0])),
      qTrack('LeftArm', idleTimes, qArr([0, 0, -8], [0, 0, -6], [0, 0, -8])),
      qTrack('RightArm', idleTimes, qArr([0, 0, 8], [0, 0, 6], [0, 0, 8])),
      qTrack('LeftForeArm', idleTimes, qArr([15, 0, 0], [12, 0, 0], [15, 0, 0])),
      qTrack('RightForeArm', idleTimes, qArr([15, 0, 0], [12, 0, 0], [15, 0, 0])),
      qTrack('Head', idleTimes, qArr([0, 0, 0], [1, 2, 0], [0, 0, 0]))
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
      // Left leg swing forward (+X rot in hips)
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
