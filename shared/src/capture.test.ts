import { describe, expect, it } from 'vitest';
import { findCapture } from './capture';
import type { Card, Rank } from './cards';

const oros = (rank: Rank): Card => ({ rank, suit: 'oros' });
const copas = (rank: Rank): Card => ({ rank, suit: 'copas' });

describe('findCapture', () => {
  it('no captura si no hay una carta del mismo valor', () => {
    expect(findCapture([oros(3), oros(6)], copas(5))).toBeNull();
  });

  it('captura solo la carta igual si no hay consecutivas', () => {
    expect(findCapture([oros(3), oros(5)], copas(5))).toEqual([oros(5)]);
  });

  it('se lleva la carta igual y las consecutivas hacia arriba', () => {
    const table = [oros(5), oros(6), oros(7)];
    expect(findCapture(table, copas(5))).toEqual(table);
  });

  it('encuentra las consecutivas aunque estén desordenadas en la mesa', () => {
    const captured = findCapture([oros(7), oros(11), oros(5), oros(6)], copas(5));
    expect(captured).toEqual([oros(5), oros(6), oros(7)]);
  });

  it('corta la cadena en el primer valor que falta', () => {
    expect(findCapture([oros(5), oros(6), oros(10)], copas(5))).toEqual([oros(5), oros(6)]);
  });

  it('pasa del 7 al 10 porque no hay 8 ni 9', () => {
    const table = [oros(7), oros(10), oros(11), oros(12)];
    expect(findCapture(table, copas(7))).toEqual(table);
  });

  it('no incluye las cartas de valor menor', () => {
    expect(findCapture([oros(3), oros(4), oros(5)], copas(4))).toEqual([oros(4), oros(5)]);
  });

  it('no captura más allá del Rey', () => {
    expect(findCapture([oros(1), oros(12)], copas(12))).toEqual([oros(12)]);
  });
});
