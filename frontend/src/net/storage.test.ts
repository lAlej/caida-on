import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStore, loadPlayerName, loadSessionToken, savePlayerName } from './storage';
import type { KeyValueStore } from './storage';

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadSessionToken', () => {
  it('crea un token la primera vez y lo conserva después', () => {
    const store = memoryStore();
    const first = loadSessionToken(store);
    expect(first.length).toBeGreaterThanOrEqual(16);
    expect(loadSessionToken(store)).toBe(first);
  });

  it('cada navegador (almacenamiento) recibe un token distinto', () => {
    expect(loadSessionToken(memoryStore())).not.toBe(loadSessionToken(memoryStore()));
  });
});

describe('nombre del jugador', () => {
  it('es vacío hasta que se guarda y luego se recupera', () => {
    const store = memoryStore();
    expect(loadPlayerName(store)).toBe('');
    savePlayerName('Ana', store);
    expect(loadPlayerName(store)).toBe('Ana');
  });
});

describe('createStore', () => {
  it('usa una copia en memoria si el navegador bloquea localStorage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    const store = createStore();
    store.setItem('a', '1');
    expect(store.getItem('a')).toBe('1');
    expect(store.getItem('otra')).toBeNull();
  });
});
