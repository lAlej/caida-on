import { CANTO_LABELS } from '@caida/shared';
import type { AnnouncedCanto } from '@caida/shared';
import { rankName } from './cards';

/** "Ronda de Rey", "Trivilín de 5", "Vigía"... */
export function cantoName(canto: Pick<AnnouncedCanto, 'kind' | 'rank'>): string {
  const label = CANTO_LABELS[canto.kind];
  return canto.kind === 'ronda' || canto.kind === 'trivilin'
    ? `${label} de ${rankName(canto.rank)}`
    : label;
}
