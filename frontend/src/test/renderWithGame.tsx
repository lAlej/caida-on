import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';
import { GameContext } from '../state/GameContext';
import type { GameActions } from '../state/GameContext';
import { initialState } from '../state/reducer';
import type { AppState } from '../state/reducer';

export function makeActions(): { [K in keyof GameActions]: ReturnType<typeof vi.fn> } {
  return {
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    addBot: vi.fn(),
    startGame: vi.fn(),
    chooseMesaOrder: vi.fn(),
    playCard: vi.fn(),
    dismissError: vi.fn(),
    dismissSummary: vi.fn(),
    setPlayerName: vi.fn(),
  };
}

interface Options {
  state?: Partial<AppState>;
  playerName?: string;
}

/** Dibuja un componente con un contexto de juego falso y devuelve las acciones espiadas. */
export function renderWithGame(ui: ReactElement, { state, playerName = 'Ana' }: Options = {}) {
  const actions = makeActions();
  const result = render(
    <GameContext.Provider
      value={{ state: { ...initialState, ...state }, playerName, actions: actions as GameActions }}
    >
      {ui}
    </GameContext.Provider>,
  );
  return { ...result, actions };
}
