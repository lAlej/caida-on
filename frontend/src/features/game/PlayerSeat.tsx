import type { PlayerView } from '@caida/shared';
import { Card } from '../../components/cards/Card';
import { Avatar } from '../../components/ui/Avatar';
import { CantoBadge } from './CantoBadge';
import styles from './PlayerSeat.module.css';

interface PlayerSeatProps {
  player: PlayerView;
  targetScore: number;
  isYou: boolean;
  /** Es su turno, o le toca echar la mesa. */
  isActor: boolean;
  /** Su canto es el que puntuará al cerrar la mano. */
  cantoWins: boolean;
  /**
   * Un rival muestra su mano boca abajo y su canto. Tú ves tu mano y tu canto aparte,
   * así que tu asiento no reserva ese espacio.
   */
  isOpponent: boolean;
}

/**
 * Los espacios de la mano, las etiquetas y el canto se reservan aunque estén vacíos:
 * así el asiento mide siempre lo mismo y el tablero no salta cuando algo aparece o se va.
 */
export function PlayerSeat({
  player,
  targetScore,
  isYou,
  isActor,
  cantoWins,
  isOpponent,
}: PlayerSeatProps) {
  return (
    <div className={styles['seat']}>
      <div className={`${styles['badge']} ${isActor ? styles['active'] : ''}`}>
        <Avatar id={player.id} name={player.name} />
        <div className={styles['info']}>
          <span className={styles['name']}>
            {player.name}
            {isYou && ' (tú)'}
          </span>
          <span className={styles['stats']}>
            {player.score} / {targetScore} pts · {player.pileCount} ganadas
          </span>
        </div>
      </div>

      {isOpponent && (
        <div className={styles['fan']} role="img" aria-label={`${player.handCount} cartas en mano`}>
          {Array.from({ length: player.handCount }, (_, index) => (
            <Card key={index} size="xs" />
          ))}
        </div>
      )}

      <div className={styles['tags']}>
        {player.isDealer && <span className={styles['tag']}>Reparte</span>}
        {player.isBot && <span className={styles['tag']}>Bot</span>}
        {!player.isBot && !player.connected && (
          <span className={`${styles['tag']} ${styles['warn']}`}>Desconectado</span>
        )}
      </div>

      {isOpponent && (
        <div className={styles['cantoSlot']}>
          {player.canto && <CantoBadge canto={player.canto} wins={cantoWins} />}
        </div>
      )}
    </div>
  );
}
