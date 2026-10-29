import type { AnnouncedCanto } from '@caida/shared';
import { cantoName } from '../../lib/cantos';
import styles from './CantoBadge.module.css';

interface CantoBadgeProps {
  canto: AnnouncedCanto;
  /** `true` si es el canto más alto de la mano y por tanto el único que puntúa. */
  wins: boolean;
}

export function CantoBadge({ canto, wins }: CantoBadgeProps) {
  return (
    <p className={`${styles['badge']} ${wins ? styles['wins'] : styles['loses']}`}>
      <strong>Cantó {cantoName(canto)}</strong>
      <span>
        {wins ? `Suma ${canto.points} al cerrar la mano` : 'No puntúa: hay un canto más alto'}
      </span>
    </p>
  );
}
