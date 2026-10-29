import { z } from 'zod';
import { LOG_LEVELS } from './logger';
import type { LogLevel } from './logger';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(0).max(65535).default(3001),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  BOT_DELAY_MS: z.coerce.number().int().min(0).default(1200),
  ROOM_IDLE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1)
    .default(5 * 60_000),
  MESSAGES_PER_SECOND: z.coerce.number().int().min(1).default(30),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
});

export interface Config {
  readonly port: number;
  readonly corsOrigins: readonly string[];
  readonly botDelayMs: number;
  readonly roomIdleTimeoutMs: number;
  /** Mensajes que una conexión puede enviar por segundo antes de que se la cierre. */
  readonly messagesPerSecond: number;
  readonly logLevel: LogLevel;
}

/** Lee y valida la configuración desde variables de entorno; falla al arrancar si es inválida. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Configuración inválida:\n${z.prettifyError(parsed.error)}`);
  }

  const values = parsed.data;
  return {
    port: values.PORT,
    corsOrigins: values.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    botDelayMs: values.BOT_DELAY_MS,
    roomIdleTimeoutMs: values.ROOM_IDLE_TIMEOUT_MS,
    messagesPerSecond: values.MESSAGES_PER_SECOND,
    logLevel: values.LOG_LEVEL,
  };
}
