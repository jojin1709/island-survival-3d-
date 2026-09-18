import * as THREE from 'three';
import { AssetManager } from '../../assets/AssetManager';

export function createTerrainMaterial(): THREE.ShaderMaterial {
  const assetManager = AssetManager.getInstance();
  const sandTex = assetManager.getProceduralTexture('sand');
  const grassTex = assetManager.getProceduralTexture('grass');
  const rockTex = assetManager.getProceduralTexture('rock');

  sandTex.repeat.set(24, 24);
  grassTex.repeat.set(28, 28);
  rockTex.repeat.set(20, 20);

  const uniforms = {
    uSandTex: { value: sandTex },
    uGrassTex: { value: grassTex },
    uRockTex: { value: rockTex },
    uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
    uSunColor: { value: new THREE.Color(0xfffaea) },
    uAmbientColor: { value: new THREE.Color(0x5a4836) },
    uFogColor: { value: new THREE.Color(0x8bc0d0) },
    uFogDensity: { value: 0.006 },
    uTime: { value: 0.0 }
  };

  const vertexShader = `
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `;

  const fragmentShader = `
    uniform sampler2D uSandTex;
    uniform sampler2D uGrassTex;
    uniform sampler2D uRockTex;
    uniform vec3 uSunDirection;
    uniform vec3 uSunColor;
    uniform vec3 uAmbientColor;
    uniform vec3 uFogColor;
    uniform float uFogDensity;
    uniform float uTime;

    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;

    void main() {
      float height = vWorldPosition.y;
      vec3 norm = normalize(vNormal);
      float slope = clamp(1.0 - norm.y, 0.0, 1.0);

      // Tri-planar style tiled coordinates
      vec2 uvTiled = vWorldPosition.xz * 0.10;
      vec3 sandCol = texture2D(uSandTex, uvTiled * 1.6).rgb;
      vec3 grassCol = texture2D(uGrassTex, uvTiled * 2.2).rgb;
      vec3 rockCol = texture2D(uRockTex, uvTiled * 1.8).rgb;

      // Wet sand near sea level
      if (height < 0.8) {
        float wetness = clamp(1.0 - (height + 0.3) / 1.1, 0.0, 1.0);
        sandCol = mix(sandCol, sandCol * 0.72, wetness);
      }

      // Height and slope blending
      float grassWeight = smoothstep(1.0, 2.8, height) * (1.0 - smoothstep(14.0, 20.0, height));
      float mountainWeight = smoothstep(14.0, 20.0, height);
      float cliffWeight = smoothstep(0.28, 0.58, slope);

      vec3 baseColor = mix(sandCol, grassCol, grassWeight);
      baseColor = mix(baseColor, rockCol, max(cliffWeight, mountainWeight));

      // Directional diffuse + soft ambient lighting
      float NdotL = max(dot(norm, normalize(uSunDirection)), 0.0);
      vec3 diffuse = uSunColor * (NdotL * 0.95);
      vec3 ambient = uAmbientColor * 1.15;
      vec3 finalColor = baseColor * (diffuse + ambient);

      // Distance atmospheric fog
      float dist = length(vWorldPosition - cameraPosition);
      float fogFactor = 1.0 - exp(-dist * uFogDensity);
      finalColor = mix(finalColor, uFogColor, clamp(fogFactor, 0.0, 1.0));

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.FrontSide
  });

  return mat;
}
