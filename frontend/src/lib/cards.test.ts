import { RANKS } from '@caida/shared';
import { describe, expect, it } from 'vitest';
import { cardName, figureLabel, rankName } from './cards';

describe('rankName', () => {
  it('llama As al 1 y usa el número en el resto, salvo las figuras', () => {
    expect(RANKS.map(rankName)).toEqual([
      'As',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      'Sota',
      'Caballo',
      'Rey',
    ]);
  });
});

describe('cardName', () => {
  it('describe la carta en español', () => {
    expect(cardName({ rank: 5, suit: 'bastos' })).toBe('5 de bastos');
    expect(cardName({ rank: 12, suit: 'oros' })).toBe('Rey de oros');
    expect(cardName({ rank: 1, suit: 'copas' })).toBe('As de copas');
  });
});

describe('figureLabel', () => {
  it('solo las figuras llevan etiqueta', () => {
    expect(figureLabel(7)).toBeNull();
    expect(figureLabel(10)).toBe('Sota');
    expect(figureLabel(12)).toBe('Rey');
  });
});
