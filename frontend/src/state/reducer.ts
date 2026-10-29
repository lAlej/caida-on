import type {
  CountEntry,
  ErrorCode,
  GameEvent,
  PlayerId,
  RoomView,
  ServerMessage,
} from '@caida/shared';
import type { ConnectionStatus } from '../net/GameSocket';

const MAX_LOG_ENTRIES = 60;

export interface LogEntry {
  readonly id: number;
  readonly event: GameEvent;
}

export interface AppError {
  readonly id: number;
  readonly code: ErrorCode | 'OFFLINE';
  readonly message: string;
}

export interface Identity {
  readonly playerId: PlayerId;
  readonly name: string;
}

export interface AppState {
  readonly connection: ConnectionStatus;
  readonly identity: Identity | null;
  readonly room: RoomView | null;
  readonly log: readonly LogEntry[];
  /** Conteo de cartas al acabar una baraja, hasta que el jugador lo cierra. */
  readonly countSummary: readonly CountEntry[] | null;
  readonly error: AppError | null;
  /** Contador para dar un identificador único a cada entrada y error. */
  readonly nextId: number;
}

export type Action =
  | { type: 'connectionChanged'; status: ConnectionStatus }
  | { type: 'serverMessage'; message: ServerMessage }
  | { type: 'localError'; message: string }
  | { type: 'errorDismissed' }
  | { type: 'summaryDismissed' };

export const initialState: AppState = {
  connection: 'connecting',
  identity: null,
  room: null,
  log: [],
  countSummary: null,
  error: null,
  nextId: 1,
};

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'connectionChanged':
      return { ...state, connection: action.status };

    case 'localError':
      return {
        ...state,
        error: { id: state.nextId, code: 'OFFLINE', message: action.message },
        nextId: state.nextId + 1,
      };

    case 'errorDismissed':
      return { ...state, error: null };

    case 'summaryDismissed':
      return { ...state, countSummary: null };

    case 'serverMessage':
      return applyServerMessage(state, action.message);
  }
}

function applyServerMessage(state: AppState, message: ServerMessage): AppState {
  switch (message.type) {
    case 'identified':
      return { ...state, identity: { playerId: message.playerId, name: message.name } };

    case 'roomUpdate': {
      const sameRoom = state.room?.code === message.room.code;
      const entries = message.events.map((event, index) => ({ id: state.nextId + index, event }));
      const counted = message.events.find((event) => event.type === 'barajaCounted');

      return {
        ...state,
        room: message.room,
        log: [...(sameRoom ? state.log : []), ...entries].slice(-MAX_LOG_ENTRIES),
        countSummary:
          counted?.type === 'barajaCounted' ? counted.counts : sameRoom ? state.countSummary : null,
        nextId: state.nextId + entries.length,
      };
    }

    case 'roomLeft':
      return { ...state, room: null, log: [], countSummary: null };

    case 'error':
      return {
        ...state,
        error: { id: state.nextId, code: message.code, message: message.message },
        nextId: state.nextId + 1,
      };
  }
}
