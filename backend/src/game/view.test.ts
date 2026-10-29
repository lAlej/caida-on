import { cardKey } from '@caida/shared';
import { describe, expect, it } from 'vitest';
import { CaidaGame } from './CaidaGame';
import { buildDeck, card } from './testHelpers';
import { buildGameView } from './view';
import type { PlayerMeta } from './view';

const META = new Map<string, PlayerMeta>([
  ['ana', { name: 'Ana', isBot: false, connected: true }],
  ['beto', { name: 'Beto', isBot: false, connected: true }],
  ['carla', { name: 'Carla', isBot: true, connected: false }],
]);

const MESA = [card(12, 'copas'), card(11, 'copas'), card(10, 'copas'), card(7, 'copas')];
const BETO = [card(5), card(6), card(7)];
const CARLA = [card(3, 'copas'), card(3, 'espadas'), card(12, 'espadas')];
const ANA = [card(1, 'bastos'), card(4, 'bastos'), card(10, 'bastos')];

function startedGame() {
  const game = new CaidaGame(['ana', 'beto', 'carla'], {
    initialDeck: buildDeck([...MESA, ...BETO, ...CARLA, ...ANA]),
    firstDealerIndex: 0,
  });
  game.chooseMesaOrder('ana', 'ascending');
  return game;
}

describe('buildGameView', () => {
  it('muestra al jugador solo su propia mano', () => {
    const view = buildGameView(startedGame().snapshot(), 'beto', META);
    expect(view.youId).toBe('beto');
    expect(view.hand).toEqual(BETO);
  });

  it('no filtra las cartas de los demás ni el orden del mazo', () => {
    const view = buildGameView(startedGame().snapshot(), 'beto', META);

    const visible = new Set([...view.hand, ...view.table].map(cardKey));
    for (const hidden of [...ANA, ...CARLA]) expect(visible.has(cardKey(hidden))).toBe(false);

    for (const player of view.players) expect(player).not.toHaveProperty('hand');
    expect(view).not.toHaveProperty('deck');
    expect(view.deckCount).toBe(40 - 4 - 9);
  });

  it('cada jugador ve su propia mano y la cantidad de cartas de los demás', () => {
    const snapshot = startedGame().snapshot();
    const forAna = buildGameView(snapshot, 'ana', META);
    const forCarla = buildGameView(snapshot, 'carla', META);

    expect(forAna.hand).toEqual(ANA);
    expect(forCarla.hand).toEqual(CARLA);
    expect(forAna.players.map((p) => p.handCount)).toEqual([3, 3, 3]);
  });

  it('anuncia el canto con su tipo, valor y puntos, sin revelar la tercera carta', () => {
    const view = buildGameView(startedGame().snapshot(), 'ana', META);
    const byId = Object.fromEntries(view.players.map((p) => [p.id, p]));

    expect(byId['beto']?.canto).toEqual({ kind: 'patrulla', rank: 7, points: 6 });
    expect(byId['carla']?.canto).toEqual({ kind: 'ronda', rank: 3, points: 1 });
    expect(byId['ana']?.canto).toBeNull();
    expect(view.cantoWinnerId).toBe('beto');
  });

  it('incluye nombre, repartidor y estado de conexión de cada jugador', () => {
    const view = buildGameView(startedGame().snapshot(), 'ana', META);
    expect(view.players[0]).toMatchObject({ id: 'ana', name: 'Ana', isDealer: true });
    expect(view.players[2]).toMatchObject({ id: 'carla', isBot: true, connected: false });
    expect(view).toMatchObject({ actorId: 'beto', dealerId: 'ana', mano: 1, targetScore: 24 });
  });

  it('un espectador no ve ninguna mano', () => {
    const view = buildGameView(startedGame().snapshot(), 'nadie', META);
    expect(view.hand).toEqual([]);
  });

  it('falla si falta información de un jugador', () => {
    expect(() => buildGameView(startedGame().snapshot(), 'ana', new Map())).toThrow();
  });
});
