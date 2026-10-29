import { useState } from 'react';
import type { FormEvent } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS, ROOM_CODE_LENGTH } from '@caida/shared';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { useGame } from '../../state/useGame';
import styles from './lobby.module.css';
import { useOpenRooms } from './useOpenRooms';

const PLAYER_OPTIONS = Array.from(
  { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
  (_, index) => MIN_PLAYERS + index,
);

const COUNT_HINT: Readonly<Record<number, string>> = {
  2: 'Al acabar la baraja, cada uno cuenta hasta 20 cartas; las que sobren son puntos.',
  3: 'Al acabar la baraja, el repartidor cuenta hasta 14 y los otros dos hasta 13.',
  4: 'Al acabar la baraja, cada uno cuenta hasta 10 cartas; las que sobren son puntos.',
};

export function LobbyPage() {
  const { state, playerName, actions } = useGame();
  const { rooms, failed } = useOpenRooms();
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [code, setCode] = useState('');

  const joinByCode = (event: FormEvent) => {
    event.preventDefault();
    if (code.length === ROOM_CODE_LENGTH) actions.joinRoom(code);
  };

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <span className={styles['wordmark']}>Caída</span>
        <div className={styles['user']}>
          <Avatar id={state.identity?.playerId ?? playerName} name={playerName} size="sm" />
          <span>{playerName}</span>
          <button
            type="button"
            className={styles['linkButton']}
            onClick={() => actions.setPlayerName('')}
          >
            Cambiar nombre
          </button>
        </div>
      </header>

      <main className={styles['content']}>
        <section className={styles['column']}>
          <div className={styles['hero']}>
            <h1 className={styles['headline']}>El clásico venezolano, en una mesa de cuatro.</h1>
            <p className={styles['lead']}>
              Llega a 24 puntos con caídas, cantos y cartas ganadas. Crea una sala y pásale el
              código a tus panas.
            </p>
          </div>

          <div className={styles['card']}>
            <h2 className={styles['cardTitle']}>Crear sala</h2>
            <div className={styles['field']}>
              <span className={styles['fieldLabel']} id="players-label">
                Jugadores
              </span>
              <div className={styles['segmented']} role="group" aria-labelledby="players-label">
                {PLAYER_OPTIONS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={styles['segment']}
                    aria-pressed={count === maxPlayers}
                    onClick={() => setMaxPlayers(count)}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className={styles['hint']}>{COUNT_HINT[maxPlayers]}</p>
            </div>
            <Button fullWidth onClick={() => actions.createRoom(maxPlayers)}>
              Crear sala
            </Button>
          </div>
        </section>

        <section className={styles['column']}>
          <form className={styles['card']} onSubmit={joinByCode}>
            <label className={styles['fieldLabel']} htmlFor="room-code">
              Unirse con código
            </label>
            <div className={styles['row']}>
              <input
                id="room-code"
                className={styles['codeInput']}
                value={code}
                maxLength={ROOM_CODE_LENGTH}
                placeholder="K7QX"
                autoComplete="off"
                autoCapitalize="characters"
                onChange={(event) => setCode(event.target.value.toUpperCase())}
              />
              <Button type="submit" variant="secondary" disabled={code.length !== ROOM_CODE_LENGTH}>
                Unirme
              </Button>
            </div>
          </form>

          <div className={styles['card']}>
            <h2 className={styles['cardTitle']}>Salas abiertas</h2>
            {rooms.length === 0 ? (
              <p className={styles['hint']}>
                {failed
                  ? 'No se pudo consultar las salas.'
                  : 'Nadie está esperando ahora. Crea la primera sala.'}
              </p>
            ) : (
              <ul className={styles['rooms']}>
                {rooms.map((room) => (
                  <li key={room.code} className={styles['room']}>
                    <Avatar id={room.code} name={room.hostName} />
                    <div className={styles['roomInfo']}>
                      <span className={styles['roomName']}>Sala de {room.hostName}</span>
                      <span className={styles['hint']}>
                        {room.code} · {room.playerCount} de {room.maxPlayers} jugadores
                      </span>
                    </div>
                    <Button variant="secondary" onClick={() => actions.joinRoom(room.code)}>
                      Unirme
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
