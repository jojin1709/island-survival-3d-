import * as THREE from 'three';
import { TerrainGenerator } from '../terrain/TerrainGenerator';
import { AssetManager } from '../../assets/AssetManager';
import { PhysicsWorld } from '../physics/PhysicsWorld';

export interface HarvestableRock {
  id: string;
  type: 'stone_node' | 'flint_node';
  position: THREE.Vector3;
  group: THREE.Group;
  remainingHarvests: number;
  maxHarvests: number;
  isAlive: boolean;
  collider?: any;
}

export class RockManager {
  public harvestables: HarvestableRock[] = [];
  public rockGroup = new THREE.Group();
  private rockMaterial!: THREE.MeshStandardMaterial;
  private oreMaterial!: THREE.MeshStandardMaterial;

  public create(scene: THREE.Scene): void {
    scene.add(this.rockGroup);

    const assetManager = AssetManager.getInstance();
    const rockTex = assetManager.getProceduralTexture('rock');
    rockTex.repeat.set(2, 2);

    this.rockMaterial = new THREE.MeshStandardMaterial({
      map: rockTex,
      roughness: 0.85,
      metalness: 0.05,
      color: 0xffffff // White tint so rock texture renders naturally
    });

    this.oreMaterial = new THREE.MeshStandardMaterial({
      map: rockTex,
      roughness: 0.65,
      metalness: 0.25,
      color: 0xd8c8b4 // Subtle iron/flint tint
    });

    this.spawnCliffsAndBoulders();
    this.spawnResourceNodes();

    console.log(`[RockManager] Created ${this.harvestables.length} mineable rock nodes + large boulders`);
  }

  private spawnCliffsAndBoulders(): void {
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 70;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = TerrainGenerator.sampleHeight(x, z);

      if (y < 0.2) continue;

      const group = new THREE.Group();
      const scale = 1.8 + Math.random() * 3.2;
      const geo = new THREE.DodecahedronGeometry(scale, 1);
      geo.scale(1.0, 0.65 + Math.random() * 0.45, 1.1 + Math.random() * 0.3);

      const mesh = new THREE.Mesh(geo, this.rockMaterial);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      group.position.set(x, y + scale * 0.45, z);
      this.rockGroup.add(group);

      PhysicsWorld.getInstance().createStaticSphere(
        new THREE.Vector3(x, y + scale * 0.45, z),
        scale * 0.75
      );
    }
  }

  private spawnResourceNodes(): void {
    let idCounter = 0;
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * 65;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = TerrainGenerator.sampleHeight(x, z);

      if (y < 0.3) continue;

      const group = new THREE.Group();
      const isFlint = Math.random() > 0.7;
      const radius = 0.85 + Math.random() * 0.55;

      const geo = new THREE.DodecahedronGeometry(radius, 1);
      geo.scale(1.2, 0.75, 1.0);
      const mesh = new THREE.Mesh(geo, isFlint ? this.oreMaterial : this.rockMaterial);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      group.position.set(x, y + radius * 0.4, z);
      this.rockGroup.add(group);

      const collider = PhysicsWorld.getInstance().createStaticSphere(
        new THREE.Vector3(x, y + radius * 0.4, z),
        radius * 0.8
      );

      this.harvestables.push({
        id: `rock_${idCounter++}`,
        type: isFlint ? 'flint_node' : 'stone_node',
        position: new THREE.Vector3(x, y, z),
        group,
        remainingHarvests: 4,
        maxHarvests: 4,
        isAlive: true,
        collider
      });
    }
  }

  public harvest(nodeId: string): { type: string; amount: number; destroyed: boolean } | null {
    const node = this.harvestables.find((r) => r.id === nodeId);
    if (!node || !node.isAlive) return null;

    node.remainingHarvests--;
    const resourceType = node.type === 'flint_node' ? (Math.random() > 0.5 ? 'flint' : 'stone') : 'stone';
    const amount = 2 + Math.floor(Math.random() * 2);

    if (node.remainingHarvests <= 0) {
      node.isAlive = false;
      this.rockGroup.remove(node.group);
      if (node.collider && node.collider.body) {
        PhysicsWorld.getInstance().world.removeRigidBody(node.collider.body);
      }
      return { type: resourceType, amount, destroyed: true };
    }

    return { type: resourceType, amount, destroyed: false };
  }
}
