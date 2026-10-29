import { CANTO_LABELS } from '@caida/shared';
import type { GameEvent, PlayerId } from '@caida/shared';
import { cardName } from '../../lib/cards';
import { cantoName } from '../../lib/cantos';

export type NameOf = (playerId: PlayerId) => string;

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Frase en español para el registro de jugadas. */
export function describeEvent(event: GameEvent, nameOf: NameOf): string {
  switch (event.type) {
    case 'mesaDealt': {
      const range = event.order === 'ascending' ? '1, 2, 3, 4' : '4, 3, 2, 1';
      const result = event.hits.length
        ? `acertó ${event.hits.map((hit) => `el ${hit}`).join(' y ')} (+${event.points})`
        : 'no acertó ninguno';
      return `${nameOf(event.dealerId)} echó la mesa diciendo ${range}: ${result}.`;
    }
    case 'malEchada':
      return `Mesa mal echada: ${nameOf(event.playerId)} gana 1 punto.`;
    case 'manoStarted':
      return `Empieza la mano ${event.mano} de ${event.totalManos}.`;
    case 'cantoAnnounced':
      return `${nameOf(event.playerId)} cantó ${cantoName(event)}.`;
    case 'cardPlayed':
      return `${nameOf(event.playerId)} jugó el ${cardName(event.card)}.`;
    case 'captured': {
      const action = event.caida ? 'hizo caída y recogió' : 'recogió';
      const clean = event.mesaLimpia ? ' y dejó la mesa limpia' : '';
      const points = event.points > 0 ? ` (+${event.points})` : '';
      return `${nameOf(event.playerId)} ${action} ${plural(event.cards.length, 'carta', 'cartas')}${clean}${points}.`;
    }
    case 'cantoScored':
      return `${nameOf(event.playerId)} suma ${event.points} por su ${CANTO_LABELS[event.kind]}.`;
    case 'tableSwept':
      return `${nameOf(event.playerId)} se lleva ${plural(event.count, 'carta', 'cartas')} que quedaron en la mesa.`;
    case 'barajaCounted': {
      const scorers = event.counts
        .filter((entry) => entry.points > 0)
        .map((entry) => `${nameOf(entry.playerId)} +${entry.points}`);
      return scorers.length
        ? `Se acabó la baraja. Por cartas: ${scorers.join(', ')}.`
        : 'Se acabó la baraja. Nadie suma por cartas.';
    }
    case 'barajaStarted':
      return `Nueva baraja. Reparte ${nameOf(event.dealerId)}.`;
    case 'gameOver':
      return `${nameOf(event.winnerId)} ganó la partida.`;
    case 'botTookOver':
      return `${nameOf(event.playerId)} se desconectó. Un bot juega por esa persona.`;
    case 'playerReturned':
      return `${nameOf(event.playerId)} volvió a la partida.`;
    default:
      return event satisfies never;
  }
}
