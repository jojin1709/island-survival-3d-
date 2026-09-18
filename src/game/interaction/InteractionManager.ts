import * as THREE from 'three';
import { VegetationManager } from '../environment/VegetationManager';
import { RockManager } from '../environment/RockManager';
import { PropManager } from '../environment/PropManager';
import { BuildingManager } from '../building/BuildingManager';
import { InventoryManager } from '../inventory/InventoryManager';
import { SurvivalStats } from '../survival/SurvivalStats';

export interface InteractionTarget {
  id: string;
  type: 'vegetation' | 'rock' | 'prop' | 'water' | 'structure';
  prompt: string;
  distance: number;
  position: THREE.Vector3;
}

export class InteractionManager {
  private vegetationManager: VegetationManager;
  private rockManager: RockManager;
  private propManager: PropManager;
  private buildingManager?: BuildingManager;
  public currentTarget: InteractionTarget | null = null;

  constructor(
    vegetationManager: VegetationManager,
    rockManager: RockManager,
    propManager: PropManager,
    buildingManager?: BuildingManager
  ) {
    this.vegetationManager = vegetationManager;
    this.rockManager = rockManager;
    this.propManager = propManager;
    this.buildingManager = buildingManager;
  }

  public update(playerPos: THREE.Vector3, camera: THREE.Camera): void {
    let bestTarget: InteractionTarget | null = null;
    let minScore = 999; // Combined distance and aim angle score
    const maxDistance = 3.6;

    // Get camera position and forward direction
    const camPos = new THREE.Vector3();
    const camFwd = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    camera.getWorldDirection(camFwd);

    const checkCandidate = (
      id: string,
      type: 'vegetation' | 'rock' | 'prop' | 'structure',
      pos: THREE.Vector3,
      prompt: string,
      reach = maxDistance
    ) => {
      const distToPlayer = playerPos.distanceTo(pos);
      if (distToPlayer > reach) return;

      // Check vector from camera to object
      const toObj = new THREE.Vector3().subVectors(pos, camPos);
      const distToCam = toObj.length();
      toObj.normalize();

      // Dot product to check if player is looking towards it
      const dot = camFwd.dot(toObj);
      if (dot < 0.72) return; // Must be within ~44 degree cone of crosshair

      // Score based on distance and aim alignment (higher dot + closer = lower score)
      const score = distToPlayer * (2.0 - dot);
      if (score < minScore) {
        minScore = score;
        bestTarget = {
          id,
          type,
          prompt,
          distance: distToPlayer,
          position: pos
        };
      }
    };

    // 1. Check Vegetation
    for (const veg of this.vegetationManager.harvestables) {
      if (!veg.isAlive) continue;
      let prompt = 'Chop Palm Tree';
      if (veg.type === 'hardwood') prompt = 'Chop Hardwood Tree';
      if (veg.type === 'bush') prompt = 'Gather Bush & Berries';
      checkCandidate(veg.id, 'vegetation', veg.position, prompt, 3.8);
    }

    // 2. Check Rocks
    for (const rock of this.rockManager.harvestables) {
      if (!rock.isAlive) continue;
      const prompt = rock.type === 'flint_node' ? 'Mine Flint Node' : 'Mine Granite Stone';
      checkCandidate(rock.id, 'rock', rock.position, prompt, 3.5);
    }

    // 3. Check Props & Freshwater
    for (const prop of this.propManager.harvestables) {
      if (!prop.isAlive) continue;
      let prompt = 'Gather Driftwood';
      if (prop.type === 'crate') prompt = 'Salvage Shipwreck Crate';
      if (prop.type === 'freshwater_source') prompt = 'Drink / Collect Water';
      checkCandidate(prop.id, 'prop', prop.position, prompt, 3.5);
    }

    // 4. Check Placed Structures
    if (this.buildingManager) {
      for (const b of this.buildingManager.placedBuildings) {
        let prompt = 'Use Structure';
        if (b.type === 'campfire') prompt = 'Rest by Warm Campfire';
        if (b.type === 'shelter') prompt = 'Rest / Sleep in Shelter';
        checkCandidate(b.id, 'structure', b.position, prompt, 3.2);
      }
    }

    this.currentTarget = bestTarget;
  }

  public interact(
    inventory: InventoryManager,
    survival: SurvivalStats
  ): { success: boolean; message?: string; soundEffect?: string; hitPosition?: THREE.Vector3 } {
    if (!this.currentTarget) return { success: false };

    const target = this.currentTarget;
    const hitPos = target.position.clone();

    if (target.type === 'vegetation') {
      const res = this.vegetationManager.harvest(target.id);
      if (res) {
        inventory.addItem(res.type, res.amount);
        return {
          success: true,
          message: `+${res.amount} ${res.type.toUpperCase()}`,
          soundEffect: 'chop',
          hitPosition: hitPos
        };
      }
    } else if (target.type === 'rock') {
      const res = this.rockManager.harvest(target.id);
      if (res) {
        inventory.addItem(res.type, res.amount);
        return {
          success: true,
          message: `+${res.amount} ${res.type.toUpperCase()}`,
          soundEffect: 'mine',
          hitPosition: hitPos
        };
      }
    } else if (target.type === 'prop') {
      const res = this.propManager.harvest(target.id);
      if (res) {
        if (res.type === 'water') {
          survival.drink(30);
          inventory.addItem('water', 1);
          return {
            success: true,
            message: 'Drank Fresh Water (+1 Water Flask)',
            soundEffect: 'water',
            hitPosition: hitPos
          };
        } else {
          inventory.addItem(res.type, res.amount);
          return {
            success: true,
            message: `+${res.amount} ${res.type.toUpperCase()}`,
            soundEffect: 'gather',
            hitPosition: hitPos
          };
        }
      }
    } else if (target.type === 'structure') {
      // Warmth & Rest
      survival.health = Math.min(survival.maxHealth, survival.health + 15);
      survival.stamina = survival.maxStamina;
      return {
        success: true,
        message: 'Rested and recovered vitality!',
        soundEffect: 'gather',
        hitPosition: hitPos
      };
    }

    return { success: false };
  }
}
