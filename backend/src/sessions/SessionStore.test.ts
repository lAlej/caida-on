import { describe, expect, it } from 'vitest';
import type { Connection } from '../server/Connection';
import { SessionStore } from './SessionStore';

const fakeConnection = (id: string): Connection => ({
  id,
  send: () => undefined,
  close: () => undefined,
});
const TOKEN = 'token-secreto-de-prueba-1';

function createStore() {
  let time = 1_000;
  let next = 0;
  const store = new SessionStore(
    () => time,
    () => `player-${++next}`,
  );
  return { store, advance: (ms: number) => (time += ms) };
}

describe('SessionStore.identify', () => {
  it('crea una sesión nueva para un token desconocido', () => {
    const { store } = createStore();
    expect(store.identify(TOKEN, 'Ana')).toMatchObject({
      playerId: 'player-1',
      name: 'Ana',
      roomCode: null,
      connection: null,
    });
  });

  it('devuelve la misma sesión para el mismo token y actualiza el nombre', () => {
    const { store } = createStore();
    const first = store.identify(TOKEN, 'Ana');
    const second = store.identify(TOKEN, 'Ana María');

    expect(second).toBe(first);
    expect(second.name).toBe('Ana María');
  });

  it('da identidades distintas a tokens distintos', () => {
    const { store } = createStore();
    const a = store.identify('token-secreto-aaaaaaaa', 'Ana');
    const b = store.identify('token-secreto-bbbbbbbb', 'Beto');
    expect(a.playerId).not.toBe(b.playerId);
  });

  it('el playerId público no contiene el token', () => {
    const store = new SessionStore();
    const session = store.identify(TOKEN, 'Ana');
    expect(session.playerId).not.toContain(TOKEN);
    expect(session.playerId).not.toBe(TOKEN);
  });

  it('encuentra la sesión por playerId', () => {
    const { store } = createStore();
    const session = store.identify(TOKEN, 'Ana');
    expect(store.findByPlayerId(session.playerId)).toBe(session);
    expect(store.findByPlayerId('nadie')).toBeUndefined();
  });
});

describe('SessionStore conexiones', () => {
  it('attach devuelve la conexión anterior para poder cerrarla', () => {
    const { store } = createStore();
    const session = store.identify(TOKEN, 'Ana');
    const first = fakeConnection('1');
    const second = fakeConnection('2');

    expect(store.attach(session, first)).toBeNull();
    expect(store.attach(session, second)).toBe(first);
    expect(session.connection).toBe(second);
  });

  it('detach ignora una conexión que ya fue reemplazada', () => {
    const { store } = createStore();
    const session = store.identify(TOKEN, 'Ana');
    const first = fakeConnection('1');
    const second = fakeConnection('2');
    store.attach(session, first);
    store.attach(session, second);

    expect(store.detach(session, first)).toBe(false);
    expect(session.connection).toBe(second);
    expect(store.detach(session, second)).toBe(true);
    expect(session.connection).toBeNull();
  });

  it('send entrega el mensaje solo si el jugador está conectado', () => {
    const { store } = createStore();
    const session = store.identify(TOKEN, 'Ana');
    const received: unknown[] = [];
    store.send(session.playerId, { type: 'roomLeft' });

    store.attach(session, { id: '1', send: (m) => received.push(m), close: () => undefined });
    store.send(session.playerId, { type: 'roomLeft' });
    expect(received).toEqual([{ type: 'roomLeft' }]);
  });
});

describe('SessionStore.prune', () => {
  it('elimina las sesiones inactivas sin sala ni conexión', () => {
    const { store, advance } = createStore();
    const session = store.identify(TOKEN, 'Ana');
    advance(10_000);

    expect(store.prune(5_000)).toBe(1);
    expect(store.findByPlayerId(session.playerId)).toBeUndefined();
  });

  it('conserva las sesiones conectadas, con sala o recientes', () => {
    const { store, advance } = createStore();
    const connected = store.identify('token-secreto-conectado', 'A');
    store.attach(connected, fakeConnection('1'));
    const inRoom = store.identify('token-secreto-en-sala', 'B');
    inRoom.roomCode = 'K7QX';
    advance(10_000);
    const recent = store.identify('token-secreto-reciente', 'C');

    expect(store.prune(5_000)).toBe(0);
    for (const session of [connected, inRoom, recent]) {
      expect(store.findByPlayerId(session.playerId)).toBe(session);
    }
  });
});
