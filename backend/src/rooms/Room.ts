import { MIN_PLAYERS } from '@caida/shared';
import type {
  Card,
  GameEvent,
  MesaOrder,
  PlayerId,
  RoomStatus,
  RoomSummary,
  RoomView,
  SeatView,
  ServerMessage,
} from '@caida/shared';
import { decideBotAction } from '../bots/randomBot';
import { AppError } from '../errors';
import { CaidaGame } from '../game/CaidaGame';
import type { Random } from '../game/random';
import type { GameAction, GameSnapshot } from '../game/types';
import { buildGameView } from '../game/view';
import type { PlayerMeta } from '../game/view';
import type { Logger } from '../logger';
import type { CancelTimer, Scheduler } from './scheduler';

export interface PlayerIdentity {
  readonly playerId: PlayerId;
  readonly name: string;
}

export interface RoomDeps {
  readonly random: Random;
  readonly botDelayMs: number;
  readonly idleTimeoutMs: number;
  readonly logger: Logger;
  readonly schedule: Scheduler;
  /** Entrega un mensaje a un jugador si está conectado. */
  publish(playerId: PlayerId, message: ServerMessage): void;
  /** Avisa de que la sala ya no debe existir. */
  onClose(room: Room): void;
}

interface Seat {
  readonly playerId: PlayerId;
  readonly name: string;
  /** Bot de la sala, o humano que abandonó la partida y fue reemplazado para siempre. */
  isBot: boolean;
  /** Solo tiene sentido para humanos. */
  connected: boolean;
}

/** Un asiento lo juega un bot si lo es, o si su jugador está desconectado. */
const isBotControlled = (seat: Seat): boolean => seat.isBot || !seat.connected;

/**
 * Una sala: reúne a los jugadores, arranca la partida y reparte el estado a cada uno.
 * Mientras un humano está desconectado, un bot juega por él.
 */
export class Room {
  private readonly seats: Seat[] = [];
  private hostId: PlayerId;
  private status: RoomStatus = 'lobby';
  private game: CaidaGame | null = null;
  private botCount = 0;
  private closed = false;
  private cancelBotTimer: CancelTimer | null = null;
  private cancelIdleTimer: CancelTimer | null = null;

  constructor(
    readonly code: string,
    host: PlayerIdentity,
    private readonly maxPlayers: number,
    private readonly deps: RoomDeps,
  ) {
    this.hostId = host.playerId;
    this.seats.push({ ...host, isBot: false, connected: true });
    this.broadcast();
  }

  // ── Consultas ──────────────────────────────────────────────────────────────

  has(playerId: PlayerId): boolean {
    return this.seatOf(playerId) !== undefined;
  }

  /** Salas en espera con sitio libre: las que se pueden listar y a las que unirse. */
  get isOpen(): boolean {
    return this.status === 'lobby' && this.seats.length < this.maxPlayers;
  }

  /** Jugadores humanos con asiento, conectados o no. */
  humanIds(): PlayerId[] {
    return this.seats.filter((seat) => !seat.isBot).map((seat) => seat.playerId);
  }

  summary(): RoomSummary {
    return {
      code: this.code,
      hostName: this.seatOf(this.hostId)?.name ?? '',
      playerCount: this.seats.length,
      maxPlayers: this.maxPlayers,
    };
  }

  viewFor(playerId: PlayerId): RoomView {
    return this.buildView(playerId, this.game?.snapshot() ?? null);
  }

  // ── Antes de la partida ────────────────────────────────────────────────────

  join(identity: PlayerIdentity): void {
    if (this.has(identity.playerId)) return;
    this.assertLobby();
    if (this.seats.length >= this.maxPlayers) {
      throw new AppError('ROOM_FULL', 'La sala está llena.');
    }
    this.seats.push({ ...identity, isBot: false, connected: true });
    this.broadcast();
  }

  addBot(requesterId: PlayerId): void {
    this.assertHost(requesterId);
    this.assertLobby();
    if (this.seats.length >= this.maxPlayers) {
      throw new AppError('ROOM_FULL', 'La sala está llena.');
    }
    this.botCount += 1;
    this.seats.push({
      playerId: `bot-${this.code}-${this.botCount}`,
      name: `Bot ${this.botCount}`,
      isBot: true,
      connected: true,
    });
    this.broadcast();
  }

  start(requesterId: PlayerId): void {
    this.assertHost(requesterId);
    this.assertLobby();
    if (this.seats.length < MIN_PLAYERS) {
      throw new AppError('NOT_ENOUGH_PLAYERS', `Hacen falta al menos ${MIN_PLAYERS} jugadores.`);
    }

    this.game = new CaidaGame(
      this.seats.map((seat) => seat.playerId),
      { random: this.deps.random },
    );
    this.status = 'playing';
    this.broadcast();
    this.scheduleBot();
  }

  // ── Durante la partida ─────────────────────────────────────────────────────

  chooseMesaOrder(playerId: PlayerId, order: MesaOrder): void {
    this.act(playerId, { type: 'chooseMesaOrder', order });
  }

  playCard(playerId: PlayerId, card: Card): void {
    this.act(playerId, { type: 'playCard', card });
  }

  // ── Salidas, desconexiones y regresos ──────────────────────────────────────

  /** Salida voluntaria. En plena partida el asiento queda en manos de un bot para siempre. */
  leave(playerId: PlayerId): void {
    const seat = this.seatOf(playerId);
    if (!seat || seat.isBot) throw new AppError('NOT_IN_ROOM', 'No estás en esta sala.');

    const events: GameEvent[] = [];
    if (this.status === 'playing') {
      seat.isBot = true;
      seat.connected = true;
      events.push({ type: 'botTookOver', playerId });
    } else {
      this.seats.splice(this.seats.indexOf(seat), 1);
    }

    const nextHost = this.seats.find((candidate) => !candidate.isBot);
    if (!nextHost) {
      this.close();
      return;
    }
    this.hostId = nextHost.playerId;
    this.broadcast(events);
    this.scheduleBot();
  }

