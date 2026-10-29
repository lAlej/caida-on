import { describe, expect, it } from 'vitest';
import { createLogger } from './logger';

function capture(level: Parameters<typeof createLogger>[0]) {
  const lines: string[] = [];
  return { logger: createLogger(level, (line) => lines.push(line)), lines };
}

describe('createLogger', () => {
  it('escribe una línea con nivel, mensaje y contexto', () => {
    const { logger, lines } = capture('info');
    logger.info('Hola', { port: 3001 });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^\d{4}-\d{2}-\d{2}T.* INFO Hola \{"port":3001\}$/);
  });

  it('ignora los mensajes por debajo del nivel configurado', () => {
    const { logger, lines } = capture('warn');
    logger.debug('a');
    logger.info('b');
    logger.warn('c');
    logger.error('d');
    expect(lines.map((line) => line.split(' ')[1])).toEqual(['WARN', 'ERROR']);
  });

  it('serializa los errores con su mensaje', () => {
    const { logger, lines } = capture('error');
    logger.error('Falló', { error: new Error('boom') });
    expect(lines[0]).toContain('"message":"boom"');
  });
});
