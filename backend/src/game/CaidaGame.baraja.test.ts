import { DECK_SIZE, TARGET_SCORE, cardCountThreshold } from '@caida/shared';
import type { GameEvent } from '@caida/shared';
import { describe, expect, it } from 'vitest';
import { CaidaGame } from './CaidaGame';
import { createSeededRandom } from './random';
import { playSimpleTurn } from './testHelpers';

const MAX_TURNS = 500;

function newGame(playerCount: number, seed: number, initialScore = 0) {
  const ids = ['a', 'b', 'c', 'd'].slice(0, playerCount);
  const initialScores = Object.fromEntries(ids.map((id) => [id, initialScore]));
  return new CaidaGame(ids, { random: createSeededRandom(seed), initialScores });
}

/** Juega hasta que ocurre un evento del tipo pedido (o la partida termina) y devuelve todos los eventos. */
function playUntil(game: CaidaGame, type: GameEvent['type']): GameEvent[] {
  const all: GameEvent[] = [];
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const events = playSimpleTurn(game);
    all.push(...events);
    if (events.some((event) => event.type === type)) return all;
    if (game.snapshot().phase === 'finished') return all;
  }
  throw new Error('La partida no avanzó');
}

describe('CaidaGame · fin de la baraja', () => {
  it.each([2, 3, 4])('con %i jugadores las 40 cartas se reparten entre los montones', (count) => {
    for (let seed = 0; seed < 50; seed++) {
      const game = newGame(count, seed);
      const events = playUntil(game, 'barajaCounted');
      const counted = events.find((event) => event.type === 'barajaCounted');
      if (counted?.type !== 'barajaCounted') continue; // terminó antes por puntos
      const total = counted.counts.reduce((sum, entry) => sum + entry.cards, 0);
      expect(total, `semilla ${seed}`).toBe(DECK_SIZE);
    }
  });

  it('los puntos del conteo son las cartas que superan el número de cada jugador', () => {
    let checked = 0;
    for (let seed = 0; seed < 50; seed++) {
      const game = newGame(3, seed);
      const dealerId = game.snapshot().dealerId;
      const events = playUntil(game, 'barajaCounted');
      const counted = events.find((event) => event.type === 'barajaCounted');
      if (counted?.type !== 'barajaCounted') continue;

      for (const entry of counted.counts) {
        const threshold = cardCountThreshold(3, entry.playerId === dealerId);
        expect(entry.points).toBe(Math.max(0, entry.cards - threshold));
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('las cartas que quedan en la mesa se las lleva el último que capturó', () => {
    let swept = 0;
    for (let seed = 0; seed < 50; seed++) {
      const game = newGame(2, seed);
      const events = playUntil(game, 'barajaCounted');
      const tableSwept = events.find((event) => event.type === 'tableSwept');
      if (tableSwept?.type !== 'tableSwept') continue;
      swept++;
      const lastCapture = events.filter((event) => event.type === 'captured').at(-1);
      expect(lastCapture?.type, `semilla ${seed}`).toBe('captured');
      expect(tableSwept.count).toBeGreaterThan(0);
      if (lastCapture?.type === 'captured') {
        expect(tableSwept.playerId, `semilla ${seed}`).toBe(lastCapture.playerId);
      }
    }
    expect(swept).toBeGreaterThan(0);
  });

  it('si nadie llega a 24 empieza otra baraja con el siguiente repartidor', () => {
    let restarted = 0;
    for (let seed = 0; seed < 50; seed++) {
      const game = newGame(3, seed);
      const firstDealer = game.snapshot().dealerId;
      const events = playUntil(game, 'barajaCounted');
      const started = events.find((event) => event.type === 'barajaStarted');
      if (!started) continue;
      restarted++;

      const snapshot = game.snapshot();
      expect(snapshot).toMatchObject({ phase: 'choosingOrder', mano: 0, table: [] });
      expect(snapshot.dealerId).not.toBe(firstDealer);
      expect(snapshot.players.every((p) => p.hand.length === 0 && p.pileCount === 0)).toBe(true);
    }
    expect(restarted).toBeGreaterThan(0);
  });

  it('el conteo puede dar la victoria: gana quien tenga más puntos y llegue a 24', () => {
    let decided = 0;
    for (let seed = 0; seed < 200; seed++) {
      const game = newGame(2, seed, 15);
      const events = playUntil(game, 'barajaCounted');
      const over = events.find((event) => event.type === 'gameOver');
      if (over?.type !== 'gameOver' || over.reason !== 'cards') continue;
      decided++;

      const scores = game.snapshot().players.map((p) => p.score);
      const winner = game.snapshot().players.find((p) => p.id === over.winnerId);
      expect(winner?.score).toBe(Math.max(...scores));
      expect(winner?.score).toBeGreaterThanOrEqual(TARGET_SCORE);
    }
    expect(decided).toBeGreaterThan(0);
  });
});
