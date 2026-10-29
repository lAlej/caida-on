import type { CardSize } from '../../components/cards/Card';

/**
 * Tamaño de las cartas de la mesa según cuántas haya. El área de la mesa tiene alto fijo,
 * así que cuando se llena las cartas se achican en vez de empujar el resto del tablero.
 */
export function tableCardSize(count: number, preferred: CardSize): CardSize {
  if (preferred === 'md') {
    if (count <= 8) return 'md';
    return count <= 16 ? 'sm' : 'xs';
  }
  return count <= 10 ? preferred : 'xs';
}

/** Alto en píxeles de cada tamaño de carta (debe coincidir con `Card.module.css`). */
export const CARD_HEIGHT: Readonly<Record<CardSize, number>> = {
  xs: 54,
  sm: 76,
  md: 110,
  lg: 140,
};

/** Ancho en píxeles de cada tamaño de carta (debe coincidir con `Card.module.css`). */
export const CARD_WIDTH: Readonly<Record<CardSize, number>> = {
  xs: 38,
  sm: 54,
  md: 78,
  lg: 100,
};
