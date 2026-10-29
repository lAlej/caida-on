import type { GameEvent, PlayerId, RoomView } from './view';

/** Código de cierre cuando la sesión se abre en otra pestaña y esta queda reemplazada. */
export const CLOSE_CODE_REPLACED = 4001;

export const MAX_NAME_LENGTH = 20;
export const ROOM_CODE_LENGTH = 4;

export const ERROR_CODES = [
  'INVALID_MESSAGE',
  'NOT_IDENTIFIED',
  'ALREADY_IN_ROOM',
  'NOT_IN_ROOM',
  'ROOM_NOT_FOUND',
  'ROOM_FULL',
  'NOT_HOST',
  'GAME_IN_PROGRESS',
  'GAME_NOT_STARTED',
  'NOT_ENOUGH_PLAYERS',
  'NOT_YOUR_TURN',
  'INVALID_ACTION',
  'CARD_NOT_IN_HAND',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** Mensajes que el servidor envía al cliente. */
export type ServerMessage =
  | { type: 'identified'; playerId: PlayerId; name: string }
  | { type: 'roomUpdate'; room: RoomView; events: GameEvent[] }
  | { type: 'roomLeft' }
  | { type: 'error'; code: ErrorCode; message: string };
