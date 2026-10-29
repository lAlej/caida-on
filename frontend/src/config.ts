/** URL del WebSocket. Por defecto, el mismo origen que la página (en desarrollo, el proxy de Vite). */
export function resolveWebSocketUrl(
  override: string | undefined = import.meta.env.VITE_WS_URL,
  location: Pick<Location, 'protocol' | 'host'> = window.location,
): string {
  if (override) return override;
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${location.host}/ws`;
}

/** Base de la API HTTP; vacía significa el mismo origen. */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? '';
