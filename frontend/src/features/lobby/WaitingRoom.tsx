import { useState } from 'react';
import { MIN_PLAYERS } from '@caida/shared';
import type { RoomView } from '@caida/shared';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { useGame } from '../../state/useGame';
import styles from './lobby.module.css';

interface WaitingRoomProps {
  room: RoomView;
}

export function WaitingRoom({ room }: WaitingRoomProps) {
  const { actions } = useGame();
  const [copied, setCopied] = useState(false);

  const isHost = room.hostId === room.youId;
  const isFull = room.seats.length >= room.maxPlayers;
  const canStart = room.seats.length >= MIN_PLAYERS;
  const emptySeats = Array.from({ length: room.maxPlayers - room.seats.length }, (_, i) => i);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso para el portapapeles: el código sigue visible para copiarlo a mano.
    }
  };

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <span className={styles['wordmark']}>Caída</span>
      </header>

      <main className={styles['content']}>
        <section className={styles['column']}>
          <div className={styles['card']}>
            <h1 className={styles['cardTitle']}>Código de la sala</h1>
            <div className={styles['code']}>
              <span className={styles['codeValue']} aria-label={room.code.split('').join(' ')}>
                {room.code}
              </span>
              <Button variant="secondary" onClick={copyCode}>
                {copied ? '¡Copiado!' : 'Copiar'}
              </Button>
            </div>
            <p className={styles['hint']}>Pásalo a quien quieras que juegue contigo.</p>
          </div>
        </section>

        <section className={styles['column']}>
          <div className={styles['card']}>
            <h2 className={styles['cardTitle']}>
              Jugadores · {room.seats.length} de {room.maxPlayers}
            </h2>
            <ul className={styles['seats']}>
              {room.seats.map((seat) => (
                <li key={seat.playerId} className={styles['seat']}>
                  <Avatar id={seat.playerId} name={seat.name} />
                  <span>{seat.name}</span>
                  {seat.playerId === room.youId && <span className={styles['tag']}>Tú</span>}
                  {seat.isBot && <span className={styles['tag']}>Bot</span>}
                  {seat.playerId === room.hostId && (
                    <span className={styles['tag']}>Anfitrión</span>
                  )}
                </li>
              ))}
              {emptySeats.map((index) => (
                <li key={`empty-${index}`} className={`${styles['seat']} ${styles['seatEmpty']}`}>
                  Esperando jugador…
                </li>
              ))}
            </ul>

            {isHost ? (
              <div className={styles['actions']}>
                <Button variant="secondary" disabled={isFull} onClick={actions.addBot}>
                  Añadir bot
                </Button>
                <Button disabled={!canStart} onClick={actions.startGame}>
                  Empezar partida
                </Button>
              </div>
            ) : (
              <p className={styles['hint']}>Esperando a que el anfitrión empiece la partida…</p>
            )}
            {isHost && !canStart && (
              <p className={styles['hint']}>
                Hacen falta al menos {MIN_PLAYERS} jugadores. Puedes añadir un bot.
              </p>
            )}
            <Button variant="secondary" onClick={actions.leaveRoom}>
              Salir de la sala
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
