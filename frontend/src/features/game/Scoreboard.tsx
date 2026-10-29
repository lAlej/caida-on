import type { GameView } from '@caida/shared';
import styles from './Scoreboard.module.css';

interface ScoreboardProps {
  game: GameView;
}

const percent = (value: number, total: number) => Math.min(100, (value / total) * 100);

/** Puntos de cada jugador hacia la meta; los del canto pendiente se dibujan rayados. */
export function Scoreboard({ game }: ScoreboardProps) {
  const rows = [...game.players]
    .map((player) => {
      const pending = player.id === game.cantoWinnerId ? (player.canto?.points ?? 0) : 0;
      return { player, pending: Math.min(pending, game.targetScore - player.score) };
    })
    .sort((a, b) => b.player.score - a.player.score);

  return (
    <section className={styles['panel']} aria-labelledby="scoreboard-title">
      <h2 id="scoreboard-title" className={styles['title']}>
        Marcador · meta {game.targetScore}
      </h2>
      <ul className={styles['list']}>
        {rows.map(({ player, pending }) => {
          const description = `${player.name}: ${player.score} de ${game.targetScore} puntos${
            pending ? `, más ${pending} pendientes por un canto` : ''
          }`;
          return (
            <li key={player.id} className={styles['row']}>
              <div className={styles['line']}>
                <span className={styles['name']}>{player.name}</span>
                <span className={styles['points']}>
                  <strong>{player.score}</strong> / {game.targetScore}
                  {pending > 0 && ` · +${pending} pendiente`}
                </span>
              </div>
              <div className={styles['bar']} role="img" aria-label={description}>
                <div
                  className={styles['fill']}
                  style={{ width: `${percent(player.score, game.targetScore)}%` }}
                />
                <div
                  className={styles['pending']}
                  style={{ width: `${percent(pending, game.targetScore)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
