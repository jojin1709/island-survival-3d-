import * as THREE from 'three';
import { createTerrainMaterial } from './TerrainMaterial';
import { PhysicsWorld } from '../physics/PhysicsWorld';

export class TerrainGenerator {
  public static readonly ISLAND_RADIUS = 88;
  public static readonly GRID_SIZE = 140; // 140x140 vertices
  public static readonly WORLD_SIZE = 220; // 220m x 220m

  public mesh!: THREE.Mesh;
  public geometry!: THREE.BufferGeometry;
  public material!: THREE.ShaderMaterial;
  public positions!: Float32Array;
  public indices!: Uint32Array;

  public static sampleHeight(x: number, z: number): number {
    const r = Math.hypot(x, z);
    if (r > TerrainGenerator.ISLAND_RADIUS + 12) {
      return -8.0; // Deep ocean floor
    }

    // Radial mask with smooth organic boundary
    const angle = Math.atan2(z, x);
    const deformedR = TerrainGenerator.ISLAND_RADIUS * (1.0 + 0.12 * Math.sin(angle * 3.0) + 0.08 * Math.cos(angle * 5.0 + 1.2));
    
    if (r >= deformedR) {
      const drop = (r - deformedR) / 12.0;
      return -Math.min(8.0, drop * 6.0 + 0.5);
    }

    const normDist = r / deformedR; // 0 at center, 1 at shore
    const islandMask = Math.pow(Math.max(0, 1.0 - normDist), 0.85);

    // Multi-octave terrain features
    // 1. Highland Mountain Ridge (North-West)
    const nwDist = Math.hypot(x + 22, z + 30);
    const mountainShape = Math.exp(-Math.pow(nwDist / 32, 2.0)) * 24.0;
    const ridgeNoise = Math.sin(x * 0.14 + z * 0.18) * 3.5 + Math.cos(z * 0.22 - x * 0.1) * 2.5;
    const highland = (mountainShape + (mountainShape > 2.0 ? ridgeNoise : 0.0)) * islandMask;

    // 2. Central Jungle Plateau
    const jungleNoise = Math.sin(x * 0.08) * Math.cos(z * 0.07) * 3.0 +
                        Math.sin((x + z) * 0.12) * 1.8 +
                        Math.cos(x * 0.25 - z * 0.18) * 0.9;
    const plateau = (4.5 + jungleNoise) * Math.pow(islandMask, 1.2);

    // 3. Freshwater Lagoon depression near (32, -8)
    const lagoonDist = Math.hypot(x - 32, z + 8);
    let lagoonCarve = 0;
    if (lagoonDist < 16) {
      lagoonCarve = Math.cos((lagoonDist / 16) * Math.PI * 0.5) * 4.2;
    }

    // 4. Cave depression near (-46, 8)
    const caveDist = Math.hypot(x + 46, z - 8);
    let caveCarve = 0;
    if (caveDist < 12) {
      caveCarve = Math.cos((caveDist / 12) * Math.PI * 0.5) * 2.8;
    }

    // 5. South Beach gentle slope
    let beachLift = 0;
    if (z > 15 && r < deformedR) {
      beachLift = Math.sin((z - 15) * 0.05) * 0.8;
    }

    const rawHeight = (plateau + highland + beachLift - lagoonCarve - caveCarve);
    
    // Smooth transition into ocean shoreline
    const edgeBlend = smoothstep(deformedR - 8.0, deformedR, r);
    const finalHeight = rawHeight * (1.0 - edgeBlend) + (-0.6 * edgeBlend);

    return Math.max(-8.0, finalHeight);
  }

  public generate(scene: THREE.Scene): void {
    const N = TerrainGenerator.GRID_SIZE;
    const size = TerrainGenerator.WORLD_SIZE;
    const halfSize = size / 2;
    const step = size / N;

    const vertCount = (N + 1) * (N + 1);
    this.positions = new Float32Array(vertCount * 3);
    const uvs = new Float32Array(vertCount * 2);

    let vIndex = 0;
    let uvIndex = 0;

    for (let i = 0; i <= N; i++) {
      const z = -halfSize + i * step;
      for (let j = 0; j <= N; j++) {
        const x = -halfSize + j * step;
        const y = TerrainGenerator.sampleHeight(x, z);

        this.positions[vIndex] = x;
        this.positions[vIndex + 1] = y;
        this.positions[vIndex + 2] = z;
        vIndex += 3;

        uvs[uvIndex] = j / N;
        uvs[uvIndex + 1] = i / N;
        uvIndex += 2;
      }
    }

    const indexCount = N * N * 6;
    this.indices = new Uint32Array(indexCount);
    let iIndex = 0;

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const a = i * (N + 1) + j;
        const b = a + 1;
        const c = a + (N + 1);
        const d = c + 1;

        this.indices[iIndex++] = a;
        this.indices[iIndex++] = c;
        this.indices[iIndex++] = b;

        this.indices[iIndex++] = b;
        this.indices[iIndex++] = c;
        this.indices[iIndex++] = d;
      }
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geometry.setIndex(new THREE.BufferAttribute(this.indices, 1));
    this.geometry.computeVertexNormals();

    this.material = createTerrainMaterial();
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'TerrainMesh';
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;

    scene.add(this.mesh);

    // Register with Rapier3D physics
    PhysicsWorld.getInstance().createTerrainCollider(this.positions, this.indices);
    console.log('[TerrainGenerator] Terrain generated and physics collider registered');
  }

  public update(time: number, sunDir: THREE.Vector3, sunColor: THREE.Color, ambientColor: THREE.Color, fogColor: THREE.Color): void {
    if (this.material && this.material.uniforms) {
      this.material.uniforms.uTime.value = time;
      this.material.uniforms.uSunDirection.value.copy(sunDir);
      this.material.uniforms.uSunColor.value.copy(sunColor);
      this.material.uniforms.uAmbientColor.value.copy(ambientColor);
      this.material.uniforms.uFogColor.value.copy(fogColor);
    }
  }
}

function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}
