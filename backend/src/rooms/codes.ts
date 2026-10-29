import { randomInt } from 'node:crypto';
import { ROOM_CODE_LENGTH } from '@caida/shared';

/** Sin I, O, 0 ni 1 para que el código no se confunda al dictarlo. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  return Array.from({ length: ROOM_CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join(
    '',
  );
}
