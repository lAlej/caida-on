import {
  CARDS_PER_HAND,
  MAL_ECHADA_POINTS,
  MAX_PLAYERS,
  MESA_ORDERS,
  MIN_PLAYERS,
  TARGET_SCORE,
  cantoPoints,
  capturePoints,
  cardCountThreshold,
  compareCantos,
  createDeck,
  detectCanto,
  findCapture,
  isSameCard,
  manosPerBaraja,
} from '@caida/shared';
import type {
  Card,
  GameEvent,
  GamePhase,
  GameResult,
  MesaOrder,
  PlayerId,
  WinReason,
} from '@caida/shared';
import { createSeededRandom, pickOne, shuffle, shuffleInPlace } from './random';
import type { Random } from './random';
import { GameRuleError } from './types';
import type { GameAction, GameSnapshot, LastThrown, PlayerState } from './types';

export interface CaidaGameOptions {
  readonly random?: Random;
  readonly firstDealerIndex?: number;
  /** Puntos con los que arrancan algunos jugadores. Solo para pruebas. */
  readonly initialScores?: Readonly<Record<PlayerId, number>>;
  /** Mazo inicial ya ordenado; se roba desde el final. Solo se usa en la primera baraja (pruebas). */
  readonly initialDeck?: readonly Card[];
}

/**
 * Motor de reglas de una partida de Caída. No sabe nada de red ni de salas: recibe
 * acciones, valida las reglas y devuelve los eventos que ocurrieron.
 *
 * Los jugadores se guardan en el orden de juego: el siguiente índice es el jugador
 * a la derecha del actual.
 */
export class CaidaGame {
  private readonly random: Random;
  private readonly players: PlayerState[];
  private dealerIndex: number;
  private turnIndex: number;
  private deck: Card[] = [];
  private table: Card[] = [];
  private lastThrown: LastThrown | null = null;
  private lastCapturerId: PlayerId | null = null;
  private phase: GamePhase = 'choosingOrder';
  private mano = 0;
  private cantoWinnerId: PlayerId | null = null;
  private result: GameResult | null = null;
  private presetDeck: Card[] | null;

  constructor(playerIds: readonly PlayerId[], options: CaidaGameOptions = {}) {
    if (playerIds.length < MIN_PLAYERS || playerIds.length > MAX_PLAYERS) {
      throw new GameRuleError('INVALID_ACTION', `Se juega de ${MIN_PLAYERS} a ${MAX_PLAYERS}.`);
    }
    if (new Set(playerIds).size !== playerIds.length) {
      throw new GameRuleError('INVALID_ACTION', 'Los jugadores deben ser distintos.');
    }

    this.random = options.random ?? createSeededRandom(Date.now());
    this.players = playerIds.map((id) => ({
      id,
      score: options.initialScores?.[id] ?? 0,
      hand: [],
      pile: [],
      canto: null,
    }));
    this.dealerIndex = options.firstDealerIndex ?? Math.floor(this.random() * this.players.length);
    this.turnIndex = this.dealerIndex;
    this.presetDeck = options.initialDeck ? [...options.initialDeck] : null;
    this.beginBaraja();
  }

  /** Jugador que debe actuar ahora, o `null` si la partida terminó. */
  pendingActor(): PlayerId | null {
    return this.phase === 'finished' ? null : this.currentPlayer.id;
  }

  handOf(playerId: PlayerId): readonly Card[] {
    return [...this.playerById(playerId).hand];
  }

  snapshot(): GameSnapshot {
    return {
      phase: this.phase,
      players: this.players.map((player) => ({
        id: player.id,
        score: player.score,
        hand: [...player.hand],
        pileCount: player.pile.length,
        canto: player.canto,
      })),
      table: [...this.table],
      deckCount: this.deck.length,
      dealerId: this.dealer.id,
      actorId: this.pendingActor(),
      mano: this.mano,
      totalManos: manosPerBaraja(this.players.length),
      lastThrown: this.lastThrown?.card ?? null,
      cantoWinnerId: this.cantoWinnerId,
      result: this.result,
    };
  }

  /** Punto de entrada único para las acciones de cualquier jugador. */
  apply(playerId: PlayerId, action: GameAction): GameEvent[] {
    return action.type === 'playCard'
      ? this.playCard(playerId, action.card)
      : this.chooseMesaOrder(playerId, action.order);
  }

