import { useSyncExternalStore } from 'react';

/** `true` mientras la consulta de medios se cumpla (por ejemplo, `(max-width: 640px)`). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
