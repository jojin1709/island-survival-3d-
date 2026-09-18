import { RECIPE_REGISTRY, type CraftingRecipe } from './RecipeRegistry';
import { InventoryManager } from '../inventory/InventoryManager';
import { ITEM_REGISTRY } from '../inventory/ItemRegistry';

export class CraftingManager {
  public recipes: CraftingRecipe[] = RECIPE_REGISTRY;

  public canCraft(recipe: CraftingRecipe, inventory: InventoryManager): boolean {
    for (const ingredient of recipe.ingredients) {
      if (inventory.getItemCount(ingredient.itemId) < ingredient.count) {
        return false;
      }
    }
    return true;
  }

  public craft(recipe: CraftingRecipe, inventory: InventoryManager): { success: boolean; message: string } {
    if (!this.canCraft(recipe, inventory)) {
      return { success: false, message: 'Insufficient resources to craft this recipe.' };
    }

    // Deduct ingredients
    for (const ingredient of recipe.ingredients) {
      inventory.removeItem(ingredient.itemId, ingredient.count);
    }

    // Add result
    inventory.addItem(recipe.resultItemId, recipe.resultCount);
    const itemDef = ITEM_REGISTRY[recipe.resultItemId];
    const itemName = itemDef ? itemDef.name : recipe.resultItemId;

    return { success: true, message: `Crafted ${itemName}!` };
  }
}
