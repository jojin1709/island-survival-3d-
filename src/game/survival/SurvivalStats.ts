export class SurvivalStats {
  public health = 100;
  public hunger = 100;
  public thirst = 100;
  public stamina = 100;
  public oxygen = 100;
  public maxHealth = 100;
  public maxHunger = 100;
  public maxThirst = 100;
  public maxStamina = 100;
  public maxOxygen = 100;

  // Depletion and regeneration rates per second
  public hungerRate = 0.08;
  public thirstRate = 0.12;
  public staminaRegenRate = 18.0;
  public oxygenDepletionRate = 4.0; // ~25 seconds of breath underwater
  public oxygenRegenRate = 35.0;     // rapid lung refill on surface

  public update(dt: number, isSprinting: boolean, staminaUsed: number, isDiving = false): void {
    // Deplete hunger & thirst
    this.hunger = Math.max(0, this.hunger - this.hungerRate * dt);
    this.thirst = Math.max(0, this.thirst - this.thirstRate * dt);

    // Oxygen depletion / recovery
    if (isDiving) {
      this.oxygen = Math.max(0, this.oxygen - this.oxygenDepletionRate * dt);
      if (this.oxygen <= 0) {
        // Drowning damage
        this.health = Math.max(0, this.health - 6.5 * dt);
      }
    } else {
      this.oxygen = Math.min(this.maxOxygen, this.oxygen + this.oxygenRegenRate * dt);
    }

    // Stamina depletion / recovery
    if (isSprinting || staminaUsed > 0) {
      this.stamina = Math.max(0, this.stamina - staminaUsed);
    } else {
      const regenMultiplier = this.thirst < 15 || this.hunger < 15 ? 0.4 : 1.0;
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegenRate * regenMultiplier * dt);
    }

    // Health starvation / dehydration damage
    if (this.hunger <= 0 || this.thirst <= 0) {
      const damageRate = (this.hunger <= 0 ? 0.6 : 0) + (this.thirst <= 0 ? 0.8 : 0);
      this.health = Math.max(0, this.health - damageRate * dt);
    } else if (this.hunger > 75 && this.thirst > 75 && this.health < this.maxHealth && this.oxygen > 50) {
      // Natural health healing when well nourished
      this.health = Math.min(this.maxHealth, this.health + 0.35 * dt);
    }
  }

  public eat(amountHunger: number, amountHealth = 0): void {
    this.hunger = Math.min(this.maxHunger, this.hunger + amountHunger);
    this.health = Math.min(this.maxHealth, this.health + amountHealth);
  }

  public drink(amountThirst: number): void {
    this.thirst = Math.min(this.maxThirst, this.thirst + amountThirst);
  }

  public restoreAll(): void {
    this.health = 100;
    this.hunger = 100;
    this.thirst = 100;
    this.stamina = 100;
    this.oxygen = 100;
  }
}
