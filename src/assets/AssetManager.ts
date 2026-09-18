import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class AssetManager {
  private static instance: AssetManager;
  private gltfLoader = new GLTFLoader();
  private gltfCache = new Map<string, Promise<GLTF>>();
  private proceduralTextures = new Map<string, THREE.CanvasTexture>();

  private constructor() {}

  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  public async loadGLTF(url: string): Promise<GLTF> {
    if (!this.gltfCache.has(url)) {
      const promise = new Promise<GLTF>((resolve, reject) => {
        this.gltfLoader.load(
          url,
          (gltf) => resolve(gltf),
          undefined,
          (error) => {
            console.warn(`[AssetManager] Failed to load GLTF from ${url}:`, error);
            reject(error);
          }
        );
      });
      this.gltfCache.set(url, promise);
    }
    return this.gltfCache.get(url)!;
  }

  public getProceduralTexture(type: 'sand' | 'grass' | 'rock' | 'bark' | 'normal'): THREE.CanvasTexture {
    if (this.proceduralTextures.has(type)) {
      return this.proceduralTextures.get(type)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    if (type === 'sand') {
      // Natural warm golden tropical sand
      ctx.fillStyle = '#dfcf9f';
      ctx.fillRect(0, 0, 512, 512);
      const imgData = ctx.getImageData(0, 0, 512, 512);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const n = (Math.random() - 0.5) * 22;
        data[i] = Math.min(255, Math.max(0, 228 + n));
        data[i + 1] = Math.min(255, Math.max(0, 210 + n * 0.9));
        data[i + 2] = Math.min(255, Math.max(0, 165 + n * 0.7));
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (type === 'grass') {
      // Lush tropical jungle grass
      ctx.fillStyle = '#4a822a';
      ctx.fillRect(0, 0, 512, 512);
      const imgData = ctx.getImageData(0, 0, 512, 512);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const n = (Math.random() - 0.5) * 35;
        data[i] = Math.min(255, Math.max(0, 75 + n * 0.6));
        data[i + 1] = Math.min(255, Math.max(0, 138 + n));
        data[i + 2] = Math.min(255, Math.max(0, 48 + n * 0.5));
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (type === 'rock') {
      // Weathered natural granite stone
      ctx.fillStyle = '#8e928f';
      ctx.fillRect(0, 0, 512, 512);
      const imgData = ctx.getImageData(0, 0, 512, 512);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const n = (Math.random() - 0.5) * 40;
        const v = Math.min(255, Math.max(0, 142 + n));
        data[i] = v;
        data[i + 1] = v + (Math.random() - 0.5) * 6;
        data[i + 2] = v + (Math.random() - 0.5) * 6;
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (type === 'bark') {
      // Natural palm & hardwood tree bark
      ctx.fillStyle = '#7a5a3c';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#543b24';
      ctx.lineWidth = 4;
      for (let x = 0; x < 512; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + (Math.random() - 0.5) * 16, 170, x + (Math.random() - 0.5) * 16, 340, x, 512);
        ctx.stroke();
      }
    } else if (type === 'normal') {
      ctx.fillStyle = 'rgb(128,128,255)';
      ctx.fillRect(0, 0, 512, 512);
      const imgData = ctx.getImageData(0, 0, 512, 512);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 128 + Math.floor((Math.random() - 0.5) * 20);
        data[i + 1] = 128 + Math.floor((Math.random() - 0.5) * 20);
        data[i + 2] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    if (type === 'normal') {
      texture.colorSpace = THREE.NoColorSpace;
    } else {
      texture.colorSpace = THREE.SRGBColorSpace;
    }

    this.proceduralTextures.set(type, texture);
    return texture;
  }
}
