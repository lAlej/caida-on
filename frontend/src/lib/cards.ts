import type { Card, Rank, Suit } from '@caida/shared';

const RANK_NAMES: Partial<Record<Rank, string>> = {
  1: 'As',
  10: 'Sota',
  11: 'Caballo',
  12: 'Rey',
};

/** Nombre corto de un valor: "As", "5", "Sota"... */
export function rankName(rank: Rank): string {
  return RANK_NAMES[rank] ?? String(rank);
}

const SUIT_NAMES: Readonly<Record<Suit, string>> = {
  oros: 'oros',
  copas: 'copas',
  espadas: 'espadas',
  bastos: 'bastos',
};

/** "5 de bastos", "Rey de oros"... */
export function cardName(card: Card): string {
  return `${rankName(card.rank)} de ${SUIT_NAMES[card.suit]}`;
}

/** Etiqueta bajo el número en las figuras (10, 11 y 12). */
export function figureLabel(rank: Rank): string | null {
  return rank >= 10 ? rankName(rank) : null;
}
