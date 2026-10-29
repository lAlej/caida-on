import type { MesaOrder } from '@caida/shared';
import { Modal } from '../../components/ui/Modal';
import styles from './dialogs.module.css';

interface MesaOrderDialogProps {
  onChoose: (order: MesaOrder) => void;
}

/** El repartidor decide en qué orden dice los números al echar la mesa. */
export function MesaOrderDialog({ onChoose }: MesaOrderDialogProps) {
  return (
    <Modal title="Eres quien reparte">
      <p className={styles['text']}>
        Elige en qué orden dices los números al echar las 4 cartas de la mesa. Cada carta que
        coincida con su número te da esos puntos.
      </p>
      <div className={styles['choices']}>
        <button type="button" className={styles['choice']} onClick={() => onChoose('ascending')}>
          1 · 2 · 3 · 4
        </button>
        <button type="button" className={styles['choice']} onClick={() => onChoose('descending')}>
          4 · 3 · 2 · 1
        </button>
      </div>
    </Modal>
  );
}
