import { createDeck, isSameCard } from '@caida/shared';
import type { Card, GameEvent, Rank, Suit } from '@caida/shared';
import type { CaidaGame } from './CaidaGame';

export const card = (rank: Rank, suit: Suit = 'oros'): Card => ({ rank, suit });

/**
 * Arma un mazo en el que las cartas se roban exactamente en el orden dado
 * (mesa primero, luego la mano de cada jugador a partir del de la derecha del repartidor).
 * El resto de la baraja queda al fondo.
 */
export function buildDeck(drawOrder: readonly Card[]): Card[] {
  const rest = createDeck().filter((c) => !drawOrder.some((drawn) => isSameCard(drawn, c)));
  if (rest.length + drawOrder.length !== 40)
    throw new Error('Cartas repetidas en el mazo de prueba');
  return [...rest, ...[...drawOrder].reverse()];
}

/** Hace la jugada más simple posible: mesa ascendente o la primera carta de la mano. */
export function playSimpleTurn(game: CaidaGame): GameEvent[] {
  const { phase, actorId } = game.snapshot();
  if (!actorId) throw new Error('La partida ya terminó');
  if (phase === 'choosingOrder') return game.chooseMesaOrder(actorId, 'ascending');
  const [first] = game.handOf(actorId);
  if (!first) throw new Error('El jugador no tiene cartas');
  return game.playCard(actorId, first);
}
