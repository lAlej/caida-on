import type { ServerMessage } from '@caida/shared';
import type { Connection } from './Connection';

/** Conexión de mentira que guarda lo que el servidor le envía. */
export class FakeConnection implements Connection {
  readonly messages: ServerMessage[] = [];
  closed: { code: number; reason: string } | null = null;

  constructor(readonly id: string) {}

  send(message: ServerMessage): void {
    this.messages.push(message);
  }

  close(code: number, reason: string): void {
    this.closed = { code, reason };
  }

  /** Último mensaje de ese tipo, o falla si no llegó ninguno. */
  last<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }> {
    const found = [...this.messages].reverse().find((message) => message.type === type);
    if (!found) throw new Error(`No llegó ningún mensaje "${type}"`);
    return found as Extract<ServerMessage, { type: T }>;
  }

  has(type: ServerMessage['type']): boolean {
    return this.messages.some((message) => message.type === type);
  }
}
