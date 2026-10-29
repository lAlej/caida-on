import { loadConfig } from './config';
import { createGameApp } from './createGameApp';
import { createLogger } from './logger';

const config = loadConfig();
const logger = createLogger(config.logLevel);
const app = createGameApp(config, logger);

const port = await app.listen(config.port);
logger.info('Servidor escuchando', { port });

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('Cerrando el servidor', { signal });

  // Si algo no cierra a tiempo, se sale igual.
  setTimeout(() => process.exit(1), 5000).unref();
  await app.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
