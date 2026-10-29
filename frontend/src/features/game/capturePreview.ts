import { capturePoints, findCapture } from '@caida/shared';
import type { Card } from '@caida/shared';

export interface PlayPreview {
  /** Cartas de la mesa que se llevaría la jugada, empezando por la que coincide. */
  readonly captured: readonly Card[];
  readonly caida: boolean;
  readonly mesaLimpia: boolean;
  readonly points: number;
}

/**
 * Qué pasaría al jugar `card`. Devuelve `null` si no captura nada y la carta queda en la mesa.
 * Usa las mismas reglas que el servidor, que es quien decide de verdad.
 */
export function previewPlay(
  table: readonly Card[],
  lastThrown: Card | null,
  card: Card,
): PlayPreview | null {
  const captured = findCapture(table, card);
  if (!captured) return null;

  const caida = lastThrown !== null && lastThrown.rank === card.rank;
  const mesaLimpia = captured.length === table.length;
  return {
    captured,
    caida,
    mesaLimpia,
    points: capturePoints({ rank: card.rank, caida, mesaLimpia }),
  };
}
