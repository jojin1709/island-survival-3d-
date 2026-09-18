import { CraftingManager } from '../crafting/CraftingManager';
import { InventoryManager } from '../inventory/InventoryManager';
import { ITEM_REGISTRY } from '../inventory/ItemRegistry';
import { RECIPE_REGISTRY, type CraftingRecipe } from '../crafting/RecipeRegistry';

export class CraftingUI {
  private container!: HTMLElement;
  private recipesListEl!: HTMLElement;
  public isVisible = false;

  public init(onCraftClick: (recipe: CraftingRecipe) => void): void {
    this.container = document.querySelector('#craftingModal')!;
    this.recipesListEl = document.querySelector('#craftingList')!;

    document.querySelector('#closeCraftBtn')?.addEventListener('click', () => {
      this.hide();
    });

    this.recipesListEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.craft-btn') as HTMLElement;
      if (btn && btn.dataset.recipeId) {
        const recipe = RECIPE_REGISTRY.find((r) => r.id === btn.dataset.recipeId);
        if (recipe) {
          onCraftClick(recipe);
        }
      }
    });
  }

  public show(crafting: CraftingManager, inventory: InventoryManager): void {
    this.isVisible = true;
    this.container.classList.remove('hidden');
    this.render(crafting, inventory);
  }

  public hide(): void {
    this.isVisible = false;
    this.container.classList.add('hidden');
  }

  public toggle(crafting: CraftingManager, inventory: InventoryManager): void {
    if (this.isVisible) this.hide();
    else this.show(crafting, inventory);
  }

  public render(crafting: CraftingManager, inventory: InventoryManager): void {
    if (!this.isVisible) return;

    let html = '';
    for (const recipe of crafting.recipes) {
      const resultDef = ITEM_REGISTRY[recipe.resultItemId];
      if (!resultDef) continue;

      const canCraft = crafting.canCraft(recipe, inventory);
      const ingredientsHtml = recipe.ingredients
        .map((ing) => {
          const ingDef = ITEM_REGISTRY[ing.itemId];
          const hasCount = inventory.getItemCount(ing.itemId);
          const hasEnough = hasCount >= ing.count;
          return `<span class="ing-pill ${hasEnough ? 'has-enough' : 'missing'}">${ingDef ? ingDef.icon : ''} ${ing.count} ${ingDef ? ingDef.name : ing.itemId} (${hasCount}/${ing.count})</span>`;
        })
        .join(' ');

      html += `
        <div class="recipe-card ${canCraft ? 'craftable' : 'locked'}">
          <div class="recipe-icon">${resultDef.icon}</div>
          <div class="recipe-info">
            <h4>${resultDef.name}</h4>
            <p class="recipe-desc">${resultDef.description}</p>
            <div class="recipe-ingredients">${ingredientsHtml}</div>
          </div>
          <button class="craft-btn" data-recipe-id="${recipe.id}" ${canCraft ? '' : 'disabled'}>
            ${canCraft ? 'CRAFT' : 'LOCKED'}
          </button>
        </div>
      `;
    }

    this.recipesListEl.innerHTML = html;
  }
}
