import { describe, expect, it } from 'vitest';
import { CaidaGame } from './CaidaGame';
import { createSeededRandom } from './random';
import { buildDeck, card } from './testHelpers';

const IDS = ['ana', 'beto', 'carla'];

/** Sin aciertos con 1-2-3-4: la mesa es mal echada. */
const MESA = [card(12, 'copas'), card(11, 'copas'), card(10, 'copas'), card(7, 'copas')];

/** Ana reparte; el orden de reparto es beto, carla, ana. */
function startedGame(beto: ReturnType<typeof card>[], carla: ReturnType<typeof card>[]) {
  const ana = [card(1, 'bastos'), card(4, 'bastos'), card(10, 'bastos')];
  const game = new CaidaGame(IDS, {
    initialDeck: buildDeck([...MESA, ...beto, ...carla, ...ana]),
    firstDealerIndex: 0,
  });
  const events = game.chooseMesaOrder('ana', 'ascending');
  return { game, events };
}

const PATRULLA = [card(5), card(6), card(7)];
const RONDA_DE_3 = [card(3, 'copas'), card(3, 'espadas'), card(12, 'espadas')];

describe('CaidaGame · reparto de la mano', () => {
  it('reparte 3 cartas a cada jugador empezando por el de la derecha del repartidor', () => {
    const { game } = startedGame(PATRULLA, RONDA_DE_3);
    const hands = Object.fromEntries(game.snapshot().players.map((p) => [p.id, p.hand]));

    expect(hands['beto']).toEqual(PATRULLA);
    expect(hands['carla']).toEqual(RONDA_DE_3);
    expect(hands['ana']).toHaveLength(3);
  });

  it('empieza a jugar el de la derecha del repartidor', () => {
    const { game } = startedGame(PATRULLA, RONDA_DE_3);
    expect(game.snapshot()).toMatchObject({
      phase: 'playing',
      actorId: 'beto',
      mano: 1,
      totalManos: 4,
      deckCount: 40 - 4 - 9,
    });
  });

  it.each([
    [2, 6],
    [3, 4],
    [4, 3],
  ])('con %i jugadores una baraja tiene %i manos', (players, manos) => {
    const ids = ['a', 'b', 'c', 'd'].slice(0, players);
    const game = new CaidaGame(ids, { random: createSeededRandom(5) });
    game.chooseMesaOrder(game.snapshot().dealerId, 'ascending');
    expect(game.snapshot().totalManos).toBe(manos);
  });
});

describe('CaidaGame · cantos', () => {
  it('anuncia el canto de cada jugador, con su tipo y sus puntos', () => {
    const { events } = startedGame(PATRULLA, RONDA_DE_3);

    expect(events).toContainEqual({ type: 'manoStarted', mano: 1, totalManos: 4 });
    expect(events).toContainEqual({
      type: 'cantoAnnounced',
      playerId: 'beto',
      kind: 'patrulla',
      rank: 7,
      points: 6,
    });
    expect(events).toContainEqual({
      type: 'cantoAnnounced',
      playerId: 'carla',
      kind: 'ronda',
      rank: 3,
      points: 1,
    });
    expect(events.filter((e) => e.type === 'cantoAnnounced')).toHaveLength(2);
  });

  it('solo puntúa el canto más alto de la mano', () => {
    const { game } = startedGame(PATRULLA, RONDA_DE_3);
    expect(game.snapshot().cantoWinnerId).toBe('beto');
  });

  it('entre dos rondas gana la pareja más alta', () => {
    const rondaDe2 = [card(2, 'oros'), card(2, 'copas'), card(12, 'oros')];
    const rondaDe7 = [card(7, 'oros'), card(7, 'espadas'), card(1, 'oros')];
    const { game } = startedGame(rondaDe2, rondaDe7);
    expect(game.snapshot().cantoWinnerId).toBe('carla');
  });

  it('si empatan del todo, gana el más cercano a la derecha del repartidor', () => {
    const beto = [card(5, 'oros'), card(5, 'copas'), card(1, 'oros')];
    const carla = [card(5, 'espadas'), card(5, 'bastos'), card(1, 'copas')];
    const { game } = startedGame(beto, carla);
    expect(game.snapshot().cantoWinnerId).toBe('beto');
  });

  it('no hay ganador de canto si nadie tiene canto', () => {
    const { game } = startedGame(
      [card(1, 'oros'), card(4, 'oros'), card(10, 'oros')],
      [card(2, 'oros'), card(5, 'oros'), card(11, 'oros')],
    );
    expect(game.snapshot().cantoWinnerId).toBeNull();
  });
});
