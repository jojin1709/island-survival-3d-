import * as THREE from 'three';
import './style.css';
import { PhysicsWorld } from './game/physics/PhysicsWorld';
import { TerrainGenerator } from './game/terrain/TerrainGenerator';
import { WaterMesh } from './game/environment/WaterMesh';
import { SkyAtmosphere } from './game/environment/SkyAtmosphere';
import { VegetationManager } from './game/environment/VegetationManager';
import { RockManager } from './game/environment/RockManager';
import { PropManager } from './game/environment/PropManager';
import { HumanSurvivorModel } from './game/player/HumanSurvivorModel';
import { CharacterController } from './game/player/CharacterController';
import { ThirdPersonCamera } from './game/camera/ThirdPersonCamera';
import { SurvivalStats } from './game/survival/SurvivalStats';
import { InventoryManager } from './game/inventory/InventoryManager';
import { CraftingManager } from './game/crafting/CraftingManager';
import { BuildingManager } from './game/building/BuildingManager';
import { BuildingPlacer } from './game/building/BuildingPlacer';
import { InteractionManager } from './game/interaction/InteractionManager';
import { DayNightCycle } from './game/time/DayNightCycle';
import { WeatherManager } from './game/weather/WeatherManager';
import { SynthesizedAudio } from './game/audio/SynthesizedAudio';
import { SaveManager } from './game/save/SaveManager';
import { UIManager } from './game/ui/UIManager';
import { getZoneAtPosition } from './game/world/IslandZones';
import { ITEM_REGISTRY } from './game/inventory/ItemRegistry';
import { ToolVisualManager } from './game/player/ToolVisualManager';
import { ParticleFX } from './game/environment/ParticleFX';
import { WildlifeManager } from './game/environment/WildlifeManager';

