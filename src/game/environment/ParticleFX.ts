import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class ParticleFX {
  private particles: Particle[] = [];
  private group = new THREE.Group();
  private scene?: THREE.Scene;

  // Reusable materials
  private woodMat = new THREE.MeshBasicMaterial({ color: 0x8b5a2b });
  private stoneMat = new THREE.MeshBasicMaterial({ color: 0x999999 });
  private sparkMat = new THREE.MeshBasicMaterial({ color: 0xffcc44 });
  private waterMat = new THREE.MeshBasicMaterial({ color: 0x90e0ef, transparent: true, opacity: 0.75 });
  private bubbleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });

  // Reusable geometries
  private chipGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
  private sparkGeo = new THREE.BoxGeometry(0.03, 0.03, 0.03);
  private dropletGeo = new THREE.SphereGeometry(0.05, 4, 4);

  public init(scene: THREE.Scene): void {
    this.scene = scene;
    this.group.name = 'ParticleFXGroup';
    scene.add(this.group);
  }

  public spawnImpact(pos: THREE.Vector3, type: 'wood' | 'stone' | 'water' | 'bubble', count = 10): void {
    if (!this.scene) return;

    let mat: THREE.Material = this.woodMat;
    let geo: THREE.BufferGeometry = this.chipGeo;
    let speed = 2.5;

    if (type === 'stone') {
      mat = Math.random() > 0.5 ? this.sparkMat : this.stoneMat;
      geo = this.sparkGeo;
      speed = 3.5;
    } else if (type === 'water') {
      mat = this.waterMat;
      geo = this.dropletGeo;
      speed = 2.0;
    } else if (type === 'bubble') {
      mat = this.bubbleMat;
      geo = this.dropletGeo;
      speed = 1.0;
    }

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        type === 'bubble' ? Math.random() * speed + 0.5 : Math.random() * speed + 1.2,
        (Math.random() - 0.5) * speed
      );

      this.group.add(mesh);
      this.particles.push({
        mesh,
        velocity: vel,
        life: 0,
        maxLife: type === 'bubble' ? 1.2 : 0.45 + Math.random() * 0.25
      });
    }
  }

  public update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        this.group.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      // Physics
      p.mesh.position.addScaledVector(p.velocity, dt);
      // Gravity
      p.velocity.y -= 9.8 * dt;

      // Scale down over time
      const scale = 1.0 - p.life / p.maxLife;
      p.mesh.scale.setScalar(Math.max(0.01, scale));
    }
  }
}
