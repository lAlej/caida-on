import type { RoomSummary } from '@caida/shared';
import { generateRoomCode } from './codes';
import { Room } from './Room';
import type { PlayerIdentity, RoomDeps } from './Room';

const MAX_CODE_ATTEMPTS = 20;

/** Crea, busca y elimina salas. */
export class RoomManager {
  private readonly rooms = new Map<string, Room>();

  constructor(
    private readonly deps: Omit<RoomDeps, 'onClose'>,
    /** Se llama cuando una sala deja de existir, para que quien la usaba pueda limpiar. */
    private readonly onRoomClosed: (room: Room) => void,
    private readonly newCode: () => string = generateRoomCode,
  ) {}

  create(host: PlayerIdentity, maxPlayers: number): Room {
    const code = this.uniqueCode();
    const room = new Room(code, host, maxPlayers, {
      ...this.deps,
      onClose: (closed) => this.remove(closed),
    });
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  /** Salas en espera con sitio, las más nuevas primero. */
  listOpen(): RoomSummary[] {
    return [...this.rooms.values()]
      .filter((room) => room.isOpen)
      .map((room) => room.summary())
      .reverse();
  }

  closeAll(): void {
    for (const room of this.rooms.values()) room.dispose();
    this.rooms.clear();
  }

  private remove(room: Room): void {
    if (this.rooms.get(room.code) !== room) return;
    this.rooms.delete(room.code);
    this.onRoomClosed(room);
  }

  private uniqueCode(): string {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = this.newCode();
      if (!this.rooms.has(code)) return code;
    }
    throw new Error('No se pudo generar un código de sala libre');
  }
}
