import { describe, expect, it, vi } from 'vitest';
import { fetchOpenRooms } from './api';

const response = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('fetchOpenRooms', () => {
  it('devuelve las salas del servidor', async () => {
    const rooms = [{ code: 'K7QX', hostName: 'Ana', playerCount: 1, maxPlayers: 4 }];
    const fetchFn = vi.fn(() => response(rooms));

    await expect(fetchOpenRooms(undefined, fetchFn)).resolves.toEqual(rooms);
    expect(fetchFn).toHaveBeenCalledWith('/api/rooms', { signal: undefined });
  });

  it('falla si el servidor responde con un error', async () => {
    const fetchFn = vi.fn(() => response({ error: 'x' }, 500));
    await expect(fetchOpenRooms(undefined, fetchFn)).rejects.toThrow(/500/);
  });

  it('falla si la respuesta no es una lista', async () => {
    const fetchFn = vi.fn(() => response({ rooms: [] }));
    await expect(fetchOpenRooms(undefined, fetchFn)).rejects.toThrow(/inesperada/);
  });
});
