import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeRoom } from '../../state/testFixtures';
import { renderWithGame } from '../../test/renderWithGame';
import { LobbyPage } from './LobbyPage';
import { NamePage } from './NamePage';
import { WaitingRoom } from './WaitingRoom';

const OPEN_ROOMS = [{ code: 'M3PR', hostName: 'Carla', playerCount: 2, maxPlayers: 4 }];

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(OPEN_ROOMS)))),
  );
});

describe('NamePage', () => {
  it('no deja entrar sin nombre y guarda el nombre escrito', async () => {
    const { actions } = renderWithGame(<NamePage />, { playerName: '' });
    const enter = screen.getByRole('button', { name: 'Entrar' });
    expect(enter).toBeDisabled();

    await userEvent.type(screen.getByLabelText('¿Cómo te llamas?'), 'Luis');
    await userEvent.click(enter);
    expect(actions.setPlayerName).toHaveBeenCalledWith('Luis');
  });
});

describe('LobbyPage', () => {
  it('crea una sala de 4 jugadores por defecto', async () => {
    const { actions } = renderWithGame(<LobbyPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Crear sala' }));
    expect(actions.createRoom).toHaveBeenCalledWith(4);
  });

  it('permite elegir 2 o 3 jugadores y explica el conteo', async () => {
    const { actions } = renderWithGame(<LobbyPage />);
    await userEvent.click(screen.getByRole('button', { name: '3' }));

    expect(screen.getByText(/el repartidor cuenta hasta 14/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Crear sala' }));
    expect(actions.createRoom).toHaveBeenCalledWith(3);
  });

  it('solo deja unirse con un código completo y lo pasa en mayúsculas', async () => {
    const { actions } = renderWithGame(<LobbyPage />);
    const join = screen.getByRole('button', { name: 'Unirme' });
    expect(join).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Unirse con código'), 'k7q');
    expect(join).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Unirse con código'), 'x');
    await userEvent.click(join);
    expect(actions.joinRoom).toHaveBeenCalledWith('K7QX');
  });

  it('lista las salas abiertas y permite unirse a una', async () => {
    const { actions } = renderWithGame(<LobbyPage />);

    expect(await screen.findByText('Sala de Carla')).toBeInTheDocument();
    expect(screen.getByText('M3PR · 2 de 4 jugadores')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button', { name: 'Unirme' });
    await userEvent.click(buttons[buttons.length - 1]!);
    expect(actions.joinRoom).toHaveBeenCalledWith('M3PR');
  });

  it('permite cambiar de nombre', async () => {
    const { actions } = renderWithGame(<LobbyPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar nombre' }));
    expect(actions.setPlayerName).toHaveBeenCalledWith('');
  });
});

describe('WaitingRoom', () => {
  const solo = makeRoom({
    seats: [{ playerId: 'ana', name: 'Ana', isBot: false, connected: true }],
  });

  it('muestra el código y los asientos libres', () => {
    renderWithGame(<WaitingRoom room={solo} />);
    expect(screen.getByLabelText('K 7 Q X')).toBeInTheDocument();
    expect(screen.getAllByText('Esperando jugador…')).toHaveLength(3);
  });

  it('el anfitrión necesita 2 jugadores para empezar y puede añadir un bot', async () => {
    const { actions } = renderWithGame(<WaitingRoom room={solo} />);
    expect(screen.getByRole('button', { name: 'Empezar partida' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Añadir bot' }));
    expect(actions.addBot).toHaveBeenCalled();
  });

  it('con 2 jugadores el anfitrión puede empezar', async () => {
    const { actions } = renderWithGame(<WaitingRoom room={makeRoom()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Empezar partida' }));
    expect(actions.startGame).toHaveBeenCalled();
  });

  it('quien no es anfitrión solo espera', () => {
    renderWithGame(<WaitingRoom room={makeRoom({ youId: 'beto' })} />);
    expect(screen.queryByRole('button', { name: 'Empezar partida' })).not.toBeInTheDocument();
    expect(screen.getByText(/Esperando a que el anfitrión/)).toBeInTheDocument();
  });

  it('no deja añadir bots con la sala llena', () => {
    renderWithGame(<WaitingRoom room={makeRoom({ maxPlayers: 2 })} />);
    expect(screen.getByRole('button', { name: 'Añadir bot' })).toBeDisabled();
  });

  it('permite salir de la sala', async () => {
    const { actions } = renderWithGame(<WaitingRoom room={makeRoom()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Salir de la sala' }));
    expect(actions.leaveRoom).toHaveBeenCalled();
  });
});
