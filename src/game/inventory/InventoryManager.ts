import { ITEM_REGISTRY, type ItemDefinition } from './ItemRegistry';
import { SurvivalStats } from '../survival/SurvivalStats';

export interface InventorySlot {
  itemId: string;
  count: number;
}

export class InventoryManager {
  public static readonly TOTAL_SLOTS = 24;
  public static readonly HOTBAR_SLOTS = 6;

  public slots: (InventorySlot | null)[] = new Array(InventoryManager.TOTAL_SLOTS).fill(null);
  public selectedHotbarIndex = 0; // 0 to 5

  constructor() {
    // Initial starter kit: 2 water flasks, 1 food ration
    this.addItem('water', 2);
    this.addItem('food', 1);
  }

  public addItem(itemId: string, count = 1): number {
    const itemDef = ITEM_REGISTRY[itemId];
    if (!itemDef) return count;

    let remaining = count;

    // 1. Try stacking into existing slots with same itemId
    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      const slot = this.slots[i];
      if (slot && slot.itemId === itemId && slot.count < itemDef.maxStack) {
        const canAdd = Math.min(remaining, itemDef.maxStack - slot.count);
        slot.count += canAdd;
        remaining -= canAdd;
      }
    }

    // 2. Put remaining into first empty slot
    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      if (!this.slots[i]) {
        const canAdd = Math.min(remaining, itemDef.maxStack);
        this.slots[i] = { itemId, count: canAdd };
        remaining -= canAdd;
      }
    }

    return remaining; // 0 if fully added
  }

  public removeItem(itemId: string, count = 1): boolean {
    if (this.getItemCount(itemId) < count) return false;

    let remaining = count;
    for (let i = this.slots.length - 1; i >= 0 && remaining > 0; i--) {
      const slot = this.slots[i];
      if (slot && slot.itemId === itemId) {
        if (slot.count <= remaining) {
          remaining -= slot.count;
          this.slots[i] = null;
        } else {
          slot.count -= remaining;
          remaining = 0;
        }
      }
    }
    return true;
  }

  public getItemCount(itemId: string): number {
    let total = 0;
    for (const slot of this.slots) {
      if (slot && slot.itemId === itemId) {
        total += slot.count;
      }
    }
    return total;
  }

  public getSelectedItem(): ItemDefinition | null {
    const slot = this.slots[this.selectedHotbarIndex];
    if (!slot) return null;
    return ITEM_REGISTRY[slot.itemId] || null;
  }

  public useSlot(slotIndex: number, survival: SurvivalStats): { used: boolean; message?: string } {
    const slot = this.slots[slotIndex];
    if (!slot) return { used: false };

    const def = ITEM_REGISTRY[slot.itemId];
    if (!def) return { used: false };

    if (def.category === 'consumable') {
      if (def.foodValue) survival.eat(def.foodValue, def.healValue || 0);
      if (def.waterValue) survival.drink(def.waterValue);

      slot.count--;
      if (slot.count <= 0) {
        this.slots[slotIndex] = null;
      }
      return { used: true, message: `Consumed ${def.name}` };
    }

    return { used: false };
  }

  public getTotalWeight(): number {
    let weight = 0;
    for (const slot of this.slots) {
      if (slot) {
        const def = ITEM_REGISTRY[slot.itemId];
        if (def) weight += def.weight * slot.count;
      }
    }
    return parseFloat(weight.toFixed(1));
  }
}
