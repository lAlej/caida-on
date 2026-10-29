import { DECK_SIZE } from './cards';
import type { Rank } from './cards';

export const TARGET_SCORE = 24;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const CARDS_PER_HAND = 3;
export const MESA_CARDS = 4;

export const MESA_LIMPIA_POINTS = 4;
export const CAIDA_CON_MESA_POINTS = 5;
export const MAL_ECHADA_POINTS = 1;

export type MesaOrder = 'ascending' | 'descending';

/** Números que dice el repartidor al echar la mesa, en orden. */
export const MESA_ORDERS: Readonly<Record<MesaOrder, readonly number[]>> = {
  ascending: [1, 2, 3, 4],
  descending: [4, 3, 2, 1],
};

/** Puntos de una caída o de una ronda según el valor de la carta. */
export function rankPoints(rank: Rank): number {
  switch (rank) {
    case 10:
      return 2;
    case 11:
      return 3;
    case 12:
      return 4;
    default:
      return 1;
  }
}

interface CaptureOutcome {
  readonly rank: Rank;
  readonly caida: boolean;
  readonly mesaLimpia: boolean;
}

/** Puntos inmediatos de una captura. La caída con mesa vale 5 en total, sin acumular. */
export function capturePoints({ rank, caida, mesaLimpia }: CaptureOutcome): number {
  if (caida && mesaLimpia) return CAIDA_CON_MESA_POINTS;
  if (caida) return rankPoints(rank);
  if (mesaLimpia) return MESA_LIMPIA_POINTS;
  return 0;
}

/** Cartas que cada jugador cuenta al acabarse la baraja; las que sobran son puntos. */
export function cardCountThreshold(playerCount: number, isDealer: boolean): number {
  switch (playerCount) {
    case 2:
      return 20;
    case 3:
      return isDealer ? 14 : 13;
    default:
      return 10;
  }
}

export function manosPerBaraja(playerCount: number): number {
  return (DECK_SIZE - MESA_CARDS) / (CARDS_PER_HAND * playerCount);
}