  /** El repartidor elige el orden (1-2-3-4 o 4-3-2-1) y se echa la mesa. */
  chooseMesaOrder(playerId: PlayerId, order: MesaOrder): GameEvent[] {
    this.assertActor(playerId, 'choosingOrder');
    const events: GameEvent[] = [];

    const hits: number[] = [];
    for (const called of MESA_ORDERS[order]) {
      const card = this.drawDistinctFromTable();
      this.table.push(card);
      if (card.rank === called) hits.push(called);
    }

    const points = hits.reduce((sum, hit) => sum + hit, 0);
    events.push({
      type: 'mesaDealt',
      dealerId: playerId,
      order,
      cards: [...this.table],
      hits,
      points,
    });

    if (points > 0) {
      if (this.award(this.dealer, points, 'instant', events)) return events;
    } else {
      const first = this.players[this.firstPlayerIndex()] as PlayerState;
      events.push({ type: 'malEchada', playerId: first.id });
      if (this.award(first, MAL_ECHADA_POINTS, 'instant', events)) return events;
    }

    this.dealMano(events);
    return events;
  }

  /**
   * Un jugador juega una carta. Si en la mesa hay una del mismo valor la captura
   * automáticamente (junto con las consecutivas); si no, la carta queda en la mesa.
   */
  playCard(playerId: PlayerId, card: Card): GameEvent[] {
    this.assertActor(playerId, 'playing');
    const player = this.currentPlayer;

    const handIndex = player.hand.findIndex((inHand) => isSameCard(inHand, card));
    if (handIndex < 0) {
      throw new GameRuleError('CARD_NOT_IN_HAND', 'Esa carta no está en tu mano.');
    }
    const [played] = player.hand.splice(handIndex, 1) as [Card];
    const events: GameEvent[] = [{ type: 'cardPlayed', playerId, card: played }];

    const captured = findCapture(this.table, played);
    if (captured) {
      if (this.capture(player, played, captured, events)) return events;
    } else {
      this.table.push(played);
      this.lastThrown = { card: played, by: playerId };
    }

    this.advanceTurn(events);
    return events;
  }

  /** Devuelve `true` si los puntos de la captura terminan la partida. */
  private capture(
    player: PlayerState,
    played: Card,
    captured: readonly Card[],
    events: GameEvent[],
  ): boolean {
    const caida = this.lastThrown !== null && this.lastThrown.card.rank === played.rank;
    this.table = this.table.filter((onTable) => !captured.includes(onTable));
    player.pile.push(played, ...captured);
    this.lastCapturerId = player.id;
    this.lastThrown = null;

    const mesaLimpia = this.table.length === 0;
    const points = capturePoints({ rank: played.rank, caida, mesaLimpia });
    events.push({
      type: 'captured',
      playerId: player.id,
      cards: [played, ...captured],
      caida,
      mesaLimpia,
      points,
    });
    return points > 0 && this.award(player, points, 'instant', events);
  }

  private advanceTurn(events: GameEvent[]): void {
    this.turnIndex = (this.turnIndex + 1) % this.players.length;
    if (this.players.every((player) => player.hand.length === 0)) this.closeMano(events);
  }

  /** Al acabarse las cartas de la mano puntúa el canto ganador y se reparte de nuevo si queda mazo. */
  private closeMano(events: GameEvent[]): void {
    const winner = this.cantoWinnerId ? this.playerById(this.cantoWinnerId) : null;
    if (winner?.canto) {
      const points = cantoPoints(winner.canto);
      events.push({ type: 'cantoScored', playerId: winner.id, kind: winner.canto.kind, points });
      if (this.award(winner, points, 'canto', events)) return;
    }

    this.cantoWinnerId = null;
    for (const player of this.players) player.canto = null;

    if (this.deck.length > 0) this.dealMano(events);
    else this.endBaraja(events);
  }

  /** Reparte lo que quedó en la mesa, cuenta las cartas y decide si hay ganador o empieza otra baraja. */
  private endBaraja(events: GameEvent[]): void {
    const sweeper = this.lastCapturerId ? this.playerById(this.lastCapturerId) : null;
    if (sweeper && this.table.length > 0) {
      events.push({ type: 'tableSwept', playerId: sweeper.id, count: this.table.length });
      sweeper.pile.push(...this.table);
      this.table = [];
    }

    const counts = [];
    for (const player of this.players) {
      const threshold = cardCountThreshold(this.players.length, player === this.dealer);
      const points = Math.max(0, player.pile.length - threshold);
      player.score += points;
      counts.push({ playerId: player.id, cards: player.pile.length, points });
    }
    events.push({ type: 'barajaCounted', counts });

    const best = Math.max(...this.players.map((player) => player.score));
    if (best >= TARGET_SCORE) {
      const tied = this.players.filter((player) => player.score === best);
      this.finish(pickOne(tied, this.random), 'cards', events);
      return;
    }

    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    this.beginBaraja();
    events.push({ type: 'barajaStarted', dealerId: this.dealer.id });
  }

