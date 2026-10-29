import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { RoomSummary } from '@caida/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from './app';

let server: http.Server | undefined;

async function start(
  corsOrigins: string[] = ['http://localhost:5173'],
  openRooms: RoomSummary[] = [],
): Promise<string> {
  server = http.createServer(createApp({ corsOrigins, rooms: { listOpen: () => openRooms } }));
  await new Promise<void>((resolve) => server?.listen(0, resolve));
  return `http://localhost:${(server.address() as AddressInfo).port}`;
}

afterEach(async () => {
  await new Promise((resolve) => (server ? server.close(resolve) : resolve(undefined)));
  server = undefined;
});

describe('app', () => {
  it('GET /health responde que el servicio está vivo', async () => {
    const response = await fetch(`${await start()}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'ok' });
  });

  it('GET /api/rooms devuelve las salas abiertas', async () => {
    const rooms: RoomSummary[] = [{ code: 'K7QX', hostName: 'Ana', playerCount: 1, maxPlayers: 4 }];
    const response = await fetch(`${await start(['http://localhost:5173'], rooms)}/api/rooms`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(rooms);
  });

  it('GET /api/rooms devuelve una lista vacía si no hay salas', async () => {
    const response = await fetch(`${await start()}/api/rooms`);
    expect(await response.json()).toEqual([]);
  });

  it('responde 404 en JSON a rutas desconocidas', async () => {
    const response = await fetch(`${await start()}/nada`);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'No encontrado' });
  });

  it('permite el origen configurado y no los demás', async () => {
    const base = await start(['http://localhost:5173']);

    const allowed = await fetch(`${base}/health`, { headers: { Origin: 'http://localhost:5173' } });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');

    const denied = await fetch(`${base}/health`, { headers: { Origin: 'https://otro.com' } });
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('no revela que usa Express', async () => {
    const response = await fetch(`${await start()}/health`);
    expect(response.headers.get('x-powered-by')).toBeNull();
  });
});
