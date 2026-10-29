import { CLOSE_CODE_REPLACED } from '@caida/shared';
import type { ServerMessage } from '@caida/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSocket } from './GameSocket';
import type { ConnectionStatus, SocketLike } from './GameSocket';

class FakeSocket implements SocketLike {
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  readonly sent: string[] = [];
  closed = false;

  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {
    this.closed = true;
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }
  receive(data: unknown): void {
    this.onmessage?.({ data } as MessageEvent);
  }
  drop(code = 1006): void {
    this.readyState = 3;
    this.onclose?.({ code } as CloseEvent);
  }
}

let sockets: FakeSocket[];
let statuses: ConnectionStatus[];
let messages: ServerMessage[];

function createGameSocket(): GameSocket {
  return new GameSocket({
    url: 'ws://test/ws',
    sessionToken: 'token-de-prueba-123456',
    name: 'Ana',
    onStatus: (status) => statuses.push(status),
    onMessage: (message) => messages.push(message),
    createSocket: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  sockets = [];
  statuses = [];
  messages = [];
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GameSocket · conexión', () => {
  it('se identifica con el token y el nombre en cuanto se abre', () => {
    createGameSocket().start();
    sockets[0]?.open();

    expect(statuses).toEqual(['connecting', 'open']);
    expect(JSON.parse(sockets[0]?.sent[0] ?? '{}')).toEqual({
      type: 'identify',
      sessionToken: 'token-de-prueba-123456',
      name: 'Ana',
    });
  });

  it('entrega los mensajes del servidor y descarta los inválidos', () => {
    createGameSocket().start();
    const socket = sockets[0] as FakeSocket;
    socket.open();

    socket.receive(JSON.stringify({ type: 'roomLeft' }));
    socket.receive('no es json');
    socket.receive(JSON.stringify({ sinTipo: true }));
    socket.receive(new ArrayBuffer(2));

    expect(messages).toEqual([{ type: 'roomLeft' }]);
  });

  it('send devuelve false mientras no hay conexión abierta', () => {
    const client = createGameSocket();
    client.start();
    expect(client.send({ type: 'leaveRoom' })).toBe(false);
  });

  it('send envía el mensaje serializado cuando la conexión está abierta', () => {
    const client = createGameSocket();
    client.start();
    sockets[0]?.open();

    expect(client.send({ type: 'addBot' })).toBe(true);
    expect(sockets[0]?.sent.at(-1)).toBe('{"type":"addBot"}');
  });
});

describe('GameSocket · reconexión', () => {
  it('reintenta con espera creciente hasta un máximo', () => {
    createGameSocket().start();
    sockets[0]?.drop();

    const delays: number[] = [];
    for (let attempt = 0; attempt < 7; attempt++) {
      const before = sockets.length;
      let waited = 0;
      while (sockets.length === before && waited < 20_000) {
        vi.advanceTimersByTime(250);
        waited += 250;
      }
      delays.push(waited);
      sockets[sockets.length - 1]?.drop();
    }

    expect(delays).toEqual([500, 1000, 2000, 4000, 8000, 10_000, 10_000]);
    expect(statuses).toContain('reconnecting');
  });

  it('tras reconectar con éxito la espera vuelve a empezar', () => {
    createGameSocket().start();
    sockets[0]?.drop();
    vi.advanceTimersByTime(500);
    sockets[1]?.open();
    sockets[1]?.drop();

    vi.advanceTimersByTime(499);
    expect(sockets).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(3);
  });

  it('no reconecta si la sesión fue reemplazada por otra pestaña', () => {
    createGameSocket().start();
    sockets[0]?.open();
    sockets[0]?.drop(CLOSE_CODE_REPLACED);

    vi.advanceTimersByTime(60_000);
    expect(sockets).toHaveLength(1);
    expect(statuses.at(-1)).toBe('replaced');
  });

  it('stop cierra la conexión y cancela los reintentos', () => {
    const client = createGameSocket();
    client.start();
    sockets[0]?.drop();
    client.stop();

    vi.advanceTimersByTime(60_000);
    expect(sockets).toHaveLength(1);
  });

  it('stop cierra el socket abierto sin avisar de un corte', () => {
    const client = createGameSocket();
    client.start();
    sockets[0]?.open();
    const before = statuses.length;

    client.stop();

    expect(sockets[0]?.closed).toBe(true);
    expect(statuses).toHaveLength(before);
  });
});
