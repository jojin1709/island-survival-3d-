import * as THREE from 'three';

export type WaterLocomotionState = 'NONE' | 'SHALLOW' | 'SWIMMING' | 'DIVING';

export interface WaterSubmersionInfo {
  isInWater: boolean;
  waterHeight: number;
  submergedDepth: number; // Positive when body is below water surface
  waterState: WaterLocomotionState;
  isFreshwater: boolean;
}

export class WaterVolume {
  public static readonly OCEAN_LEVEL = 0.0;
  public static readonly LAGOON_CENTER = new THREE.Vector2(32, -8);
  public static readonly LAGOON_RADIUS = 15.0;
  public static readonly LAGOON_LEVEL = 0.55;

  public static getWaterSurfaceElevation(x: number, z: number, time = 0): number {
    // 1. Check Freshwater Lagoon
    const distToLagoon = Math.hypot(x - WaterVolume.LAGOON_CENTER.x, z - WaterVolume.LAGOON_CENTER.y);
    if (distToLagoon <= WaterVolume.LAGOON_RADIUS) {
      return WaterVolume.LAGOON_LEVEL;
    }

    // 2. Ocean with Trochoidal Wave displacement
    const w1 = Math.sin(x * 0.18 + time * 1.6) * Math.cos(z * 0.14 + time * 1.2) * 0.22;
    const w2 = Math.sin((x + z) * 0.35 - time * 2.1) * 0.12;
    return WaterVolume.OCEAN_LEVEL + w1 + w2;
  }

  public static getSubmersionInfo(playerPos: THREE.Vector3, time = 0): WaterSubmersionInfo {
    const waterHeight = WaterVolume.getWaterSurfaceElevation(playerPos.x, playerPos.z, time);
    const isFreshwater = Math.hypot(playerPos.x - WaterVolume.LAGOON_CENTER.x, playerPos.z - WaterVolume.LAGOON_CENTER.y) <= WaterVolume.LAGOON_RADIUS;

    // Submersion depth measured from player's center/feet
    const submergedDepth = waterHeight - playerPos.y;

    let waterState: WaterLocomotionState = 'NONE';

    if (submergedDepth > 0.05) {
      if (submergedDepth < 0.65) {
        // Feet/knees in water
        waterState = 'SHALLOW';
      } else if (submergedDepth < 1.7) {
        // Body floating / swimming at surface
        waterState = 'SWIMMING';
      } else {
        // Completely submerged underwater
        waterState = 'DIVING';
      }
    }

    return {
      isInWater: waterState !== 'NONE',
      waterHeight,
      submergedDepth,
      waterState,
      isFreshwater
    };
  }
}