// Setup HTML DOM Root
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <canvas id="game"></canvas>
  <div id="hudContainer">
    <!-- Top Compass Tape -->
    <div class="compass-wrapper">
      <div class="compass-center-indicator"></div>
      <div class="compass-tape" id="compassTape">
        <span class="cardinal">N</span>
        <span>NE</span>
        <span class="cardinal">E</span>
        <span>SE</span>
        <span class="cardinal">S</span>
        <span>SW</span>
        <span class="cardinal">W</span>
        <span>NW</span>
        <span class="cardinal">N</span>
        <span>NE</span>
        <span class="cardinal">E</span>
        <span>SE</span>
        <span class="cardinal">S</span>
        <span>SW</span>
        <span class="cardinal">W</span>
        <span>NW</span>
      </div>
    </div>

    <!-- Top Right Time & Zone -->
    <div class="top-right-widget">
      <div class="time-card">
        <span class="clock" id="hudClock">07:30</span>
        <span class="divider"></span>
        <span id="hudDay">DAY 1</span>
        <span class="divider"></span>
        <span id="hudWeather">☀️ CLEAR</span>
      </div>
      <div class="zone-badge" id="hudZone">Survivor Beach</div>
    </div>

    <!-- Center Reticle & Prompt -->
    <div id="crosshair"></div>
    <div id="interactionPrompt"></div>

    <!-- Building Guide -->
    <div id="buildingGuide" class="hidden"></div>

    <!-- Bottom Left Survival Meters -->
    <div class="survival-meters">
      <div class="meter-row">
        <span class="meter-icon">❤️</span>
        <div class="meter-track"><div class="meter-fill health" id="healthFill"></div></div>
      </div>
      <div class="meter-row">
        <span class="meter-icon">🍖</span>
        <div class="meter-track"><div class="meter-fill hunger" id="hungerFill"></div></div>
      </div>
      <div class="meter-row">
        <span class="meter-icon">💧</span>
        <div class="meter-track"><div class="meter-fill thirst" id="thirstFill"></div></div>
      </div>
      <div class="meter-row">
        <span class="meter-icon">⚡</span>
        <div class="meter-track"><div class="meter-fill stamina" id="staminaFill"></div></div>
      </div>
      <div class="meter-row" id="oxygenRow" style="display: none;">
        <span class="meter-icon">🫁</span>
        <div class="meter-track"><div class="meter-fill oxygen" id="oxygenFill"></div></div>
      </div>
    </div>

    <!-- Bottom Center Hotbar -->
    <div class="hotbar-container" id="hotbar"></div>

    <!-- Developer Watermark Badge -->
    <div class="dev-badge">
      <span style="font-weight: 700; color: #fff;">🏝️ Island Survival 3D</span>
      <span>Developed by <a href="https://github.com/jojin1709" target="_blank" rel="noopener">JOJIN JOHN</a></span>
    </div>

    <!-- F3 Debug Overlay -->
    <div id="debugOverlay" class="hidden">
      <div class="debug-card">
        <h4>🛠️ CONTROLLER DEBUG (F3)</h4>
        <div id="debugText"></div>
      </div>
    </div>
  </div>

  <!-- Toast Notifications -->
  <div id="toastContainer"></div>

  <!-- Inventory Modal -->
  <div id="inventoryModal" class="modal-overlay hidden">
    <div class="panel-card">
      <div class="panel-header">
        <h3>🎒 Survivor Inventory</h3>
        <button class="close-btn" id="closeInvBtn">✕</button>
      </div>
      <div class="panel-body">
        <div class="inv-grid" id="invGrid"></div>
      </div>
      <div class="panel-footer">
        <span id="invWeight">Carrying: 0.0 kg / 45.0 kg</span>
        <span>Click item to use / consume</span>
      </div>
    </div>
  </div>

  <!-- Crafting Modal -->
  <div id="craftingModal" class="modal-overlay hidden">
    <div class="panel-card">
      <div class="panel-header">
        <h3>🔨 Crafting Station</h3>
        <button class="close-btn" id="closeCraftBtn">✕</button>
      </div>
      <div class="panel-body">
        <div class="crafting-list" id="craftingList"></div>
      </div>
      <div class="panel-footer">
        <span>Gather materials from trees, rocks, bushes, and shipwreck debris</span>
      </div>
    </div>
  </div>

  <!-- Start Screen -->
  <div id="startScreen">
    <div class="start-card">
      <h1>ISLAND SURVIVAL</h1>
      <p class="subtitle">Explore. Gather. Craft. Build. Endure the wild.</p>
      <div class="controls-summary">
        <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Camera-Relative Move / Swim</div>
        <div><kbd>Shift</kbd> Sprint / Fast Swim</div>
        <div><kbd>Space</kbd> Jump / Swim Up</div>
        <div><kbd>X</kbd> Dive Down (Water)</div>
        <div><kbd>E</kbd> / <code>Click</code> Gather / Mine / Strike</div>
        <div><kbd>1</kbd>-<kbd>6</kbd> Hotbar Select</div>
        <div><kbd>I</kbd> Inventory</div>
        <div><kbd>C</kbd> Crafting Menu</div>
        <div><kbd>B</kbd> Building Mode</div>
        <div><kbd>F3</kbd> Debug Vectors</div>
      </div>
      <button class="enter-btn" id="enterIslandBtn">ENTER ISLAND</button>
      <div class="developer-credit">
        <span>Crafted with Three.js & Rapier3D by <a href="https://github.com/jojin1709" target="_blank" rel="noopener"><strong>JOJIN JOHN</strong></a></span>
        <span class="copyright">© 2026 JOJIN JOHN • All Rights Reserved</span>
      </div>
    </div>
  </div>
