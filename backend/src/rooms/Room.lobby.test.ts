import { describe, expect, it } from 'vitest';
import { createTestRoom } from './testHelpers';

const BETO = { playerId: 'beto', name: 'Beto' };

describe('Room · lobby', () => {
  it('nace con el anfitrión sentado y le manda la vista de la sala', () => {
    const { room, closed } = createTestRoom();
    expect(room.has('ana')).toBe(true);
    expect(room.summary()).toEqual({
      code: 'K7QX',
      hostName: 'Ana',
      playerCount: 1,
      maxPlayers: 4,
    });
    expect(room.viewFor('ana')).toMatchObject({
      code: 'K7QX',
      status: 'lobby',
      hostId: 'ana',
      youId: 'ana',
      game: null,
    });
    expect(closed).toHaveLength(0);
  });

  it('un jugador se une y todos reciben la sala actualizada', () => {
    const { room, messagesTo, lastView } = createTestRoom();
    room.join(BETO);

    expect(lastView('ana').seats.map((s) => s.name)).toEqual(['Ana', 'Beto']);
    expect(lastView('beto').youId).toBe('beto');
    expect(messagesTo('beto')).toHaveLength(1);
  });

  it('unirse dos veces no duplica el asiento', () => {
    const { room } = createTestRoom();
    room.join(BETO);
    room.join(BETO);
    expect(room.summary().playerCount).toBe(2);
  });

  it('rechaza a quien llega cuando la sala está llena', () => {
    const { room } = createTestRoom({ maxPlayers: 2 });
    room.join(BETO);
    expect(() => room.join({ playerId: 'carla', name: 'Carla' })).toThrowError(
      expect.objectContaining({ code: 'ROOM_FULL' }),
    );
  });

  it('solo se anuncia como abierta mientras tiene sitio y no ha empezado', () => {
    const { room } = createTestRoom({ maxPlayers: 2 });
    expect(room.isOpen).toBe(true);
    room.join(BETO);
    expect(room.isOpen).toBe(false);
  });
});

describe('Room · bots', () => {
  it('el anfitrión añade bots con nombre y sin recibir mensajes', () => {
    const { room, messagesTo, lastView } = createTestRoom();
    room.addBot('ana');

    expect(lastView('ana').seats[1]).toMatchObject({ name: 'Bot 1', isBot: true });
    expect(messagesTo('bot-K7QX-1')).toEqual([]);
  });

  it('solo el anfitrión puede añadir bots', () => {
    const { room } = createTestRoom();
    room.join(BETO);
    expect(() => room.addBot('beto')).toThrowError(expect.objectContaining({ code: 'NOT_HOST' }));
  });

  it('no se pueden añadir bots a una sala llena', () => {
    const { room } = createTestRoom({ maxPlayers: 2 });
    room.addBot('ana');
    expect(() => room.addBot('ana')).toThrowError(expect.objectContaining({ code: 'ROOM_FULL' }));
  });
});

describe('Room · empezar', () => {
  it('necesita al menos 2 jugadores', () => {
    const { room } = createTestRoom();
    expect(() => room.start('ana')).toThrowError(
      expect.objectContaining({ code: 'NOT_ENOUGH_PLAYERS' }),
    );
  });

  it('solo el anfitrión puede empezar', () => {
    const { room } = createTestRoom();
    room.join(BETO);
    expect(() => room.start('beto')).toThrowError(expect.objectContaining({ code: 'NOT_HOST' }));
  });

  it('al empezar todos reciben la partida con su propia mano', () => {
    const { room, lastView } = createTestRoom();
    room.join(BETO);
    room.start('ana');

    for (const id of ['ana', 'beto']) {
      expect(lastView(id)).toMatchObject({ status: 'playing', game: { phase: 'choosingOrder' } });
    }
    expect(lastView('ana').game?.hand).toEqual([]);
  });

  it('una vez empezada no admite más jugadores, bots ni otro inicio', () => {
    const { room } = createTestRoom();
    room.addBot('ana');
    room.start('ana');

    expect(() => room.join(BETO)).toThrowError(
      expect.objectContaining({ code: 'GAME_IN_PROGRESS' }),
    );
    expect(() => room.addBot('ana')).toThrowError(
      expect.objectContaining({ code: 'GAME_IN_PROGRESS' }),
    );
    expect(() => room.start('ana')).toThrowError(
      expect.objectContaining({ code: 'GAME_IN_PROGRESS' }),
    );
  });
});

describe('Room · salir del lobby', () => {
  it('quien sale deja su asiento y los demás lo ven', () => {
    const { room, lastView } = createTestRoom();
    room.join(BETO);
    room.leave('beto');

    expect(room.has('beto')).toBe(false);
    expect(lastView('ana').seats).toHaveLength(1);
  });

  it('si sale el anfitrión, el siguiente humano pasa a serlo', () => {
    const { room, lastView } = createTestRoom();
    room.addBot('ana');
    room.join(BETO);
    room.leave('ana');

    expect(lastView('beto').hostId).toBe('beto');
    expect(room.summary().hostName).toBe('Beto');
  });

  it('la sala se cierra cuando no queda ningún humano', () => {
    const { room, closed } = createTestRoom();
    room.addBot('ana');
    room.leave('ana');
    expect(closed).toEqual([room]);
  });

  it('salir de una sala en la que no estás es un error', () => {
    const { room } = createTestRoom();
    expect(() => room.leave('nadie')).toThrowError(
      expect.objectContaining({ code: 'NOT_IN_ROOM' }),
    );
  });
});
