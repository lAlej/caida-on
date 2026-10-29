import { describe, expect, it } from 'vitest';
import { cantoName } from './cantos';

describe('cantoName', () => {
  it('la ronda y el trivilín dicen de qué valor son', () => {
    expect(cantoName({ kind: 'ronda', rank: 12 })).toBe('Ronda de Rey');
    expect(cantoName({ kind: 'trivilin', rank: 5 })).toBe('Trivilín de 5');
  });

  it('el resto usa solo su nombre', () => {
    expect(cantoName({ kind: 'vigia', rank: 7 })).toBe('Vigía');
    expect(cantoName({ kind: 'patrulla', rank: 10 })).toBe('Patrulla');
    expect(cantoName({ kind: 'registro', rank: 12 })).toBe('Registro');
  });
});
