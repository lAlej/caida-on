import { describe, expect, it } from 'vitest';
import { RANKS } from './cards';
import { capturePoints, cardCountThreshold, manosPerBaraja, rankPoints } from './scoring';

describe('rankPoints', () => {
  it('da 1 punto del 1 al 7 y 2, 3 y 4 al 10, 11 y 12', () => {
    expect(RANKS.map(rankPoints)).toEqual([1, 1, 1, 1, 1, 1, 1, 2, 3, 4]);
  });
});

describe('capturePoints', () => {
  it('no da puntos por una captura normal', () => {
    expect(capturePoints({ rank: 5, caida: false, mesaLimpia: false })).toBe(0);
  });

  it('da los puntos de la carta en una caída', () => {
    expect(capturePoints({ rank: 11, caida: true, mesaLimpia: false })).toBe(3);
  });

  it('da 4 por mesa limpia', () => {
    expect(capturePoints({ rank: 5, caida: false, mesaLimpia: true })).toBe(4);
  });

  it('da 5 en total por una caída que limpia la mesa, sin acumular', () => {
    expect(capturePoints({ rank: 12, caida: true, mesaLimpia: true })).toBe(5);
  });
});

describe('cardCountThreshold', () => {
  it.each([2, 3, 4])('reparte las 40 cartas entre %i jugadores', (players) => {
    const total = Array.from({ length: players }, (_, seat) =>
      cardCountThreshold(players, seat === 0),
    ).reduce((sum, value) => sum + value, 0);
    expect(total).toBe(40);
  });

  it('con 3 jugadores el repartidor cuenta hasta 14 y los otros hasta 13', () => {
    expect(cardCountThreshold(3, true)).toBe(14);
    expect(cardCountThreshold(3, false)).toBe(13);
  });
});

describe('manosPerBaraja', () => {
  it('son 6, 4 y 3 manos con 2, 3 y 4 jugadores', () => {
    expect([2, 3, 4].map(manosPerBaraja)).toEqual([6, 4, 3]);
  });
});
