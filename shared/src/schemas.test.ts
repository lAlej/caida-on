import { describe, expect, it } from 'vitest';
import { clientMessageSchema } from './schemas';

const TOKEN = 'a-valid-session-token-123';

describe('clientMessageSchema', () => {
  it('acepta mensajes válidos', () => {
    const messages = [
      { type: 'identify', sessionToken: TOKEN, name: 'Luis' },
      { type: 'createRoom', maxPlayers: 4 },
      { type: 'joinRoom', code: 'K7QX' },
      { type: 'leaveRoom' },
      { type: 'addBot' },
      { type: 'startGame' },
      { type: 'chooseMesaOrder', order: 'ascending' },
      { type: 'playCard', card: { rank: 5, suit: 'bastos' } },
    ];
    for (const message of messages) {
      expect(clientMessageSchema.safeParse(message).success, message.type).toBe(true);
    }
  });

  it('normaliza el nombre y el código de sala', () => {
    const identify = clientMessageSchema.parse({
      type: 'identify',
      sessionToken: TOKEN,
      name: '  Luis  ',
    });
    expect(identify).toMatchObject({ name: 'Luis' });

    const join = clientMessageSchema.parse({ type: 'joinRoom', code: ' k7qx ' });
    expect(join).toMatchObject({ code: 'K7QX' });
  });

  it.each([
    ['tipo desconocido', { type: 'hack' }],
    ['sin tipo', {}],
    ['nombre vacío', { type: 'identify', sessionToken: TOKEN, name: '   ' }],
    ['nombre demasiado largo', { type: 'identify', sessionToken: TOKEN, name: 'x'.repeat(21) }],
    ['token demasiado corto', { type: 'identify', sessionToken: 'abc', name: 'Luis' }],
    ['sala de 1 jugador', { type: 'createRoom', maxPlayers: 1 }],
    ['sala de 5 jugadores', { type: 'createRoom', maxPlayers: 5 }],
    ['sala con decimales', { type: 'createRoom', maxPlayers: 2.5 }],
    ['código de sala corto', { type: 'joinRoom', code: 'AB' }],
    ['orden de mesa inválido', { type: 'chooseMesaOrder', order: 'random' }],
    ['carta con el 8', { type: 'playCard', card: { rank: 8, suit: 'oros' } }],
    ['carta con pinta inválida', { type: 'playCard', card: { rank: 5, suit: 'tréboles' } }],
    ['carta ausente', { type: 'playCard' }],
  ])('rechaza %s', (_name, message) => {
    expect(clientMessageSchema.safeParse(message).success).toBe(false);
  });
});
