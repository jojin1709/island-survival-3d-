import * as THREE from 'three';
import { TerrainGenerator } from '../terrain/TerrainGenerator';
import { BuildingManager } from './BuildingManager';
import { InventoryManager } from '../inventory/InventoryManager';

export class BuildingPlacer {
  public isPlacing = false;
  public activeBuildingType: string | null = null;
  public ghostGroup = new THREE.Group();
  public rotation = 0;
  public isValid = true;
  private validMaterial!: THREE.MeshBasicMaterial;
  private invalidMaterial!: THREE.MeshBasicMaterial;
  private buildingManager: BuildingManager;

  constructor(buildingManager: BuildingManager) {
    this.buildingManager = buildingManager;

    this.validMaterial = new THREE.MeshBasicMaterial({
      color: 0x22ee66,
      transparent: true,
      opacity: 0.55,
      wireframe: true
    });

    this.invalidMaterial = new THREE.MeshBasicMaterial({
      color: 0xee2222,
      transparent: true,
      opacity: 0.55,
      wireframe: true
    });
  }

  public startPlacement(scene: THREE.Scene, type: string): void {
    this.cancelPlacement(scene);
    this.isPlacing = true;
    this.activeBuildingType = type;
    this.rotation = 0;

    const rawMesh = this.buildingManager.instantiateBuildingMesh(type);
    this.ghostGroup = new THREE.Group();

    rawMesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const ghostChild = new THREE.Mesh((child as THREE.Mesh).geometry, this.validMaterial);
        ghostChild.position.copy(child.position);
        ghostChild.rotation.copy(child.rotation);
        ghostChild.scale.copy(child.scale);
        this.ghostGroup.add(ghostChild);
      }
    });

    scene.add(this.ghostGroup);
  }

  public cancelPlacement(scene: THREE.Scene): void {
    this.isPlacing = false;
    this.activeBuildingType = null;
    if (this.ghostGroup.parent) {
      scene.remove(this.ghostGroup);
    }
    this.ghostGroup = new THREE.Group();
  }

  public rotate(): void {
    this.rotation += Math.PI / 4; // 45 degree steps
  }

  public update(playerPos: THREE.Vector3, cameraYaw: number): void {
    if (!this.isPlacing) return;

    // Place 4.5m in front of player
    const targetX = playerPos.x - Math.sin(cameraYaw) * 4.5;
    const targetZ = playerPos.z - Math.cos(cameraYaw) * 4.5;
    const targetY = TerrainGenerator.sampleHeight(targetX, targetZ);

    this.ghostGroup.position.set(targetX, targetY, targetZ);
    this.ghostGroup.rotation.y = this.rotation;

    // Validation: cannot place in deep water (y < 0.2) or on extreme cliffs
    const slopeCheck = Math.abs(TerrainGenerator.sampleHeight(targetX + 1, targetZ) - TerrainGenerator.sampleHeight(targetX - 1, targetZ));
    this.isValid = targetY >= 0.2 && slopeCheck < 2.2;

    const activeMat = this.isValid ? this.validMaterial : this.invalidMaterial;
    this.ghostGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = activeMat;
      }
    });
  }

  public confirmPlacement(scene: THREE.Scene, inventory: InventoryManager): boolean {
    if (!this.isPlacing || !this.isValid || !this.activeBuildingType) return false;

    // Check inventory
    if (inventory.getItemCount(this.activeBuildingType) <= 0) {
      return false;
    }

    inventory.removeItem(this.activeBuildingType, 1);
    this.buildingManager.place(this.activeBuildingType, this.ghostGroup.position, this.rotation);
    this.cancelPlacement(scene);
    return true;
  }
}
