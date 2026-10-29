import { manosPerBaraja } from '@caida/shared';
import { describe, expect, it } from 'vitest';
import { CaidaGame } from './CaidaGame';
import { createSeededRandom } from './random';
import { buildDeck, card, playSimpleTurn } from './testHelpers';

type Hand = ReturnType<typeof card>[];

/**
 * Dos jugadores: Ana reparte. Mano 1 abre Beto y Ana juega la última carta (el 6 de espadas);
 * mano 2 abre Ana, que recibe un 6.
 */
function twoManosGame() {
  const mesa: Hand = [card(12, 'copas'), card(11, 'copas'), card(10, 'copas'), card(7, 'copas')];
  const beto1: Hand = [card(1), card(3), card(5)];
  const ana1: Hand = [card(2, 'espadas'), card(4, 'espadas'), card(6, 'espadas')];
  const beto2: Hand = [card(2, 'copas'), card(4, 'copas'), card(12, 'oros')];
  const ana2: Hand = [card(6, 'copas'), card(1, 'espadas'), card(3, 'espadas')];

  const game = new CaidaGame(['ana', 'beto'], {
    initialDeck: buildDeck([...mesa, ...beto1, ...ana1, ...beto2, ...ana2]),
    firstDealerIndex: 0,
  });
  game.chooseMesaOrder('ana', 'ascending');
  return { game, beto1, ana1 };
}

/** Juega la mano 1 completa sin que nadie capture nada. */
function playFirstMano(game: CaidaGame, beto: Hand, ana: Hand) {
  for (let i = 0; i < 3; i++) {
    game.playCard('beto', beto[i] as ReturnType<typeof card>);
    game.playCard('ana', ana[i] as ReturnType<typeof card>);
  }
}

describe('CaidaGame · la caída no cruza de una mano a otra', () => {
  it('la última carta de una mano no se puede "caer" en la mano siguiente', () => {
    const { game, beto1, ana1 } = twoManosGame();
    playFirstMano(game, beto1, ana1);

    const snapshot = game.snapshot();
    expect(snapshot.mano).toBe(2);
    expect(snapshot.lastThrown).toBeNull();
    // El 6 de espadas sigue en la mesa, pero ya no es una carta "recién lanzada".
    expect(snapshot.table).toContainEqual(card(6, 'espadas'));

    const events = game.playCard('ana', card(6, 'copas'));
    expect(events[1]).toMatchObject({ type: 'captured', caida: false, points: 0 });
    expect(game.snapshot().players.find((p) => p.id === 'ana')?.score).toBe(0);
  });

  it('dentro de la misma mano, capturar la carta recién lanzada sí es caída', () => {
    const { game } = twoManosGame();
    game.playCard('beto', card(1));
    game.playCard('ana', card(2, 'espadas'));
    // La carta de Ana queda recién lanzada; Beto tiene el 2 de copas más adelante, no ahora.
    expect(game.snapshot().lastThrown).toEqual(card(2, 'espadas'));
  });
});

describe('CaidaGame · quién abre cada mano', () => {
  function openers(playerCount: number, seed: number): { dealer: string; order: string[] } {
    const ids = ['a', 'b', 'c', 'd'].slice(0, playerCount);
    const game = new CaidaGame(ids, { random: createSeededRandom(seed) });
    const dealer = game.snapshot().dealerId;
    game.chooseMesaOrder(dealer, 'ascending');

    const order: string[] = [];
    let lastMano = 0;
    for (let turn = 0; turn < 300; turn++) {
      const snapshot = game.snapshot();
      if (snapshot.phase !== 'playing') break;
      if (snapshot.mano !== lastMano) {
        lastMano = snapshot.mano;
        order.push(snapshot.actorId as string);
        if (order.length === Math.min(playerCount, manosPerBaraja(playerCount))) break;
      }
      playSimpleTurn(game);
    }
    return { dealer, order };
  }

  it.each([2, 3, 4])('con %i jugadores el que abre rota hacia la derecha en cada mano', (count) => {
    const ids = ['a', 'b', 'c', 'd'].slice(0, count);
    let checked = 0;

    for (let seed = 0; seed < 40; seed++) {
      const { dealer, order } = openers(count, seed);
      const manos = Math.min(count, manosPerBaraja(count));
      if (order.length < manos) continue; // la partida terminó antes por puntos
      checked++;

      const dealerIndex = ids.indexOf(dealer);
      const expected = Array.from({ length: manos }, (_, i) => ids[(dealerIndex + 1 + i) % count]);
      expect(order, `semilla ${seed}`).toEqual(expected);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('en la primera mano de cada baraja abre el de la derecha del repartidor', () => {
    const game = new CaidaGame(['a', 'b', 'c'], { random: createSeededRandom(5) });
    const dealer = game.snapshot().dealerId;
    game.chooseMesaOrder(dealer, 'ascending');

    const ids = ['a', 'b', 'c'];
    const expectedFirst = ids[(ids.indexOf(dealer) + 1) % 3];
    expect(game.snapshot()).toMatchObject({ mano: 1, actorId: expectedFirst });
  });

  it('al empezar otra baraja vuelve a abrir el de la derecha del nuevo repartidor', () => {
    let verified = 0;
    for (let seed = 0; seed < 60 && verified < 3; seed++) {
      const ids = ['a', 'b', 'c'];
      const game = new CaidaGame(ids, { random: createSeededRandom(seed) });
      const firstDealer = game.snapshot().dealerId;

      let restarted = false;
      for (let turn = 0; turn < 500 && game.snapshot().phase !== 'finished'; turn++) {
        const events = playSimpleTurn(game);
        if (events.some((event) => event.type === 'barajaStarted')) {
          restarted = true;
          break;
        }
      }
      if (!restarted) continue;

      const newDealer = game.snapshot().dealerId;
      expect(newDealer).not.toBe(firstDealer);
      game.chooseMesaOrder(newDealer, 'ascending');
      if (game.snapshot().phase !== 'playing') continue;

      const expected = ids[(ids.indexOf(newDealer) + 1) % 3];
      expect(game.snapshot()).toMatchObject({ mano: 1, actorId: expected });
      verified++;
    }
    expect(verified).toBeGreaterThan(0);
  });
});
