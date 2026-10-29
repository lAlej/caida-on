import { randomUUID } from 'node:crypto';
import type { PlayerId, ServerMessage } from '@caida/shared';
import type { Connection } from '../server/Connection';

export interface Session {
  /** Secreto del cliente; nunca se envía a nadie. */
  readonly token: string;
  /** Identidad pública del jugador, la que ven los demás. */
  readonly playerId: PlayerId;
  name: string;
  roomCode: string | null;
  connection: Connection | null;
  lastSeenAt: number;
}

/**
 * Sesiones en memoria. El cliente guarda su token y lo presenta al conectarse, así
 * puede volver a su partida tras recargar o perder la conexión.
 */
export class SessionStore {
  private readonly byToken = new Map<string, Session>();
  private readonly byPlayerId = new Map<PlayerId, Session>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly generateId: () => string = randomUUID,
  ) {}

  /** Devuelve la sesión de ese token (o crea una nueva) y actualiza el nombre. */
  identify(token: string, name: string): Session {
    let session = this.byToken.get(token);
    if (!session) {
      session = {
        token,
        playerId: this.generateId(),
        name,
        roomCode: null,
        connection: null,
        lastSeenAt: this.now(),
      };
      this.byToken.set(token, session);
      this.byPlayerId.set(session.playerId, session);
    }
    session.name = name;
    session.lastSeenAt = this.now();
    return session;
  }

  findByPlayerId(playerId: PlayerId): Session | undefined {
    return this.byPlayerId.get(playerId);
  }

  /** Asocia la conexión a la sesión y devuelve la anterior, si había otra. */
  attach(session: Session, connection: Connection): Connection | null {
    const previous = session.connection;
    session.connection = connection;
    session.lastSeenAt = this.now();
    return previous !== connection ? previous : null;
  }

  /** Suelta la conexión. Devuelve `false` si ya había sido reemplazada por otra. */
  detach(session: Session, connection: Connection): boolean {
    if (session.connection !== connection) return false;
    session.connection = null;
    session.lastSeenAt = this.now();
    return true;
  }

  /** Envía un mensaje al jugador si está conectado. */
  send(playerId: PlayerId, message: ServerMessage): void {
    this.byPlayerId.get(playerId)?.connection?.send(message);
  }

  /** Elimina las sesiones sin conexión ni sala que llevan más de `maxIdleMs` inactivas. */
  prune(maxIdleMs: number): number {
    let removed = 0;
    for (const session of this.byToken.values()) {
      const idle = !session.connection && !session.roomCode;
      if (idle && this.now() - session.lastSeenAt > maxIdleMs) {
        this.byToken.delete(session.token);
        this.byPlayerId.delete(session.playerId);
        removed++;
      }
    }
    return removed;
  }
}
