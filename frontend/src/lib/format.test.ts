import { describe, expect, it } from 'vitest';
import { avatarColor, initialsOf } from './format';

describe('initialsOf', () => {
  it.each([
    ['Ana', 'AN'],
    ['ana maría', 'AM'],
    ['  Luis   Alejandro  Pérez ', 'LA'],
    ['X', 'X'],
    ['', '?'],
    ['   ', '?'],
  ])('%j → %s', (name, expected) => {
    expect(initialsOf(name)).toBe(expected);
  });
});

describe('avatarColor', () => {
  it('es estable para el mismo jugador', () => {
    expect(avatarColor('beto')).toBe(avatarColor('beto'));
  });

  it('devuelve siempre un color hexadecimal', () => {
    for (const id of ['a', 'bot-K7QX-1', 'c56f0ca1-555c-412c-8b36-889b49cae2d1']) {
      expect(avatarColor(id)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
