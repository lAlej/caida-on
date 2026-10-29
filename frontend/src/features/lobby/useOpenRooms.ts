import { useEffect, useState } from 'react';
import type { RoomSummary } from '@caida/shared';
import { fetchOpenRooms } from '../../net/api';

interface OpenRooms {
  readonly rooms: readonly RoomSummary[];
  /** `true` si la última consulta falló. */
  readonly failed: boolean;
}

/** Consulta las salas abiertas ahora y cada `intervalMs` mientras el componente esté en pantalla. */
export function useOpenRooms(intervalMs = 4000): OpenRooms {
  const [state, setState] = useState<OpenRooms>({ rooms: [], failed: false });

  useEffect(() => {
    const controller = new AbortController();

    const refresh = () => {
      fetchOpenRooms(controller.signal).then(
        (rooms) => setState({ rooms, failed: false }),
        () => {
          if (!controller.signal.aborted) setState((previous) => ({ ...previous, failed: true }));
        },
      );
    };

    refresh();
    const timer = setInterval(refresh, intervalMs);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [intervalMs]);

  return state;
}
