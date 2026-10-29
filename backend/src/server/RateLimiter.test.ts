import { describe, expect, it } from 'vitest';
import { RateLimiter } from './RateLimiter';

describe('RateLimiter', () => {
  it('admite mensajes hasta el límite dentro de la ventana', () => {
    const limiter = new RateLimiter(3, 1000, () => 0);
    expect([limiter.allow(), limiter.allow(), limiter.allow()]).toEqual([true, true, true]);
    expect(limiter.allow()).toBe(false);
  });

  it('vuelve a admitir mensajes cuando empieza otra ventana', () => {
    let time = 0;
    const limiter = new RateLimiter(1, 1000, () => time);
    expect(limiter.allow()).toBe(true);
    expect(limiter.allow()).toBe(false);

    time = 1000;
    expect(limiter.allow()).toBe(true);
  });
});
