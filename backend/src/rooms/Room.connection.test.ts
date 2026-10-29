import { describe, expect, it } from 'vitest';
import { BOT_DELAY, IDLE_TIMEOUT, createTestRoom, seedForDealer } from './testHelpers';

/** Ana (repartidora), Beto y un bot, con la partida ya empezada. */
function threeSeats() {
  const ctx = createTestRoom({ seed: seedForDealer(0, 3) });
  ctx.room.join({ playerId: 'beto', name: 'Beto' });
  ctx.room.addBot('ana');
  ctx.room.start('ana');
  ctx.clearMessages();
  return ctx;
}

describe('Room · desconexión', () => {
  it('en el lobby, desconectarse equivale a salir', () => {
    const { room, lastView } = createTestRoom();
    room.join({ playerId: 'beto', name: 'Beto' });
    room.markDisconnected('beto');

    expect(room.has('beto')).toBe(false);
    expect(lastView('ana').seats).toHaveLength(1);
  });

  it('en partida, el asiento sigue y los demás ven que se desconectó', () => {
    const { room, lastView, messagesTo } = threeSeats();
    room.markDisconnected('ana');

    const ana = lastView('beto').game?.players.find((p) => p.id === 'ana');
    expect(ana).toMatchObject({ connected: false, isBot: false });
    const update = messagesTo('beto').at(-1);
    expect(update?.type === 'roomUpdate' && update.events).toContainEqual({
      type: 'botTookOver',
      playerId: 'ana',
    });
  });

  it('un bot juega por el jugador desconectado cuando le toca', () => {
    const { room, scheduler, lastView } = threeSeats();
    // Ana es la repartidora y debe echar la mesa.
    expect(room.viewFor('beto').game?.actorId).toBe('ana');

    room.markDisconnected('ana');
    expect(scheduler.delays).toEqual([BOT_DELAY]);

    scheduler.runNext();
    expect(lastView('beto').game?.phase).toBe('playing');
  });

  it('no se manda nada al jugador desconectado', () => {
    const { room, scheduler, messagesTo, clearMessages } = threeSeats();
    room.markDisconnected('ana');
    clearMessages();

    scheduler.runNext(); // el bot juega por Ana y la partida avanza
    expect(messagesTo('beto')).not.toEqual([]);
    expect(messagesTo('ana')).toEqual([]);
  });
});

describe('Room · regreso', () => {
  it('al volver recupera el asiento, recibe la partida y el bot se retira', () => {
    const { room, scheduler, lastView, messagesTo } = threeSeats();
    room.markDisconnected('ana');
    expect(scheduler.pending).toBe(1);

    room.markReconnected('ana');

    expect(scheduler.pending).toBe(0);
    expect(lastView('ana').game?.players.find((p) => p.id === 'ana')?.connected).toBe(true);
    const update = messagesTo('beto').at(-1);
    expect(update?.type === 'roomUpdate' && update.events).toContainEqual({
      type: 'playerReturned',
      playerId: 'ana',
    });
  });

  it('puede jugar de nuevo después de volver', () => {
    const { room, scheduler, lastView } = threeSeats();
    room.markDisconnected('ana');
    room.markReconnected('ana');

    room.chooseMesaOrder('ana', 'ascending');
    expect(lastView('ana').game?.phase).toBe('playing');
    expect(scheduler.pending).toBeLessThanOrEqual(1);
  });

  it('volver sin haberse caído (recargar la página) reenvía el estado sin avisos', () => {
    const { room, messagesTo } = threeSeats();
    room.markReconnected('ana');
    const update = messagesTo('ana').at(-1);
    expect(update).toMatchObject({ type: 'roomUpdate', events: [] });
  });
});

describe('Room · salir en plena partida', () => {
  it('el asiento pasa a un bot para siempre', () => {
    const { room, lastView } = threeSeats();
    room.leave('beto');

    expect(lastView('ana').game?.players.find((p) => p.id === 'beto')).toMatchObject({
      isBot: true,
    });
    expect(room.has('beto')).toBe(true);
    expect(() => room.leave('beto')).toThrowError(expect.objectContaining({ code: 'NOT_IN_ROOM' }));
  });

  it('si el último humano sale, la sala se cierra', () => {
    const { room, closed } = threeSeats();
    room.leave('beto');
    room.leave('ana');
    expect(closed).toEqual([room]);
  });
});

describe('Room · sin humanos conectados', () => {
  it('los bots dejan de jugar y la sala se cierra pasado el tiempo de espera', () => {
    const { room, scheduler, closed } = threeSeats();
    room.markDisconnected('beto');
    room.markDisconnected('ana');

    expect(scheduler.delays).toEqual([IDLE_TIMEOUT]);
    scheduler.runNext();
    expect(closed).toEqual([room]);
    expect(scheduler.pending).toBe(0);
  });

  it('si alguien vuelve a tiempo, la sala sigue abierta y se cancela el cierre', () => {
    const { room, scheduler, closed } = threeSeats();
    room.markDisconnected('beto');
    room.markDisconnected('ana');
    room.markReconnected('beto');

    expect(scheduler.delays).not.toContain(IDLE_TIMEOUT);
    expect(closed).toHaveLength(0);
  });

  it('al cerrar el servidor se cancelan los temporizadores', () => {
    const { room, scheduler } = threeSeats();
    room.markDisconnected('beto');
    room.markDisconnected('ana');
    room.dispose();
    expect(scheduler.pending).toBe(0);
  });
});
