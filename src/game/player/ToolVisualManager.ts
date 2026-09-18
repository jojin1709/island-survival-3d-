import * as THREE from 'three';
import { HumanSurvivorModel } from './HumanSurvivorModel';
import { InventoryManager } from '../inventory/InventoryManager';
import { ITEM_REGISTRY } from '../inventory/ItemRegistry';

type ItemId = string;

export class ToolVisualManager {
  private playerModel: HumanSurvivorModel;
  private handBone?: THREE.Bone;
  private toolHolder = new THREE.Group();
  private currentToolId: ItemId | null = null;
  private toolMeshes = new Map<string, THREE.Object3D>();
  
  // Torch dynamic light
  private torchLight?: THREE.PointLight;
  private torchFlame?: THREE.Mesh;

  // Swing animation state
  public isSwinging = false;
  private swingProgress = 0;
  private swingDuration = 0.35; // seconds

  constructor(playerModel: HumanSurvivorModel) {
    this.playerModel = playerModel;
    this.toolHolder.name = 'EquippedToolHolder';
  }

  public init(): void {
    if (this.playerModel.bones['RightHand']) {
      this.handBone = this.playerModel.bones['RightHand'];
      this.handBone.add(this.toolHolder);
      
      // Position offset so tool sits inside the palm & extends outward
      this.toolHolder.position.set(0, -0.06, 0.04);
      this.toolHolder.rotation.set(Math.PI / 2, 0, 0);

      this.createToolModels();
    }
  }

