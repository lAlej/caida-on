import { describe, expect, it } from 'vitest';
import { BOT_DELAY, createTestRoom, seedForDealer } from './testHelpers';

const BOT = 'bot-K7QX-1';

/** Ana contra un bot. Seat 0 = Ana, seat 1 = Bot 1. */
function duel(dealerSeat: 0 | 1) {
  const ctx = createTestRoom({ seed: seedForDealer(dealerSeat, 2) });
  ctx.room.addBot('ana');
  ctx.room.start('ana');
  return ctx;
}

describe('Room · bots en la partida', () => {
  it('un bot repartidor echa la mesa cuando pasa el retardo, no antes', () => {
    const { scheduler, lastView, messagesTo } = duel(1);

    expect(lastView('ana').game).toMatchObject({ phase: 'choosingOrder', actorId: BOT });
    expect(scheduler.pending).toBe(1);
    expect(scheduler.delays).toEqual([BOT_DELAY]);

    scheduler.runNext();

    expect(lastView('ana').game).toMatchObject({ phase: 'playing', mano: 1, actorId: 'ana' });
    const update = messagesTo('ana').at(-1);
    expect(update).toMatchObject({ type: 'roomUpdate' });
    expect(update?.type === 'roomUpdate' && update.events.map((e) => e.type)).toContain(
      'mesaDealt',
    );
    expect(scheduler.pending).toBe(0);
  });

  it('si el repartidor es humano, la partida espera su decisión', () => {
    const { room, scheduler, lastView } = duel(0);

    expect(lastView('ana').game?.actorId).toBe('ana');
    expect(scheduler.pending).toBe(0);

    room.chooseMesaOrder('ana', 'ascending');

    // Juega primero el bot, que está a la derecha de Ana.
    expect(lastView('ana').game?.actorId).toBe(BOT);
    expect(scheduler.pending).toBe(1);

    scheduler.runNext();
    expect(lastView('ana').game?.actorId).toBe('ana');
    expect(lastView('ana').game?.table.length).toBeGreaterThanOrEqual(1);
  });

  it('los bots nunca reciben mensajes', () => {
    const { scheduler, messagesTo } = duel(1);
    scheduler.runNext();
    expect(messagesTo(BOT)).toEqual([]);
  });
});

describe('Room · acciones del jugador', () => {
  it('no se puede jugar antes de empezar', () => {
    const { room } = createTestRoom();
    expect(() => room.chooseMesaOrder('ana', 'ascending')).toThrowError(
      expect.objectContaining({ code: 'GAME_NOT_STARTED' }),
    );
  });

  it('no se puede echar la mesa si no eres el repartidor', () => {
    const { room } = duel(1);
    expect(() => room.chooseMesaOrder('ana', 'ascending')).toThrowError(
      expect.objectContaining({ code: 'NOT_YOUR_TURN' }),
    );
  });

  it('no se puede jugar fuera de turno', () => {
    const { room, scheduler, lastView } = duel(1);
    scheduler.runNext();
    room.playCard('ana', lastView('ana').game?.hand[0] as never);
    expect(() => room.playCard('ana', lastView('ana').game?.hand[0] as never)).toThrowError(
      expect.objectContaining({ code: 'NOT_YOUR_TURN' }),
    );
  });
});

describe('Room · una partida completa', () => {
  it('humano contra bot termina con un ganador y sin tareas pendientes', () => {
    const { room, scheduler, lastView } = duel(0);

    for (let step = 0; step < 5000; step++) {
      const game = lastView('ana').game;
      if (!game || game.phase === 'finished') break;

      if (game.actorId === 'ana') {
        if (game.phase === 'choosingOrder') room.chooseMesaOrder('ana', 'ascending');
        else room.playCard('ana', game.hand[0] as never);
      } else if (!scheduler.runNext()) {
        throw new Error('La partida se quedó esperando');
      }
    }

    const view = lastView('ana');
    expect(view.status).toBe('finished');
    expect(view.game?.result).not.toBeNull();
    expect(view.game?.actorId).toBeNull();
    expect(scheduler.pending).toBe(0);
  });
});
