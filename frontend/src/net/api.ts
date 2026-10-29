import type { RoomSummary } from '@caida/shared';
import { API_BASE_URL } from '../config';

/** Salas en espera a las que se puede unir cualquiera. */
export async function fetchOpenRooms(
  signal?: AbortSignal,
  fetchFn: typeof fetch = fetch,
): Promise<RoomSummary[]> {
  const response = await fetchFn(`${API_BASE_URL}/api/rooms`, { signal });
  if (!response.ok) throw new Error(`El servidor respondió ${response.status}`);

  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error('Respuesta inesperada del servidor');
  return data as RoomSummary[];
}