  /** La conexión se perdió. En el lobby equivale a salir; en partida entra un bot. */
  markDisconnected(playerId: PlayerId): void {
    const seat = this.seatOf(playerId);
    if (!seat || seat.isBot || !seat.connected) return;

    if (this.status !== 'playing') {
      this.leave(playerId);
      return;
    }

    seat.connected = false;
    if (!this.hasConnectedHuman()) this.startIdleTimer();
    this.broadcast([{ type: 'botTookOver', playerId }]);
    this.scheduleBot();
  }

  /** El jugador volvió: recupera su asiento y el bot deja de jugar por él. */
  markReconnected(playerId: PlayerId): void {
    const seat = this.seatOf(playerId);
    if (!seat || seat.isBot) return;

    const wasDisconnected = !seat.connected;
    seat.connected = true;
    this.stopIdleTimer();
    this.broadcast(wasDisconnected ? [{ type: 'playerReturned', playerId }] : []);
    this.scheduleBot();
  }

  /** Detiene los temporizadores sin avisar a nadie. Para el cierre del servidor. */
  dispose(): void {
    this.closed = true;
    this.stopBotTimer();
    this.stopIdleTimer();
  }

  // ── Internos ───────────────────────────────────────────────────────────────

  private act(playerId: PlayerId, action: GameAction): void {
    if (!this.game) throw new AppError('GAME_NOT_STARTED', 'La partida no ha empezado.');
    this.afterGameChange(this.game.apply(playerId, action));
  }

  private afterGameChange(events: GameEvent[]): void {
    if (this.game?.pendingActor() === null) this.status = 'finished';
    this.broadcast(events);
    this.scheduleBot();
  }

  /** Si le toca a un asiento controlado por un bot, programa su jugada. */
  private scheduleBot(): void {
    this.stopBotTimer();
    const actorId = this.game?.pendingActor();
    if (this.closed || !actorId || !this.hasConnectedHuman()) return;

    const seat = this.seatOf(actorId);
    if (!seat || !isBotControlled(seat)) return;

    this.cancelBotTimer = this.deps.schedule(() => this.runBot(actorId), this.deps.botDelayMs);
  }

  private runBot(actorId: PlayerId): void {
    this.cancelBotTimer = null;
    const seat = this.seatOf(actorId);
    const game = this.game;
    // Pudo cambiar algo mientras esperaba: el humano volvió, la partida terminó o cambió el turno.
    if (!game || !seat || !isBotControlled(seat) || game.pendingActor() !== actorId) return;

    try {
      const action = decideBotAction(game, actorId, this.deps.random);
      if (action) this.afterGameChange(game.apply(actorId, action));
    } catch (error) {
      this.deps.logger.error('Un bot no pudo jugar', { room: this.code, actorId, error });
    }
  }

  private startIdleTimer(): void {
    if (this.cancelIdleTimer) return;
    this.cancelIdleTimer = this.deps.schedule(() => this.close(), this.deps.idleTimeoutMs);
  }

  private stopIdleTimer(): void {
    this.cancelIdleTimer?.();
    this.cancelIdleTimer = null;
  }

  private stopBotTimer(): void {
    this.cancelBotTimer?.();
    this.cancelBotTimer = null;
  }

  private close(): void {
    if (this.closed) return;
    this.dispose();
    this.deps.onClose(this);
  }

  private hasConnectedHuman(): boolean {
    return this.seats.some((seat) => !seat.isBot && seat.connected);
  }

  private seatOf(playerId: PlayerId): Seat | undefined {
    return this.seats.find((seat) => seat.playerId === playerId);
  }

  private assertHost(playerId: PlayerId): void {
    if (!this.has(playerId)) throw new AppError('NOT_IN_ROOM', 'No estás en esta sala.');
    if (playerId !== this.hostId) {
      throw new AppError('NOT_HOST', 'Solo el anfitrión puede hacer eso.');
    }
  }

  private assertLobby(): void {
    if (this.status !== 'lobby') {
      throw new AppError('GAME_IN_PROGRESS', 'La partida ya empezó.');
    }
  }

  /** Envía a cada humano conectado su propia vista de la sala. */
  private broadcast(events: GameEvent[] = []): void {
    const snapshot = this.game?.snapshot() ?? null;
    for (const seat of this.seats) {
      if (seat.isBot || !seat.connected) continue;
      this.deps.publish(seat.playerId, {
        type: 'roomUpdate',
        room: this.buildView(seat.playerId, snapshot),
        events,
      });
    }
  }

  private buildView(playerId: PlayerId, snapshot: GameSnapshot | null): RoomView {
    const meta = new Map<PlayerId, PlayerMeta>(
      this.seats.map((seat) => [
        seat.playerId,
        { name: seat.name, isBot: seat.isBot, connected: seat.connected },
      ]),
    );
    const seats: SeatView[] = this.seats.map((seat) => ({
      playerId: seat.playerId,
      name: seat.name,
      isBot: seat.isBot,
      connected: seat.connected,
    }));

    return {
      code: this.code,
      status: this.status,
      hostId: this.hostId,
      maxPlayers: this.maxPlayers,
      youId: playerId,
      seats,
      game: snapshot ? buildGameView(snapshot, playerId, meta) : null,
    };
  }
}
