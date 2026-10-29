import { RANKS, rankIndex } from './cards';
import type { Card } from './cards';

/**
 * Cartas de la mesa que se lleva quien juega `played`, o `null` si no captura nada.
 *
 * Si hay una carta del mismo valor se la lleva junto con todas las consecutivas hacia
 * arriba (5, 6, 7, 10...) que haya en la mesa, estén donde estén. La cadena se corta
 * en el primer valor que falte. La primera carta devuelta es la que coincide.
 */
export function findCapture(table: readonly Card[], played: Card): Card[] | null {
  const matched = table.find((card) => card.rank === played.rank);
  if (!matched) return null;

  const captured = [matched];
  for (let i = rankIndex(played.rank) + 1; i < RANKS.length; i++) {
    const next = table.find((card) => card.rank === RANKS[i]);
    if (!next) break;
    captured.push(next);
  }
  return captured;
}
