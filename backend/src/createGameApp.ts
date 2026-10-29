import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from './app';
import type { Config } from './config';
import type { Logger } from './logger';
import { RoomManager } from './rooms/RoomManager';
import { realScheduler } from './rooms/scheduler';
import { GameServer, releaseRoomSessions } from './server/GameServer';
import { attachWebSocketTransport } from './server/wsTransport';
import { SessionStore } from './sessions/SessionStore';

const SESSION_IDLE_MS = 60 * 60_000;
const SESSION_PRUNE_INTERVAL_MS = 10 * 60_000;

export interface GameApp {
  /** Empieza a escuchar y devuelve el puerto real (útil con puerto 0). */
  listen(port: number): Promise<number>;
  close(): Promise<void>;
}

/** Raíz de composición: crea y conecta todas las piezas del servidor. */
export function createGameApp(config: Config, logger: Logger): GameApp {
  const sessions = new SessionStore();
  const rooms = new RoomManager(
    {
      random: Math.random,
      botDelayMs: config.botDelayMs,
      idleTimeoutMs: config.roomIdleTimeoutMs,
      logger,
      schedule: realScheduler,
      publish: (playerId, message) => sessions.send(playerId, message),
    },
    (room) => releaseRoomSessions(sessions, room),
  );
  const gameServer = new GameServer(sessions, rooms, logger);

  const httpServer = http.createServer(
    createApp({
      corsOrigins: config.corsOrigins,
      rooms,
      ...(config.staticDir ? { staticDir: config.staticDir } : {}),
    }),
  );
  const transport = attachWebSocketTransport(httpServer, gameServer, logger, {
    messagesPerSecond: config.messagesPerSecond,
  });

  const pruneTimer = setInterval(() => {
    const removed = sessions.prune(SESSION_IDLE_MS);
    if (removed > 0) logger.debug('Sesiones inactivas eliminadas', { removed });
  }, SESSION_PRUNE_INTERVAL_MS);
  pruneTimer.unref();

  return {
    listen: (port) =>
      new Promise((resolve) => {
        httpServer.listen(port, () => resolve((httpServer.address() as AddressInfo).port));
      }),

    close: async () => {
      clearInterval(pruneTimer);
      rooms.closeAll();
      await transport.close();
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
        httpServer.closeAllConnections();
      });
    },
  };
}
