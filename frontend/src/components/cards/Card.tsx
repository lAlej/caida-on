import type { Card as CardData } from '@caida/shared';
import { cardName, figureLabel } from '../../lib/cards';
import styles from './Card.module.css';
import { SuitIcon } from './SuitIcon';

export type CardSize = 'xs' | 'sm' | 'md' | 'lg';

/**
 * - `selected`: la carta elegida en la mano.
 * - `hit`: carta de la mesa que se llevaría la jugada elegida.
 * - `last`: la última carta lanzada.
 * - `dim`: carta apagada.
 */
export type CardState = 'normal' | 'selected' | 'hit' | 'last' | 'dim';

interface CardProps {
  /** Sin carta, se dibuja boca abajo. */
  card?: CardData;
  size?: CardSize;
  state?: CardState;
}

const SHOWS_FIGURE_LABEL: ReadonlySet<CardSize> = new Set(['md', 'lg']);

export function Card({ card, size = 'md', state = 'normal' }: CardProps) {
  const classes = [styles['card'], styles[size], styles[state]].filter(Boolean).join(' ');

  if (!card) {
    return (
      <span className={`${classes} ${styles['back']}`} role="img" aria-label="Carta boca abajo" />
    );
  }

  const label = SHOWS_FIGURE_LABEL.has(size) ? figureLabel(card.rank) : null;

  return (
    <span className={`${classes} ${styles['face']}`} role="img" aria-label={cardName(card)}>
      <span className={`${styles['corner']} ${styles[card.suit]}`} aria-hidden="true">
        <span className={styles['rank']}>{card.rank}</span>
        <SuitIcon suit={card.suit} className={styles['pip']} />
      </span>
      <SuitIcon suit={card.suit} className={`${styles['center']} ${styles[card.suit]}`} />
      {label && (
        <span className={styles['label']} aria-hidden="true">
          {label}
        </span>
      )}
    </span>
  );
}
