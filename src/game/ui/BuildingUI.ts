export class BuildingUI {
  private guideEl!: HTMLElement;

  public init(): void {
    this.guideEl = document.querySelector('#buildingGuide')!;
  }

  public show(buildingName: string): void {
    if (!this.guideEl) return;
    this.guideEl.innerHTML = `
      <div class="build-guide-card">
        <div class="build-title">🔨 PLACEMENT MODE: <strong>${buildingName}</strong></div>
        <div class="build-hints">
          <span><kbd>R</kbd> Rotate 45°</span>
          <span><kbd>Left Click</kbd> Confirm Placement</span>
          <span><kbd>ESC</kbd> Cancel</span>
        </div>
      </div>
    `;
    this.guideEl.classList.remove('hidden');
  }

  public hide(): void {
    if (this.guideEl) {
      this.guideEl.classList.add('hidden');
    }
  }
}
