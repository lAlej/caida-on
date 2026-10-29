import type { Card, GameView } from '@caida/shared';
import { Button } from '../../components/ui/Button';
import { rankName } from '../../lib/cards';
import type { PlayPreview } from './capturePreview';
import styles from './ActionBar.module.css';

interface ActionBarProps {
  game: GameView;
  selected: Card | null;
  preview: PlayPreview | null;
  onPlay: () => void;
}

export function describePreview(selected: Card, preview: PlayPreview | null): string {
  if (!preview) {
    return `No hay un ${rankName(selected.rank)} en la mesa: la carta se queda sobre el tapete.`;
  }
  const parts = [`Te llevas ${preview.captured.map((card) => rankName(card.rank)).join(' · ')}`];
  if (preview.caida) parts.push('¡Caída!');
  if (preview.mesaLimpia) parts.push('¡Mesa limpia!');
  if (preview.points > 0) parts.push(`+${preview.points} pts`);
  return parts.join(' · ');
}

export function playLabel(preview: PlayPreview | null): string {
  if (!preview) return 'Jugar: queda en la mesa';
  const count = preview.captured.length;
  const cards = `${count} ${count === 1 ? 'carta' : 'cartas'}`;
  return preview.caida ? `¡Caída! Jugar y recoger ${cards}` : `Jugar y recoger ${cards}`;
}

/** Qué pasaría con la carta elegida y el botón para jugarla. */
export function ActionBar({ game, selected, preview, onPlay }: ActionBarProps) {
  const myTurn = game.phase === 'playing' && game.actorId === game.youId;
  const actorName = game.players.find((player) => player.id === game.actorId)?.name;

  let status = '';
  if (game.phase === 'playing') {
    if (!myTurn) status = `Turno de ${actorName ?? 'otro jugador'}.`;
    else if (!selected) status = 'Elige una carta de tu mano.';
    else status = describePreview(selected, preview);
  }

  return (
    <div className={styles['bar']}>
      <p className={styles['status']} aria-live="polite">
        {status}
      </p>
      <Button onClick={onPlay} disabled={!myTurn || !selected}>
        {selected ? playLabel(preview) : 'Jugar'}
      </Button>
    </div>
  );
}
