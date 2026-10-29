/** Fuente de números en [0, 1). Se inyecta para poder reproducir partidas en las pruebas. */
export type Random = () => number;

/** Mezcla Fisher-Yates in situ. */
export function shuffleInPlace<T>(items: T[], random: Random): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j] as T, items[i] as T];
  }
  return items;
}

export function shuffle<T>(items: readonly T[], random: Random): T[] {
  return shuffleInPlace([...items], random);
}

export function pickOne<T>(items: readonly T[], random: Random): T {
  if (items.length === 0) throw new Error('No se puede elegir de una lista vacía');
  return items[Math.floor(random() * items.length)] as T;
}

/** Generador determinista (mulberry32): la misma semilla produce siempre la misma secuencia. */
export function createSeededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
