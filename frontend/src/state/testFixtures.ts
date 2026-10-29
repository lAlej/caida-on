import type { GameView, PlayerView, RoomView } from '@caida/shared';

export function makePlayer(overrides: Partial<PlayerView> = {}): PlayerView {
  return {
    id: 'ana',
    name: 'Ana',
    score: 0,
    handCount: 3,
    pileCount: 0,
    isDealer: false,
    isBot: false,
    connected: true,
    canto: null,
    ...overrides,
  };
}

export function makeGame(overrides: Partial<GameView> = {}): GameView {
  return {
    youId: 'ana',
    phase: 'playing',
    players: [makePlayer({ id: 'ana', name: 'Ana' }), makePlayer({ id: 'beto', name: 'Beto' })],
    table: [],
    hand: [],
    deckCount: 30,
    dealerId: 'beto',
    actorId: 'ana',
    mano: 1,
    totalManos: 6,
    lastThrown: null,
    cantoWinnerId: null,
    targetScore: 24,
    result: null,
    ...overrides,
  };
}

export function makeRoom(overrides: Partial<RoomView> = {}): RoomView {
  return {
    code: 'K7QX',
    status: 'lobby',
    hostId: 'ana',
    maxPlayers: 4,
    youId: 'ana',
    seats: [
      { playerId: 'ana', name: 'Ana', isBot: false, connected: true },
      { playerId: 'beto', name: 'Beto', isBot: false, connected: true },
    ],
    game: null,
    ...overrides,
  };
}
