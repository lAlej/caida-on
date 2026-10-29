export const SUITS = ['oros', 'copas', 'espadas', 'bastos'] as const;
export type Suit = (typeof SUITS)[number];

/**
 * Valores de la baraja española de 40 cartas (sin 8 ni 9), en el orden en que
 * se encadenan las capturas y las patrullas: después del 7 viene el 10.
 */
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  readonly rank: Rank;
  readonly suit: Suit;
}

export const DECK_SIZE = RANKS.length * SUITS.length;

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));
}

export function isRank(value: unknown): value is Rank {
  return RANKS.includes(value as Rank);
}

/** Posición del valor en la cadena 1-2-3-4-5-6-7-10-11-12. */
export function rankIndex(rank: Rank): number {
  return RANKS.indexOf(rank);
}

export function isSameCard(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

export function cardKey(card: Card): string {
  return `${card.rank}-${card.suit}`;
}
