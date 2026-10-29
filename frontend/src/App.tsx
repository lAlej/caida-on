import { ConnectionBanner } from './components/ui/ConnectionBanner';
import { ErrorToast } from './components/ui/ErrorToast';
import { GamePage } from './features/game/GamePage';
import { LobbyPage } from './features/lobby/LobbyPage';
import { NamePage } from './features/lobby/NamePage';
import { WaitingRoom } from './features/lobby/WaitingRoom';
import { GameProvider } from './state/GameProvider';
import { useGame } from './state/useGame';
import styles from './App.module.css';

export function App() {
  return (
    <GameProvider>
      <Screen />
    </GameProvider>
  );
}

function Screen() {
  const { state, playerName } = useGame();
  const { room, identity } = state;

  return (
    <>
      <ConnectionBanner />
      {!playerName ? (
        <NamePage />
      ) : !identity ? (
        <p className={styles['splash']} role="status">
          Conectando…
        </p>
      ) : !room ? (
        <LobbyPage />
      ) : room.status === 'lobby' || !room.game ? (
        <WaitingRoom room={room} />
      ) : (
        <GamePage room={room} game={room.game} />
      )}
      <ErrorToast />
    </>
  );
}
