import { useState } from 'react';
import type { FormEvent } from 'react';
import { MAX_NAME_LENGTH } from '@caida/shared';
import { Button } from '../../components/ui/Button';
import { useGame } from '../../state/useGame';
import styles from './lobby.module.css';

export function NamePage() {
  const { actions } = useGame();
  const [name, setName] = useState('');
  const canSubmit = name.trim().length > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canSubmit) actions.setPlayerName(name);
  };

  return (
    <main className={styles['centered']}>
      <form className={styles['form']} onSubmit={submit}>
        <h1 className={styles['wordmark']}>Caída</h1>
        <p className={styles['lead']}>El juego de cartas venezolano, en línea.</p>
        <div className={styles['field']}>
          <label className={styles['fieldLabel']} htmlFor="player-name">
            ¿Cómo te llamas?
          </label>
          <input
            id="player-name"
            className={styles['input']}
            value={name}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="nickname"
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={!canSubmit} fullWidth>
          Entrar
        </Button>
      </form>
    </main>
  );
}
