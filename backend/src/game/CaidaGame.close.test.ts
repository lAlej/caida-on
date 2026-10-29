import { describe, expect, it } from 'vitest';
import { CaidaGame } from './CaidaGame';
import { buildDeck, card } from './testHelpers';
import type { CaidaGameOptions } from './CaidaGame';

/** Sin aciertos con 1-2-3-4: beto parte con 1 punto por la mal echada. */
const MESA = [card(12, 'copas'), card(11, 'copas'), card(10, 'copas'), card(1, 'copas')];

/** Beto tiene patrulla (6 pts). Ana no tiene canto. Nadie captura nada hasta el último turno. */
const BETO = [card(5), card(6), card(7)];
const ANA = [card(2, 'espadas'), card(4, 'espadas'), card(12, 'espadas')];

function playedGame(options: CaidaGameOptions = {}) {
  const game = new CaidaGame(['ana', 'beto'], {
    initialDeck: buildDeck([...MESA, ...BETO, ...ANA]),
    firstDealerIndex: 0,
    ...options,
  });
  game.chooseMesaOrder('ana', 'ascending');
  return game;
}

/** Juega los 5 primeros turnos de la mano; falta el último de ana. */
function playUntilLastCard(game: CaidaGame) {
  game.playCard('beto', card(5));
  game.playCard('ana', card(2, 'espadas'));
  game.playCard('beto', card(6));
  game.playCard('ana', card(4, 'espadas'));
  game.playCard('beto', card(7));
}

const scoreOf = (game: CaidaGame, id: string) =>
  game.snapshot().players.find((p) => p.id === id)?.score;

describe('CaidaGame · cierre de la mano', () => {
  it('los puntos del canto no se suman hasta que se acaban las cartas', () => {
    const game = playedGame();
    playUntilLastCard(game);

    expect(scoreOf(game, 'beto')).toBe(1);
    expect(game.snapshot().cantoWinnerId).toBe('beto');
  });

  it('al acabarse las cartas suma el canto ganador y reparte la mano siguiente', () => {
    const game = playedGame();
    playUntilLastCard(game);
    const events = game.playCard('ana', card(12, 'espadas'));

    expect(events).toContainEqual({
      type: 'cantoScored',
      playerId: 'beto',
      kind: 'patrulla',
      points: 6,
    });
    expect(scoreOf(game, 'beto')).toBe(1 + 6);

    const snapshot = game.snapshot();
    expect(snapshot).toMatchObject({ phase: 'playing', mano: 2, totalManos: 6, actorId: 'ana' });
    expect(snapshot.players.every((p) => p.hand.length === 3)).toBe(true);
    expect(snapshot.deckCount).toBe(40 - 4 - 6 - 6);
  });

  it('un canto que lleva a 24 gana la partida al cerrar la mano', () => {
    const game = playedGame({ initialScores: { beto: 20 } });
    playUntilLastCard(game);
    const events = game.playCard('ana', card(12, 'espadas'));

    expect(events).toContainEqual({ type: 'gameOver', winnerId: 'beto', reason: 'canto' });
    expect(game.snapshot().phase).toBe('finished');
  });

  it('la mesa persiste entre manos', () => {
    const game = playedGame();
    playUntilLastCard(game);
    const before = game.snapshot().table.length;
    game.playCard('ana', card(12, 'espadas'));
    // Ana capturó el Rey de copas: la mesa perdió una carta pero conserva el resto.
    expect(game.snapshot().table.length).toBeGreaterThan(0);
    expect(game.snapshot().table.length).toBeLessThanOrEqual(before);
  });
});
