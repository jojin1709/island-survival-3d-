export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  category: 'resource' | 'consumable' | 'tool' | 'structure';
  icon: string;
  maxStack: number;
  weight: number;
  foodValue?: number;
  waterValue?: number;
  healValue?: number;
}

export const ITEM_REGISTRY: Record<string, ItemDefinition> = {
  wood: {
    id: 'wood',
    name: 'Hardwood Timber',
    description: 'Sturdy wood harvested from trees and driftwood. Essential for crafting and shelter.',
    category: 'resource',
    icon: '🪵',
    maxStack: 50,
    weight: 0.5
  },
  stone: {
    id: 'stone',
    name: 'Rough Granite Stone',
    description: 'Dense stone mined from rocks and boulders. Used for sturdy tools and building.',
    category: 'resource',
    icon: '🪨',
    maxStack: 50,
    weight: 0.8
  },
  fiber: {
    id: 'fiber',
    name: 'Plant Fiber',
    description: 'Flexible fibers stripped from jungle bushes and palm foliage.',
    category: 'resource',
    icon: '🌿',
    maxStack: 100,
    weight: 0.1
  },
  flint: {
    id: 'flint',
    name: 'Sharp Flint',
    description: 'Chipped mineral stone with razor-sharp edges. Ideal for crafting tools.',
    category: 'resource',
    icon: '🔪',
    maxStack: 30,
    weight: 0.3
  },
  berries: {
    id: 'berries',
    name: 'Wild Tropical Berries',
    description: 'Sweet, juicy jungle berries. Slightly restores hunger and thirst.',
    category: 'consumable',
    icon: '🫐',
    maxStack: 30,
    weight: 0.1,
    foodValue: 14,
    waterValue: 6
  },
  water: {
    id: 'water',
    name: 'Purified Water Flask',
    description: 'Clean freshwater collected from springs or condensed from morning dew.',
    category: 'consumable',
    icon: '💧',
    maxStack: 10,
    weight: 0.5,
    waterValue: 40
  },
  food: {
    id: 'food',
    name: 'Salvaged Ship Rations',
    description: 'Preserved rations recovered from shipwreck cargo crates.',
    category: 'consumable',
    icon: '🥫',
    maxStack: 10,
    weight: 0.4,
    foodValue: 50,
    healValue: 15
  },
  stone_axe: {
    id: 'stone_axe',
    name: 'Stone Hatchet',
    description: 'A primitive axe bound with fiber. Increases wood gathering speed.',
    category: 'tool',
    icon: '🪓',
    maxStack: 1,
    weight: 1.5
  },
  pickaxe: {
    id: 'pickaxe',
    name: 'Stone Pickaxe',
    description: 'A pointed mining tool for breaking granite and extracting flint.',
    category: 'tool',
    icon: '⛏️',
    maxStack: 1,
    weight: 1.8
  },
  spear: {
    id: 'spear',
    name: 'Hunting Spear',
    description: 'Sharpened hardwood spear for defense and catching fish.',
    category: 'tool',
    icon: '🗡️',
    maxStack: 1,
    weight: 1.2
  },
  torch: {
    id: 'torch',
    name: 'Fiber Torch',
    description: 'Provides warm illumination during the dark island nights.',
    category: 'tool',
    icon: '🔦',
    maxStack: 1,
    weight: 0.6
  },
  campfire_kit: {
    id: 'campfire_kit',
    name: 'Campfire',
    description: 'A stone ring campfire. Provides heat, light, and cooking capabilities.',
    category: 'structure',
    icon: '🔥',
    maxStack: 5,
    weight: 2.5
  },
  shelter_kit: {
    id: 'shelter_kit',
    name: 'Wooden Lean-To Shelter',
    description: 'A roofed wooden shelter to survive tropical storms and rest safely.',
    category: 'structure',
    icon: '🏕️',
    maxStack: 2,
    weight: 6.0
  },
  water_purifier_kit: {
    id: 'water_purifier_kit',
    name: 'Dew Water Collector',
    description: 'Collects and purifies fresh condensation water over time.',
    category: 'structure',
    icon: '🏺',
    maxStack: 2,
    weight: 3.5
  }
};
