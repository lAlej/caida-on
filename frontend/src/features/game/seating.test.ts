import { describe, expect, it } from 'vitest';
import { makePlayer } from '../../state/testFixtures';
import { arrangeSeats } from './seating';

const players = (...ids: string[]) => ids.map((id) => makePlayer({ id, name: id }));
const layout = (seats: ReturnType<typeof arrangeSeats>) =>
  seats.map((seat) => `${seat.player.id}:${seat.position}`);

describe('arrangeSeats', () => {
  it('con 4 jugadores te pone abajo y el siguiente a tu derecha', () => {
    const seats = arrangeSeats(players('ana', 'beto', 'carla', 'dani'), 'ana');
    expect(layout(seats)).toEqual(['ana:bottom', 'beto:right', 'carla:top', 'dani:left']);
  });

  it('gira la mesa para que siempre estés abajo', () => {
    const seats = arrangeSeats(players('ana', 'beto', 'carla', 'dani'), 'carla');
    expect(layout(seats)).toEqual(['carla:bottom', 'dani:right', 'ana:top', 'beto:left']);
  });

  it('con 2 jugadores el rival queda enfrente', () => {
    expect(layout(arrangeSeats(players('ana', 'beto'), 'beto'))).toEqual([
      'beto:bottom',
      'ana:top',
    ]);
  });

  it('con 3 jugadores los rivales quedan a los lados', () => {
    expect(layout(arrangeSeats(players('ana', 'beto', 'carla'), 'ana'))).toEqual([
      'ana:bottom',
      'beto:right',
      'carla:left',
    ]);
  });

  it('si no estás entre los jugadores, mantiene el orden original', () => {
    const seats = arrangeSeats(players('ana', 'beto'), 'nadie');
    expect(layout(seats)).toEqual(['ana:bottom', 'beto:top']);
  });
});
