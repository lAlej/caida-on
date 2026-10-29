import type { PlayerId } from '@caida/shared';
import type { CaidaGame } from '../game/CaidaGame';
import { pickOne } from '../game/random';
import type { Random } from '../game/random';
import type { GameAction } from '../game/types';

/**
 * Bot sencillo: elige el orden de la mesa y la carta a jugar al azar.
 * Devuelve `null` si no es su turno o la partida terminó.
 */
export function decideBotAction(
  game: CaidaGame,
  botId: PlayerId,
  random: Random,
): GameAction | null {
  const { phase, actorId } = game.snapshot();
  if (actorId !== botId) return null;

  if (phase === 'choosingOrder') {
    return { type: 'chooseMesaOrder', order: random() < 0.5 ? 'ascending' : 'descending' };
  }
  if (phase === 'playing') {
    return { type: 'playCard', card: pickOne(game.handOf(botId), random) };
  }
  return null;
}
