import type { Suit } from '@caida/shared';

/** Siluetas sencillas de las cuatro pintas, dibujadas en una cuadrícula de 24x24. */
const SUIT_PATHS: Readonly<Record<Suit, string>> = {
  oros: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 6a6 6 0 1 1 0 12a6 6 0 1 1 0-12zM12 9.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z',
  copas: 'M5 3h14c.5 6.2-2.4 10.4-6 11.3V19h4.3v2.5H6.7V19H11v-4.7C7.4 13.4 4.5 9.2 5 3z',
  espadas: 'M12 1.5l3.3 4.7-1 11.3H9.7l-1-11.3zM5 17.5h14v2.4H5zM10.8 19.9h2.4v3.1h-2.4z',
  bastos: 'M4.2 19.8L15 3.6Q15.6 .8 18.2 1.4Q21 2.2 19.8 4.2L7.8 22.2Z',
};

interface SuitIconProps {
  suit: Suit;
  className?: string;
}

/** Pinta de la baraja. Toma su color de `currentColor`. */
export function SuitIcon({ suit, className }: SuitIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={SUIT_PATHS[suit]} fill="currentColor" />
    </svg>
  );
}
