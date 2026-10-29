/** Limita cuántos mensajes admite una conexión por ventana de tiempo. */
export class RateLimiter {
  private windowStart = 0;
  private count = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Registra un mensaje y dice si cabe dentro del límite. */
  allow(): boolean {
    const time = this.now();
    if (time - this.windowStart >= this.windowMs) {
      this.windowStart = time;
      this.count = 0;
    }
    this.count += 1;
    return this.count <= this.limit;
  }
}
