import { describe, expect, it } from 'vitest';
import { DECK_SIZE, RANKS, SUITS, cardKey, createDeck, isRank, rankIndex } from './cards';

describe('createDeck', () => {
  it('crea 40 cartas distintas', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(DECK_SIZE);
    expect(new Set(deck.map(cardKey)).size).toBe(40);
  });

  it('no incluye 8 ni 9', () => {
    const ranks = new Set(createDeck().map((card) => card.rank));
    expect(ranks.has(8 as never)).toBe(false);
    expect(ranks.has(9 as never)).toBe(false);
  });

  it('tiene 10 cartas de cada pinta', () => {
    for (const suit of SUITS) {
      expect(createDeck().filter((card) => card.suit === suit)).toHaveLength(RANKS.length);
    }
  });
});

describe('rankIndex', () => {
  it('encadena el 7 con el 10', () => {
    expect(rankIndex(10)).toBe(rankIndex(7) + 1);
  });
});

describe('isRank', () => {
  it('acepta valores de la baraja y rechaza el resto', () => {
    expect(isRank(12)).toBe(true);
    expect(isRank(8)).toBe(false);
    expect(isRank('5')).toBe(false);
    expect(isRank(undefined)).toBe(false);
  });
});
