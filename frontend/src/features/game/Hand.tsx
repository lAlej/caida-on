import { isSameCard } from '@caida/shared';
import type { Card as CardData } from '@caida/shared';
import { Card } from '../../components/cards/Card';
import type { CardSize } from '../../components/cards/Card';
import { cardName } from '../../lib/cards';
import styles from './Hand.module.css';
import { CARD_HEIGHT, CARD_WIDTH } from './tableLayout';

/** Espacio sobre las cartas donde sube la elegida; coincide con el relleno de `.hand`. */
const LIFT_SPACE = 18;
const HAND_SIZE = 3;
const HAND_GAP = 14;

interface HandProps {
  hand: readonly CardData[];
  selected: CardData | null;
  size: CardSize;
  onSelect: (card: CardData) => void;
}

/**
 * Tu mano: se elige una carta a la vez. Reserva el espacio de 3 cartas aunque queden menos,
 * para que el tablero no cambie de tamaño a medida que juegas.
 */
export function Hand({ hand, selected, size, onSelect }: HandProps) {
  const reserved = {
    minHeight: CARD_HEIGHT[size] + LIFT_SPACE,
    minWidth: CARD_WIDTH[size] * HAND_SIZE + HAND_GAP * (HAND_SIZE - 1),
  };

  return (
    <ul className={styles['hand']} style={reserved} aria-label="Tu mano">
      {hand.map((card) => {
        const isSelected = selected !== null && isSameCard(card, selected);
        return (
          <li key={`${card.rank}-${card.suit}`}>
            <button
              type="button"
              className={styles['card']}
              aria-pressed={isSelected}
              aria-label={cardName(card)}
              onClick={() => onSelect(card)}
            >
              <Card card={card} size={size} state={isSelected ? 'selected' : 'normal'} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
