import * as THREE from 'three';
import { InventoryManager } from '../inventory/InventoryManager';
import { SurvivalStats } from '../survival/SurvivalStats';
import { DayNightCycle } from '../time/DayNightCycle';
import { BuildingManager } from '../building/BuildingManager';

export interface GameSaveData {
  version: number;
  player: {
    position: [number, number, number];
    rotation: number;
  };
  survival: {
    health: number;
    hunger: number;
    thirst: number;
    stamina: number;
  };
  inventory: {
    slots: ({ itemId: string; count: number } | null)[];
    selectedHotbarIndex: number;
  };
  time: {
    day: number;
    timeOfDay: number;
  };
  buildings: {
    id: string;
    type: string;
    position: [number, number, number];
    rotation: number;
  }[];
}

export class SaveManager {
  private static readonly SAVE_KEY = 'island_survival_save_v2';

  public static saveGame(
    playerPos: THREE.Vector3,
    playerRot: number,
    survival: SurvivalStats,
    inventory: InventoryManager,
    dayNight: DayNightCycle,
    buildings: BuildingManager
  ): boolean {
    try {
      const data: GameSaveData = {
        version: 2,
        player: {
          position: [playerPos.x, playerPos.y, playerPos.z],
          rotation: playerRot
        },
        survival: {
          health: survival.health,
          hunger: survival.hunger,
          thirst: survival.thirst,
          stamina: survival.stamina
        },
        inventory: {
          slots: inventory.slots,
          selectedHotbarIndex: inventory.selectedHotbarIndex
        },
        time: {
          day: dayNight.day,
          timeOfDay: dayNight.timeOfDay
        },
        buildings: buildings.placedBuildings.map((b) => ({
          id: b.id,
          type: b.type,
          position: [b.position.x, b.position.y, b.position.z],
          rotation: b.rotation
        }))
      };

      localStorage.setItem(SaveManager.SAVE_KEY, JSON.stringify(data));
      console.log('[SaveManager] Game state saved successfully');
      return true;
    } catch (e) {
      console.warn('[SaveManager] Failed to save game state:', e);
      return false;
    }
  }

  public static loadGame(): GameSaveData | null {
    try {
      const raw = localStorage.getItem(SaveManager.SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as GameSaveData;
      return data;
    } catch (e) {
      console.warn('[SaveManager] Failed to parse save data:', e);
      return null;
    }
  }

  public static clearSave(): void {
    localStorage.removeItem(SaveManager.SAVE_KEY);
  }
}
