export interface CraftingRecipe {
  id: string;
  resultItemId: string;
  resultCount: number;
  category: 'tools' | 'survival' | 'structures';
  ingredients: { itemId: string; count: number }[];
  craftTimeSeconds: number;
}

export const RECIPE_REGISTRY: CraftingRecipe[] = [
  {
    id: 'craft_stone_axe',
    resultItemId: 'stone_axe',
    resultCount: 1,
    category: 'tools',
    ingredients: [
      { itemId: 'wood', count: 4 },
      { itemId: 'stone', count: 3 },
      { itemId: 'fiber', count: 2 }
    ],
    craftTimeSeconds: 1.5
  },
  {
    id: 'craft_pickaxe',
    resultItemId: 'pickaxe',
    resultCount: 1,
    category: 'tools',
    ingredients: [
      { itemId: 'wood', count: 3 },
      { itemId: 'stone', count: 4 },
      { itemId: 'fiber', count: 2 }
    ],
    craftTimeSeconds: 1.5
  },
  {
    id: 'craft_spear',
    resultItemId: 'spear',
    resultCount: 1,
    category: 'tools',
    ingredients: [
      { itemId: 'wood', count: 5 },
      { itemId: 'flint', count: 2 },
      { itemId: 'fiber', count: 3 }
    ],
    craftTimeSeconds: 2.0
  },
  {
    id: 'craft_torch',
    resultItemId: 'torch',
    resultCount: 1,
    category: 'survival',
    ingredients: [
      { itemId: 'wood', count: 2 },
      { itemId: 'fiber', count: 3 }
    ],
    craftTimeSeconds: 1.0
  },
  {
    id: 'craft_campfire',
    resultItemId: 'campfire_kit',
    resultCount: 1,
    category: 'structures',
    ingredients: [
      { itemId: 'wood', count: 6 },
      { itemId: 'stone', count: 8 }
    ],
    craftTimeSeconds: 2.5
  },
  {
    id: 'craft_shelter',
    resultItemId: 'shelter_kit',
    resultCount: 1,
    category: 'structures',
    ingredients: [
      { itemId: 'wood', count: 12 },
      { itemId: 'fiber', count: 8 }
    ],
    craftTimeSeconds: 3.5
  },
  {
    id: 'craft_water_collector',
    resultItemId: 'water_purifier_kit',
    resultCount: 1,
    category: 'structures',
    ingredients: [
      { itemId: 'wood', count: 8 },
      { itemId: 'stone', count: 6 },
      { itemId: 'fiber', count: 6 }
    ],
    craftTimeSeconds: 3.0
  }
];
