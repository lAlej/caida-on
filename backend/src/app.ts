import cors from 'cors';
import express from 'express';
import type { Express } from 'express';
import type { RoomSummary } from '@caida/shared';

export interface AppOptions {
  readonly corsOrigins: readonly string[];
  readonly rooms: { listOpen(): RoomSummary[] };
}

/** Aplicación HTTP: salud del servicio y consultas de solo lectura. El juego va por WebSocket. */
export function createApp({ corsOrigins, rooms }: AppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: [...corsOrigins] }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  });

  app.get('/api/rooms', (_req, res) => {
    res.json(rooms.listOpen());
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'No encontrado' });
  });

  return app;
}