  private createToolModels(): void {
    // 1. Stone Hatchet / Axe
    const axeGroup = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.02, 0.024, 0.55, 8);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6e4726, roughness: 0.85, metalness: 0.05 });
    const handle = new THREE.Mesh(handleGeo, woodMat);
    handle.position.y = 0.15;
    handle.castShadow = true;
    axeGroup.add(handle);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x48494b, roughness: 0.6, metalness: 0.15 });
    const bladeGeo = new THREE.BoxGeometry(0.05, 0.16, 0.14);
    const blade = new THREE.Mesh(bladeGeo, stoneMat);
    blade.position.set(0, 0.36, 0.05);
    blade.castShadow = true;
    axeGroup.add(blade);

    const twineMat = new THREE.MeshStandardMaterial({ color: 0xc2a649, roughness: 0.9 });
    const twine = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), twineMat);
    twine.position.set(0, 0.35, 0);
    axeGroup.add(twine);

    axeGroup.visible = false;
    this.toolHolder.add(axeGroup);
    this.toolMeshes.set('stone_axe', axeGroup);

    // 2. Stone Pickaxe
    const pickGroup = new THREE.Group();
    const pickHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.6, 8), woodMat);
    pickHandle.position.y = 0.18;
    pickHandle.castShadow = true;
    pickGroup.add(pickHandle);

    const pickHeadGeo = new THREE.ConeGeometry(0.03, 0.32, 6);
    const pickHead1 = new THREE.Mesh(pickHeadGeo, stoneMat);
    pickHead1.rotation.z = Math.PI / 2;
    pickHead1.position.set(0.12, 0.42, 0);
    pickHead1.castShadow = true;
    pickGroup.add(pickHead1);

    const pickHead2 = new THREE.Mesh(pickHeadGeo, stoneMat);
    pickHead2.rotation.z = -Math.PI / 2;
    pickHead2.position.set(-0.12, 0.42, 0);
    pickHead2.castShadow = true;
    pickGroup.add(pickHead2);

    pickGroup.visible = false;
    this.toolHolder.add(pickGroup);
    this.toolMeshes.set('stone_pickaxe', pickGroup);

    // 3. Hunting Spear
    const spearGroup = new THREE.Group();
    const shaftGeo = new THREE.CylinderGeometry(0.016, 0.02, 1.4, 8);
    const shaft = new THREE.Mesh(shaftGeo, woodMat);
    shaft.position.y = 0.45;
    shaft.castShadow = true;
    spearGroup.add(shaft);

    const tipGeo = new THREE.ConeGeometry(0.035, 0.22, 5);
    const tip = new THREE.Mesh(tipGeo, stoneMat);
    tip.position.y = 1.2;
    tip.castShadow = true;
    spearGroup.add(tip);

    spearGroup.visible = false;
    this.toolHolder.add(spearGroup);
    this.toolMeshes.set('spear', spearGroup);

    // 4. Fiber Torch with dynamic light
    const torchGroup = new THREE.Group();
    const torchStick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.5, 8), woodMat);
    torchStick.position.y = 0.15;
    torchStick.castShadow = true;
    torchGroup.add(torchStick);

    const torchHead = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.14, 8), twineMat);
    torchHead.position.y = 0.38;
    torchGroup.add(torchHead);

    // Torch flame particle / glow
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xff7711,
      transparent: true,
      opacity: 0.85
    });
    this.torchFlame = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 6), flameMat);
    this.torchFlame.position.y = 0.48;
    torchGroup.add(this.torchFlame);

    this.torchLight = new THREE.PointLight(0xff8833, 2.5, 14, 1.5);
    this.torchLight.position.y = 0.52;
    this.torchLight.castShadow = false; // keep fast performance
    torchGroup.add(this.torchLight);

    torchGroup.visible = false;
    this.toolHolder.add(torchGroup);
    this.toolMeshes.set('torch', torchGroup);
  }

  public updateEquippedTool(inventory: InventoryManager): void {
    const selectedItem = inventory.getSelectedItem();
    const targetToolId = selectedItem ? selectedItem.id : null;

    if (targetToolId === this.currentToolId) return;

    this.currentToolId = targetToolId;

    // Hide all tools
    this.toolMeshes.forEach((mesh) => {
      mesh.visible = false;
    });

    // Show matching tool if available
    if (targetToolId && this.toolMeshes.has(targetToolId)) {
      const activeMesh = this.toolMeshes.get(targetToolId)!;
      activeMesh.visible = true;
    }
  }

  public triggerSwing(): void {
    if (this.isSwinging) return;
    this.isSwinging = true;
    this.swingProgress = 0;
  }

  public update(dt: number, elapsedTime: number): void {
    // Torch flicker
    if (this.torchLight && this.torchFlame && this.currentToolId === 'torch') {
      const flicker = 2.2 + Math.sin(elapsedTime * 18.0) * 0.3 + Math.cos(elapsedTime * 27.0) * 0.2;
      this.torchLight.intensity = flicker;
      const scaleFlicker = 1.0 + Math.sin(elapsedTime * 22.0) * 0.15;
      this.torchFlame.scale.set(scaleFlicker, scaleFlicker * 1.1, scaleFlicker);
    }

    // Dynamic Arm Swing Procedural Motion
    if (this.isSwinging) {
      this.swingProgress += dt / this.swingDuration;
      if (this.swingProgress >= 1.0) {
        this.isSwinging = false;
        this.swingProgress = 0;
      }

      const rArm = this.playerModel.bones['RightArm'];
      const rForeArm = this.playerModel.bones['RightForeArm'];

      if (rArm && rForeArm) {
        // Swing curve: wind up (0 -> 0.3), chop down (0.3 -> 0.6), return (0.6 -> 1.0)
        let armRotX = 0;
        let armRotZ = 0;
        let foreArmRotX = 0;

        if (this.swingProgress < 0.3) {
          const t = this.swingProgress / 0.3;
          armRotX = THREE.MathUtils.lerp(0, -1.2, t); // Wind back upwards
          armRotZ = THREE.MathUtils.lerp(0, 0.4, t);
          foreArmRotX = THREE.MathUtils.lerp(0, 1.4, t);
        } else if (this.swingProgress < 0.6) {
          const t = (this.swingProgress - 0.3) / 0.3;
          armRotX = THREE.MathUtils.lerp(-1.2, 1.1, t); // Chop downwards forcefully
          armRotZ = THREE.MathUtils.lerp(0.4, -0.2, t);
          foreArmRotX = THREE.MathUtils.lerp(1.4, 0.4, t);
        } else {
          const t = (this.swingProgress - 0.6) / 0.4;
          armRotX = THREE.MathUtils.lerp(1.1, 0, t); // Return to neutral
          armRotZ = THREE.MathUtils.lerp(-0.2, 0, t);
          foreArmRotX = THREE.MathUtils.lerp(0.4, 0, t);
        }

        rArm.rotation.x += armRotX;
        rArm.rotation.z += armRotZ;
        rForeArm.rotation.x += foreArmRotX;
      }
    }
  }
}
