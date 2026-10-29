import type { Card, GameView, Rank } from '@caida/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeGame, makePlayer, makeRoom } from '../../state/testFixtures';
import { renderWithGame } from '../../test/renderWithGame';
import { GamePage } from './GamePage';

const oros = (rank: Rank): Card => ({ rank, suit: 'oros' });
const copas = (rank: Rank): Card => ({ rank, suit: 'copas' });
const bastos = (rank: Rank): Card => ({ rank, suit: 'bastos' });

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});

function show(game: GameView, state: Parameters<typeof renderWithGame>[1] = {}) {
  const room = makeRoom({ status: 'playing', game });
  return renderWithGame(<GamePage room={room} game={game} />, state);
}

/** Mi turno: mano con 5 de bastos, 2 de copas y Rey de oros; en la mesa hay 5, 6 y 7. */
const myTurn = () =>
  makeGame({
    hand: [bastos(5), copas(2), oros(12)],
    table: [oros(5), oros(6), oros(7), oros(11)],
  });

describe('GamePage · jugar', () => {
  it('muestra tu mano, la mesa y la información de la partida', () => {
    show(myTurn());

    expect(screen.getByRole('list', { name: 'Tu mano' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Cartas en la mesa' })).toBeInTheDocument();
    expect(screen.getByText('Sala K7QX')).toBeInTheDocument();
    expect(screen.getByText('Mano 1 de 6')).toBeInTheDocument();
    expect(screen.getByText(/Marcador/)).toBeInTheDocument();
  });

  it('al elegir una carta explica qué te llevarías', async () => {
    show(myTurn());
    await userEvent.click(screen.getByRole('button', { name: '5 de bastos' }));

    expect(screen.getByText('Te llevas 5 · 6 · 7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jugar y recoger 3 cartas' })).toBeEnabled();
  });

  it('si no hay carta igual, avisa de que se queda en la mesa', async () => {
    show(myTurn());
    await userEvent.click(screen.getByRole('button', { name: '2 de copas' }));

    expect(screen.getByText(/No hay un 2 en la mesa/)).toBeInTheDocument();
  });

  it('jugar envía la carta elegida y limpia la selección', async () => {
    const { actions } = show(myTurn());
    await userEvent.click(screen.getByRole('button', { name: '5 de bastos' }));
    await userEvent.click(screen.getByRole('button', { name: /Jugar y recoger/ }));

    expect(actions.playCard).toHaveBeenCalledWith(bastos(5));
    expect(screen.getByText('Elige una carta de tu mano.')).toBeInTheDocument();
  });

  it('fuera de tu turno puedes elegir una carta pero no jugarla', async () => {
    const { actions } = show({ ...myTurn(), actorId: 'beto' });
    await userEvent.click(screen.getByRole('button', { name: '5 de bastos' }));

    expect(screen.getByText('Turno de Beto.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Jugar y recoger/ })).toBeDisabled();
    expect(actions.playCard).not.toHaveBeenCalled();
  });

  it('detecta una caída sobre la última carta lanzada', async () => {
    show({ ...myTurn(), lastThrown: oros(5) });
    await userEvent.click(screen.getByRole('button', { name: '5 de bastos' }));

    expect(screen.getByText('Te llevas 5 · 6 · 7 · ¡Caída! · +1 pts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '¡Caída! Jugar y recoger 3 cartas' })).toBeEnabled();
  });
});

describe('GamePage · jugadores y cantos', () => {
  const players = [
    makePlayer({ id: 'ana', name: 'Ana' }),
    makePlayer({
      id: 'beto',
      name: 'Beto',
      score: 17,
      canto: { kind: 'vigia', rank: 7, points: 7 },
    }),
    makePlayer({ id: 'bot-1', name: 'Bot 1', isBot: true }),
    makePlayer({ id: 'carla', name: 'Carla', connected: false }),
  ];

  it('muestra el canto anunciado y que suma al cerrar la mano', () => {
    show(makeGame({ players, cantoWinnerId: 'beto' }));

    expect(screen.getByText('Cantó Vigía')).toBeInTheDocument();
    expect(screen.getByText('Suma 7 al cerrar la mano')).toBeInTheDocument();
  });

  it('un canto que no gana avisa de que no puntúa', () => {
    show(makeGame({ players, cantoWinnerId: 'carla' }));
    expect(screen.getByText('No puntúa: hay un canto más alto')).toBeInTheDocument();
  });

  it('marca a los bots y a quien está desconectado', () => {
    show(makeGame({ players }));

    expect(screen.getByText('Bot')).toBeInTheDocument();
    expect(screen.getByText('Desconectado')).toBeInTheDocument();
  });

  it('el marcador incluye los puntos pendientes del canto ganador', () => {
    show(makeGame({ players, cantoWinnerId: 'beto' }));
    expect(
      screen.getByRole('img', { name: /Beto: 17 de 24 puntos, más 7 pendientes/ }),
    ).toBeInTheDocument();
  });

  it('te avisa de tu propio canto', () => {
    const own = [makePlayer({ canto: { kind: 'patrulla', rank: 7, points: 6 } }), players[1]!];
    show(makeGame({ players: own, cantoWinnerId: 'ana' }));
    expect(screen.getByText('Tienes Patrulla · 6 pts')).toBeInTheDocument();
  });
});

describe('GamePage · diálogos', () => {
  it('el repartidor debe elegir el orden de la mesa', async () => {
    const game = makeGame({ phase: 'choosingOrder', actorId: 'ana', dealerId: 'ana' });
    const { actions } = show(game);

    const dialog = screen.getByRole('dialog', { name: 'Eres quien reparte' });
    await userEvent.click(within(dialog).getByRole('button', { name: '4 · 3 · 2 · 1' }));
    expect(actions.chooseMesaOrder).toHaveBeenCalledWith('descending');
  });

  it('los demás ven quién está echando la mesa', () => {
    show(makeGame({ phase: 'choosingOrder', actorId: 'beto', dealerId: 'beto' }));
    expect(screen.getByText('Beto está echando la mesa…')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('al terminar una baraja muestra el conteo y se puede cerrar', async () => {
    const { actions } = show(makeGame(), {
      state: { countSummary: [{ playerId: 'ana', cards: 13, points: 3 }] },
    });

    expect(screen.getByText('13 cartas ·', { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(actions.dismissSummary).toHaveBeenCalled();
  });

  it('al terminar la partida anuncia al ganador y deja salir', async () => {
    const game = makeGame({ result: { winnerId: 'ana', reason: 'canto' } });
    const { actions } = show(game);

    expect(screen.getByText('¡Ganaste!')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salir de la sala' }));
    expect(actions.leaveRoom).toHaveBeenCalled();
  });

  it('si ganó otro, dice quién', () => {
    show(makeGame({ result: { winnerId: 'beto', reason: 'cards' } }));
    expect(screen.getByText('Ganó Beto')).toBeInTheDocument();
  });
});

describe('GamePage · salir', () => {
  it('pide confirmación antes de abandonar una partida en curso', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { actions } = show(makeGame());

    await userEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(confirm).toHaveBeenCalled();
    expect(actions.leaveRoom).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await userEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(actions.leaveRoom).toHaveBeenCalled();
  });
});
