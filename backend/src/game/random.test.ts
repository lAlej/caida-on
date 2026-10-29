import { DECK_SIZE, cardKey, createDeck } from '@caida/shared';
import { describe, expect, it } from 'vitest';
import { createSeededRandom, pickOne, shuffle } from './random';

describe('createSeededRandom', () => {
  it('produce la misma secuencia con la misma semilla', () => {
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b));
  });

  it('produce secuencias distintas con semillas distintas', () => {
    expect(createSeededRandom(1)()).not.toBe(createSeededRandom(2)());
  });

  it('siempre devuelve valores en [0, 1)', () => {
    const random = createSeededRandom(7);
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  it('conserva las 40 cartas distintas de la baraja', () => {
    const shuffled = shuffle(createDeck(), createSeededRandom(3));
    expect(shuffled).toHaveLength(DECK_SIZE);
    expect(new Set(shuffled.map(cardKey)).size).toBe(DECK_SIZE);
  });

  it('da siempre la misma mezcla con la misma semilla', () => {
    const deck = createDeck();
    expect(shuffle(deck, createSeededRandom(9))).toEqual(shuffle(deck, createSeededRandom(9)));
  });

  it('realmente cambia el orden', () => {
    const deck = createDeck();
    expect(shuffle(deck, createSeededRandom(9))).not.toEqual(deck);
  });

  it('no modifica la lista original', () => {
    const deck = createDeck();
    const copy = [...deck];
    shuffle(deck, createSeededRandom(5));
    expect(deck).toEqual(copy);
  });
});

describe('pickOne', () => {
  it('elige un elemento de la lista', () => {
    expect(pickOne(['a', 'b', 'c'], createSeededRandom(1))).toMatch(/^[abc]$/);
  });

  it('falla con una lista vacía', () => {
    expect(() => pickOne([], Math.random)).toThrow();
  });
});
