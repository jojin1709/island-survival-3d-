export class ToastUI {
  private container!: HTMLElement;

  public init(): void {
    this.container = document.querySelector('#toastContainer')!;
  }

  public show(message: string, duration = 2200): void {
    if (!this.container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.innerHTML = message;
    this.container.appendChild(toast);

    // Trigger animate in
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast);
        }
      }, 300);
    }, duration);
  }
}
