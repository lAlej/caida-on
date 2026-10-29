import { isSameCard } from '@caida/shared';
import type { GameView } from '@caida/shared';
import type { ReactNode } from 'react';
import { Card } from '../../components/cards/Card';
import type { CardSize, CardState } from '../../components/cards/Card';
import type { PlayPreview } from './capturePreview';
import { PlayerSeat } from './PlayerSeat';
import { arrangeSeats } from './seating';
import { tableCardSize } from './tableLayout';
import styles from './Table.module.css';

interface TableProps {
  game: GameView;
  /** Lo que se llevaría la carta elegida; resalta esas cartas en la mesa. */
  preview: PlayPreview | null;
  /** Tamaño preferido de las cartas; se reduce si la mesa se llena. */
  cardSize: CardSize;
  /** Tu mano y los controles, que van en la parte baja de la mesa. */
  children: ReactNode;
}

/**
 * El tablero mide siempre lo mismo: el área central tiene alto fijo y los asientos y la parte
 * baja reservan su espacio. Si hay muchas cartas en la mesa, se achican.
 */
export function Table({ game, preview, cardSize, children }: TableProps) {
  const seats = arrangeSeats(game.players, game.youId);
  const you = seats.find((seat) => seat.position === 'bottom');
  const dealerName = game.players.find((player) => player.id === game.dealerId)?.name;
  const tableSize = tableCardSize(game.table.length, cardSize);

  const stateOf = (tableCard: GameView['table'][number]): CardState => {
    if (preview?.captured.some((captured) => isSameCard(captured, tableCard))) return 'hit';
    if (game.lastThrown && isSameCard(game.lastThrown, tableCard)) return 'last';
    return 'normal';
  };

  // Sin cartas en la mesa, el aviso ocupa su lugar en vez de añadir una fila.
  const emptyMessage =
    game.phase === 'choosingOrder'
      ? `${dealerName ?? 'El repartidor'} está echando la mesa…`
      : 'La mesa está vacía.';

  return (
    <section className={styles['felt']} aria-label="Mesa de juego">
      <div className={styles['grid']}>
        {seats
          .filter((seat) => seat.position !== 'bottom')
          .map(({ player, position }) => (
            <div key={player.id} className={styles[position]}>
              <PlayerSeat
                player={player}
                targetScore={game.targetScore}
                isYou={false}
                isOpponent
                isActor={game.actorId === player.id}
                cantoWins={game.cantoWinnerId === player.id}
              />
            </div>
          ))}

        <div className={styles['center']}>
          <div className={styles['tableRow']}>
            <div className={styles['deck']}>
              <Card size={cardSize} />
              <span className={styles['deckCount']}>Mazo · {game.deckCount}</span>
            </div>
            {game.table.length === 0 ? (
              <p className={styles['message']}>{emptyMessage}</p>
            ) : (
              <ul className={styles['cards']} aria-label="Cartas en la mesa">
                {game.table.map((card) => (
                  <li key={`${card.rank}-${card.suit}`} className={styles['tableCard']}>
                    <Card card={card} size={tableSize} state={stateOf(card)} />
                    <span className={styles['tag']}>
                      {game.lastThrown && isSameCard(game.lastThrown, card) ? 'Última' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={styles['bottom']}>
          {you && (
            <PlayerSeat
              player={you.player}
              targetScore={game.targetScore}
              isYou
              isOpponent={false}
              isActor={game.actorId === you.player.id}
              cantoWins={game.cantoWinnerId === you.player.id}
            />
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
