import { describe, expect, it } from 'vitest';
import { CARD_HEIGHT, tableCardSize } from './tableLayout';

describe('tableCardSize', () => {
  it.each([
    [0, 'md'],
    [8, 'md'],
    [9, 'sm'],
    [16, 'sm'],
    [17, 'xs'],
    [30, 'xs'],
  ])('en escritorio, con %i cartas usa tamaño %s', (count, expected) => {
    expect(tableCardSize(count, 'md')).toBe(expected);
  });

  it('en pantallas pequeñas empieza a achicar antes', () => {
    expect(tableCardSize(10, 'sm')).toBe('sm');
    expect(tableCardSize(11, 'sm')).toBe('xs');
  });

  it('las cartas más pequeñas nunca son más altas', () => {
    expect(CARD_HEIGHT.xs).toBeLessThan(CARD_HEIGHT.sm);
    expect(CARD_HEIGHT.sm).toBeLessThan(CARD_HEIGHT.md);
    expect(CARD_HEIGHT.md).toBeLessThan(CARD_HEIGHT.lg);
  });
});
