import { InventoryManager } from '../inventory/InventoryManager';
import { ITEM_REGISTRY } from '../inventory/ItemRegistry';
import { SurvivalStats } from '../survival/SurvivalStats';

export class InventoryUI {
  private container!: HTMLElement;
  private gridEl!: HTMLElement;
  private weightEl!: HTMLElement;
  public isVisible = false;

  public init(onItemClick: (slotIndex: number) => void): void {
    this.container = document.querySelector('#inventoryModal')!;
    this.gridEl = document.querySelector('#invGrid')!;
    this.weightEl = document.querySelector('#invWeight')!;

    document.querySelector('#closeInvBtn')?.addEventListener('click', () => {
      this.hide();
    });

    this.gridEl.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('.inv-slot') as HTMLElement;
      if (target && target.dataset.index !== undefined) {
        const idx = parseInt(target.dataset.index, 10);
        onItemClick(idx);
      }
    });
  }

  public show(inventory: InventoryManager): void {
    this.isVisible = true;
    this.container.classList.remove('hidden');
    this.render(inventory);
  }

  public hide(): void {
    this.isVisible = false;
    this.container.classList.add('hidden');
  }

  public toggle(inventory: InventoryManager): void {
    if (this.isVisible) this.hide();
    else this.show(inventory);
  }

  public render(inventory: InventoryManager): void {
    if (!this.isVisible) return;

    let html = '';
    for (let i = 0; i < InventoryManager.TOTAL_SLOTS; i++) {
      const slot = inventory.slots[i];
      const itemDef = slot ? ITEM_REGISTRY[slot.itemId] : null;

      html += `
        <div class="inv-slot ${slot ? 'filled' : 'empty'}" data-index="${i}">
          ${
            itemDef
              ? `
            <div class="slot-header">
              <span class="item-icon">${itemDef.icon}</span>
              ${slot!.count > 1 ? `<span class="item-badge">${slot!.count}</span>` : ''}
            </div>
            <div class="item-name">${itemDef.name}</div>
            <div class="item-meta">${itemDef.category} · ${(itemDef.weight * slot!.count).toFixed(1)}kg</div>
          `
              : '<span class="empty-hint">Empty</span>'
          }
        </div>
      `;
    }

    this.gridEl.innerHTML = html;
    if (this.weightEl) {
      this.weightEl.textContent = `Carrying: ${inventory.getTotalWeight()} kg / 45.0 kg`;
    }
  }
}
