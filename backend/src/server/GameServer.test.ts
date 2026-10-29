import { CLOSE_CODE_REPLACED } from '@caida/shared';
import type { ClientMessage } from '@caida/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSeededRandom } from '../game/random';
import type { Logger } from '../logger';
import { RoomManager } from '../rooms/RoomManager';
import { FakeScheduler } from '../rooms/testHelpers';
import { SessionStore } from '../sessions/SessionStore';
import { GameServer, releaseRoomSessions } from './GameServer';
import { FakeConnection } from './testHelpers';

const TOKEN_ANA = 'token-secreto-de-ana-0001';
const TOKEN_BETO = 'token-secreto-de-beto-002';

let sessions: SessionStore;
let rooms: RoomManager;
let server: GameServer;
let scheduler: FakeScheduler;
let logger: Logger;

beforeEach(() => {
  scheduler = new FakeScheduler();
  sessions = new SessionStore();
  logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  rooms = new RoomManager(
    {
      random: createSeededRandom(3),
      botDelayMs: 0,
      idleTimeoutMs: 1000,
      logger,
      schedule: scheduler.schedule,
      publish: (playerId, message) => sessions.send(playerId, message),
    },
    (room) => releaseRoomSessions(sessions, room),
  );
  server = new GameServer(sessions, rooms, logger);
});

function connect(id: string, token?: string, name = 'Jugador'): FakeConnection {
  const connection = new FakeConnection(id);
  if (token) send(connection, { type: 'identify', sessionToken: token, name });
  return connection;
}

const send = (connection: FakeConnection, message: ClientMessage) =>
  server.handleMessage(connection, message);

