import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  it('usa valores por defecto si no hay variables de entorno', () => {
    expect(loadConfig({})).toEqual({
      port: 3001,
      corsOrigins: ['http://localhost:5173'],
      botDelayMs: 1200,
      roomIdleTimeoutMs: 300_000,
      messagesPerSecond: 30,
      logLevel: 'info',
    });
  });

  it('lee las variables de entorno', () => {
    const config = loadConfig({
      PORT: '8080',
      CORS_ORIGIN: 'https://a.com, https://b.com',
      BOT_DELAY_MS: '0',
      ROOM_IDLE_TIMEOUT_MS: '60000',
      MESSAGES_PER_SECOND: '100',
      LOG_LEVEL: 'debug',
    });

    expect(config).toEqual({
      port: 8080,
      corsOrigins: ['https://a.com', 'https://b.com'],
      botDelayMs: 0,
      roomIdleTimeoutMs: 60_000,
      messagesPerSecond: 100,
      logLevel: 'debug',
    });
  });

  it('STATIC_DIR es opcional: sin ella no hay carpeta de la web', () => {
    expect(loadConfig({})).not.toHaveProperty('staticDir');
    expect(loadConfig({ STATIC_DIR: 'frontend/dist' })).toMatchObject({
      staticDir: 'frontend/dist',
    });
  });

  it.each([
    ['puerto fuera de rango', { PORT: '70000' }],
    ['puerto no numérico', { PORT: 'abc' }],
    ['retardo de bot negativo', { BOT_DELAY_MS: '-1' }],
    ['límite de mensajes en cero', { MESSAGES_PER_SECOND: '0' }],
    ['nivel de log desconocido', { LOG_LEVEL: 'verbose' }],
  ])('falla con %s', (_name, env) => {
    expect(() => loadConfig(env)).toThrowError(/Configuración inválida/);
  });
});
