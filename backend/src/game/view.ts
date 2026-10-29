import type { GameView, PlayerId, PlayerView } from '@caida/shared';
import { cantoPoints, TARGET_SCORE } from '@caida/shared';
import type { GameSnapshot } from './types';

/** Datos de cada jugador que no pertenecen a las reglas: nombre y estado de conexión. */
export interface PlayerMeta {
  readonly name: string;
  readonly isBot: boolean;
  readonly connected: boolean;
}

/**
 * Proyecta el estado de la partida para un jugador. Solo incluye su propia mano;
 * de los demás se conoce la cantidad de cartas y el canto que anunciaron.
 */
export function buildGameView(
  snapshot: GameSnapshot,
  viewerId: PlayerId,
  meta: ReadonlyMap<PlayerId, PlayerMeta>,
): GameView {
  const players: PlayerView[] = snapshot.players.map((player) => {
    const info = meta.get(player.id);
    if (!info) throw new Error(`Faltan los datos del jugador ${player.id}`);
    return {
      id: player.id,
      name: info.name,
      score: player.score,
      handCount: player.hand.length,
      pileCount: player.pileCount,
      isDealer: player.id === snapshot.dealerId,
      isBot: info.isBot,
      connected: info.connected,
      canto: player.canto
        ? { kind: player.canto.kind, rank: player.canto.rank, points: cantoPoints(player.canto) }
        : null,
    };
  });

  return {
    youId: viewerId,
    phase: snapshot.phase,
    players,
    table: snapshot.table,
    hand: snapshot.players.find((player) => player.id === viewerId)?.hand ?? [],
    deckCount: snapshot.deckCount,
    dealerId: snapshot.dealerId,
    actorId: snapshot.actorId,
    mano: snapshot.mano,
    totalManos: snapshot.totalManos,
    lastThrown: snapshot.lastThrown,
    cantoWinnerId: snapshot.cantoWinnerId,
    targetScore: TARGET_SCORE,
    result: snapshot.result,
  };
}
