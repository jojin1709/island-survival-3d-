import * as THREE from 'three';
import { VegetationManager } from '../environment/VegetationManager';
import { RockManager } from '../environment/RockManager';
import { PropManager } from '../environment/PropManager';
import { InventoryManager } from '../inventory/InventoryManager';
import { SurvivalStats } from '../survival/SurvivalStats';

export interface InteractionTarget {
  id: string;
  type: 'vegetation' | 'rock' | 'prop' | 'water';
  prompt: string;
  distance: number;
  position: THREE.Vector3;
}

export class InteractionManager {
  private vegetationManager: VegetationManager;
  private rockManager: RockManager;
  private propManager: PropManager;
  public currentTarget: InteractionTarget | null = null;

  constructor(
    vegetationManager: VegetationManager,
    rockManager: RockManager,
    propManager: PropManager
  ) {
    this.vegetationManager = vegetationManager;
    this.rockManager = rockManager;
    this.propManager = propManager;
  }

  public update(playerPos: THREE.Vector3): void {
    let closestTarget: InteractionTarget | null = null;
    let minDistance = 3.6; // 3.6m interaction reach

    // 1. Check Vegetation
    for (const veg of this.vegetationManager.harvestables) {
      if (!veg.isAlive) continue;
      const d = veg.position.distanceTo(playerPos);
      if (d < minDistance) {
        minDistance = d;
        let prompt = 'Chop Palm Tree';
        if (veg.type === 'hardwood') prompt = 'Chop Hardwood Tree';
        if (veg.type === 'bush') prompt = 'Gather Bush & Berries';

        closestTarget = {
          id: veg.id,
          type: 'vegetation',
          prompt,
          distance: d,
          position: veg.position
        };
      }
    }

    // 2. Check Rocks
    for (const rock of this.rockManager.harvestables) {
      if (!rock.isAlive) continue;
      const d = rock.position.distanceTo(playerPos);
      if (d < minDistance) {
        minDistance = d;
        const prompt = rock.type === 'flint_node' ? 'Mine Flint Node' : 'Mine Granite Stone';
        closestTarget = {
          id: rock.id,
          type: 'rock',
          prompt,
          distance: d,
          position: rock.position
        };
      }
    }

    // 3. Check Props & Freshwater
    for (const prop of this.propManager.harvestables) {
      if (!prop.isAlive) continue;
      const d = prop.position.distanceTo(playerPos);
      if (d < minDistance) {
        minDistance = d;
        let prompt = 'Gather Driftwood';
        if (prop.type === 'crate') prompt = 'Salvage Shipwreck Crate';
        if (prop.type === 'freshwater_source') prompt = 'Drink / Collect Water';

        closestTarget = {
          id: prop.id,
          type: 'prop',
          prompt,
          distance: d,
          position: prop.position
        };
      }
    }

    this.currentTarget = closestTarget;
  }

  public interact(
    inventory: InventoryManager,
    survival: SurvivalStats
  ): { success: boolean; message?: string; soundEffect?: string } {
    if (!this.currentTarget) return { success: false };

    const target = this.currentTarget;

    if (target.type === 'vegetation') {
      const res = this.vegetationManager.harvest(target.id);
      if (res) {
        inventory.addItem(res.type, res.amount);
        return {
          success: true,
          message: `+${res.amount} ${res.type.toUpperCase()}`,
          soundEffect: 'chop'
        };
      }
    } else if (target.type === 'rock') {
      const res = this.rockManager.harvest(target.id);
      if (res) {
        inventory.addItem(res.type, res.amount);
        return {
          success: true,
          message: `+${res.amount} ${res.type.toUpperCase()}`,
          soundEffect: 'mine'
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
            soundEffect: 'water'
          };
        } else {
          inventory.addItem(res.type, res.amount);
          return {
            success: true,
            message: `+${res.amount} ${res.type.toUpperCase()}`,
            soundEffect: 'gather'
          };
        }
      }
    }

    return { success: false };
  }
}
