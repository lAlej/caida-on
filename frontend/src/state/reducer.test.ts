import type { GameEvent, ServerMessage } from '@caida/shared';
import { describe, expect, it } from 'vitest';
import { initialState, reducer } from './reducer';
import type { Action, AppState } from './reducer';
import { makeRoom } from './testFixtures';

const server = (message: ServerMessage): Action => ({ type: 'serverMessage', message });
const update = (events: GameEvent[] = [], code = 'K7QX'): Action =>
  server({ type: 'roomUpdate', room: makeRoom({ code }), events });

const reduceAll = (...actions: Action[]): AppState => actions.reduce(reducer, initialState);

const played = (n: number): GameEvent => ({
  type: 'cardPlayed',
  playerId: 'ana',
  card: { rank: 5, suit: 'oros' },
  ...{ n },
});

describe('reducer · conexión e identidad', () => {
  it('guarda el estado de la conexión', () => {
    const state = reduceAll({ type: 'connectionChanged', status: 'reconnecting' });
    expect(state.connection).toBe('reconnecting');
  });

  it('guarda la identidad al recibir identified', () => {
    const state = reduceAll(server({ type: 'identified', playerId: 'ana', name: 'Ana' }));
    expect(state.identity).toEqual({ playerId: 'ana', name: 'Ana' });
  });

  it('perder la conexión no borra la sala', () => {
    const state = reduceAll(update(), { type: 'connectionChanged', status: 'reconnecting' });
    expect(state.room?.code).toBe('K7QX');
  });
});

describe('reducer · sala y registro', () => {
  it('guarda la última vista de la sala', () => {
    expect(reduceAll(update()).room).toMatchObject({ code: 'K7QX', status: 'lobby' });
  });

  it('acumula los eventos con identificadores únicos', () => {
    const state = reduceAll(update([played(1), played(2)]), update([played(3)]));
    const ids = state.log.map((entry) => entry.id);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });

  it('conserva solo las últimas 60 entradas', () => {
    const many = Array.from({ length: 50 }, (_, i) => played(i));
    const state = reduceAll(update(many), update(many));
    expect(state.log).toHaveLength(60);
  });

  it('cambiar de sala reinicia el registro', () => {
    const state = reduceAll(update([played(1)], 'AAAA'), update([played(2)], 'BBBB'));
    expect(state.log).toHaveLength(1);
  });

  it('salir de la sala lo borra todo', () => {
    const state = reduceAll(update([played(1)]), server({ type: 'roomLeft' }));
    expect(state).toMatchObject({ room: null, log: [], countSummary: null });
  });
});

describe('reducer · conteo de la baraja', () => {
  const counted: GameEvent = {
    type: 'barajaCounted',
    counts: [{ playerId: 'ana', cards: 13, points: 3 }],
  };

  it('guarda el conteo para mostrarlo', () => {
    expect(reduceAll(update([counted])).countSummary).toEqual(counted.counts);
  });

  it('se mantiene en las actualizaciones siguientes hasta cerrarlo', () => {
    const state = reduceAll(update([counted]), update([played(1)]));
    expect(state.countSummary).toEqual(counted.counts);
  });

  it('se puede cerrar', () => {
    const state = reduceAll(update([counted]), { type: 'summaryDismissed' });
    expect(state.countSummary).toBeNull();
  });
});

describe('reducer · errores', () => {
  it('guarda el error del servidor', () => {
    const state = reduceAll(server({ type: 'error', code: 'ROOM_FULL', message: 'Llena' }));
    expect(state.error).toMatchObject({ code: 'ROOM_FULL', message: 'Llena' });
  });

  it('cada error tiene un identificador nuevo', () => {
    const first = reduceAll(server({ type: 'error', code: 'ROOM_FULL', message: 'a' }));
    const second = reducer(first, server({ type: 'error', code: 'ROOM_FULL', message: 'a' }));
    expect(second.error?.id).not.toBe(first.error?.id);
  });

  it('un error local se marca como sin conexión', () => {
    const state = reduceAll({ type: 'localError', message: 'Sin conexión' });
    expect(state.error).toMatchObject({ code: 'OFFLINE', message: 'Sin conexión' });
  });

  it('se puede cerrar', () => {
    const state = reduceAll(server({ type: 'error', code: 'ROOM_FULL', message: 'a' }), {
      type: 'errorDismissed',
    });
    expect(state.error).toBeNull();
  });
});
