import { describe, expect, it } from 'vitest';
import { resolveWebSocketUrl } from './config';

describe('resolveWebSocketUrl', () => {
  it('usa ws en una página http', () => {
    expect(resolveWebSocketUrl(undefined, { protocol: 'http:', host: 'localhost:5173' })).toBe(
      'ws://localhost:5173/ws',
    );
  });

  it('usa wss en una página https', () => {
    expect(resolveWebSocketUrl(undefined, { protocol: 'https:', host: 'caida.example' })).toBe(
      'wss://caida.example/ws',
    );
  });

  it('prefiere la URL configurada', () => {
    expect(resolveWebSocketUrl('wss://otro.example/ws', { protocol: 'http:', host: 'x' })).toBe(
      'wss://otro.example/ws',
    );
  });
});
