import { createContext } from 'react';
import type { Card, MesaOrder } from '@caida/shared';
import type { AppState } from './reducer';

export interface GameActions {
  createRoom(maxPlayers: number): void;
  joinRoom(code: string): void;
  leaveRoom(): void;
  addBot(): void;
  startGame(): void;
  chooseMesaOrder(order: MesaOrder): void;
  playCard(card: Card): void;
  dismissError(): void;
  dismissSummary(): void;
  setPlayerName(name: string): void;
}

export interface GameContextValue {
  readonly state: AppState;
  /** Nombre guardado en este navegador; vacío si todavía no se ha elegido. */
  readonly playerName: string;
  readonly actions: GameActions;
}

export const GameContext = createContext<GameContextValue | null>(null);
