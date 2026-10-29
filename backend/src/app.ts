import { existsSync } from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import type { Express } from 'express';
import type { RoomSummary } from '@caida/shared';

export interface AppOptions {
  readonly corsOrigins: readonly string[];
  readonly rooms: { listOpen(): RoomSummary[] };
  /** Carpeta del frontend compilado. Si falta, el servidor solo expone la API. */
  readonly staticDir?: string;
}

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/** Aplicación HTTP: salud, consultas de solo lectura y, si se pide, la web. El juego va por WebSocket. */
export function createApp({ corsOrigins, rooms, staticDir }: AppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: [...corsOrigins] }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  });

  app.get('/api/rooms', (_req, res) => {
    res.json(rooms.listOpen());
  });

  if (staticDir) serveFrontend(app, path.resolve(staticDir));

  app.use((_req, res) => {
    res.status(404).json({ error: 'No encontrado' });
  });

  return app;
}

/**
 * Sirve la web compilada. Los archivos con nombre único (`/assets/...`) se guardan un año en la
 * caché del navegador; `index.html` nunca, para que una versión nueva se vea enseguida.
 * Cualquier otra ruta de navegación devuelve `index.html`.
 */
function serveFrontend(app: Express, root: string): void {
  if (!existsSync(path.join(root, 'index.html'))) {
    throw new Error(
      `STATIC_DIR no contiene la web compilada (no existe ${path.join(root, 'index.html')}). ` +
        'Compila con "npm run build" y arranca desde la raíz del proyecto.',
    );
  }

  app.use(
    express.static(root, {
      setHeaders: (res, filePath) => {
        res.setHeader(
          'Cache-Control',
          filePath.endsWith('.html')
            ? 'no-cache'
            : `public, max-age=${ONE_YEAR_SECONDS}, immutable`,
        );
      },
    }),
  );

  app.use((req, res, next) => {
    const isPage = req.method === 'GET' && !req.path.startsWith('/api/') && req.path !== '/ws';
    if (!isPage) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(root, 'index.html'));
  });
}
