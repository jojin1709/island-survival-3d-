# Asset guide

The current build generates the island, foliage, rocks, tools, resources and character from Three.js geometry. This keeps the prototype self-contained and deployable without external asset licensing.

If replacing procedural meshes later, use:
- `public/assets/models/*.glb` for licensed models
- `public/assets/textures/*` for CC0/licensed textures
- `public/audio/*` for original/CC0 sound effects

Recommended optimization targets for browser WebGL:
- GLB + Draco/Meshopt compression
- 1K textures for small props, 2K for hero assets
- Reuse materials and geometries
- Keep draw calls low
- Prefer baked/vertex AO for small props
