import type { PlayerId, PlayerView } from '@caida/shared';

export type SeatPosition = 'bottom' | 'right' | 'top' | 'left';

export interface PlacedSeat {
  readonly player: PlayerView;
  readonly position: SeatPosition;
}

const POSITIONS: Readonly<Record<number, readonly SeatPosition[]>> = {
  2: ['bottom', 'top'],
  3: ['bottom', 'right', 'left'],
  4: ['bottom', 'right', 'top', 'left'],
};

/**
 * Coloca a los jugadores alrededor de la mesa con `youId` abajo. Los jugadores vienen en orden
 * de juego, y el turno pasa al de la derecha: el siguiente a ti queda a tu derecha.
 */
export function arrangeSeats(players: readonly PlayerView[], youId: PlayerId): PlacedSeat[] {
  const youIndex = Math.max(
    0,
    players.findIndex((player) => player.id === youId),
  );
  const fromYou = [...players.slice(youIndex), ...players.slice(0, youIndex)];
  const positions = POSITIONS[players.length] ?? POSITIONS[4] ?? [];

  return fromYou.map((player, index) => ({ player, position: positions[index] ?? 'top' }));
}
