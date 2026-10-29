import type { CountEntry, PlayerId } from '@caida/shared';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import styles from './dialogs.module.css';

interface CountSummaryDialogProps {
  counts: readonly CountEntry[];
  nameOf: (playerId: PlayerId) => string;
  onClose: () => void;
}

/** Resultado del conteo de cartas al terminar una baraja. */
export function CountSummaryDialog({ counts, nameOf, onClose }: CountSummaryDialogProps) {
  return (
    <Modal title="Se acabó la baraja" onClose={onClose}>
      <p className={styles['text']}>Cada jugador cuenta sus cartas; las que sobran son puntos.</p>
      <ul className={styles['list']}>
        {counts.map((entry) => (
          <li key={entry.playerId} className={styles['row']}>
            <span className={styles['rowName']}>{nameOf(entry.playerId)}</span>
            <span className={styles['rowValue']}>
              {entry.cards} cartas ·{' '}
              {entry.points > 0 ? <strong>+{entry.points} pts</strong> : 'sin puntos'}
            </span>
          </li>
        ))}
      </ul>
      <Button fullWidth onClick={onClose}>
        Continuar
      </Button>
    </Modal>
  );
}
