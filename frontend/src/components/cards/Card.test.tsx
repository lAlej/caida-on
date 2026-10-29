import { RANKS, SUITS, createDeck } from '@caida/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './Card';

describe('Card', () => {
  it('se anuncia con su nombre en español', () => {
    render(<Card card={{ rank: 5, suit: 'bastos' }} />);
    expect(screen.getByRole('img', { name: '5 de bastos' })).toBeInTheDocument();
  });

  it('sin carta se muestra boca abajo', () => {
    render(<Card />);
    expect(screen.getByRole('img', { name: 'Carta boca abajo' })).toBeInTheDocument();
  });

  it('las figuras muestran su nombre en tamaños grandes', () => {
    render(<Card card={{ rank: 12, suit: 'oros' }} size="lg" />);
    expect(screen.getByText('Rey')).toBeInTheDocument();
  });

  it('las figuras no lo muestran en tamaños pequeños', () => {
    render(<Card card={{ rank: 12, suit: 'oros' }} size="xs" />);
    expect(screen.queryByText('Rey')).not.toBeInTheDocument();
  });

  it('el estado se refleja en la clase', () => {
    render(<Card card={{ rank: 1, suit: 'copas' }} state="selected" />);
    expect(screen.getByRole('img').className).toContain('selected');
  });

  it('se puede dibujar cualquiera de las 40 cartas', () => {
    const { container } = render(
      <>
        {createDeck().map((card) => (
          <Card key={`${card.rank}-${card.suit}`} card={card} />
        ))}
      </>,
    );
    expect(container.querySelectorAll('[role="img"]')).toHaveLength(RANKS.length * SUITS.length);
  });
});
