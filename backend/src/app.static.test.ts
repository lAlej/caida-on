import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';

let staticDir: string;
let server: http.Server | undefined;

beforeAll(() => {
  staticDir = mkdtempSync(path.join(tmpdir(), 'caida-web-'));
  mkdirSync(path.join(staticDir, 'assets'));
  writeFileSync(path.join(staticDir, 'index.html'), '<!doctype html><title>Caída</title>');
  writeFileSync(path.join(staticDir, 'assets', 'app-abc123.js'), 'console.log("hola");');
  writeFileSync(path.join(staticDir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" />');
});

afterAll(() => {
  rmSync(staticDir, { recursive: true, force: true });
});

afterEach(async () => {
  await new Promise((resolve) => (server ? server.close(resolve) : resolve(undefined)));
  server = undefined;
});

async function start(withStatic: boolean): Promise<string> {
  server = http.createServer(
    createApp({
      corsOrigins: [],
      rooms: { listOpen: () => [] },
      ...(withStatic ? { staticDir } : {}),
    }),
  );
  await new Promise<void>((resolve) => server?.listen(0, resolve));
  return `http://localhost:${(server.address() as AddressInfo).port}`;
}

describe('app · web compilada', () => {
  it('sirve index.html en la raíz y sin caché', async () => {
    const response = await fetch(`${await start(true)}/`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<title>Caída</title>');
    expect(response.headers.get('cache-control')).toBe('no-cache');
  });

  it('los archivos con nombre único se guardan un año', async () => {
    const response = await fetch(`${await start(true)}/assets/app-abc123.js`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
  });

  it('los archivos de la raíz (favicon) se revalidan siempre', async () => {
    const response = await fetch(`${await start(true)}/favicon.svg`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-cache');
  });

  it('cualquier otra ruta de navegación devuelve index.html', async () => {
    const response = await fetch(`${await start(true)}/sala/K7QX`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<title>Caída</title>');
  });

  it('la API y la salud siguen funcionando', async () => {
    const base = await start(true);
    expect(await (await fetch(`${base}/api/rooms`)).json()).toEqual([]);
    expect(await (await fetch(`${base}/health`)).json()).toMatchObject({ status: 'ok' });
  });

  it('una ruta de la API desconocida da 404 en JSON, no la web', async () => {
    const response = await fetch(`${await start(true)}/api/otra-cosa`);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'No encontrado' });
  });

  it('solo responde a GET con la web', async () => {
    const response = await fetch(`${await start(true)}/sala/K7QX`, { method: 'POST' });
    expect(response.status).toBe(404);
  });

  it('falla al crear la app si la carpeta no tiene la web compilada', () => {
    expect(() =>
      createApp({
        corsOrigins: [],
        rooms: { listOpen: () => [] },
        staticDir: path.join(staticDir, 'no-existe'),
      }),
    ).toThrowError(/STATIC_DIR no contiene la web compilada/);
  });

  it('sin carpeta configurada, no sirve la web', async () => {
    const response = await fetch(`${await start(false)}/`);
    expect(response.status).toBe(404);
  });
});
