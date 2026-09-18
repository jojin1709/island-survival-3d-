import * as THREE from 'three';
import { TerrainGenerator } from '../terrain/TerrainGenerator';
import { PhysicsWorld } from '../physics/PhysicsWorld';

export interface HarvestableProp {
  id: string;
  name: string;
  type: 'driftwood' | 'crate' | 'freshwater_source';
  position: THREE.Vector3;
  group: THREE.Group;
  isAlive: boolean;
  remainingHarvests: number;
}

export class PropManager {
  public harvestables: HarvestableProp[] = [];
  public propGroup = new THREE.Group();
  private woodMaterial!: THREE.MeshStandardMaterial;
  private ropeMaterial!: THREE.MeshStandardMaterial;
  private ironMaterial!: THREE.MeshStandardMaterial;

  public create(scene: THREE.Scene): void {
    scene.add(this.propGroup);

    this.woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3222,
      roughness: 0.85,
      metalness: 0.05
    });

    this.ropeMaterial = new THREE.MeshStandardMaterial({
      color: 0x9a8868,
      roughness: 0.90,
      metalness: 0.0
    });

    this.ironMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b2b2b,
      roughness: 0.60,
      metalness: 0.70
    });

    this.spawnShipwreck();
    this.spawnSeaCave();
    this.spawnDriftwood();
    this.spawnFreshwaterReeds();

    console.log(`[PropManager] Landmark props, shipwreck, sea cave, and ${this.harvestables.length} interactable props created`);
  }

  private spawnShipwreck(): void {
    const x = -38, z = 36;
    const y = TerrainGenerator.sampleHeight(x, z);
    const shipGroup = new THREE.Group();
    shipGroup.position.set(x, y + 0.3, z);
    shipGroup.rotation.y = 0.65;
    shipGroup.rotation.z = 0.18; // Tilted on beach shoal

    // Keel & Hull Ribs
    const keelGeo = new THREE.BoxGeometry(1.2, 0.8, 16);
    const keel = new THREE.Mesh(keelGeo, this.woodMaterial);
    keel.castShadow = true;
    keel.receiveShadow = true;
    shipGroup.add(keel);

    // Curved Hull Planking & Ribs
    for (let i = -7; i <= 7; i += 1.8) {
      const ribGeo = new THREE.TorusGeometry(3.5, 0.25, 6, 12, Math.PI);
      const rib = new THREE.Mesh(ribGeo, this.woodMaterial);
      rib.rotation.x = Math.PI / 2;
      rib.position.set(0, 1.2, i);
      rib.castShadow = true;
      shipGroup.add(rib);
    }

    // Broken Main Mast
    const mastGeo = new THREE.CylinderGeometry(0.35, 0.45, 8.5, 8);
    const mast = new THREE.Mesh(mastGeo, this.woodMaterial);
    mast.position.set(0, 3.8, 1.5);
    mast.rotation.x = 0.35;
    mast.rotation.z = 0.45;
    mast.castShadow = true;
    shipGroup.add(mast);

    // Salvageable Cargo Crates
    for (let c = 0; c < 3; c++) {
      const crateGroup = new THREE.Group();
      const crateMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), this.woodMaterial);
      crateMesh.castShadow = true;
      crateMesh.receiveShadow = true;
      crateGroup.add(crateMesh);

      const cx = x + (c - 1) * 2.2;
      const cz = z + (c % 2) * 1.5;
      const cy = TerrainGenerator.sampleHeight(cx, cz) + 0.6;
      crateGroup.position.set(cx, cy, cz);
      crateGroup.rotation.y = Math.random() * Math.PI;
      this.propGroup.add(crateGroup);

      // Rapier collider for crate
      PhysicsWorld.getInstance().createStaticBox(
        new THREE.Vector3(cx, cy, cz),
        new THREE.Vector3(1.2, 1.2, 1.2)
      );

      this.harvestables.push({
        id: `salvage_crate_${c}`,
        name: 'Salvage Cargo Crate',
        type: 'crate',
        position: new THREE.Vector3(cx, cy, cz),
        group: crateGroup,
        isAlive: true,
        remainingHarvests: 2
      });
    }

    this.propGroup.add(shipGroup);

    // Shipwreck Rapier physics box
    PhysicsWorld.getInstance().createStaticBox(
      new THREE.Vector3(x, y + 1.5, z),
      new THREE.Vector3(6.0, 3.5, 16.0),
      shipGroup.quaternion
    );
  }

  private spawnSeaCave(): void {
    const x = -46, z = 8;
    const y = TerrainGenerator.sampleHeight(x, z);
    const caveGroup = new THREE.Group();
    caveGroup.position.set(x, y, z);

    // Massive rock arches over the cave mouth
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x3d3f3e,
      roughness: 0.95,
      metalness: 0.0
    });

    for (let a = 0; a < 4; a++) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(4.5 + a * 0.8, 1.8, 7, 12, Math.PI), archMat);
      arch.position.set(-a * 1.5, 1.8, (a - 1.5) * 1.8);
      arch.rotation.y = 0.4;
      arch.castShadow = true;
      arch.receiveShadow = true;
      caveGroup.add(arch);
    }

    this.propGroup.add(caveGroup);

    PhysicsWorld.getInstance().createStaticBox(
      new THREE.Vector3(x - 2, y + 4, z),
      new THREE.Vector3(8, 8, 8)
    );
  }

  private spawnDriftwood(): void {
    let idCounter = 0;
    // 25 Driftwood logs on beaches and inland
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 65;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = TerrainGenerator.sampleHeight(x, z);

      if (y < 0.2) continue;

      const group = new THREE.Group();
      const length = 2.4 + Math.random() * 1.6;
      const radius = 0.25 + Math.random() * 0.15;

      const logMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.8, radius, length, 7),
        this.woodMaterial
      );
      logMesh.rotation.z = Math.PI / 2;
      logMesh.rotation.y = Math.random() * Math.PI;
      logMesh.castShadow = true;
      logMesh.receiveShadow = true;
      group.add(logMesh);

      group.position.set(x, y + radius, z);
      this.propGroup.add(group);

      this.harvestables.push({
        id: `driftwood_${idCounter++}`,
        name: 'Fallen Driftwood',
        type: 'driftwood',
        position: new THREE.Vector3(x, y, z),
        group,
        isAlive: true,
        remainingHarvests: 2
      });
    }
  }

  private spawnFreshwaterReeds(): void {
    // Freshwater interaction node at Oasis Pond (32, 0.6, -8)
    const x = 32, z = -8, y = 0.6;
    const pondGroup = new THREE.Group();
    pondGroup.position.set(x, y, z);

    // Reeds around perimeter
    const reedMat = new THREE.MeshStandardMaterial({
      color: 0x487a32,
      roughness: 0.8,
      side: THREE.DoubleSide
    });

    for (let r = 0; r < 24; r++) {
      const angle = (r / 24) * Math.PI * 2;
      const rad = 13 + (Math.random() - 0.5) * 2;
      const rx = Math.cos(angle) * rad;
      const rz = Math.sin(angle) * rad;
      const ry = TerrainGenerator.sampleHeight(x + rx, z + rz);

      const reed = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.8 + Math.random() * 0.8, 4), reedMat);
      reed.position.set(rx, ry - y + 0.9, rz);
      reed.castShadow = true;
      pondGroup.add(reed);
    }

    this.propGroup.add(pondGroup);

    this.harvestables.push({
      id: 'freshwater_oasis',
      name: 'Freshwater Spring',
      type: 'freshwater_source',
      position: new THREE.Vector3(x, y, z),
      group: pondGroup,
      isAlive: true,
      remainingHarvests: 9999
    });
  }

  public harvest(nodeId: string): { type: string; amount: number; destroyed: boolean } | null {
    const node = this.harvestables.find((p) => p.id === nodeId);
    if (!node || !node.isAlive) return null;

    if (node.type === 'freshwater_source') {
      return { type: 'water', amount: 1, destroyed: false };
    }

    node.remainingHarvests--;
    let resourceType = 'wood';
    let amount = 3;

    if (node.type === 'crate') {
      const roll = Math.random();
      if (roll < 0.4) {
        resourceType = 'food';
        amount = 2;
      } else if (roll < 0.7) {
        resourceType = 'fiber';
        amount = 4;
      } else {
        resourceType = 'stone';
        amount = 3;
      }
    }

    if (node.remainingHarvests <= 0) {
      node.isAlive = false;
      this.propGroup.remove(node.group);
      return { type: resourceType, amount, destroyed: true };
    }

    return { type: resourceType, amount, destroyed: false };
  }
}
