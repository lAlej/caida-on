import type { Card, Rank } from '@caida/shared';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeGame, makePlayer, makeRoom } from '../../state/testFixtures';
import { renderWithGame } from '../../test/renderWithGame';
import { GamePage } from './GamePage';
import { Hand } from './Hand';
import { PlayerSeat } from './PlayerSeat';

/**
 * El tablero debe medir siempre lo mismo. jsdom no calcula diseño, así que se comprueba lo que
 * lo garantiza: que cada pieza reserve su espacio aunque esté vacía.
 */

const oros = (rank: Rank): Card => ({ rank, suit: 'oros' });

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});

describe('Hand · espacio reservado', () => {
  const reserved = (hand: Card[], size: 'md' | 'lg') => {
    render(<Hand hand={hand} selected={null} size={size} onSelect={() => undefined} />);
    const list = screen.getByRole('list', { name: 'Tu mano' });
    return { height: list.style.minHeight, width: list.style.minWidth };
  };

  it('mide lo mismo con 3 cartas que sin ninguna', () => {
    const full = reserved([oros(1), oros(2), oros(3)], 'lg');
    document.body.innerHTML = '';
    const empty = reserved([], 'lg');

    expect(empty).toEqual(full);
    expect(full).toEqual({ height: '158px', width: '328px' });
  });

  it('reserva menos en el tamaño mediano', () => {
    expect(reserved([], 'md')).toEqual({ height: '128px', width: '262px' });
  });
});

describe('PlayerSeat · espacio reservado', () => {
  const player = makePlayer({ id: 'beto', name: 'Beto' });
  const seat = (overrides = {}) => (
    <PlayerSeat
      player={{ ...player, ...overrides }}
      targetScore={24}
      isYou={false}
      isOpponent
      isActor={false}
      cantoWins={false}
    />
  );

  it('un rival sin cartas ni canto conserva el hueco de la mano y del canto', () => {
    const { container } = render(seat({ handCount: 0, canto: null }));
    expect(screen.getByRole('img', { name: '0 cartas en mano' })).toBeInTheDocument();
    expect(container.querySelector('[class*="cantoSlot"]')).toBeInTheDocument();
    expect(container.querySelector('[class*="tags"]')).toBeInTheDocument();
  });

  it('con canto usa el mismo hueco en vez de añadir uno', () => {
    const { container } = render(seat({ canto: { kind: 'vigia', rank: 7, points: 7 } as const }));
    const slot = container.querySelector('[class*="cantoSlot"]');
    expect(slot?.textContent).toContain('Cantó Vigía');
    expect(container.querySelectorAll('[class*="cantoSlot"]')).toHaveLength(1);
  });

  it('tu propio asiento no reserva hueco de mano ni de canto rival', () => {
    const { container } = render(
      <PlayerSeat
        player={player}
        targetScore={24}
        isYou
        isOpponent={false}
        isActor={false}
        cantoWins={false}
      />,
    );
    expect(container.querySelector('[class*="cantoSlot"]')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /cartas en mano/ })).not.toBeInTheDocument();
  });
});

describe('GamePage · el aviso de tu canto', () => {
  it('el hueco existe aunque no tengas canto', () => {
    const game = makeGame({ hand: [oros(1)] });
    const { container } = renderWithGame(
      <GamePage room={makeRoom({ status: 'playing', game })} game={game} />,
    );
    expect(container.querySelector('[class*="cantoSlot"]')).toBeInTheDocument();
    expect(screen.queryByText(/^Tienes /)).not.toBeInTheDocument();
  });
});
