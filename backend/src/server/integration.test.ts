import { randomUUID } from 'node:crypto';
import { CLOSE_CODE_REPLACED } from '@caida/shared';
import type { ClientMessage, RoomView, ServerMessage } from '@caida/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { createGameApp } from '../createGameApp';
import type { GameApp } from '../createGameApp';
import { silentLogger } from '../logger';

const TIMEOUT_MS = 10_000;

/** Cliente de pruebas sobre un WebSocket real. Guarda lo recibido y permite esperar mensajes. */
class TestClient {
  readonly inbox: ServerMessage[] = [];
  closeCode: number | null = null;
  private waiters: Array<() => void> = [];

  private constructor(
    private readonly socket: WebSocket,
    readonly token: string,
    readonly name: string,
  ) {
    socket.on('message', (data) => {
      this.inbox.push(JSON.parse(data.toString()) as ServerMessage);
      this.wake();
    });
    socket.on('close', (code) => {
      this.closeCode = code;
      this.wake();
    });
  }

  static async connect(
    port: number,
    name: string,
    token: string = randomUUID(),
  ): Promise<TestClient> {
    const socket = new WebSocket(`ws://localhost:${port}/ws`);
    await new Promise<void>((resolve, reject) => {
      socket.once('open', resolve);
      socket.once('error', reject);
    });
    const client = new TestClient(socket, token, name);
    client.send({ type: 'identify', sessionToken: token, name });
    await client.until((m) => m.type === 'identified');
    return client;
  }

  send(message: ClientMessage | { type: string }): void {
    this.socket.send(JSON.stringify(message));
  }

  sendRaw(text: string): void {
    this.socket.send(text);
  }

  close(): void {
    this.socket.close();
  }

  get playerId(): string {
    const identified = this.inbox.find((m) => m.type === 'identified');
    if (identified?.type !== 'identified') throw new Error('Sin identificar');
    return identified.playerId;
  }

  /** Última vista de sala recibida. */
  get room(): RoomView | null {
    const updates = this.inbox.filter((m) => m.type === 'roomUpdate');
    const last = updates.at(-1);
    return last?.type === 'roomUpdate' ? last.room : null;
  }

  get errors(): ServerMessage[] {
    return this.inbox.filter((m) => m.type === 'error');
  }

  /** Espera a que haya un mensaje (recibido antes o después) que cumpla la condición. */
  async until(predicate: (message: ServerMessage) => boolean): Promise<ServerMessage> {
    const deadline = Date.now() + TIMEOUT_MS;
    for (;;) {
      const found = this.inbox.find(predicate);
      if (found) return found;
      if (this.closeCode !== null) throw new Error(`Conexión cerrada (${this.closeCode})`);
      if (Date.now() > deadline) throw new Error('Tiempo de espera agotado');
      await new Promise<void>((resolve) => {
        this.waiters.push(resolve);
        setTimeout(resolve, 100);
      });
    }
  }

  async untilClosed(): Promise<number> {
    const deadline = Date.now() + TIMEOUT_MS;
    while (this.closeCode === null) {
      if (Date.now() > deadline) throw new Error('La conexión no se cerró');
      await new Promise<void>((resolve) => {
        this.waiters.push(resolve);
        setTimeout(resolve, 100);
      });
    }
    return this.closeCode;
  }

  /**
   * Juega por este cliente (mesa ascendente y la primera carta) cada vez que le toca,
   * hasta que la partida termina.
   */
  async playUntilFinished(): Promise<RoomView> {
    // Índice de la primera vista que aún no se ha mirado. Al actuar se descartan las que ya
    // llegaron: son repeticiones del mismo estado (por ejemplo, el aviso de una desconexión).
    let cursor = 0;
    const deadline = Date.now() + TIMEOUT_MS * 3;
    for (;;) {
      const updates = this.inbox.filter((m) => m.type === 'roomUpdate');
      for (let i = cursor; i < updates.length; i++) {
        cursor = i + 1;
        const update = updates[i];
        if (update?.type !== 'roomUpdate') continue;
        if (update.room.status === 'finished') return update.room;

        const game = update.room.game;
        if (game?.actorId !== this.playerId) continue;
        if (game.phase === 'choosingOrder') {
          this.send({ type: 'chooseMesaOrder', order: 'ascending' });
        } else if (game.hand[0]) {
          this.send({ type: 'playCard', card: game.hand[0] });
        }
        cursor = updates.length;
        break;
      }
      if (this.closeCode !== null) throw new Error(`Conexión cerrada (${this.closeCode})`);
      if (Date.now() > deadline) throw new Error('La partida no terminó');
      await new Promise<void>((resolve) => {
        this.waiters.push(resolve);
        setTimeout(resolve, 100);
      });
    }
  }

