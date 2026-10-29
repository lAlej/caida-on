import { describe, expect, it } from 'vitest';
import { CaidaGame } from './CaidaGame';
import { createSeededRandom } from './random';
import { buildDeck, card } from './testHelpers';

const IDS = ['ana', 'beto', 'carla'];

/** Mesa sin aciertos posibles con 1-2-3-4: 12, 11, 10, 7. */
const MESA_FALLIDA = [card(12, 'copas'), card(11, 'copas'), card(10, 'copas'), card(7, 'copas')];

function newGame(drawOrder: ReturnType<typeof card>[], ids = IDS) {
  return new CaidaGame(ids, { initialDeck: buildDeck(drawOrder), firstDealerIndex: 0 });
}

describe('CaidaGame · inicio', () => {
  it.each([[[]], [['solo']], [['a', 'b', 'c', 'd', 'e']]])('rechaza %j jugadores', (ids) => {
    expect(() => new CaidaGame(ids)).toThrowError(/Se juega de 2 a 4/);
  });

  it('rechaza jugadores repetidos', () => {
    expect(() => new CaidaGame(['a', 'a'])).toThrowError(/distintos/);
  });

  it('empieza esperando que el repartidor elija el orden de la mesa', () => {
    const game = newGame([]);
    expect(game.snapshot()).toMatchObject({
      phase: 'choosingOrder',
      dealerId: 'ana',
      actorId: 'ana',
      table: [],
      mano: 0,
    });
  });

  it('solo el repartidor puede echar la mesa', () => {
    const game = newGame(MESA_FALLIDA);
    expect(() => game.chooseMesaOrder('beto', 'ascending')).toThrowError(
      expect.objectContaining({ code: 'NOT_YOUR_TURN' }),
    );
  });

  it('no se puede echar la mesa dos veces', () => {
    const game = newGame(MESA_FALLIDA);
    game.chooseMesaOrder('ana', 'ascending');
    expect(() => game.chooseMesaOrder('ana', 'ascending')).toThrowError(
      expect.objectContaining({ code: 'INVALID_ACTION' }),
    );
  });
});

describe('CaidaGame · entrega de la mesa', () => {
  it('pone 4 cartas en la mesa', () => {
    const game = newGame(MESA_FALLIDA);
    game.chooseMesaOrder('ana', 'ascending');
    expect(game.snapshot().table).toEqual(MESA_FALLIDA);
  });

  it('suma al repartidor los números que aciertan en orden ascendente', () => {
    // Dice 1, 2, 3, 4 y salen 1, 5, 3, 12: acierta el 1 y el 3.
    const mesa = [card(1, 'copas'), card(5, 'copas'), card(3, 'copas'), card(12, 'copas')];
    const game = newGame(mesa);
    const events = game.chooseMesaOrder('ana', 'ascending');

    expect(events[0]).toMatchObject({ type: 'mesaDealt', hits: [1, 3], points: 4 });
    expect(game.snapshot().players.find((p) => p.id === 'ana')?.score).toBe(4);
  });

  it('en orden descendente dice 4, 3, 2, 1', () => {
    // Salen 4, 2, 3, 1: acierta el 4 y el 1.
    const mesa = [card(4, 'copas'), card(2, 'copas'), card(3, 'copas'), card(1, 'copas')];
    const game = newGame(mesa);
    const events = game.chooseMesaOrder('ana', 'descending');

    expect(events[0]).toMatchObject({ type: 'mesaDealt', hits: [4, 1], points: 5 });
  });

  it('sin aciertos es mal echada: 1 punto para el primer jugador, no para el repartidor', () => {
    const game = newGame(MESA_FALLIDA);
    const events = game.chooseMesaOrder('ana', 'ascending');

    expect(events).toContainEqual({ type: 'malEchada', playerId: 'beto' });
    const scores = Object.fromEntries(game.snapshot().players.map((p) => [p.id, p.score]));
    expect(scores).toEqual({ ana: 0, beto: 1, carla: 0 });
  });

  it('si sale un valor repetido, la segunda carta vuelve al mazo y se saca otra', () => {
    const repetida = [card(5, 'oros'), card(5, 'copas'), card(7), card(10), card(11)];
    const game = new CaidaGame(IDS, {
      initialDeck: buildDeck(repetida),
      firstDealerIndex: 0,
      random: createSeededRandom(1),
    });
    game.chooseMesaOrder('ana', 'ascending');

    const table = game.snapshot().table;
    expect(table).toHaveLength(4);
    expect(table[0]).toEqual(card(5, 'oros'));
    expect(new Set(table.map((c) => c.rank)).size).toBe(4);
  });

  it('nunca deja valores repetidos en la mesa, con cualquier mezcla', () => {
    for (let seed = 0; seed < 300; seed++) {
      const game = new CaidaGame(IDS, { random: createSeededRandom(seed) });
      const dealer = game.snapshot().dealerId;
      game.chooseMesaOrder(dealer, 'ascending');
      const ranks = game.snapshot().table.map((c) => c.rank);
      expect(new Set(ranks).size, `semilla ${seed}`).toBe(ranks.length);
    }
  });
});
