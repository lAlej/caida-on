import { CLOSE_CODE_REPLACED, clientMessageSchema } from '@caida/shared';
import type { ClientMessage, ErrorCode } from '@caida/shared';
import { AppError } from '../errors';
import type { Logger } from '../logger';
import type { Room } from '../rooms/Room';
import type { RoomManager } from '../rooms/RoomManager';
import type { Session, SessionStore } from '../sessions/SessionStore';
import type { Connection } from './Connection';

/** Cuando una sala deja de existir, sus jugadores ya no pertenecen a ninguna. */
export function releaseRoomSessions(sessions: SessionStore, room: Room): void {
  for (const playerId of room.humanIds()) {
    const session = sessions.findByPlayerId(playerId);
    if (session?.roomCode === room.code) session.roomCode = null;
  }
}

/**
 * Recibe los mensajes ya decodificados de cada conexión y los traduce en acciones
 * sobre sesiones y salas. No sabe nada de WebSocket: trabaja con `Connection`.
 */
export class GameServer {
  private readonly sessionOf = new Map<Connection, Session>();

  constructor(
    private readonly sessions: SessionStore,
    private readonly rooms: RoomManager,
    private readonly logger: Logger,
  ) {}

  handleMessage(connection: Connection, raw: unknown): void {
    const parsed = clientMessageSchema.safeParse(raw);
    if (!parsed.success) {
      this.sendError(connection, 'INVALID_MESSAGE', 'El mensaje no es válido.');
      return;
    }

    try {
      this.dispatch(connection, parsed.data);
    } catch (error) {
      if (error instanceof AppError) {
        this.sendError(connection, error.code, error.message);
        return;
      }
      this.logger.error('Error inesperado al procesar un mensaje', {
        type: parsed.data.type,
        error,
      });
      this.sendError(connection, 'INTERNAL_ERROR', 'Algo salió mal en el servidor.');
    }
  }

  handleClose(connection: Connection): void {
    const session = this.sessionOf.get(connection);
    this.sessionOf.delete(connection);
    // Si la conexión ya fue reemplazada por otra, la sesión sigue viva y no hay nada que hacer.
    if (!session || !this.sessions.detach(session, connection)) return;

    const room = session.roomCode ? this.rooms.get(session.roomCode) : undefined;
    room?.markDisconnected(session.playerId);
    if (!room?.has(session.playerId)) session.roomCode = null;
  }

  private dispatch(connection: Connection, message: ClientMessage): void {
    if (message.type === 'identify') {
      this.identify(connection, message.sessionToken, message.name);
      return;
    }

    const session = this.sessionOf.get(connection);
    if (!session) throw new AppError('NOT_IDENTIFIED', 'Primero debes identificarte.');
    const identity = { playerId: session.playerId, name: session.name };

    switch (message.type) {
      case 'createRoom': {
        this.assertNotInRoom(session);
        session.roomCode = this.rooms.create(identity, message.maxPlayers).code;
        return;
      }
      case 'joinRoom': {
        this.assertNotInRoom(session);
        const room = this.rooms.get(message.code);
        if (!room) throw new AppError('ROOM_NOT_FOUND', 'No existe una sala con ese código.');
        room.join(identity);
        session.roomCode = room.code;
        return;
      }
      case 'leaveRoom': {
        this.currentRoom(session).leave(session.playerId);
        session.roomCode = null;
        connection.send({ type: 'roomLeft' });
        return;
      }
      case 'addBot':
        this.currentRoom(session).addBot(session.playerId);
        return;
      case 'startGame':
        this.currentRoom(session).start(session.playerId);
        return;
      case 'chooseMesaOrder':
        this.currentRoom(session).chooseMesaOrder(session.playerId, message.order);
        return;
      case 'playCard':
        this.currentRoom(session).playCard(session.playerId, message.card);
        return;
      default:
        message satisfies never;
    }
  }

  private identify(connection: Connection, token: string, name: string): void {
    const known = this.sessionOf.get(connection);
    if (known && known.token !== token) {
      throw new AppError('INVALID_MESSAGE', 'Esta conexión ya está identificada.');
    }

    const session = this.sessions.identify(token, name);
    const previous = this.sessions.attach(session, connection);
    this.sessionOf.set(connection, session);
    if (previous) {
      // La pestaña anterior queda fuera; su cierre ya no afecta a la sesión.
      this.sessionOf.delete(previous);
      previous.close(CLOSE_CODE_REPLACED, 'Sesión abierta en otra pestaña');
    }

    connection.send({ type: 'identified', playerId: session.playerId, name: session.name });
    this.resumeRoom(session);
  }

  /** Si el jugador tenía una sala, vuelve a su asiento y recibe el estado actual. */
  private resumeRoom(session: Session): void {
    if (!session.roomCode) return;
    const room = this.rooms.get(session.roomCode);
    if (room?.has(session.playerId)) room.markReconnected(session.playerId);
    else session.roomCode = null;
  }

  private assertNotInRoom(session: Session): void {
    const room = session.roomCode ? this.rooms.get(session.roomCode) : undefined;
    if (room?.has(session.playerId)) {
      throw new AppError('ALREADY_IN_ROOM', 'Ya estás en una sala.');
    }
    session.roomCode = null;
  }

  private currentRoom(session: Session): Room {
    const room = session.roomCode ? this.rooms.get(session.roomCode) : undefined;
    if (!room?.has(session.playerId)) {
      session.roomCode = null;
      throw new AppError('NOT_IN_ROOM', 'No estás en ninguna sala.');
    }
    return room;
  }

  private sendError(connection: Connection, code: ErrorCode, message: string): void {
    connection.send({ type: 'error', code, message });
  }
}
