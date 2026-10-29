export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export type LogContext = Readonly<Record<string, unknown>>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

const serializeErrors = (_key: string, value: unknown): unknown =>
  value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value;

type WriteLine = (line: string) => void;

/** Logger de una línea por mensaje, con contexto en JSON. Ignora lo que esté por debajo de `level`. */
export function createLogger(
  level: LogLevel,
  write: WriteLine = (line) => process.stdout.write(`${line}\n`),
): Logger {
  const threshold = LOG_LEVELS.indexOf(level);

  const log =
    (messageLevel: LogLevel) =>
    (message: string, context?: LogContext): void => {
      if (LOG_LEVELS.indexOf(messageLevel) < threshold) return;
      const suffix = context ? ` ${JSON.stringify(context, serializeErrors)}` : '';
      write(`${new Date().toISOString()} ${messageLevel.toUpperCase()} ${message}${suffix}`);
    };

  return {
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
  };
}

export const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
