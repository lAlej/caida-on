import type { Canto, Card, GamePhase, GameResult, MesaOrder, PlayerId } from '@caida/shared';
import { AppError } from '../errors';

/** Se lanza cuando una acción rompe las reglas del juego. */
export class GameRuleError extends AppError {}

/** Lo que un jugador (humano o bot) puede hacer en la partida. */
export type GameAction =
  | { readonly type: 'chooseMesaOrder'; readonly order: MesaOrder }
  | { readonly type: 'playCard'; readonly card: Card };

export interface PlayerState {
  readonly id: PlayerId;
  score: number;
  hand: Card[];
  /** Cartas ganadas en la baraja actual. */
  pile: Card[];
  canto: Canto | null;
}

export interface LastThrown {
  readonly card: Card;
  readonly by: PlayerId;
}

export interface PlayerSnapshot {
  readonly id: PlayerId;
  readonly score: number;
  readonly hand: readonly Card[];
  readonly pileCount: number;
  readonly canto: Canto | null;
}

/** Copia de solo lectura del estado, para proyectar vistas sin tocar el motor. */
export interface GameSnapshot {
  readonly phase: GamePhase;
  readonly players: readonly PlayerSnapshot[];
  readonly table: readonly Card[];
  readonly deckCount: number;
  readonly dealerId: PlayerId;
  readonly actorId: PlayerId | null;
  readonly mano: number;
  readonly totalManos: number;
  readonly lastThrown: Card | null;
  readonly cantoWinnerId: PlayerId | null;
  readonly result: GameResult | null;
}
