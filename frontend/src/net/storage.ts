const TOKEN_KEY = 'caida.sessionToken';
const NAME_KEY = 'caida.playerName';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** localStorage si está disponible; si el navegador lo bloquea, una copia en memoria. */
export function createStore(): KeyValueStore {
  try {
    const probe = '__caida_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    const memory = new Map<string, string>();
    return {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => void memory.set(key, value),
    };
  }
}

const defaultStore = createStore();

/** Secreto que identifica a este navegador ante el servidor; permite volver a la partida. */
export function loadSessionToken(store: KeyValueStore = defaultStore): string {
  const saved = store.getItem(TOKEN_KEY);
  if (saved) return saved;
  const token = crypto.randomUUID();
  store.setItem(TOKEN_KEY, token);
  return token;
}

export function loadPlayerName(store: KeyValueStore = defaultStore): string {
  return store.getItem(NAME_KEY) ?? '';
}

export function savePlayerName(name: string, store: KeyValueStore = defaultStore): void {
  store.setItem(NAME_KEY, name);
}
