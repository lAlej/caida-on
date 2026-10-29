import { useGame } from '../../state/useGame';
import { Button } from './Button';
import styles from './ConnectionBanner.module.css';

/** Avisa cuando se pierde la conexión o la sesión se abrió en otra pestaña. */
export function ConnectionBanner() {
  const { state } = useGame();

  if (state.connection === 'reconnecting') {
    return (
      <div className={styles['banner']} role="status">
        Se perdió la conexión. Reconectando… Si tardas, un bot juega por ti.
      </div>
    );
  }

  if (state.connection === 'replaced') {
    return (
      <div className={styles['banner']} role="alert">
        <span>Abriste Caída en otra pestaña, y esa es la que juega ahora.</span>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Jugar desde esta pestaña
        </Button>
      </div>
    );
  }

  return null;
}
