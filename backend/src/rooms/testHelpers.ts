import type { PlayerId, RoomView, ServerMessage } from '@caida/shared';
import { createSeededRandom } from '../game/random';
import { silentLogger } from '../logger';
import { Room } from './Room';
import type { RoomDeps } from './Room';
import type { Scheduler } from './scheduler';

interface Task {
  readonly callback: () => void;
  readonly delayMs: number;
}

/** Reloj de mentira: las tareas solo corren cuando la prueba lo pide. */
export class FakeScheduler {
  private tasks = new Set<Task>();

  readonly schedule: Scheduler = (callback, delayMs) => {
    const task: Task = { callback, delayMs };
    this.tasks.add(task);
    return () => this.tasks.delete(task);
  };

  get pending(): number {
    return this.tasks.size;
  }

  get delays(): number[] {
    return [...this.tasks].map((task) => task.delayMs);
  }

  /** Ejecuta la tarea más antigua. Devuelve `false` si no había ninguna. */
  runNext(): boolean {
    const [task] = this.tasks;
    if (!task) return false;
    this.tasks.delete(task);
    task.callback();
    return true;
  }
}

/** Primera semilla con la que el motor elige repartidor al asiento `index` de `players`. */
export function seedForDealer(index: number, players: number): number {
  for (let seed = 0; seed < 1000; seed++) {
    if (Math.floor(createSeededRandom(seed)() * players) === index) return seed;
  }
  throw new Error('No se encontró una semilla');
}

export const BOT_DELAY = 1000;
export const IDLE_TIMEOUT = 60_000;

interface TestRoomOptions {
  readonly maxPlayers?: number;
  readonly seed?: number;
}

/** Sala aislada: recoge los mensajes enviados y las salas cerradas. */
export function createTestRoom({ maxPlayers = 4, seed = 1 }: TestRoomOptions = {}) {
  const scheduler = new FakeScheduler();
  const sent = new Map<PlayerId, ServerMessage[]>();
  const closed: Room[] = [];

  const deps: RoomDeps = {
    random: createSeededRandom(seed),
    botDelayMs: BOT_DELAY,
    idleTimeoutMs: IDLE_TIMEOUT,
    logger: silentLogger,
    schedule: scheduler.schedule,
    publish: (playerId, message) => {
      sent.set(playerId, [...(sent.get(playerId) ?? []), message]);
    },
    onClose: (room) => closed.push(room),
  };

  const room = new Room('K7QX', { playerId: 'ana', name: 'Ana' }, maxPlayers, deps);
  sent.clear();

  return {
    room,
    scheduler,
    closed,
    messagesTo: (playerId: PlayerId): ServerMessage[] => sent.get(playerId) ?? [],
    clearMessages: () => sent.clear(),
    /** Última vista de la sala que recibió el jugador. */
    lastView: (playerId: PlayerId): RoomView => {
      const update = [...(sent.get(playerId) ?? [])].reverse().find((m) => m.type === 'roomUpdate');
      if (update?.type !== 'roomUpdate') throw new Error(`${playerId} no recibió ninguna vista`);
      return update.room;
    },
  };
}
