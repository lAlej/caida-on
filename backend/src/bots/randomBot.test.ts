import { DECK_SIZE } from '@caida/shared';
import { describe, expect, it } from 'vitest';
import { CaidaGame } from '../game/CaidaGame';
import { createSeededRandom } from '../game/random';
import { decideBotAction } from './randomBot';

const MAX_TURNS = 2000;

function botsOnly(playerCount: number, seed: number) {
  const ids = ['a', 'b', 'c', 'd'].slice(0, playerCount);
  const random = createSeededRandom(seed);
  return { game: new CaidaGame(ids, { random }), random };
}

describe('decideBotAction', () => {
  it('no hace nada si no es su turno', () => {
    const { game, random } = botsOnly(2, 1);
    const { actorId } = game.snapshot();
    const other = ['a', 'b'].find((id) => id !== actorId) as string;
    expect(decideBotAction(game, other, random)).toBeNull();
  });

  it('elige el orden de la mesa cuando es el repartidor', () => {
    const { game, random } = botsOnly(2, 1);
    const action = decideBotAction(game, game.snapshot().dealerId, random);
    expect(action).toMatchObject({ type: 'chooseMesaOrder' });
  });

  it('juega una carta de su propia mano', () => {
    const { game, random } = botsOnly(3, 2);
    game.chooseMesaOrder(game.snapshot().dealerId, 'ascending');
    const botId = game.snapshot().actorId as string;
    const action = decideBotAction(game, botId, random);

    expect(action?.type).toBe('playCard');
    if (action?.type === 'playCard') expect(game.handOf(botId)).toContainEqual(action.card);
  });

  it('no hace nada cuando la partida terminó', () => {
    const { game, random } = botsOnly(2, 1);
    for (let i = 0; i < MAX_TURNS && game.snapshot().phase !== 'finished'; i++) {
      const actorId = game.snapshot().actorId as string;
      const action = decideBotAction(game, actorId, random);
      if (action) game.apply(actorId, action);
    }
    expect(decideBotAction(game, 'a', random)).toBeNull();
    expect(decideBotAction(game, 'b', random)).toBeNull();
  });
});

describe('simulación de partidas completas entre bots', () => {
  it.each([2, 3, 4])(
    'con %i jugadores las partidas terminan y respetan las invariantes',
    (count) => {
      for (let seed = 0; seed < 100; seed++) {
        const { game, random } = botsOnly(count, seed);
        let previousScores = game.snapshot().players.map((p) => p.score);

        let turns = 0;
        while (game.snapshot().phase !== 'finished') {
          if (++turns > MAX_TURNS) throw new Error(`La partida ${seed} no terminó`);

          const actorId = game.snapshot().actorId as string;
          const action = decideBotAction(game, actorId, random);
          expect(action, `semilla ${seed}`).not.toBeNull();
          game.apply(actorId, action as NonNullable<typeof action>);

          const snapshot = game.snapshot();
          const cardsInPlay =
            snapshot.deckCount +
            snapshot.table.length +
            snapshot.players.reduce((sum, p) => sum + p.hand.length + p.pileCount, 0);
          expect(cardsInPlay, `semilla ${seed}, turno ${turns}`).toBe(DECK_SIZE);

          const ranks = snapshot.table.map((c) => c.rank);
          expect(new Set(ranks).size, `semilla ${seed}: mesa con valores repetidos`).toBe(
            ranks.length,
          );

          const scores = snapshot.players.map((p) => p.score);
          scores.forEach((score, i) =>
            expect(score).toBeGreaterThanOrEqual(previousScores[i] as number),
          );
          previousScores = scores;
        }

        const { result, players } = game.snapshot();
        const winner = players.find((p) => p.id === result?.winnerId);
        expect(winner?.score, `semilla ${seed}`).toBeGreaterThanOrEqual(24);
        expect(players.filter((p) => p.score >= 24).length).toBeGreaterThanOrEqual(1);
      }
    },
  );
});
