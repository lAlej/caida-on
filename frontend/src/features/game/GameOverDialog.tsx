import type { GameView, WinReason } from '@caida/shared';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import styles from './dialogs.module.css';

interface GameOverDialogProps {
  game: GameView;
  onLeave: () => void;
}

const REASON_TEXT: Readonly<Record<WinReason, string>> = {
  instant: 'llegó a la meta con una jugada.',
  canto: 'llegó a la meta con su canto.',
  cards: 'llegó a la meta al contar las cartas.',
};

export function GameOverDialog({ game, onLeave }: GameOverDialogProps) {
  const result = game.result;
  if (!result) return null;

  const winner = game.players.find((player) => player.id === result.winnerId);
  const youWon = result.winnerId === game.youId;
  const ranking = [...game.players].sort((a, b) => b.score - a.score);

  return (
    <Modal title="Fin de la partida">
      <p className={styles['winner']}>
        {youWon ? '¡Ganaste!' : `Ganó ${winner?.name ?? 'otro jugador'}`}
      </p>
      <p className={styles['text']}>
        {youWon ? 'Tú' : (winner?.name ?? 'Alguien')} {REASON_TEXT[result.reason]}
      </p>
      <ul className={styles['list']}>
        {ranking.map((player) => (
          <li key={player.id} className={styles['row']}>
            <span className={styles['rowName']}>{player.name}</span>
            <span className={styles['rowValue']}>
              <strong>{player.score}</strong> / {game.targetScore}
            </span>
          </li>
        ))}
      </ul>
      <Button fullWidth onClick={onLeave}>
        Salir de la sala
      </Button>
    </Modal>
  );
}
