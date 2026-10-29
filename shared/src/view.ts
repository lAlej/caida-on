import type { CantoKind } from './canto';
import type { Card, Rank } from './cards';
import type { MesaOrder } from './scoring';

export type PlayerId = string;

export type RoomStatus = 'lobby' | 'playing' | 'finished';
export type GamePhase = 'choosingOrder' | 'playing' | 'finished';

/** Cómo se ganó: puntos al instante, un canto al cerrar la mano o el conteo de cartas. */
export type WinReason = 'instant' | 'canto' | 'cards';

export interface GameResult {
  readonly winnerId: PlayerId;
  readonly reason: WinReason;
}

/** Canto anunciado a toda la mesa. Revela el tipo y el valor, nunca las cartas. */
export interface AnnouncedCanto {
  readonly kind: CantoKind;
  readonly rank: Rank;
  readonly points: number;
}

export interface PlayerView {
  readonly id: PlayerId;
  readonly name: string;
  readonly score: number;
  readonly handCount: number;
  readonly pileCount: number;
  readonly isDealer: boolean;
  readonly isBot: boolean;
  readonly connected: boolean;
  readonly canto: AnnouncedCanto | null;
}

/** Estado de la partida tal como lo ve un jugador: solo conoce su propia mano. */
export interface GameView {
  readonly youId: PlayerId;
  readonly phase: GamePhase;
  readonly players: readonly PlayerView[];
  readonly table: readonly Card[];
  readonly hand: readonly Card[];
  readonly deckCount: number;
  readonly dealerId: PlayerId;
  /** Quien debe actuar ahora: el repartidor al echar la mesa o el jugador del turno. */
  readonly actorId: PlayerId | null;
  readonly mano: number;
  readonly totalManos: number;
  /** Carta que el jugador anterior acaba de lanzar; capturarla es una caída. */
  readonly lastThrown: Card | null;
  /** Jugador cuyo canto puntuará al cerrar la mano. */
  readonly cantoWinnerId: PlayerId | null;
  readonly targetScore: number;
  readonly result: GameResult | null;
}

export interface SeatView {
  readonly playerId: PlayerId;
  readonly name: string;
  readonly isBot: boolean;
  readonly connected: boolean;
}

export interface RoomView {
  readonly code: string;
  readonly status: RoomStatus;
  readonly hostId: PlayerId;
  readonly maxPlayers: number;
  readonly youId: PlayerId;
  readonly seats: readonly SeatView[];
  readonly game: GameView | null;
}

export interface RoomSummary {
  readonly code: string;
  readonly hostName: string;
  readonly playerCount: number;
  readonly maxPlayers: number;
}

export interface CountEntry {
  readonly playerId: PlayerId;
  readonly cards: number;
  readonly points: number;
}

export type GameEvent =
  | {
      type: 'mesaDealt';
      dealerId: PlayerId;
      order: MesaOrder;
      cards: Card[];
      hits: number[];
      points: number;
    }
  | { type: 'malEchada'; playerId: PlayerId }
  | { type: 'manoStarted'; mano: number; totalManos: number }
  | { type: 'cantoAnnounced'; playerId: PlayerId; kind: CantoKind; rank: Rank; points: number }
  | { type: 'cardPlayed'; playerId: PlayerId; card: Card }
  | {
      type: 'captured';
      playerId: PlayerId;
      cards: Card[];
      caida: boolean;
      mesaLimpia: boolean;
      points: number;
    }
  | { type: 'cantoScored'; playerId: PlayerId; kind: CantoKind; points: number }
  | { type: 'tableSwept'; playerId: PlayerId; count: number }
  | { type: 'barajaCounted'; counts: CountEntry[] }
  | { type: 'barajaStarted'; dealerId: PlayerId }
  | { type: 'gameOver'; winnerId: PlayerId; reason: WinReason }
  | { type: 'botTookOver'; playerId: PlayerId }
  | { type: 'playerReturned'; playerId: PlayerId };
