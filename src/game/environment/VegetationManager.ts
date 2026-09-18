import * as THREE from 'three';
import { TerrainGenerator } from '../terrain/TerrainGenerator';
import { AssetManager } from '../../assets/AssetManager';
import { PhysicsWorld } from '../physics/PhysicsWorld';

export interface HarvestableVegetation {
  id: string;
  type: 'palm' | 'hardwood' | 'bush';
  position: THREE.Vector3;
  group: THREE.Group;
  remainingHarvests: number;
  maxHarvests: number;
  isAlive: boolean;
  collider?: any;
}

export class VegetationManager {
  public harvestables: HarvestableVegetation[] = [];
  public vegetationGroup = new THREE.Group();
  public grassInstancedMesh!: THREE.InstancedMesh;
  private palmMaterial!: THREE.MeshStandardMaterial;
  private frondMaterial!: THREE.MeshStandardMaterial;
  private hardwoodMaterial!: THREE.MeshStandardMaterial;
  private leafMaterial!: THREE.MeshStandardMaterial;
  private berryMaterial!: THREE.MeshStandardMaterial;
  private coconutMaterial!: THREE.MeshStandardMaterial;

  public create(scene: THREE.Scene): void {
    scene.add(this.vegetationGroup);

    const assetManager = AssetManager.getInstance();
    const barkTex = assetManager.getProceduralTexture('bark');
    barkTex.repeat.set(2, 6);

    // Natural, bright, high quality PBR materials
    this.palmMaterial = new THREE.MeshStandardMaterial({
      map: barkTex,
      roughness: 0.85,
      metalness: 0.02,
      color: 0xffffff // White tint so texture map displays full natural colors
    });

    this.frondMaterial = new THREE.MeshStandardMaterial({
      color: 0x389e3e,
      roughness: 0.65,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    this.hardwoodMaterial = new THREE.MeshStandardMaterial({
      map: barkTex,
      roughness: 0.88,
      metalness: 0.02,
      color: 0xeeddc8
    });

    this.leafMaterial = new THREE.MeshStandardMaterial({
      color: 0x338f2b,
      roughness: 0.70,
      metalness: 0.01,
      side: THREE.DoubleSide
    });

    this.berryMaterial = new THREE.MeshStandardMaterial({
      color: 0xdb2338,
      roughness: 0.35,
      metalness: 0.05
    });

    this.coconutMaterial = new THREE.MeshStandardMaterial({
      color: 0x5c3d26,
      roughness: 0.85,
      metalness: 0.0
    });

    this.spawnPalms();
    this.spawnHardwoods();
    this.spawnBushes();
    this.spawnInstancedGrass(scene);

    console.log(`[VegetationManager] Created ${this.harvestables.length} harvestable vegetation nodes + instanced grass`);
  }

  private createPalmTree(x: number, z: number, id: string): void {
    const y = TerrainGenerator.sampleHeight(x, z);
    if (y < 0.6 || y > 14.0) return;

    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Curved realistic trunk
    const curvePoints: THREE.Vector3[] = [];
    const height = 7.0 + Math.random() * 2.5;
    const curveAngle = Math.random() * Math.PI * 2;
    const lean = 1.0 + Math.random() * 1.4;

    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const curY = t * height;
      const curX = Math.cos(curveAngle) * Math.pow(t, 1.8) * lean;
      const curZ = Math.sin(curveAngle) * Math.pow(t, 1.8) * lean;
      curvePoints.push(new THREE.Vector3(curX, curY, curZ));
    }

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const trunkGeo = new THREE.TubeGeometry(curve, 16, 0.38, 8, false);
    const trunkMesh = new THREE.Mesh(trunkGeo, this.palmMaterial);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    group.add(trunkMesh);

    // Palm Crown at tip of trunk
    const topPos = curvePoints[curvePoints.length - 1];
    const crownGroup = new THREE.Group();
    crownGroup.position.copy(topPos);

    // Multi-tiered fronds (14 leaves)
    const frondCount = 14;
    for (let f = 0; f < frondCount; f++) {
      const angle = (f / frondCount) * Math.PI * 2 + (Math.random() * 0.2);
      const frondGeo = new THREE.ConeGeometry(0.55, 4.8, 5);
      frondGeo.scale(1.2, 1.0, 0.12);
      frondGeo.translate(0, 2.4, 0);

      const frondMesh = new THREE.Mesh(frondGeo, this.frondMaterial);
      frondMesh.rotation.y = angle;
      frondMesh.rotation.x = 1.1 + Math.random() * 0.25;
      frondMesh.castShadow = true;
      frondMesh.receiveShadow = true;
      crownGroup.add(frondMesh);
    }

    // Coconut cluster
    for (let c = 0; c < 4; c++) {
      const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.24, 7, 6), this.coconutMaterial);
      coconut.position.set(
        (Math.random() - 0.5) * 0.5,
        -0.2 - Math.random() * 0.2,
        (Math.random() - 0.5) * 0.5
      );
      coconut.castShadow = true;
      crownGroup.add(coconut);
    }

    group.add(crownGroup);
    this.vegetationGroup.add(group);

    // Rapier Physics Collider around trunk
    const collider = PhysicsWorld.getInstance().createStaticCylinder(
      new THREE.Vector3(x, y + 2.5, z),
      0.45,
      2.5
    );

