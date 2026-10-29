import type { Card, Rank } from '@caida/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeGame } from '../../state/testFixtures';
import { ActionBar, describePreview, playLabel } from './ActionBar';
import { previewPlay } from './capturePreview';

const oros = (rank: Rank): Card => ({ rank, suit: 'oros' });
const copas = (rank: Rank): Card => ({ rank, suit: 'copas' });

describe('describePreview / playLabel', () => {
  it('sin captura, la carta se queda en la mesa', () => {
    expect(describePreview(copas(4), null)).toMatch(/No hay un 4 en la mesa/);
    expect(playLabel(null)).toBe('Jugar: queda en la mesa');
  });

  it('con captura lista lo que te llevas', () => {
    const preview = previewPlay([oros(5), oros(6), oros(7), oros(12)], null, copas(5));
    expect(describePreview(copas(5), preview)).toBe('Te llevas 5 · 6 · 7');
    expect(playLabel(preview)).toBe('Jugar y recoger 3 cartas');
  });

  it('una caída lo destaca y suma sus puntos', () => {
    const preview = previewPlay([oros(3), oros(11)], oros(11), copas(11));
    expect(describePreview(copas(11), preview)).toBe('Te llevas Caballo · ¡Caída! · +3 pts');
    expect(playLabel(preview)).toBe('¡Caída! Jugar y recoger 1 carta');
  });

  it('dejar la mesa limpia también se anuncia', () => {
    const preview = previewPlay([oros(5)], null, copas(5));
    expect(describePreview(copas(5), preview)).toBe('Te llevas 5 · ¡Mesa limpia! · +4 pts');
  });
});

describe('ActionBar', () => {
  const myGame = makeGame({ actorId: 'ana', youId: 'ana' });

  it('pide elegir una carta y mantiene el botón apagado', () => {
    render(<ActionBar game={myGame} selected={null} preview={null} onPlay={vi.fn()} />);
    expect(screen.getByText('Elige una carta de tu mano.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jugar' })).toBeDisabled();
  });

  it('con una carta elegida en tu turno, jugar está disponible', async () => {
    const onPlay = vi.fn();
    render(<ActionBar game={myGame} selected={copas(4)} preview={null} onPlay={onPlay} />);

    await userEvent.click(screen.getByRole('button', { name: 'Jugar: queda en la mesa' }));
    expect(onPlay).toHaveBeenCalledOnce();
  });

  it('fuera de tu turno dice de quién es y no deja jugar', () => {
    const game = makeGame({ actorId: 'beto', youId: 'ana' });
    render(<ActionBar game={game} selected={copas(4)} preview={null} onPlay={vi.fn()} />);

    expect(screen.getByText('Turno de Beto.')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
