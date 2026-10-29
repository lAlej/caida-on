import { describe, expect, it } from 'vitest';
import { CaidaGame } from './CaidaGame';
import { buildDeck, card } from './testHelpers';
import type { CaidaGameOptions } from './CaidaGame';

type Hand = ReturnType<typeof card>[];

/**
 * Dos jugadores: ana reparte y beto juega primero. Con la mesa dada ninguno de los
 * números 1-2-3-4 acierta, así que beto parte con 1 punto por la mal echada.
 */
function twoPlayerGame(mesa: Hand, beto: Hand, ana: Hand, options: CaidaGameOptions = {}) {
  const game = new CaidaGame(['ana', 'beto'], {
    initialDeck: buildDeck([...mesa, ...beto, ...ana]),
    firstDealerIndex: 0,
    ...options,
  });
  game.chooseMesaOrder('ana', 'ascending');
  return game;
}

const scoreOf = (game: CaidaGame, id: string) =>
  game.snapshot().players.find((p) => p.id === id)?.score;

const MESA_RUN: Hand = [card(5, 'copas'), card(6, 'copas'), card(7, 'copas'), card(12, 'copas')];
const FILLER: Hand = [card(1, 'espadas'), card(2, 'espadas')];

describe('CaidaGame · lanzar y capturar', () => {
  it('lanza la carta a la mesa si no hay una igual', () => {
    const game = twoPlayerGame(MESA_RUN, [card(3), ...FILLER], [card(4), card(2), card(1)]);
    const events = game.playCard('beto', card(3));

    expect(events).toEqual([{ type: 'cardPlayed', playerId: 'beto', card: card(3) }]);
    const snapshot = game.snapshot();
    expect(snapshot.table).toHaveLength(5);
    expect(snapshot.lastThrown).toEqual(card(3));
    expect(snapshot.actorId).toBe('ana');
  });

  it('captura automáticamente la carta igual y las consecutivas hacia arriba', () => {
    const game = twoPlayerGame(MESA_RUN, [card(5, 'oros'), ...FILLER], [card(4), card(2), card(1)]);
    const events = game.playCard('beto', card(5, 'oros'));

    expect(events[1]).toMatchObject({
      type: 'captured',
      playerId: 'beto',
      cards: [card(5, 'oros'), card(5, 'copas'), card(6, 'copas'), card(7, 'copas')],
      caida: false,
      mesaLimpia: false,
      points: 0,
    });
    expect(game.snapshot().table).toEqual([card(12, 'copas')]);
    expect(game.snapshot().players.find((p) => p.id === 'beto')?.pileCount).toBe(4);
  });

  it('no se puede jugar fuera de turno', () => {
    const game = twoPlayerGame(MESA_RUN, [card(3), ...FILLER], [card(4), card(2), card(1)]);
    expect(() => game.playCard('ana', card(4))).toThrowError(
      expect.objectContaining({ code: 'NOT_YOUR_TURN' }),
    );
  });

  it('no se puede jugar una carta que no está en la mano', () => {
    const game = twoPlayerGame(MESA_RUN, [card(3), ...FILLER], [card(4), card(2), card(1)]);
    expect(() => game.playCard('beto', card(4))).toThrowError(
      expect.objectContaining({ code: 'CARD_NOT_IN_HAND' }),
    );
  });

  it('no se puede jugar mientras el repartidor no ha echado la mesa', () => {
    const game = new CaidaGame(['ana', 'beto'], { firstDealerIndex: 0 });
    expect(() => game.playCard('ana', card(1))).toThrowError(
      expect.objectContaining({ code: 'INVALID_ACTION' }),
    );
  });
});

