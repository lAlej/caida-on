import { useEffect } from 'react';
import { useGame } from '../../state/useGame';
import styles from './ErrorToast.module.css';

const AUTO_DISMISS_MS = 6000;

/** Aviso temporal con el último error del servidor. */
export function ErrorToast() {
  const { state, actions } = useGame();
  const error = state.error;
  const errorId = error?.id;
  const { dismissError } = actions;

  useEffect(() => {
    if (errorId === undefined) return;
    const timer = setTimeout(dismissError, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [errorId, dismissError]);

  if (!error) return null;

  return (
    <div className={styles['toast']} role="alert">
      <span>{error.message}</span>
      <button type="button" className={styles['close']} onClick={dismissError}>
        Cerrar
      </button>
    </div>
  );
}