    this.harvestables.push({
      id,
      type: 'palm',
      position: new THREE.Vector3(x, y, z),
      group,
      remainingHarvests: 4,
      maxHarvests: 4,
      isAlive: true,
      collider
    });
  }

  private createHardwoodTree(x: number, z: number, id: string): void {
    const y = TerrainGenerator.sampleHeight(x, z);
    if (y < 2.0 || y > 15.0) return;

    const group = new THREE.Group();
    group.position.set(x, y, z);

    const trunkHeight = 5.5 + Math.random() * 2.0;
    const trunkMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.85, trunkHeight, 8),
      this.hardwoodMaterial
    );
    trunkMesh.position.y = trunkHeight / 2;
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    group.add(trunkMesh);

    const canopy = new THREE.Group();
    canopy.position.y = trunkHeight * 0.85;

    const leafClusters = 6;
    for (let i = 0; i < leafClusters; i++) {
      const rad = 2.2 + Math.random() * 1.4;
      const sphere = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 1), this.leafMaterial);
      const angle = (i / leafClusters) * Math.PI * 2;
      sphere.position.set(Math.cos(angle) * 1.8, Math.random() * 1.8, Math.sin(angle) * 1.8);
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      canopy.add(sphere);
    }
    group.add(canopy);
    this.vegetationGroup.add(group);

    const collider = PhysicsWorld.getInstance().createStaticCylinder(
      new THREE.Vector3(x, y + trunkHeight / 2, z),
      0.7,
      trunkHeight / 2
    );

    this.harvestables.push({
      id,
      type: 'hardwood',
      position: new THREE.Vector3(x, y, z),
      group,
      remainingHarvests: 5,
      maxHarvests: 5,
      isAlive: true,
      collider
    });
  }

  private createBush(x: number, z: number, id: string): void {
    const y = TerrainGenerator.sampleHeight(x, z);
    if (y < 0.6 || y > 16.0) return;

    const group = new THREE.Group();
    group.position.set(x, y, z);

    for (let i = 0; i < 4; i++) {
      const rad = 0.65 + Math.random() * 0.35;
      const sphere = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 1), this.leafMaterial);
      sphere.position.set(
        (Math.random() - 0.5) * 0.9,
        rad * 0.75,
        (Math.random() - 0.5) * 0.9
      );
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      group.add(sphere);
    }

    for (let b = 0; b < 6; b++) {
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), this.berryMaterial);
      berry.position.set(
        (Math.random() - 0.5) * 1.2,
        0.5 + Math.random() * 0.6,
        (Math.random() - 0.5) * 1.2
      );
      berry.castShadow = true;
      group.add(berry);
    }

    this.vegetationGroup.add(group);

    this.harvestables.push({
      id,
      type: 'bush',
      position: new THREE.Vector3(x, y, z),
      group,
      remainingHarvests: 3,
      maxHarvests: 3,
      isAlive: true
    });
  }

  private spawnPalms(): void {
    let idCounter = 0;
    for (let i = 0; i < 85; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 12 + Math.sqrt(Math.random()) * 62;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      this.createPalmTree(x, z, `palm_${idCounter++}`);
    }
  }

  private spawnHardwoods(): void {
    let idCounter = 0;
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * 42;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      this.createHardwoodTree(x, z, `hardwood_${idCounter++}`);
    }
  }

  private spawnBushes(): void {
    let idCounter = 0;
    for (let i = 0; i < 65; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 68;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      this.createBush(x, z, `bush_${idCounter++}`);
    }
  }

  private spawnInstancedGrass(scene: THREE.Scene): void {
    const grassCount = 2500;
    const grassGeo = new THREE.PlaneGeometry(0.7, 0.9, 1, 2);
    grassGeo.translate(0, 0.45, 0);

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x4aa330,
      roughness: 0.75,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    this.grassInstancedMesh = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);
    this.grassInstancedMesh.receiveShadow = true;
    this.grassInstancedMesh.castShadow = false;

    const dummy = new THREE.Object3D();
    let placed = 0;

    for (let i = 0; i < grassCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 6 + Math.random() * 64;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = TerrainGenerator.sampleHeight(x, z);

      if (y >= 1.5 && y <= 13.0) {
        dummy.position.set(x, y, z);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        dummy.rotation.z = (Math.random() - 0.5) * 0.2;
        const scale = 0.75 + Math.random() * 0.5;
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        this.grassInstancedMesh.setMatrixAt(placed++, dummy.matrix);
      }
    }

    this.grassInstancedMesh.count = placed;
    this.grassInstancedMesh.instanceMatrix.needsUpdate = true;
    scene.add(this.grassInstancedMesh);
  }

  public harvest(nodeId: string): { type: string; amount: number; destroyed: boolean } | null {
    const node = this.harvestables.find((h) => h.id === nodeId);
    if (!node || !node.isAlive) return null;

    node.remainingHarvests--;
    let resourceType = 'wood';
    let amount = 2;

    if (node.type === 'bush') {
      resourceType = Math.random() > 0.4 ? 'fiber' : 'berries';
      amount = 2;
    } else if (node.type === 'palm') {
      resourceType = 'wood';
      amount = 3;
    } else if (node.type === 'hardwood') {
      resourceType = 'wood';
      amount = 4;
    }

    if (node.remainingHarvests <= 0) {
      node.isAlive = false;
      this.vegetationGroup.remove(node.group);
      if (node.collider && node.collider.body) {
        PhysicsWorld.getInstance().world.removeRigidBody(node.collider.body);
      }
      return { type: resourceType, amount, destroyed: true };
    }

    return { type: resourceType, amount, destroyed: false };
  }
}