describe('CaidaGame · caída', () => {
  it('capturar la carta recién lanzada es una caída y da sus puntos', () => {
    const game = twoPlayerGame(
      MESA_RUN,
      [card(3, 'oros'), ...FILLER],
      [card(3, 'copas'), card(4), card(1)],
    );
    game.playCard('beto', card(3, 'oros'));
    const events = game.playCard('ana', card(3, 'copas'));

    expect(events[1]).toMatchObject({ type: 'captured', caida: true, points: 1 });
    expect(scoreOf(game, 'ana')).toBe(1);
  });

  it('la caída de una figura da más puntos (Rey = 4)', () => {
    const game = twoPlayerGame(
      [card(5, 'copas'), card(6, 'copas'), card(7, 'copas'), card(11, 'copas')],
      [card(12, 'oros'), ...FILLER],
      [card(12, 'copas'), card(4), card(3)],
    );
    game.playCard('beto', card(12, 'oros'));
    game.playCard('ana', card(12, 'copas'));
    expect(scoreOf(game, 'ana')).toBe(4);
  });

  it('capturar una carta más vieja de la mesa no es caída', () => {
    const game = twoPlayerGame(
      MESA_RUN,
      [card(3), ...FILLER],
      [card(12, 'oros'), card(4), card(1)],
    );
    game.playCard('beto', card(3));
    const events = game.playCard('ana', card(12, 'oros'));

    expect(events[1]).toMatchObject({ type: 'captured', caida: false, points: 0 });
    expect(scoreOf(game, 'ana')).toBe(0);
  });

  it('no hay caída si el jugador anterior capturó en vez de lanzar', () => {
    const game = twoPlayerGame(
      [card(5, 'copas'), card(6, 'copas'), card(10, 'copas'), card(12, 'copas')],
      [card(5, 'oros'), ...FILLER],
      [card(12, 'oros'), card(4), card(1)],
    );
    game.playCard('beto', card(5, 'oros'));
    const events = game.playCard('ana', card(12, 'oros'));
    expect(events[1]).toMatchObject({ caida: false, points: 0 });
  });
});

describe('CaidaGame · mesa limpia', () => {
  const MESA_COMPLETA: Hand = [
    card(5, 'copas'),
    card(6, 'copas'),
    card(7, 'copas'),
    card(10, 'copas'),
  ];

  it('dejar la mesa vacía da 4 puntos', () => {
    const game = twoPlayerGame(
      MESA_COMPLETA,
      [card(5, 'oros'), ...FILLER],
      [card(4), card(2), card(1)],
    );
    const events = game.playCard('beto', card(5, 'oros'));

    expect(events[1]).toMatchObject({ mesaLimpia: true, caida: false, points: 4 });
    expect(scoreOf(game, 'beto')).toBe(1 + 4);
  });

  it('una caída que deja la mesa vacía vale 5 en total', () => {
    const game = twoPlayerGame(
      [card(7, 'copas'), card(10, 'copas'), card(11, 'copas'), card(12, 'copas')],
      [card(6, 'oros'), ...FILLER],
      [card(6, 'copas'), card(3), card(4)],
    );
    game.playCard('beto', card(6, 'oros'));
    const events = game.playCard('ana', card(6, 'copas'));

    expect(events[1]).toMatchObject({ caida: true, mesaLimpia: true, points: 5 });
    expect(scoreOf(game, 'ana')).toBe(5);
  });
});

describe('CaidaGame · victoria inmediata', () => {
  it('quien llega a 24 con una caída con mesa gana al instante', () => {
    const game = twoPlayerGame(
      [card(7, 'copas'), card(10, 'copas'), card(11, 'copas'), card(12, 'copas')],
      [card(6, 'oros'), ...FILLER],
      [card(6, 'copas'), card(3), card(4)],
      { initialScores: { ana: 22 } },
    );
    game.playCard('beto', card(6, 'oros'));
    const events = game.playCard('ana', card(6, 'copas'));

    expect(events).toContainEqual({ type: 'gameOver', winnerId: 'ana', reason: 'instant' });
    expect(game.snapshot()).toMatchObject({
      phase: 'finished',
      actorId: null,
      result: { winnerId: 'ana', reason: 'instant' },
    });
  });

  it('no se puede jugar cuando la partida terminó', () => {
    const game = twoPlayerGame(
      [card(7, 'copas'), card(10, 'copas'), card(11, 'copas'), card(12, 'copas')],
      [card(6, 'oros'), ...FILLER],
      [card(6, 'copas'), card(3), card(4)],
      { initialScores: { ana: 22 } },
    );
    game.playCard('beto', card(6, 'oros'));
    game.playCard('ana', card(6, 'copas'));

    expect(() => game.playCard('beto', card(1, 'espadas'))).toThrowError(
      expect.objectContaining({ code: 'INVALID_ACTION' }),
    );
  });
});
