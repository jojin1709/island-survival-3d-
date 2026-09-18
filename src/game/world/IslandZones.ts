import * as THREE from 'three';

export interface ZoneDefinition {
  id: string;
  name: string;
  position: THREE.Vector3;
  radius: number;
  description: string;
}

export const ISLAND_ZONES: ZoneDefinition[] = [
  {
    id: 'south_beach',
    name: 'Survivor Beach',
    position: new THREE.Vector3(0, 0.8, 48),
    radius: 25,
    description: 'A tranquil white sand beach littered with driftwood and shells.'
  },
  {
    id: 'central_jungle',
    name: 'Dense Palm Jungle',
    position: new THREE.Vector3(0, 5.5, 0),
    radius: 35,
    description: 'Thick tropical forest filled with coconut palms, fiber bushes, and wildlife.'
  },
  {
    id: 'north_cliffs',
    name: 'Eagle Ridge & Cliffs',
    position: new THREE.Vector3(-15, 18.0, -35),
    radius: 30,
    description: 'Towering granite cliffs overlooking the roaring northern ocean.'
  },
  {
    id: 'lagoon_pond',
    name: 'Freshwater Oasis',
    position: new THREE.Vector3(32, 1.2, -8),
    radius: 18,
    description: 'A secluded freshwater pool fed by mountain runoff.'
  },
  {
    id: 'shipwreck_cove',
    name: 'Shipwreck Cove',
    position: new THREE.Vector3(-38, 1.0, 36),
    radius: 22,
    description: 'The shattered remains of an old trading vessel stranded upon the shoals.'
  },
  {
    id: 'sea_cave',
    name: 'Smuggler Cave',
    position: new THREE.Vector3(-46, 2.5, 8),
    radius: 16,
    description: 'A deep cavern entrance hollowed out by centuries of ocean tides.'
  }
];

export function getZoneAtPosition(pos: THREE.Vector3): ZoneDefinition | null {
  for (const zone of ISLAND_ZONES) {
    const dist = Math.hypot(pos.x - zone.position.x, pos.z - zone.position.z);
    if (dist <= zone.radius) {
      return zone;
    }
  }
  return null;
}
