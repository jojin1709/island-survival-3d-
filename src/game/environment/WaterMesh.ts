import * as THREE from 'three';

export class WaterMesh {
  public oceanMesh!: THREE.Mesh;
  public lagoonMesh!: THREE.Mesh;
  public material!: THREE.ShaderMaterial;
  public lagoonMaterial!: THREE.ShaderMaterial;

  public create(scene: THREE.Scene): void {
    const uniforms = {
      uTime: { value: 0 },
      uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
      uSunColor: { value: new THREE.Color(0xffffff) },
      uDeepColor: { value: new THREE.Color(0x0a2f4a) },
      uShallowColor: { value: new THREE.Color(0x1fa2a6) },
      uFoamColor: { value: new THREE.Color(0xffffff) },
      uFogColor: { value: new THREE.Color(0x8bc0d0) },
      uFogDensity: { value: 0.007 },
      uIsFreshwater: { value: 0.0 }
    };

    const vertexShader = `
      uniform float uTime;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vec3 p = position;

        // Trochoidal wave displacement
        float w1 = sin(p.x * 0.18 + uTime * 1.6) * cos(p.z * 0.14 + uTime * 1.2) * 0.22;
        float w2 = sin((p.x + p.z) * 0.35 - uTime * 2.1) * 0.12;
        float w3 = cos(p.x * 0.65 - p.z * 0.52 + uTime * 2.8) * 0.06;
        p.y += w1 + w2 + w3;

        // Wave normal calculation
        float dx = cos(p.x * 0.18 + uTime * 1.6) * 0.18 * 0.22;
        float dz = -sin(p.z * 0.14 + uTime * 1.2) * 0.14 * 0.22;
        vec3 waveNormal = normalize(vec3(-dx, 1.0, -dz));

        vNormal = normalize(normalMatrix * waveNormal);
        vec4 worldPos = modelMatrix * vec4(p, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform vec3 uSunDirection;
      uniform vec3 uSunColor;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uFoamColor;
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      uniform float uIsFreshwater;

      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec2 vUv;

      void main() {
        vec3 V = normalize(cameraPosition - vWorldPosition);
        vec3 N = normalize(vNormal);
        vec3 L = normalize(uSunDirection);

        // Fresnel approximation (water R0 = 0.02)
        float NdotV = max(dot(N, V), 0.0);
        float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 4.0);

        // Specular highlight from sun
        vec3 H = normalize(L + V);
        float NdotH = max(dot(N, H), 0.0);
        float specular = pow(NdotH, 128.0) * 1.8;

        // Micro-surface ripple noise
        float ripple = sin(vWorldPosition.x * 12.0 + uTime * 3.0) * sin(vWorldPosition.z * 12.0 - uTime * 2.5) * 0.5 + 0.5;
        
        // Shoreline distance from island center (R ~ 88m)
        float distToCenter = length(vWorldPosition.xz);
        float shoreFactor = smoothstep(68.0, 92.0, distToCenter);
        
        // Water color blending: shallow turquoise to deep ocean navy
        vec3 waterColor = mix(uShallowColor, uDeepColor, shoreFactor);
        if (uIsFreshwater > 0.5) {
          waterColor = mix(vec3(0.08, 0.42, 0.38), vec3(0.02, 0.24, 0.22), shoreFactor);
        }

        // Shore foam line around the island
        float foamLine = sin(vWorldPosition.x * 35.0 + uTime * 4.0) * cos(vWorldPosition.z * 35.0 - uTime * 3.0);
        float foamMask = smoothstep(84.0, 89.0, distToCenter) * (1.0 - smoothstep(89.0, 93.0, distToCenter));
        vec3 finalColor = mix(waterColor, uFoamColor, foamMask * clamp(foamLine * 0.5 + 0.5, 0.0, 0.8));

        // Add specular and ambient sky reflection
        finalColor += uSunColor * specular + vec3(0.04, 0.08, 0.12) * fresnel;

        // Distance fog
        float dist = length(vWorldPosition - cameraPosition);
        float fogFactor = 1.0 - exp(-dist * uFogDensity);
        finalColor = mix(finalColor, uFogColor, clamp(fogFactor, 0.0, 1.0));

        gl_FragColor = vec4(finalColor, 0.88);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // Ocean disk: 360m radius
    const oceanGeo = new THREE.CircleGeometry(360, 96);
    oceanGeo.rotateX(-Math.PI / 2);
    this.oceanMesh = new THREE.Mesh(oceanGeo, this.material);
    this.oceanMesh.position.y = 0.0;
    this.oceanMesh.name = 'OceanMesh';
    this.oceanMesh.renderOrder = 1;
    scene.add(this.oceanMesh);

    // Freshwater lagoon pond disk at (32, -8, y = 0.6)
    const lagoonGeo = new THREE.CircleGeometry(16, 48);
    lagoonGeo.rotateX(-Math.PI / 2);
    this.lagoonMaterial = this.material.clone();
    this.lagoonMaterial.uniforms.uIsFreshwater.value = 1.0;
    this.lagoonMesh = new THREE.Mesh(lagoonGeo, this.lagoonMaterial);
    this.lagoonMesh.position.set(32, 0.55, -8);
    this.lagoonMesh.name = 'LagoonWaterMesh';
    this.lagoonMesh.renderOrder = 1;
    scene.add(this.lagoonMesh);

    console.log('[WaterMesh] Realistic ocean and freshwater lagoon initialized');
  }

  public update(time: number, sunDir: THREE.Vector3, sunColor: THREE.Color, fogColor: THREE.Color, daylight: number): void {
    if (this.material && this.material.uniforms) {
      this.material.uniforms.uTime.value = time;
      this.material.uniforms.uSunDirection.value.copy(sunDir);
      this.material.uniforms.uSunColor.value.copy(sunColor);
      this.material.uniforms.uFogColor.value.copy(fogColor);

      // Night darkening
      const deepNight = new THREE.Color(0x020d18);
      const deepDay = new THREE.Color(0x0a2f4a);
      const shallowNight = new THREE.Color(0x08262a);
      const shallowDay = new THREE.Color(0x1fa2a6);

      this.material.uniforms.uDeepColor.value.lerpColors(deepNight, deepDay, Math.max(0.1, daylight));
      this.material.uniforms.uShallowColor.value.lerpColors(shallowNight, shallowDay, Math.max(0.1, daylight));

      if (this.lagoonMaterial && this.lagoonMaterial.uniforms) {
        this.lagoonMaterial.uniforms.uTime.value = time;
        this.lagoonMaterial.uniforms.uSunDirection.value.copy(sunDir);
        this.lagoonMaterial.uniforms.uSunColor.value.copy(sunColor);
        this.lagoonMaterial.uniforms.uFogColor.value.copy(fogColor);
      }
    }
  }
}
