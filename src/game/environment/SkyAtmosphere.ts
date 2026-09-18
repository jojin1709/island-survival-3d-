import * as THREE from 'three';

export class SkyAtmosphere {
  public sunLight!: THREE.DirectionalLight;
  public hemiLight!: THREE.HemisphereLight;
  public skyDome!: THREE.Mesh;
  public starPoints!: THREE.Points;
  public cloudGroup!: THREE.Group;
  private skyMaterial!: THREE.ShaderMaterial;

  public create(scene: THREE.Scene): void {
    // 1. Sun Directional Light with soft PCF shadows and normalBias
    this.sunLight = new THREE.DirectionalLight(0xfffaea, 2.5);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 1.0;
    this.sunLight.shadow.camera.far = 240.0;
    this.sunLight.shadow.camera.left = -70.0;
    this.sunLight.shadow.camera.right = 70.0;
    this.sunLight.shadow.camera.top = 70.0;
    this.sunLight.shadow.camera.bottom = -70.0;
    this.sunLight.shadow.bias = -0.0001;
    this.sunLight.shadow.normalBias = 0.06; // Crucial: eliminates shadow acne on trunks and rocks
    scene.add(this.sunLight);
    scene.add(this.sunLight.target);

    // 2. Hemisphere Ambient Light (Warm sky / Ground bounce)
    this.hemiLight = new THREE.HemisphereLight(0xdcf2ff, 0x5a4836, 1.4);
    scene.add(this.hemiLight);

    // 3. Dynamic Atmospheric Sky Dome
    const skyGeo = new THREE.SphereGeometry(450, 32, 24);
    const uniforms = {
      uZenithColor: { value: new THREE.Color(0x2d68c4) },
      uHorizonColor: { value: new THREE.Color(0x8bc0d0) },
      uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
      uSunColor: { value: new THREE.Color(0xfff5dd) },
      uDaylight: { value: 1.0 }
    };

    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const fragmentShader = `
      uniform vec3 uZenithColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunDirection;
      uniform vec3 uSunColor;
      uniform float uDaylight;
      varying vec3 vWorldPosition;

      void main() {
        vec3 dir = normalize(vWorldPosition);
        float h = max(0.0, dir.y);

        // Sky gradient
        vec3 sky = mix(uHorizonColor, uZenithColor, pow(h, 0.65));

        // Sun disc and golden atmospheric halo
        float sunDot = max(0.0, dot(dir, normalize(uSunDirection)));
        float sunDisc = smoothstep(0.9985, 0.9998, sunDot);
        float sunGlow = pow(sunDot, 16.0) * 0.45 * uDaylight;

        vec3 col = sky + uSunColor * (sunDisc * 2.5 + sunGlow);
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.skyDome = new THREE.Mesh(skyGeo, this.skyMaterial);
    scene.add(this.skyDome);

    // 4. Star Field for Nighttime
    const starCount = 1800;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 420;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = Math.abs(r * Math.cos(phi)) + 15;
      const z = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3] = x;
      starPos[i * 3 + 1] = y;
      starPos[i * 3 + 2] = z;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.8,
      transparent: true,
      opacity: 0.0
    });
    this.starPoints = new THREE.Points(starGeo, starMat);
    scene.add(this.starPoints);

    // 5. Volumetric Cloud Layer
    this.cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    });

    for (let c = 0; c < 24; c++) {
      const cloudPuff = new THREE.Group();
      const puffCount = 5 + Math.floor(Math.random() * 4);
      for (let p = 0; p < puffCount; p++) {
        const rad = 6 + Math.random() * 8;
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(rad, 8, 6), cloudMat);
        sphere.position.set(
          (Math.random() - 0.5) * 22,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 22
        );
        sphere.scale.y = 0.45;
        cloudPuff.add(sphere);
      }
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 150;
      cloudPuff.position.set(Math.cos(angle) * dist, 48 + Math.random() * 25, Math.sin(angle) * dist);
      this.cloudGroup.add(cloudPuff);
    }
    scene.add(this.cloudGroup);

    console.log('[SkyAtmosphere] Sky atmosphere and shadow lighting configured');
  }

  public update(
    timeOfDay: number,
    weatherFactor: number,
    dt: number,
    playerPos: THREE.Vector3 = new THREE.Vector3()
  ): {
    sunDirection: THREE.Vector3;
    sunColor: THREE.Color;
    ambientColor: THREE.Color;
    fogColor: THREE.Color;
    daylight: number;
  } {
    const angle = (timeOfDay - 0.25) * Math.PI * 2;
    const sunY = Math.sin(angle);
    const sunX = Math.cos(angle) * 0.85;
    const sunZ = Math.sin(angle * 0.5) * 0.4;

    const sunDir = new THREE.Vector3(sunX, Math.max(0.05, sunY), sunZ).normalize();
    const daylight = Math.max(0, Math.min(1, (sunY + 0.15) / 1.05));

    // Position sun shadow camera relative to player
    this.sunLight.position.copy(playerPos).addScaledVector(sunDir, 110);
    this.sunLight.target.position.copy(playerPos);

    const isSunset = Math.abs(sunY) < 0.35 && daylight > 0.1;
    const sunColor = new THREE.Color();
    const zenithColor = new THREE.Color();
    const horizonColor = new THREE.Color();
    const fogColor = new THREE.Color();
    const ambientColor = new THREE.Color();

    if (daylight > 0.05) {
      if (isSunset) {
        sunColor.setHSL(0.08, 0.95, 0.70);
        zenithColor.setHSL(0.62, 0.55, 0.35);
        horizonColor.setHSL(0.06, 0.85, 0.60);
        fogColor.setHSL(0.07, 0.65, 0.55);
        ambientColor.setHSL(0.08, 0.45, 0.40);
      } else {
        sunColor.setHSL(0.12, 0.40, 0.95);
        zenithColor.setHSL(0.58, 0.70, 0.55);
        horizonColor.setHSL(0.52, 0.55, 0.75);
        fogColor.setHSL(0.52, 0.40, 0.75);
        ambientColor.setHSL(0.55, 0.35, 0.52);
      }
    } else {
      sunColor.setHSL(0.60, 0.55, 0.12);
      zenithColor.setHSL(0.65, 0.85, 0.05);
      horizonColor.setHSL(0.62, 0.65, 0.12);
      fogColor.setHSL(0.65, 0.55, 0.08);
      ambientColor.setHSL(0.65, 0.45, 0.18);
    }

    if (weatherFactor > 0.1) {
      const stormColor = new THREE.Color(0x404850);
      sunColor.lerp(stormColor, weatherFactor * 0.75);
      zenithColor.lerp(stormColor, weatherFactor * 0.8);
      horizonColor.lerp(stormColor, weatherFactor * 0.8);
      fogColor.lerp(stormColor, weatherFactor * 0.85);
      ambientColor.lerp(stormColor, weatherFactor * 0.6);
    }

    this.sunLight.color.copy(sunColor);
    this.sunLight.intensity = (0.35 + 2.5 * daylight) * (1.0 - weatherFactor * 0.6);

    this.hemiLight.color.copy(zenithColor);
    this.hemiLight.groundColor.copy(ambientColor);
    this.hemiLight.intensity = (0.45 + 1.25 * daylight) * (1.0 - weatherFactor * 0.35);

    if (this.skyMaterial && this.skyMaterial.uniforms) {
      this.skyMaterial.uniforms.uZenithColor.value.copy(zenithColor);
      this.skyMaterial.uniforms.uHorizonColor.value.copy(horizonColor);
      this.skyMaterial.uniforms.uSunDirection.value.copy(sunDir);
      this.skyMaterial.uniforms.uSunColor.value.copy(sunColor);
      this.skyMaterial.uniforms.uDaylight.value = daylight;
    }

    if (this.starPoints) {
      const starMat = this.starPoints.material as THREE.PointsMaterial;
      starMat.opacity = Math.max(0, (1.0 - daylight * 2.0) * (1.0 - weatherFactor));
    }

    if (this.cloudGroup) {
      this.cloudGroup.rotation.y += dt * 0.008;
    }

    return { sunDirection: sunDir, sunColor, ambientColor, fogColor, daylight };
  }
}
