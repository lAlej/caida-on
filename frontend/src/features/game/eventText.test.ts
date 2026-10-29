import type { GameEvent } from '@caida/shared';
import { describe, expect, it } from 'vitest';
import { describeEvent } from './eventText';

const NAMES: Record<string, string> = { ana: 'Ana', beto: 'Beto' };
const nameOf = (id: string) => NAMES[id] ?? 'Alguien';
const text = (event: GameEvent) => describeEvent(event, nameOf);

describe('describeEvent', () => {
  it('la mesa con aciertos dice cuáles y los puntos', () => {
    expect(
      text({
        type: 'mesaDealt',
        dealerId: 'ana',
        order: 'ascending',
        cards: [],
        hits: [1, 3],
        points: 4,
      }),
    ).toBe('Ana echó la mesa diciendo 1, 2, 3, 4: acertó el 1 y el 3 (+4).');
  });

  it('la mesa sin aciertos y en orden inverso', () => {
    expect(
      text({
        type: 'mesaDealt',
        dealerId: 'beto',
        order: 'descending',
        cards: [],
        hits: [],
        points: 0,
      }),
    ).toBe('Beto echó la mesa diciendo 4, 3, 2, 1: no acertó ninguno.');
  });

  it('mal echada, mano y canto anunciado', () => {
    expect(text({ type: 'malEchada', playerId: 'beto' })).toBe(
      'Mesa mal echada: Beto gana 1 punto.',
    );
    expect(text({ type: 'manoStarted', mano: 2, totalManos: 6 })).toBe('Empieza la mano 2 de 6.');
    expect(
      text({ type: 'cantoAnnounced', playerId: 'ana', kind: 'ronda', rank: 11, points: 3 }),
    ).toBe('Ana cantó Ronda de Caballo.');
  });

  it('jugar una carta', () => {
    expect(text({ type: 'cardPlayed', playerId: 'ana', card: { rank: 1, suit: 'oros' } })).toBe(
      'Ana jugó el As de oros.',
    );
  });

  describe('captured', () => {
    const base = { type: 'captured', playerId: 'ana', mesaLimpia: false } as const;
    const cards = [
      { rank: 5, suit: 'oros' },
      { rank: 5, suit: 'copas' },
    ] as const;

    it('una captura normal', () => {
      expect(text({ ...base, cards: [...cards], caida: false, points: 0 })).toBe(
        'Ana recogió 2 cartas.',
      );
    });

    it('una caída con puntos', () => {
      expect(text({ ...base, cards: [cards[0]], caida: true, points: 1 })).toBe(
        'Ana hizo caída y recogió 1 carta (+1).',
      );
    });

    it('dejar la mesa limpia', () => {
      expect(text({ ...base, cards: [...cards], caida: false, mesaLimpia: true, points: 4 })).toBe(
        'Ana recogió 2 cartas y dejó la mesa limpia (+4).',
      );
    });
  });

  it('puntos de canto y cartas sobrantes de la mesa', () => {
    expect(text({ type: 'cantoScored', playerId: 'ana', kind: 'vigia', points: 7 })).toBe(
      'Ana suma 7 por su Vigía.',
    );
    expect(text({ type: 'tableSwept', playerId: 'beto', count: 3 })).toBe(
      'Beto se lleva 3 cartas que quedaron en la mesa.',
    );
  });

  it('el conteo de la baraja nombra solo a quienes suman', () => {
    expect(
      text({
        type: 'barajaCounted',
        counts: [
          { playerId: 'ana', cards: 13, points: 3 },
          { playerId: 'beto', cards: 7, points: 0 },
        ],
      }),
    ).toBe('Se acabó la baraja. Por cartas: Ana +3.');
    expect(
      text({ type: 'barajaCounted', counts: [{ playerId: 'ana', cards: 10, points: 0 }] }),
    ).toBe('Se acabó la baraja. Nadie suma por cartas.');
  });

  it('nueva baraja, fin de la partida y conexión', () => {
    expect(text({ type: 'barajaStarted', dealerId: 'beto' })).toBe('Nueva baraja. Reparte Beto.');
    expect(text({ type: 'gameOver', winnerId: 'ana', reason: 'instant' })).toBe(
      'Ana ganó la partida.',
    );
    expect(text({ type: 'botTookOver', playerId: 'ana' })).toBe(
      'Ana se desconectó. Un bot juega por esa persona.',
    );
    expect(text({ type: 'playerReturned', playerId: 'ana' })).toBe('Ana volvió a la partida.');
  });

  it('usa un nombre genérico si el jugador es desconocido', () => {
    expect(text({ type: 'malEchada', playerId: 'fantasma' })).toBe(
      'Mesa mal echada: Alguien gana 1 punto.',
    );
  });
});
