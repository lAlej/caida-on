import { randomUUID } from 'node:crypto';
import type http from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import type { RawData } from 'ws';
import type { ServerMessage } from '@caida/shared';
import type { Logger } from '../logger';
import type { Connection } from './Connection';
import type { GameServer } from './GameServer';
import { RateLimiter } from './RateLimiter';

export const WS_PATH = '/ws';

export interface WsTransportOptions {
  readonly maxPayloadBytes?: number;
  readonly heartbeatMs?: number;
  readonly messagesPerSecond?: number;
}

export interface WsTransport {
  close(): Promise<void>;
}

class WsConnection implements Connection {
  readonly id = randomUUID();

  constructor(private readonly socket: WebSocket) {}

  send(message: ServerMessage): void {
    if (this.socket.readyState !== WebSocket.OPEN) return;
    try {
      this.socket.send(JSON.stringify(message));
    } catch {
      // El canal se cerró justo ahora; el cierre se gestiona en el evento `close`.
    }
  }

  close(code: number, reason: string): void {
    this.socket.close(code, reason);
  }
}

function rawDataToString(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  return data.toString('utf8');
}

/** Acepta WebSockets en `/ws`, descarta lo que no sea JSON válido y se lo pasa al `GameServer`. */
export function attachWebSocketTransport(
  server: http.Server,
  gameServer: GameServer,
  logger: Logger,
  {
    maxPayloadBytes = 8 * 1024,
    heartbeatMs = 30_000,
    messagesPerSecond = 30,
  }: WsTransportOptions = {},
): WsTransport {
  const wss = new WebSocketServer({ server, path: WS_PATH, maxPayload: maxPayloadBytes });
  const alive = new WeakSet<WebSocket>();

  wss.on('connection', (socket) => {
    const connection = new WsConnection(socket);
    const limiter = new RateLimiter(messagesPerSecond, 1000);
    alive.add(socket);

    socket.on('pong', () => alive.add(socket));

    socket.on('message', (data, isBinary) => {
      if (!limiter.allow()) {
        socket.close(1008, 'Demasiados mensajes');
        return;
      }

      let payload: unknown;
      try {
        if (isBinary) throw new Error('binario');
        payload = JSON.parse(rawDataToString(data));
      } catch {
        connection.send({ type: 'error', code: 'INVALID_MESSAGE', message: 'JSON inválido.' });
        return;
      }
      gameServer.handleMessage(connection, payload);
    });

    socket.on('close', () => gameServer.handleClose(connection));
    socket.on('error', (error) => logger.warn('Error de WebSocket', { error }));
  });

  // Un cliente que no responde al ping está muerto aunque el socket siga abierto.
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!alive.has(socket)) {
        socket.terminate();
        continue;
      }
      alive.delete(socket);
      socket.ping();
    }
  }, heartbeatMs);
  heartbeat.unref();

  return {
    close: () =>
      new Promise((resolve) => {
        clearInterval(heartbeat);
        for (const socket of wss.clients) socket.close(1001, 'Servidor cerrándose');
        wss.close(() => resolve());
      }),
  };
}
