import { rankIndex } from './cards';
import type { Card, Rank } from './cards';
import { CARDS_PER_HAND, rankPoints } from './scoring';

/** De menor a mayor jerarquía. */
export const CANTO_KINDS = ['ronda', 'patrulla', 'vigia', 'registro', 'trivilin'] as const;
export type CantoKind = (typeof CANTO_KINDS)[number];

export const CANTO_LABELS: Readonly<Record<CantoKind, string>> = {
  ronda: 'Ronda',
  patrulla: 'Patrulla',
  vigia: 'Vigía',
  registro: 'Registro',
  trivilin: 'Trivilín',
};

const FIXED_POINTS: Readonly<Record<Exclude<CantoKind, 'ronda'>, number>> = {
  patrulla: 6,
  vigia: 7,
  registro: 8,
  trivilin: 12,
};

export interface Canto {
  readonly kind: CantoKind;
  /** Valor que define el canto: la pareja, el trío o la carta más alta de la patrulla. */
  readonly rank: Rank;
  /** Tercera carta de una ronda o vigía; desempata solo entre rondas. */
  readonly kicker?: Rank;
}

/** Detecta el canto de una mano de 3 cartas. Cada mano cuenta solo como su canto más alto. */
export function detectCanto(hand: readonly Card[]): Canto | null {
  if (hand.length !== CARDS_PER_HAND) return null;

  const [low, mid, high] = hand
    .map((card) => card.rank)
    .sort((a, b) => rankIndex(a) - rankIndex(b));
  if (low === undefined || mid === undefined || high === undefined) return null;

  if (low === mid && mid === high) return { kind: 'trivilin', rank: low };
  if (low === 1 && mid === 11 && high === 12) return { kind: 'registro', rank: high };
  if (rankIndex(mid) === rankIndex(low) + 1 && rankIndex(high) === rankIndex(mid) + 1) {
    return { kind: 'patrulla', rank: high };
  }

  const pair = low === mid ? low : mid === high ? mid : null;
  if (pair === null) return null;

  const kicker = pair === low ? high : low;
  const adjacent = Math.abs(rankIndex(pair) - rankIndex(kicker)) === 1;
  return { kind: adjacent ? 'vigia' : 'ronda', rank: pair, kicker };
}

export function cantoPoints(canto: Pick<Canto, 'kind' | 'rank'>): number {
  return canto.kind === 'ronda' ? rankPoints(canto.rank) : FIXED_POINTS[canto.kind];
}

/**
 * Compara dos cantos: positivo si `a` gana. Primero la jerarquía, luego el valor
 * (pareja, trío o carta más alta) y, solo en las rondas, la tercera carta.
 * Un resultado 0 se desempata por cercanía al repartidor, fuera de esta función.
 */
export function compareCantos(a: Canto, b: Canto): number {
  const byKind = CANTO_KINDS.indexOf(a.kind) - CANTO_KINDS.indexOf(b.kind);
  if (byKind !== 0) return byKind;

  const byRank = rankIndex(a.rank) - rankIndex(b.rank);
  if (byRank !== 0) return byRank;

  if (a.kind === 'ronda' && a.kicker !== undefined && b.kicker !== undefined) {
    return rankIndex(a.kicker) - rankIndex(b.kicker);
  }
  return 0;
}
