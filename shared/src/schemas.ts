import { z } from 'zod';
import { SUITS, isRank } from './cards';
import type { Rank } from './cards';
import { MAX_NAME_LENGTH, ROOM_CODE_LENGTH } from './protocol';
import { MAX_PLAYERS, MIN_PLAYERS } from './scoring';

const cardSchema = z.object({
  rank: z.custom<Rank>(isRank, 'Valor de carta inválido'),
  suit: z.enum(SUITS),
});

const nameSchema = z.string().trim().min(1).max(MAX_NAME_LENGTH);

/**
 * Mensajes que el cliente puede enviar. El servidor los valida antes de usarlos.
 * Va aparte del resto del protocolo para que el navegador no cargue `zod`.
 */
export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('identify'),
    sessionToken: z.string().min(16).max(128),
    name: nameSchema,
  }),
  z.object({
    type: z.literal('createRoom'),
    maxPlayers: z.number().int().min(MIN_PLAYERS).max(MAX_PLAYERS),
  }),
  z.object({
    type: z.literal('joinRoom'),
    code: z.string().trim().toUpperCase().length(ROOM_CODE_LENGTH),
  }),
  z.object({ type: z.literal('leaveRoom') }),
  z.object({ type: z.literal('addBot') }),
  z.object({ type: z.literal('startGame') }),
  z.object({
    type: z.literal('chooseMesaOrder'),
    order: z.enum(['ascending', 'descending']),
  }),
  z.object({ type: z.literal('playCard'), card: cardSchema }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;
export type ClientMessageType = ClientMessage['type'];
