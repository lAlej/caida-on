import { describe, expect, it } from 'vitest';
import { cantoPoints, compareCantos, detectCanto } from './canto';
import type { Canto, CantoKind } from './canto';
import { createDeck } from './cards';
import type { Card, Rank } from './cards';

const hand = (...ranks: Rank[]): Card[] => ranks.map((rank) => ({ rank, suit: 'oros' }));

describe('detectCanto', () => {
  it.each<[string, Rank[], Canto | null]>([
    ['trivilín', [4, 4, 4], { kind: 'trivilin', rank: 4 }],
    ['registro', [12, 1, 11], { kind: 'registro', rank: 12 }],
    ['patrulla', [5, 6, 7], { kind: 'patrulla', rank: 7 }],
    ['patrulla que salta del 7 al 10', [10, 7, 6], { kind: 'patrulla', rank: 10 }],
    ['patrulla del Rey', [12, 10, 11], { kind: 'patrulla', rank: 12 }],
    ['vigía con vecina menor', [7, 7, 6], { kind: 'vigia', rank: 7, kicker: 6 }],
    ['vigía que salta del 7 al 10', [7, 10, 7], { kind: 'vigia', rank: 7, kicker: 10 }],
    ['ronda', [2, 12, 2], { kind: 'ronda', rank: 2, kicker: 12 }],
    ['ronda con el 1 de tercera', [7, 1, 7], { kind: 'ronda', rank: 7, kicker: 1 }],
    ['1, 11 y 11 es solo una ronda', [1, 11, 11], { kind: 'ronda', rank: 11, kicker: 1 }],
    ['1, 10 y 11 no es canto', [1, 10, 11], null],
    ['mano sin canto', [1, 4, 12], null],
  ])('%s', (_name, ranks, expected) => {
    expect(detectCanto(hand(...ranks))).toEqual(expected);
  });

  it('no detecta canto si la mano no tiene 3 cartas', () => {
    expect(detectCanto(hand(5, 5))).toBeNull();
  });

  it('cuenta las 9.880 manos posibles', () => {
    const deck = createDeck();
    const counts: Record<string, number> = {};
    for (let i = 0; i < deck.length; i++) {
      for (let j = i + 1; j < deck.length; j++) {
        for (let k = j + 1; k < deck.length; k++) {
          const kind = detectCanto([deck[i]!, deck[j]!, deck[k]!])?.kind ?? 'ninguno';
          counts[kind] = (counts[kind] ?? 0) + 1;
        }
      }
    }
    expect(counts).toEqual({
      trivilin: 40,
      patrulla: 512,
      vigia: 432,
      registro: 64,
      ronda: 1728,
      ninguno: 7104,
    });
  });
});

describe('cantoPoints', () => {
  it('puntúa la ronda según el valor de la pareja', () => {
    expect(cantoPoints({ kind: 'ronda', rank: 3 })).toBe(1);
    expect(cantoPoints({ kind: 'ronda', rank: 10 })).toBe(2);
    expect(cantoPoints({ kind: 'ronda', rank: 11 })).toBe(3);
    expect(cantoPoints({ kind: 'ronda', rank: 12 })).toBe(4);
  });

  it('puntúa el resto de cantos con valor fijo', () => {
    const points = (kind: CantoKind) => cantoPoints({ kind, rank: 5 });
    expect(points('patrulla')).toBe(6);
    expect(points('vigia')).toBe(7);
    expect(points('registro')).toBe(8);
    expect(points('trivilin')).toBe(12);
  });
});

describe('compareCantos', () => {
  it('gana el canto de mayor jerarquía', () => {
    const vigia: Canto = { kind: 'vigia', rank: 2, kicker: 3 };
    const patrulla: Canto = { kind: 'patrulla', rank: 12 };
    expect(compareCantos(vigia, patrulla)).toBeGreaterThan(0);
  });

  it('entre rondas gana la pareja más alta (7-7-1 le gana a 2-2-12)', () => {
    const siete: Canto = { kind: 'ronda', rank: 7, kicker: 1 };
    const dos: Canto = { kind: 'ronda', rank: 2, kicker: 12 };
    expect(compareCantos(siete, dos)).toBeGreaterThan(0);
    expect(compareCantos(dos, siete)).toBeLessThan(0);
  });

  it('con la misma pareja gana la tercera carta más alta', () => {
    const a: Canto = { kind: 'ronda', rank: 5, kicker: 12 };
    const b: Canto = { kind: 'ronda', rank: 5, kicker: 3 };
    expect(compareCantos(a, b)).toBeGreaterThan(0);
  });

  it('entre patrullas gana la carta más alta', () => {
    const a: Canto = { kind: 'patrulla', rank: 7 };
    const b: Canto = { kind: 'patrulla', rank: 10 };
    expect(compareCantos(b, a)).toBeGreaterThan(0);
  });

  it('entre trivilines gana el de mayor valor', () => {
    const rey: Canto = { kind: 'trivilin', rank: 12 };
    const tres: Canto = { kind: 'trivilin', rank: 3 };
    expect(compareCantos(rey, tres)).toBeGreaterThan(0);
  });

  it('devuelve 0 si empatan del todo', () => {
    const a: Canto = { kind: 'registro', rank: 12 };
    expect(compareCantos(a, { ...a })).toBe(0);
  });

  it('la tercera carta no desempata vigías', () => {
    const a: Canto = { kind: 'vigia', rank: 7, kicker: 6 };
    const b: Canto = { kind: 'vigia', rank: 7, kicker: 10 };
    expect(compareCantos(a, b)).toBe(0);
  });
});