  private beginBaraja(): void {
    this.deck = this.presetDeck ?? shuffle(createDeck(), this.random);
    this.presetDeck = null;
    this.table = [];
    this.lastThrown = null;
    this.lastCapturerId = null;
    this.cantoWinnerId = null;
    this.mano = 0;
    for (const player of this.players) {
      player.hand = [];
      player.pile = [];
      player.canto = null;
    }
    this.phase = 'choosingOrder';
    this.turnIndex = this.dealerIndex;
  }

  /** Roba una carta para la mesa; si repite un valor ya puesto, vuelve al mazo y se roba otra. */
  private drawDistinctFromTable(): Card {
    for (;;) {
      const card = this.deck.pop();
      if (!card) throw new Error('El mazo se quedó sin cartas');
      if (!this.table.some((onTable) => onTable.rank === card.rank)) return card;
      this.deck.push(card);
      shuffleInPlace(this.deck, this.random);
    }
  }

  /**
   * Reparte 3 cartas a cada jugador empezando por el de la derecha del repartidor.
   *
   * Quien abre la mano rota hacia la derecha: en la mano 1 abre el de la derecha del
   * repartidor, en la 2 el siguiente, y así. Cada mano empieza sin carta recién lanzada,
   * así que una caída nunca cruza de una mano a la otra.
   */
  private dealMano(events: GameEvent[]): void {
    const count = this.players.length;
    const firstToReceive = this.firstPlayerIndex();
    for (let offset = 0; offset < count; offset++) {
      const player = this.players[(firstToReceive + offset) % count] as PlayerState;
      player.hand = Array.from({ length: CARDS_PER_HAND }, () => this.drawCard());
      player.canto = detectCanto(player.hand);
    }

    this.mano += 1;
    this.phase = 'playing';
    this.turnIndex = (this.dealerIndex + this.mano) % count;
    this.lastThrown = null;
    this.cantoWinnerId = this.resolveCantoWinner();

    events.push({ type: 'manoStarted', mano: this.mano, totalManos: manosPerBaraja(count) });
    for (const player of this.players) {
      if (!player.canto) continue;
      events.push({
        type: 'cantoAnnounced',
        playerId: player.id,
        kind: player.canto.kind,
        rank: player.canto.rank,
        points: cantoPoints(player.canto),
      });
    }
  }

  /** Gana el canto más alto; si empatan, el que esté más cerca a la derecha del repartidor. */
  private resolveCantoWinner(): PlayerId | null {
    const count = this.players.length;
    const contenders = this.players.flatMap((player, index) =>
      player.canto
        ? [
            {
              id: player.id,
              canto: player.canto,
              distance: (index - this.dealerIndex - 1 + count) % count,
            },
          ]
        : [],
    );
    contenders.sort((a, b) => compareCantos(b.canto, a.canto) || a.distance - b.distance);
    return contenders[0]?.id ?? null;
  }

  /** Suma puntos. Devuelve `true` si con ellos el jugador llega a la meta y gana. */
  private award(
    player: PlayerState,
    points: number,
    reason: WinReason,
    events: GameEvent[],
  ): boolean {
    player.score += points;
    if (player.score < TARGET_SCORE) return false;
    this.finish(player, reason, events);
    return true;
  }

  private finish(winner: PlayerState, reason: WinReason, events: GameEvent[]): void {
    this.phase = 'finished';
    this.result = { winnerId: winner.id, reason };
    events.push({ type: 'gameOver', winnerId: winner.id, reason });
  }

  private drawCard(): Card {
    const card = this.deck.pop();
    if (!card) throw new Error('El mazo se quedó sin cartas');
    return card;
  }

  private assertActor(playerId: PlayerId, expectedPhase: GamePhase): void {
    if (this.phase !== expectedPhase) {
      throw new GameRuleError('INVALID_ACTION', 'Esa acción no se puede hacer ahora.');
    }
    if (this.currentPlayer.id !== playerId) {
      throw new GameRuleError('NOT_YOUR_TURN', 'No es tu turno.');
    }
  }

  private playerById(playerId: PlayerId): PlayerState {
    const player = this.players.find((candidate) => candidate.id === playerId);
    if (!player) throw new GameRuleError('INVALID_ACTION', 'Jugador desconocido.');
    return player;
  }

  private firstPlayerIndex(): number {
    return (this.dealerIndex + 1) % this.players.length;
  }

  private get dealer(): PlayerState {
    return this.players[this.dealerIndex] as PlayerState;
  }

  private get currentPlayer(): PlayerState {
    return this.players[this.turnIndex] as PlayerState;
  }
}
