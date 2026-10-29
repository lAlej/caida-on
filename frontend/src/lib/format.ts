/** Iniciales para el avatar: dos palabras dan una letra de cada una; si no, las dos primeras letras. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const [first, second] = words;
  if (!first) return '?';
  if (second) return (first.charAt(0) + second.charAt(0)).toUpperCase();
  return first.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['#cfe3a8', '#bbd3ea', '#f2c4a0', '#f4ebd6', '#e8c9e6', '#f6e2a0'] as const;

/** Color estable para un jugador, calculado a partir de su identificador. */
export function avatarColor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] as string;
}
