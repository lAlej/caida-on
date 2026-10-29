import { CLOSE_CODE_REPLACED } from '@caida/shared';
import type { ClientMessage, ServerMessage } from '@caida/shared';

/** `replaced`: la sesión se abrió en otra pestaña y esta ya no debe reconectarse. */
export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'replaced';

/** Subconjunto de `WebSocket` que usamos; permite sustituirlo en las pruebas. */
export interface SocketLike {
  readonly readyState: number;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  send(data: string): void;
  close(): void;
}

const SOCKET_OPEN = 1;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 10_000;

export interface GameSocketOptions {
  readonly url: string;
  readonly sessionToken: string;
  readonly name: string;
  readonly onStatus: (status: ConnectionStatus) => void;
  readonly onMessage: (message: ServerMessage) => void;
  readonly createSocket?: (url: string) => SocketLike;
}

/**
 * Conexión al servidor: se identifica con el token de la sesión nada más abrirse y,
 * si se corta, reintenta con espera creciente. Al reconectar el servidor devuelve
 * al jugador a su sala.
 */
export class GameSocket {
  private socket: SocketLike | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private attempts = 0;
  private stopped = false;

  constructor(private readonly options: GameSocketOptions) {}

  start(): void {
    this.open();
  }

  /** Devuelve `false` si no hay conexión abierta y el mensaje no se envió. */
  send(message: ClientMessage): boolean {
    if (this.socket?.readyState !== SOCKET_OPEN) return false;
    this.socket.send(JSON.stringify(message));
    return true;
  }

  stop(): void {
    this.stopped = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onopen = socket.onmessage = socket.onclose = null;
      socket.close();
    }
  }

  private open(): void {
    this.options.onStatus(this.attempts === 0 ? 'connecting' : 'reconnecting');
    const socket = (this.options.createSocket ?? ((url) => new WebSocket(url)))(this.options.url);
    this.socket = socket;

    socket.onopen = () => {
      this.attempts = 0;
      socket.send(
        JSON.stringify({
          type: 'identify',
          sessionToken: this.options.sessionToken,
          name: this.options.name,
        } satisfies ClientMessage),
      );
      this.options.onStatus('open');
    };

    socket.onmessage = (event) => {
      const message = parseServerMessage(event.data);
      if (message) this.options.onMessage(message);
    };

    socket.onclose = (event) => {
      if (this.socket !== socket) return;
      this.socket = null;
      if (this.stopped) return;

      if (event.code === CLOSE_CODE_REPLACED) {
        this.options.onStatus('replaced');
        return;
      }
      this.options.onStatus('reconnecting');
      const delay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** this.attempts);
      this.attempts += 1;
      this.retryTimer = setTimeout(() => this.open(), delay);
    };
  }
}

function parseServerMessage(data: unknown): ServerMessage | null {
  if (typeof data !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(data);
    const isMessage =
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as { type?: unknown }).type === 'string';
    return isMessage ? (parsed as ServerMessage) : null;
  } catch {
    return null;
  }
}
