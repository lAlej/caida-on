import type { ServerMessage } from '@caida/shared';

/** Canal con un cliente. Abstrae el WebSocket para poder probar la lógica sin red. */
export interface Connection {
  readonly id: string;
  /** Nunca lanza: si el canal ya no sirve, el mensaje se descarta. */
  send(message: ServerMessage): void;
  close(code: number, reason: string): void;
}
