import { SurvivalStats } from '../survival/SurvivalStats';
import { InventoryManager } from '../inventory/InventoryManager';
import { ITEM_REGISTRY } from '../inventory/ItemRegistry';
import { DayNightCycle } from '../time/DayNightCycle';
import { WeatherManager } from '../weather/WeatherManager';
import type { InteractionTarget } from '../interaction/InteractionManager';
import type { ZoneDefinition } from '../world/IslandZones';

export class HUD {
  private healthFill!: HTMLElement;
  private hungerFill!: HTMLElement;
  private thirstFill!: HTMLElement;
  private staminaFill!: HTMLElement;
  private hotbarContainer!: HTMLElement;
  private clockEl!: HTMLElement;
  private dayEl!: HTMLElement;
  private weatherEl!: HTMLElement;
  private zoneEl!: HTMLElement;
  private compassTape!: HTMLElement;
  private interactionPrompt!: HTMLElement;
  private crosshairEl!: HTMLElement;

  public init(): void {
    this.healthFill = document.querySelector('#healthFill')!;
    this.hungerFill = document.querySelector('#hungerFill')!;
    this.thirstFill = document.querySelector('#thirstFill')!;
    this.staminaFill = document.querySelector('#staminaFill')!;
    this.hotbarContainer = document.querySelector('#hotbar')!;
    this.clockEl = document.querySelector('#hudClock')!;
    this.dayEl = document.querySelector('#hudDay')!;
    this.weatherEl = document.querySelector('#hudWeather')!;
    this.zoneEl = document.querySelector('#hudZone')!;
    this.compassTape = document.querySelector('#compassTape')!;
    this.interactionPrompt = document.querySelector('#interactionPrompt')!;
    this.crosshairEl = document.querySelector('#crosshair')!;
  }

  public update(
    survival: SurvivalStats,
    inventory: InventoryManager,
    dayNight: DayNightCycle,
    weather: WeatherManager,
    target: InteractionTarget | null,
    currentZone: ZoneDefinition | null,
    cameraYaw: number
  ): void {
    // 1. Survival Status Meters (Bottom-Left)
    if (this.healthFill) this.healthFill.style.width = `${(survival.health / survival.maxHealth) * 100}%`;
    if (this.hungerFill) this.hungerFill.style.width = `${(survival.hunger / survival.maxHunger) * 100}%`;
    if (this.thirstFill) this.thirstFill.style.width = `${(survival.thirst / survival.maxThirst) * 100}%`;
    if (this.staminaFill) this.staminaFill.style.width = `${(survival.stamina / survival.maxStamina) * 100}%`;

    // 2. Hotbar Slots (Bottom-Center)
    if (this.hotbarContainer) {
      let hotbarHtml = '';
      for (let i = 0; i < InventoryManager.HOTBAR_SLOTS; i++) {
        const slot = inventory.slots[i];
        const isSelected = inventory.selectedHotbarIndex === i;
        const itemDef = slot ? ITEM_REGISTRY[slot.itemId] : null;

        hotbarHtml += `
          <div class="hotbar-slot ${isSelected ? 'active' : ''}">
            <span class="slot-num">${i + 1}</span>
            ${itemDef ? `<span class="slot-icon">${itemDef.icon}</span><span class="slot-count">${slot!.count > 1 ? slot!.count : ''}</span>` : ''}
          </div>
        `;
      }
      this.hotbarContainer.innerHTML = hotbarHtml;
    }

    // 3. Time, Day & Weather (Top-Right)
    const timeData = dayNight.getFormattedTime();
    if (this.clockEl) this.clockEl.textContent = timeData.timeString;
    if (this.dayEl) this.dayEl.textContent = `DAY ${dayNight.day}`;
    if (this.weatherEl) {
      const icon = weather.currentWeather === 'clear' ? '☀️ CLEAR' : weather.currentWeather === 'cloudy' ? '☁️ OVERCAST' : '🌧️ RAINSTORM';
      this.weatherEl.textContent = icon;
    }
    if (this.zoneEl) {
      this.zoneEl.textContent = currentZone ? currentZone.name : 'Unknown Biome';
    }

    // 4. Compass Bearing Tape (Top-Center)
    if (this.compassTape) {
      // Normalize yaw to degrees (0 to 360)
      let deg = ((cameraYaw * (180 / Math.PI)) % 360 + 360) % 360;
      // Offset compass tape position
      this.compassTape.style.transform = `translateX(-${(deg / 360) * 800}px)`;
    }

    // 5. Interaction Prompt (Center)
    if (this.interactionPrompt) {
      if (target) {
        this.interactionPrompt.innerHTML = `<span class="key-badge">E</span> ${target.prompt}`;
        this.interactionPrompt.classList.add('visible');
      } else {
        this.interactionPrompt.classList.remove('visible');
      }
    }
  }
}