`;

// Three.js Core Renderer & Scene Setup
const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x8bc0d0, 0.006);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 800);
const clock = new THREE.Clock();

// Game Subsystems Initialization
const physicsWorld = PhysicsWorld.getInstance();
const terrain = new TerrainGenerator();
const water = new WaterMesh();
const sky = new SkyAtmosphere();
const vegetation = new VegetationManager();
const rocks = new RockManager();
const props = new PropManager();
const humanModel = new HumanSurvivorModel();
const controller = new CharacterController(humanModel);
const toolVisual = new ToolVisualManager(humanModel);
const particleFX = new ParticleFX();
const wildlife = new WildlifeManager();
const tpCamera = new ThirdPersonCamera(camera);
const survival = new SurvivalStats();
const inventory = new InventoryManager();
const crafting = new CraftingManager();
const buildings = new BuildingManager();
const placer = new BuildingPlacer(buildings);
const interaction = new InteractionManager(vegetation, rocks, props, buildings);
const dayNight = new DayNightCycle();
const weather = new WeatherManager();
const audio = new SynthesizedAudio();
const ui = new UIManager();

let isGameRunning = false;
let isPointerLocked = false;
let autoSaveTimer = 0;
let footstepTimer = 0;

const debugOverlayEl = document.querySelector('#debugOverlay')!;
const debugTextEl = document.querySelector('#debugText')!;

async function bootstrap() {
  console.log('[Game] Bootstrapping Island Survival...');
  
  // 1. Initialize Rapier3D Physics
  await physicsWorld.init();

  // 2. Generate Island Terrain
  terrain.generate(scene);

  // 3. Create Ocean, Lagoon & Sky
  water.create(scene);
  sky.create(scene);
  weather.create(scene);

  // 4. Create Biomes, Flora, Rocks & Props
  vegetation.create(scene);
  rocks.create(scene);
  props.create(scene);
  buildings.create(scene);
  wildlife.create(scene);
  particleFX.init(scene);

  // 5. Load Rigged Human Survivor Model & Physics
  await humanModel.load();
  toolVisual.init();

  // Load saved state if exists
  const savedState = SaveManager.loadGame();
  let spawnPos = new THREE.Vector3(0, 5, 48); // Survivor Beach

  if (savedState) {
    spawnPos.set(savedState.player.position[0], savedState.player.position[1], savedState.player.position[2]);
    controller.facingRotation = savedState.player.rotation || 0;
    survival.health = savedState.survival.health ?? 100;
    survival.hunger = savedState.survival.hunger ?? 100;
    survival.thirst = savedState.survival.thirst ?? 100;
    survival.stamina = savedState.survival.stamina ?? 100;
    survival.oxygen = 100;
    inventory.slots = savedState.inventory.slots || inventory.slots;
    inventory.selectedHotbarIndex = savedState.inventory.selectedHotbarIndex || 0;
    dayNight.setTime(savedState.time.timeOfDay ?? 0.3, savedState.time.day ?? 1);

    if (savedState.buildings) {
      for (const b of savedState.buildings) {
        buildings.place(b.type, new THREE.Vector3(b.position[0], b.position[1], b.position[2]), b.rotation);
      }
    }
    console.log('[Game] Restored save game state');
  }

  controller.init(scene, spawnPos);
  toolVisual.updateEquippedTool(inventory);
  
  // Update camera initial position anchored on player's CameraTarget
  const targetPos = new THREE.Vector3();
  humanModel.cameraTarget.getWorldPosition(targetPos);
  tpCamera.update(targetPos, 0.016);

  // 6. UI Initialization
  ui.init(
    () => {
      isGameRunning = true;
      audio.init();
      audio.resume();
      canvas.requestPointerLock();
    },
    (slotIndex) => {
      const res = inventory.useSlot(slotIndex, survival);
      if (res.used && res.message) {
        ui.toastUI.show(res.message);
        ui.inventoryUI.render(inventory);
      }
    },
    (recipe) => {
      const res = crafting.craft(recipe, inventory);
      ui.toastUI.show(res.message);
      if (res.success) {
        audio.playCraft();
        ui.craftingUI.render(crafting, inventory);
        ui.inventoryUI.render(inventory);
      }
    }
  );

  setupInputListeners();
  animate();
}

function setupInputListeners(): void {
  canvas.addEventListener('click', () => {
    if (isGameRunning && !ui.isAnyModalOpen()) {
      canvas.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === canvas;
  });

  document.addEventListener('mousemove', (e) => {
    if (isPointerLocked) {
      tpCamera.handleMouseMove(e.movementX, e.movementY);
    }
  });

  document.addEventListener('wheel', (e) => {
    if (isPointerLocked) {
      tpCamera.handleMouseWheel(e.deltaY);
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (!isPointerLocked) return;

    if (e.button === 0) {
      if (placer.isPlacing) {
        const placed = placer.confirmPlacement(scene, inventory);
        if (placed) {
          ui.toastUI.show('Structure placed successfully!');
          ui.buildingUI.hide();
          audio.playMine();
        } else {
          ui.toastUI.show('Cannot place structure here.');
        }
      } else {
        // Attack / Harvest Swing
        toolVisual.triggerSwing();

        // Perform interaction if looking directly at a resource
        if (interaction.currentTarget) {
          const res = interaction.interact(inventory, survival);
          if (res.success && res.message) {
            ui.toastUI.show(res.message);
            if (res.hitPosition) {
              particleFX.spawnImpact(
                res.hitPosition,
                res.soundEffect === 'chop' ? 'wood' : res.soundEffect === 'mine' ? 'stone' : 'water'
              );
            }
            if (res.soundEffect === 'chop') audio.playChop();
            else if (res.soundEffect === 'mine') audio.playMine();
            else if (res.soundEffect === 'gather') audio.playFootstep('grass');
            else if (res.soundEffect === 'water') audio.playFootstep('water');
          }
        }
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if (!isGameRunning) return;

    if (e.code === 'KeyW') controller.input.forward = 1;
    if (e.code === 'KeyS') controller.input.forward = -1;
    if (e.code === 'KeyD') controller.input.right = 1;
    if (e.code === 'KeyA') controller.input.right = -1;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') controller.input.sprint = true;
    if (e.code === 'Space') controller.input.jump = true;
    if (e.code === 'KeyX' || e.code === 'ControlLeft') controller.input.dive = true;

    // F3 Debug Toggle
    if (e.code === 'F3') {
      const isDebug = controller.toggleDebug();
      debugOverlayEl.classList.toggle('hidden', !isDebug);
      ui.toastUI.show(`Debug Mode: ${isDebug ? 'ON' : 'OFF'}`);
    }

    // Hotbar 1-6
    if (e.code.startsWith('Digit')) {
      const num = parseInt(e.code.replace('Digit', ''), 10);
      if (num >= 1 && num <= 6) {
        inventory.selectedHotbarIndex = num - 1;
        toolVisual.updateEquippedTool(inventory);
        audio.playUIClick();
      }
    }

    // Interaction Key E
    if (e.code === 'KeyE') {
      toolVisual.triggerSwing();
      const res = interaction.interact(inventory, survival);
      if (res.success && res.message) {
        ui.toastUI.show(res.message);
        if (res.hitPosition) {
          particleFX.spawnImpact(
            res.hitPosition,
            res.soundEffect === 'chop' ? 'wood' : res.soundEffect === 'mine' ? 'stone' : 'water'
          );
        }
        if (res.soundEffect === 'chop') audio.playChop();
        else if (res.soundEffect === 'mine') audio.playMine();
        else if (res.soundEffect === 'gather') audio.playFootstep('grass');
        else if (res.soundEffect === 'water') audio.playFootstep('water');
      }
    }

    // Building Placement Rotate (R)
    if (e.code === 'KeyR' && placer.isPlacing) {
      placer.rotate();
      audio.playUIClick();
    }

    // Toggle Building Mode (B)
    if (e.code === 'KeyB') {
      const selectedItem = inventory.getSelectedItem();
      if (selectedItem && selectedItem.category === 'structure') {
        if (placer.isPlacing) {
          placer.cancelPlacement(scene);
          ui.buildingUI.hide();
        } else {
          placer.startPlacement(scene, selectedItem.id);
          ui.buildingUI.show(selectedItem.name);
        }
      } else {
        const structSlot = inventory.slots.find((s) => s && ITEM_REGISTRY[s.itemId]?.category === 'structure');
        if (structSlot) {
          const itemDef = ITEM_REGISTRY[structSlot.itemId];
          placer.startPlacement(scene, structSlot.itemId);
          ui.buildingUI.show(itemDef.name);
        } else {
          ui.toastUI.show('Craft a Campfire or Shelter first (Press C)');
        }
      }
    }

    // Toggle Inventory (I)
    if (e.code === 'KeyI') {
      if (placer.isPlacing) placer.cancelPlacement(scene);
      ui.inventoryUI.toggle(inventory);
      if (ui.inventoryUI.isVisible) document.exitPointerLock();
      else if (!ui.craftingUI.isVisible) canvas.requestPointerLock();
      audio.playUIClick();
    }

    // Toggle Crafting (C)
    if (e.code === 'KeyC') {
      if (placer.isPlacing) placer.cancelPlacement(scene);
      ui.craftingUI.toggle(crafting, inventory);
      if (ui.craftingUI.isVisible) document.exitPointerLock();
      else if (!ui.inventoryUI.isVisible) canvas.requestPointerLock();
      audio.playUIClick();
    }

    // Escape
    if (e.code === 'Escape') {
      if (placer.isPlacing) {
        placer.cancelPlacement(scene);
        ui.buildingUI.hide();
      }
      ui.closeAllModals();
      document.exitPointerLock();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW' && controller.input.forward === 1) controller.input.forward = 0;
    if (e.code === 'KeyS' && controller.input.forward === -1) controller.input.forward = 0;
    if (e.code === 'KeyD' && controller.input.right === 1) controller.input.right = 0;
    if (e.code === 'KeyA' && controller.input.right === -1) controller.input.right = 0;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') controller.input.sprint = false;
    if (e.code === 'KeyX' || e.code === 'ControlLeft') controller.input.dive = false;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function animate(): void {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsedTime = clock.getElapsedTime();

  if (isGameRunning) {
    // 1. Step Physics
    physicsWorld.step(dt);

    // 2. Update Player Movement, Swimming & Animations
    const moveResult = controller.update(dt, tpCamera, survival.stamina, elapsedTime);

    // 3. Update Camera smoothly anchored on player's CameraTarget
    const targetPos = new THREE.Vector3();
    humanModel.cameraTarget.getWorldPosition(targetPos);
    tpCamera.update(targetPos, dt);

    // 4. Update Time of Day & Weather
    dayNight.update(dt);
    weather.update(dt, controller.position);

    // 5. Update Sky & Lighting centered around player
    const skyLighting = sky.update(dayNight.timeOfDay, weather.weatherIntensity, dt, controller.position);

    // Check underwater camera fog
    if (camera.position.y < -0.1) {
      scene.fog!.color.set(0x0a3854);
      (scene.fog as THREE.FogExp2).density = 0.04;
    } else {
      scene.fog!.color.copy(skyLighting.fogColor);
      (scene.fog as THREE.FogExp2).density = 0.006;
    }

    // 6. Update Terrain & Water Shaders
    terrain.update(
      elapsedTime,
      skyLighting.sunDirection,
      skyLighting.sunColor,
      skyLighting.ambientColor,
      skyLighting.fogColor
    );
    water.update(
      elapsedTime,
      skyLighting.sunDirection,
      skyLighting.sunColor,
      skyLighting.fogColor,
      skyLighting.daylight
    );

    // 7. Update Survival Stats & Diving
    survival.update(dt, controller.isSprinting, moveResult.staminaUsed, moveResult.waterState === 'DIVING');

    if (survival.health <= 0) {
      ui.toastUI.show('You collapsed from exhaustion! Waking at the beach...');
      survival.restoreAll();
      const spawnH = TerrainGenerator.sampleHeight(0, 48) + 2.0;
      controller.body.setTranslation({ x: 0, y: spawnH, z: 48 }, true);
      controller.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    // 8. Update Tools, Wildlife, Particles, and Interaction Target
    toolVisual.update(dt, elapsedTime);
    wildlife.update(dt, controller.position, elapsedTime);
    particleFX.update(dt);
    interaction.update(controller.position, camera);

    // 9. Update Building Ghost Placement
    if (placer.isPlacing) {
      placer.update(controller.position, tpCamera.yaw);
    }

    // 10. Update Audio Soundscape & Footsteps / Water Splashes
    const distToCenter = Math.hypot(controller.position.x, controller.position.z);
    audio.updateAmbience(distToCenter, skyLighting.daylight < 0.1, weather.weatherIntensity, dt);

    if (moveResult.waterState === 'SWIMMING') {
      footstepTimer -= dt;
      if (footstepTimer <= 0 && (moveResult.state === 'SWIM')) {
        footstepTimer = 0.55;
        audio.playFootstep('water');
      }
    } else if (controller.isGrounded && (moveResult.state === 'WALK' || moveResult.state === 'RUN' || moveResult.state === 'SPRINT')) {
      footstepTimer -= dt;
      if (footstepTimer <= 0) {
        footstepTimer = moveResult.state === 'SPRINT' ? 0.28 : moveResult.state === 'RUN' ? 0.35 : 0.48;
        const currentY = controller.position.y;
        if (currentY < 0.3) {
          audio.playFootstep('water');
        } else if (currentY < 2.2) {
          audio.playFootstep('sand');
        } else {
          audio.playFootstep('grass');
        }
      }
    }

    // 11. Update HUD UI
    const currentZone = getZoneAtPosition(controller.position);
    ui.hud.update(
      survival,
      inventory,
      dayNight,
      weather,
      interaction.currentTarget,
      currentZone,
      tpCamera.yaw
    );

    // 12. Update Debug Text (F3)
    if (controller.isDebugMode && debugTextEl) {
      const camFwd = tpCamera.getHorizontalForward();
      const fwdAngle = (controller.facingRotation * (180 / Math.PI)).toFixed(1);
      debugTextEl.innerHTML = `
        <div><strong>Pos:</strong> (${controller.position.x.toFixed(1)}, ${controller.position.y.toFixed(1)}, ${controller.position.z.toFixed(1)})</div>
        <div><strong>Velocity:</strong> (${controller.velocity.x.toFixed(2)}, ${controller.velocity.y.toFixed(2)}, ${controller.velocity.z.toFixed(2)})</div>
        <div><strong>Cam Forward:</strong> (${camFwd.x.toFixed(2)}, ${camFwd.z.toFixed(2)})</div>
        <div><strong>Move Vec:</strong> (${controller.movementDirection.x.toFixed(2)}, ${controller.movementDirection.z.toFixed(2)})</div>
        <div><strong>Facing Yaw:</strong> ${fwdAngle}°</div>
        <div><strong>Grounded:</strong> ${controller.isGrounded ? 'YES' : 'NO'}</div>
        <div><strong>Water State:</strong> ${moveResult.waterState} (Depth: ${controller.submergedDepth.toFixed(2)}m)</div>
        <div><strong>Anim State:</strong> ${moveResult.state}</div>
        <div style="margin-top:4px; font-size:10px; color:#88ccff;">🔵 Blue: Cam Fwd | 🟢 Green: Player Fwd | 🔴 Red: Movement</div>
      `;
    }

    // 13. Auto Save every 15s
    autoSaveTimer += dt;
    if (autoSaveTimer >= 15.0) {
      autoSaveTimer = 0;
      SaveManager.saveGame(
        controller.position,
        controller.facingRotation,
        survival,
        inventory,
        dayNight,
        buildings
      );
    }
  }

  renderer.render(scene, camera);
}

// Start Game Bootstrapping
bootstrap().catch((err) => {
  console.error('[Game] Fatal initialization error:', err);
});