describe('GameServer · mensajes', () => {
  it('rechaza los mensajes mal formados', () => {
    const connection = connect('1');
    server.handleMessage(connection, { type: 'hack' });
    expect(connection.last('error')).toMatchObject({ code: 'INVALID_MESSAGE' });
  });

  it('exige identificarse antes de cualquier otra acción', () => {
    const connection = connect('1');
    send(connection, { type: 'createRoom', maxPlayers: 4 });
    expect(connection.last('error')).toMatchObject({ code: 'NOT_IDENTIFIED' });
  });

  it('identify devuelve el playerId público', () => {
    const connection = connect('1', TOKEN_ANA, 'Ana');
    const identified = connection.last('identified');
    expect(identified.name).toBe('Ana');
    expect(identified.playerId).not.toBe(TOKEN_ANA);
  });

  it('no deja re-identificar una conexión con otro token', () => {
    const connection = connect('1', TOKEN_ANA);
    send(connection, { type: 'identify', sessionToken: TOKEN_BETO, name: 'Beto' });
    expect(connection.last('error')).toMatchObject({ code: 'INVALID_MESSAGE' });
  });

  it('un error inesperado se registra y el cliente solo recibe un mensaje genérico', () => {
    const connection = connect('1', TOKEN_ANA);
    vi.spyOn(rooms, 'create').mockImplementation(() => {
      throw new Error('detalle interno');
    });
    send(connection, { type: 'createRoom', maxPlayers: 2 });

    const error = connection.last('error');
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.message).not.toContain('detalle interno');
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('GameServer · salas', () => {
  it('crear una sala manda al anfitrión su estado', () => {
    const ana = connect('1', TOKEN_ANA, 'Ana');
    send(ana, { type: 'createRoom', maxPlayers: 3 });

    const { room } = ana.last('roomUpdate');
    expect(room).toMatchObject({ status: 'lobby', maxPlayers: 3 });
    expect(room.hostId).toBe(ana.last('identified').playerId);
  });

  it('otro jugador se une con el código, en minúsculas también', () => {
    const ana = connect('1', TOKEN_ANA, 'Ana');
    const beto = connect('2', TOKEN_BETO, 'Beto');
    send(ana, { type: 'createRoom', maxPlayers: 4 });
    const code = ana.last('roomUpdate').room.code;

    send(beto, { type: 'joinRoom', code: code.toLowerCase() });

    expect(ana.last('roomUpdate').room.seats.map((s) => s.name)).toEqual(['Ana', 'Beto']);
    expect(beto.last('roomUpdate').room.youId).toBe(beto.last('identified').playerId);
  });

  it('unirse a una sala que no existe da error', () => {
    const beto = connect('2', TOKEN_BETO);
    send(beto, { type: 'joinRoom', code: 'ZZZZ' });
    expect(beto.last('error')).toMatchObject({ code: 'ROOM_NOT_FOUND' });
  });

  it('no se puede estar en dos salas a la vez', () => {
    const ana = connect('1', TOKEN_ANA);
    send(ana, { type: 'createRoom', maxPlayers: 4 });
    send(ana, { type: 'createRoom', maxPlayers: 4 });
    expect(ana.last('error')).toMatchObject({ code: 'ALREADY_IN_ROOM' });
  });

  it('las acciones de sala sin estar en una dan error', () => {
    const ana = connect('1', TOKEN_ANA);
    send(ana, { type: 'startGame' });
    expect(ana.last('error')).toMatchObject({ code: 'NOT_IN_ROOM' });
  });

  it('solo el anfitrión empieza la partida', () => {
    const ana = connect('1', TOKEN_ANA);
    const beto = connect('2', TOKEN_BETO);
    send(ana, { type: 'createRoom', maxPlayers: 4 });
    send(beto, { type: 'joinRoom', code: ana.last('roomUpdate').room.code });

    send(beto, { type: 'startGame' });
    expect(beto.last('error')).toMatchObject({ code: 'NOT_HOST' });
  });

  it('salir avisa al que sale y actualiza a los demás', () => {
    const ana = connect('1', TOKEN_ANA);
    const beto = connect('2', TOKEN_BETO);
    send(ana, { type: 'createRoom', maxPlayers: 4 });
    send(beto, { type: 'joinRoom', code: ana.last('roomUpdate').room.code });

    send(beto, { type: 'leaveRoom' });

    expect(beto.has('roomLeft')).toBe(true);
    expect(ana.last('roomUpdate').room.seats).toHaveLength(1);
    send(beto, { type: 'createRoom', maxPlayers: 2 });
    expect(beto.has('error')).toBe(false);
  });

  it('cuando se cierra la sala sus jugadores quedan libres para crear otra', () => {
    const ana = connect('1', TOKEN_ANA);
    send(ana, { type: 'createRoom', maxPlayers: 2 });
    send(ana, { type: 'leaveRoom' });

    send(ana, { type: 'createRoom', maxPlayers: 2 });
    expect(ana.has('error')).toBe(false);
    expect(rooms.listOpen()).toHaveLength(1);
  });
});

describe('GameServer · conexiones', () => {
  it('cerrar la conexión en el lobby saca al jugador de la sala', () => {
    const ana = connect('1', TOKEN_ANA);
    const beto = connect('2', TOKEN_BETO);
    send(ana, { type: 'createRoom', maxPlayers: 4 });
    send(beto, { type: 'joinRoom', code: ana.last('roomUpdate').room.code });

    server.handleClose(beto);
    expect(ana.last('roomUpdate').room.seats).toHaveLength(1);
  });

  it('una pestaña nueva con el mismo token reemplaza a la anterior', () => {
    const first = connect('1', TOKEN_ANA, 'Ana');
    const second = connect('2', TOKEN_ANA, 'Ana');

    expect(first.closed).toEqual({ code: CLOSE_CODE_REPLACED, reason: expect.any(String) });
    expect(second.last('identified').playerId).toBe(first.last('identified').playerId);
  });

  it('cerrar la pestaña reemplazada no desconecta al jugador', () => {
    const first = connect('1', TOKEN_ANA);
    const beto = connect('2', TOKEN_BETO);
    send(first, { type: 'createRoom', maxPlayers: 4 });
    send(beto, { type: 'joinRoom', code: first.last('roomUpdate').room.code });
    send(beto, { type: 'addBot' });
    send(first, { type: 'startGame' });

    const second = connect('3', TOKEN_ANA);
    server.handleClose(first);

    const ana = beto
      .last('roomUpdate')
      .room.game?.players.find((p) => p.name !== 'Beto' && !p.isBot);
    expect(ana?.connected).toBe(true);
    expect(second.last('roomUpdate').room.status).toBe('playing');
  });

  it('en partida, al desconectarse un bot toma el asiento y al volver lo recupera', () => {
    const ana = connect('1', TOKEN_ANA, 'Ana');
    const beto = connect('2', TOKEN_BETO, 'Beto');
    send(ana, { type: 'createRoom', maxPlayers: 2 });
    send(beto, { type: 'joinRoom', code: ana.last('roomUpdate').room.code });
    send(ana, { type: 'startGame' });
    const anaId = ana.last('identified').playerId;

    server.handleClose(ana);
    const seatWhileAway = beto.last('roomUpdate').room.game?.players.find((p) => p.id === anaId);
    expect(seatWhileAway?.connected).toBe(false);

    const back = connect('3', TOKEN_ANA, 'Ana');
    expect(back.last('identified').playerId).toBe(anaId);
    const room = back.last('roomUpdate').room;
    expect(room.status).toBe('playing');
    expect(room.game?.players.find((p) => p.id === anaId)?.connected).toBe(true);
    expect(beto.last('roomUpdate').events).toContainEqual({
      type: 'playerReturned',
      playerId: anaId,
    });
  });

  it('si la sala ya no existe al volver, el jugador queda libre', () => {
    const ana = connect('1', TOKEN_ANA);
    send(ana, { type: 'createRoom', maxPlayers: 2 });
    server.handleClose(ana); // en el lobby equivale a salir y cierra la sala

    const back = connect('2', TOKEN_ANA);
    expect(back.has('roomUpdate')).toBe(false);
    send(back, { type: 'createRoom', maxPlayers: 2 });
    expect(back.has('error')).toBe(false);
  });
});