  private wake(): void {
    const waiters = this.waiters;
    this.waiters = [];
    for (const resolve of waiters) resolve();
  }
}

let app: GameApp;
let port: number;
const clients: TestClient[] = [];

async function connect(name: string, token?: string): Promise<TestClient> {
  const client = await TestClient.connect(port, name, token);
  clients.push(client);
  return client;
}

beforeEach(async () => {
  app = createGameApp(
    {
      port: 0,
      corsOrigins: [],
      botDelayMs: 0,
      roomIdleTimeoutMs: 60_000,
      messagesPerSecond: 1000,
      logLevel: 'error',
    },
    silentLogger,
  );
  port = await app.listen(0);
});

afterEach(async () => {
  for (const client of clients.splice(0)) client.close();
  await app.close();
});

const isRoomUpdate = (m: ServerMessage) => m.type === 'roomUpdate';

describe('integración · WebSocket real', () => {
  it('descarta JSON inválido sin cerrar la conexión', async () => {
    const ana = await connect('Ana');
    ana.sendRaw('esto no es json');

    const error = await ana.until((m) => m.type === 'error');
    expect(error).toMatchObject({ code: 'INVALID_MESSAGE' });
    expect(ana.closeCode).toBeNull();
  });

  it('una persona con un bot juega una partida completa hasta el final', async () => {
    const ana = await connect('Ana');
    ana.send({ type: 'createRoom', maxPlayers: 2 });
    await ana.until(isRoomUpdate);
    ana.send({ type: 'addBot' });
    ana.send({ type: 'startGame' });

    const final = await ana.playUntilFinished();

    expect(final.game?.result).not.toBeNull();
    const winner = final.game?.players.find((p) => p.id === final.game?.result?.winnerId);
    expect(winner?.score).toBeGreaterThanOrEqual(24);
    expect(ana.errors).toEqual([]);
  }, 30_000);

  it('el listado HTTP muestra las salas abiertas', async () => {
    const ana = await connect('Ana');
    ana.send({ type: 'createRoom', maxPlayers: 3 });
    await ana.until(isRoomUpdate);

    const rooms = (await (await fetch(`http://localhost:${port}/api/rooms`)).json()) as unknown[];
    expect(rooms).toEqual([
      expect.objectContaining({ hostName: 'Ana', playerCount: 1, maxPlayers: 3 }),
    ]);

    ana.send({ type: 'addBot' });
    ana.send({ type: 'addBot' });
    ana.send({ type: 'startGame' });
    await ana.until((m) => m.type === 'roomUpdate' && m.room.status === 'playing');
    const after = (await (await fetch(`http://localhost:${port}/api/rooms`)).json()) as unknown[];
    expect(after).toEqual([]);
  });
});

describe('integración · desconexión y regreso', () => {
  async function startDuo() {
    const ana = await connect('Ana');
    ana.send({ type: 'createRoom', maxPlayers: 2 });
    const code = ((await ana.until(isRoomUpdate)) as { room: RoomView }).room.code;
    const beto = await connect('Beto');
    beto.send({ type: 'joinRoom', code });
    await beto.until(isRoomUpdate);
    ana.send({ type: 'startGame' });
    await beto.until((m) => m.type === 'roomUpdate' && m.room.status === 'playing');
    return { ana, beto };
  }

  it('si un jugador se cae, un bot juega por él y la partida termina', async () => {
    const { ana, beto } = await startDuo();
    ana.close();
    await beto.until(
      (m) =>
        m.type === 'roomUpdate' &&
        m.room.game?.players.some((p) => p.id === ana.playerId && !p.connected) === true,
    );

    const final = await beto.playUntilFinished();
    expect(final.game?.result).not.toBeNull();
    expect(beto.errors).toEqual([]);
  });

  it('al volver con su token recupera el asiento en la misma partida', async () => {
    const { ana, beto } = await startDuo();
    const anaId = ana.playerId;
    ana.close();
    await beto.until(
      (m) =>
        m.type === 'roomUpdate' &&
        m.room.game?.players.some((p) => p.id === anaId && !p.connected) === true,
    );

    const back = await connect('Ana', ana.token);
    const update = (await back.until(isRoomUpdate)) as { room: RoomView };

    expect(back.playerId).toBe(anaId);
    expect(update.room.status).toBe('playing');
    expect(update.room.game?.players.find((p) => p.id === anaId)?.connected).toBe(true);
    await beto.until(
      (m) => m.type === 'roomUpdate' && m.events.some((e) => e.type === 'playerReturned'),
    );
  });

  it('abrir la sesión en otra pestaña cierra la anterior', async () => {
    const first = await connect('Ana');
    const second = await connect('Ana', first.token);

    expect(await first.untilClosed()).toBe(CLOSE_CODE_REPLACED);
    expect(second.playerId).toBe(first.playerId);
  });
});
