import * as THREE from 'three';
import { PhysicsWorld } from '../physics/PhysicsWorld';

export interface PlacedBuilding {
  id: string;
  type: 'campfire' | 'shelter' | 'water_collector';
  position: THREE.Vector3;
  rotation: number;
  group: THREE.Group;
  collider?: any;
}

export class BuildingManager {
  public placedBuildings: PlacedBuilding[] = [];
  public buildingsGroup = new THREE.Group();

  public create(scene: THREE.Scene): void {
    scene.add(this.buildingsGroup);
    console.log('[BuildingManager] Building container initialized');
  }

  public instantiateBuildingMesh(type: string): THREE.Group {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.85 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6e706c, roughness: 0.90 });

    if (type === 'campfire' || type === 'campfire_kit') {
      // Stone ring
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 1), stoneMat);
        stone.position.set(Math.cos(a) * 0.75, 0.15, Math.sin(a) * 0.75);
        stone.castShadow = true;
        group.add(stone);
      }
      // Wooden logs inside
      for (let l = 0; l < 3; l++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.9, 6), woodMat);
        log.rotation.z = Math.PI / 2;
        log.rotation.y = (l * Math.PI) / 3;
        log.position.y = 0.12;
        log.castShadow = true;
        group.add(log);
      }
      // Fire flame mesh & point light
      const fireMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.65, 6), fireMat);
      flame.position.y = 0.45;
      group.add(flame);

      const light = new THREE.PointLight(0xff7722, 2.2, 12);
      light.position.y = 0.8;
      group.add(light);
    } else if (type === 'shelter' || type === 'shelter_kit') {
      // Wooden platform
      const floor = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.18, 3.2), woodMat);
      floor.position.y = 0.09;
      floor.castShadow = true;
      floor.receiveShadow = true;
      group.add(floor);

      // Support pillars
      for (const px of [-1.8, 1.8]) {
        for (const pz of [-1.4, 1.4]) {
          const postHeight = pz > 0 ? 2.4 : 1.5;
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, postHeight, 6), woodMat);
          post.position.set(px, postHeight / 2, pz);
          post.castShadow = true;
          group.add(post);
        }
      }

      // Sloped thatched/plank roof
      const roof = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.15, 3.6), woodMat);
      roof.position.set(0, 2.1, 0);
      roof.rotation.x = -0.26;
      roof.castShadow = true;
      group.add(roof);
    } else if (type === 'water_purifier_kit' || type === 'water_collector') {
      // Catchment basin + tripod
      const basinMat = new THREE.MeshStandardMaterial({ color: 0x3d4245, roughness: 0.7 });
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.45, 0.75, 8), basinMat);
      basin.position.y = 0.38;
      basin.castShadow = true;
      group.add(basin);

      // Cloth tarp on top
      const clothMat = new THREE.MeshStandardMaterial({ color: 0xb5a489, roughness: 0.9, side: THREE.DoubleSide });
      const cloth = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.5, 6), clothMat);
      cloth.position.y = 1.35;
      cloth.rotation.x = Math.PI;
      cloth.castShadow = true;
      group.add(cloth);
    }

    return group;
  }

  public place(type: string, position: THREE.Vector3, rotation: number): PlacedBuilding {
    const group = this.instantiateBuildingMesh(type);
    group.position.copy(position);
    group.rotation.y = rotation;
    this.buildingsGroup.add(group);

    const id = `building_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    let colliderSize = new THREE.Vector3(1.5, 1.0, 1.5);
    if (type.includes('shelter')) colliderSize = new THREE.Vector3(4.0, 2.5, 3.2);

    const collider = PhysicsWorld.getInstance().createStaticBox(
      new THREE.Vector3(position.x, position.y + colliderSize.y / 2, position.z),
      colliderSize,
      group.quaternion
    );

    const building: PlacedBuilding = {
      id,
      type: type.replace('_kit', '') as any,
      position: position.clone(),
      rotation,
      group,
      collider
    };

    this.placedBuildings.push(building);
    return building;
  }
}
