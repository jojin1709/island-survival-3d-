import * as THREE from 'three';

export type WeatherType = 'clear' | 'cloudy' | 'rain';

export class WeatherManager {
  public currentWeather: WeatherType = 'clear';
  public weatherIntensity = 0.0; // 0.0 (clear) to 1.0 (heavy rain)
  private targetIntensity = 0.0;
  private weatherTimer = 180.0; // Changes every 3 minutes
  private rainPoints!: THREE.Points;
  private rainPositions!: Float32Array;
  private rainCount = 2500;
  private lightningTimer = 0;
  public isLightning = false;

  public create(scene: THREE.Scene): void {
    const geo = new THREE.BufferGeometry();
    this.rainPositions = new Float32Array(this.rainCount * 3);

    for (let i = 0; i < this.rainCount; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * 60;
      this.rainPositions[i * 3 + 1] = Math.random() * 35;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x90b8cf,
      size: 0.22,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });

    this.rainPoints = new THREE.Points(geo, mat);
    scene.add(this.rainPoints);

    console.log('[WeatherManager] Weather system and rain particles initialized');
  }

  public update(dt: number, playerPos: THREE.Vector3): void {
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      this.weatherTimer = 120 + Math.random() * 180;
      this.pickRandomWeather();
    }

    // Smoothly transition intensity
    this.weatherIntensity += (this.targetIntensity - this.weatherIntensity) * dt * 0.4;

    // Rain particles update
    if (this.rainPoints) {
      const mat = this.rainPoints.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0, (this.weatherIntensity - 0.25) * 1.33 * 0.75);

      if (this.weatherIntensity > 0.2) {
        const positions = this.rainPoints.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < this.rainCount; i++) {
          positions[i * 3 + 1] -= dt * 38.0; // Fall speed
          positions[i * 3] -= dt * 4.0; // Wind slant

          // Wrap around player box (60m x 35m x 60m)
          if (positions[i * 3 + 1] < playerPos.y - 2.0) {
            positions[i * 3 + 1] = playerPos.y + 32.0;
            positions[i * 3] = playerPos.x + (Math.random() - 0.5) * 60;
            positions[i * 3 + 2] = playerPos.z + (Math.random() - 0.5) * 60;
          }
        }
        this.rainPoints.geometry.attributes.position.needsUpdate = true;
      }
    }

    // Random lightning during rainstorm
    this.isLightning = false;
    if (this.currentWeather === 'rain' && this.weatherIntensity > 0.7) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 8 + Math.random() * 15;
        this.isLightning = true;
      }
    }
  }

  public setWeather(weather: WeatherType): void {
    this.currentWeather = weather;
    if (weather === 'clear') {
      this.targetIntensity = 0.0;
    } else if (weather === 'cloudy') {
      this.targetIntensity = 0.45;
    } else if (weather === 'rain') {
      this.targetIntensity = 1.0;
    }
  }

  private pickRandomWeather(): void {
    const roll = Math.random();
    if (roll < 0.55) {
      this.setWeather('clear');
    } else if (roll < 0.82) {
      this.setWeather('cloudy');
    } else {
      this.setWeather('rain');
    }
  }
}
