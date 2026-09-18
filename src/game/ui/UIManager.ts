import { HUD } from './HUD';
import { InventoryUI } from './InventoryUI';
import { CraftingUI } from './CraftingUI';
import { BuildingUI } from './BuildingUI';
import { ToastUI } from './ToastUI';

export class UIManager {
  public hud = new HUD();
  public inventoryUI = new InventoryUI();
  public craftingUI = new CraftingUI();
  public buildingUI = new BuildingUI();
  public toastUI = new ToastUI();
  private startScreen!: HTMLElement;

  public init(
    onStartGame: () => void,
    onInventorySlotClick: (index: number) => void,
    onCraftRecipe: (recipe: any) => void
  ): void {
    this.hud.init();
    this.inventoryUI.init(onInventorySlotClick);
    this.craftingUI.init(onCraftRecipe);
    this.buildingUI.init();
    this.toastUI.init();

    this.startScreen = document.querySelector('#startScreen')!;
    document.querySelector('#enterIslandBtn')?.addEventListener('click', () => {
      this.hideStartScreen();
      onStartGame();
    });
  }

  public hideStartScreen(): void {
    if (this.startScreen) {
      this.startScreen.classList.add('hidden');
    }
  }

  public closeAllModals(): void {
    this.inventoryUI.hide();
    this.craftingUI.hide();
    this.buildingUI.hide();
  }

  public isAnyModalOpen(): boolean {
    return this.inventoryUI.isVisible || this.craftingUI.isVisible;
  }
}
