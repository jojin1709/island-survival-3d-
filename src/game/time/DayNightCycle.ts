export class DayNightCycle {
  public day = 1;
  public timeOfDay = 0.30; // 07:12 AM start
  public dayDurationSeconds = 480; // 8 minutes per full 24h cycle
  public isPaused = false;

  public update(dt: number): void {
    if (this.isPaused) return;

    const deltaDay = dt / this.dayDurationSeconds;
    this.timeOfDay += deltaDay;

    if (this.timeOfDay >= 1.0) {
      this.timeOfDay -= 1.0;
      this.day++;
    }
  }

  public getFormattedTime(): { timeString: string; hours: number; minutes: number; isNight: boolean } {
    const totalMinutes = Math.floor(this.timeOfDay * 1440);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const isNight = hours < 6 || hours >= 19;
    return { timeString, hours, minutes, isNight };
  }

  public setTime(timeOfDay: number, day: number = 1): void {
    this.timeOfDay = Math.max(0, Math.min(1, timeOfDay));
    this.day = Math.max(1, day);
  }
}
