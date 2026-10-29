import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ClientMessage } from '@caida/shared';
import { resolveWebSocketUrl } from '../config';
import { GameSocket } from '../net/GameSocket';
import { loadPlayerName, loadSessionToken, savePlayerName } from '../net/storage';
import { GameContext } from './GameContext';
import type { GameActions, GameContextValue } from './GameContext';
import { initialState, reducer } from './reducer';

/** Mantiene la conexión con el servidor y el estado de la aplicación. */
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [playerName, setPlayerNameState] = useState(loadPlayerName);
  const socketRef = useRef<GameSocket | null>(null);

  useEffect(() => {
    if (!playerName) return;

    const socket = new GameSocket({
      url: resolveWebSocketUrl(),
      sessionToken: loadSessionToken(),
      name: playerName,
      onStatus: (status) => dispatch({ type: 'connectionChanged', status }),
      onMessage: (message) => dispatch({ type: 'serverMessage', message }),
    });
    socketRef.current = socket;
    socket.start();

    return () => {
      socket.stop();
      socketRef.current = null;
    };
  }, [playerName]);

  const actions = useMemo<GameActions>(() => {
    const send = (message: ClientMessage) => {
      if (!socketRef.current?.send(message)) {
        dispatch({ type: 'localError', message: 'Sin conexión con el servidor.' });
      }
    };

    return {
      createRoom: (maxPlayers) => send({ type: 'createRoom', maxPlayers }),
      joinRoom: (code) => send({ type: 'joinRoom', code }),
      leaveRoom: () => send({ type: 'leaveRoom' }),
      addBot: () => send({ type: 'addBot' }),
      startGame: () => send({ type: 'startGame' }),
      chooseMesaOrder: (order) => send({ type: 'chooseMesaOrder', order }),
      playCard: (card) => send({ type: 'playCard', card }),
      dismissError: () => dispatch({ type: 'errorDismissed' }),
      dismissSummary: () => dispatch({ type: 'summaryDismissed' }),
      setPlayerName: (name) => {
        const trimmed = name.trim();
        savePlayerName(trimmed);
        setPlayerNameState(trimmed);
      },
    };
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({ state, playerName, actions }),
    [state, playerName, actions],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
