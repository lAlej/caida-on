import type { Card, Rank } from '@caida/shared';
import { describe, expect, it } from 'vitest';
import { previewPlay } from './capturePreview';

const oros = (rank: Rank): Card => ({ rank, suit: 'oros' });
const copas = (rank: Rank): Card => ({ rank, suit: 'copas' });

describe('previewPlay', () => {
  it('es null si la carta no captura nada', () => {
    expect(previewPlay([oros(3), oros(6)], null, copas(5))).toBeNull();
  });

  it('muestra la cadena de cartas que se llevaría', () => {
    const preview = previewPlay([oros(5), oros(6), oros(7), oros(12)], null, copas(5));
    expect(preview).toMatchObject({
      captured: [oros(5), oros(6), oros(7)],
      caida: false,
      mesaLimpia: false,
      points: 0,
    });
  });

  it('detecta la caída sobre la carta recién lanzada y da sus puntos', () => {
    const preview = previewPlay([oros(3), oros(11)], oros(11), copas(11));
    expect(preview).toMatchObject({ caida: true, points: 3 });
  });

  it('capturar una carta vieja no es caída aunque haya otra recién lanzada', () => {
    const preview = previewPlay([oros(3), oros(11)], oros(11), copas(3));
    expect(preview).toMatchObject({ caida: false, points: 0 });
  });

  it('dejar la mesa vacía da 4 puntos', () => {
    const preview = previewPlay([oros(5), oros(6)], null, copas(5));
    expect(preview).toMatchObject({ mesaLimpia: true, points: 4 });
  });

  it('una caída que deja la mesa vacía vale 5', () => {
    const preview = previewPlay([oros(6), oros(7)], oros(6), copas(6));
    expect(preview).toMatchObject({ caida: true, mesaLimpia: true, points: 5 });
  });
});
