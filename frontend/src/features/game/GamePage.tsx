import { useState } from 'react';
import { isSameCard } from '@caida/shared';
import type { Card, GameView, PlayerId, RoomView } from '@caida/shared';
import { Button } from '../../components/ui/Button';
import { cantoName } from '../../lib/cantos';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { useGame } from '../../state/useGame';
import { ActionBar } from './ActionBar';
import { previewPlay } from './capturePreview';
import { CountSummaryDialog } from './CountSummaryDialog';
import { EventLog } from './EventLog';
import styles from './GamePage.module.css';
import { GameOverDialog } from './GameOverDialog';
import { Hand } from './Hand';
import { MesaOrderDialog } from './MesaOrderDialog';
import { Scoreboard } from './Scoreboard';
import { Table } from './Table';

interface GamePageProps {
  room: RoomView;
  game: GameView;
}

export function GamePage({ room, game }: GamePageProps) {
  const { state, actions } = useGame();
  const compact = useMediaQuery('(max-width: 640px)');
  const [pickedCard, setPickedCard] = useState<Card | null>(null);

  // Lo elegido solo vale mientras la carta siga en la mano.
  const selected = pickedCard
    ? (game.hand.find((card) => isSameCard(card, pickedCard)) ?? null)
    : null;
  const preview = selected ? previewPlay(game.table, game.lastThrown, selected) : null;

  const you = game.players.find((player) => player.id === game.youId);
  const myTurn = game.phase === 'playing' && game.actorId === game.youId;
  const mustChooseOrder = game.phase === 'choosingOrder' && game.actorId === game.youId;
  const nameOf = (playerId: PlayerId) =>
    game.players.find((player) => player.id === playerId)?.name ?? 'Alguien';

  const play = () => {
    if (!selected || !myTurn) return;
    actions.playCard(selected);
    setPickedCard(null);
  };

  const leave = () => {
    const warning = 'Si sales, un bot jugará por ti hasta el final y no podrás volver. ¿Salir?';
    if (game.result || window.confirm(warning)) actions.leaveRoom();
  };

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <span className={styles['wordmark']}>Caída</span>
        <ul className={styles['chips']}>
          <li>Sala {room.code}</li>
          <li>Meta: {game.targetScore} puntos</li>
          {game.mano > 0 && (
            <li>
              Mano {game.mano} de {game.totalManos}
            </li>
          )}
          <li>Se juega hacia la derecha</li>
        </ul>
        <Button variant="secondary" onClick={leave}>
          Salir
        </Button>
      </header>

      <div className={styles['body']}>
        <Table game={game} preview={preview} cardSize={compact ? 'sm' : 'md'}>
          <div className={styles['you']}>
            <div className={styles['cantoSlot']}>
              {you?.canto && (
                <p className={styles['yourCanto']}>
                  Tienes {cantoName(you.canto)} · {you.canto.points} pts
                  {game.cantoWinnerId === you.id ? '' : ' (no puntúa: hay uno más alto)'}
                </p>
              )}
            </div>
            <Hand
              hand={game.hand}
              selected={selected}
              size={compact ? 'md' : 'lg'}
              onSelect={setPickedCard}
            />
          </div>
          <ActionBar game={game} selected={selected} preview={preview} onPlay={play} />
        </Table>

        <aside className={styles['side']}>
          <Scoreboard game={game} />
          <EventLog entries={state.log} nameOf={nameOf} />
        </aside>
      </div>

      {game.result ? (
        <GameOverDialog game={game} onLeave={actions.leaveRoom} />
      ) : mustChooseOrder ? (
        <MesaOrderDialog onChoose={actions.chooseMesaOrder} />
      ) : state.countSummary ? (
        <CountSummaryDialog
          counts={state.countSummary}
          nameOf={nameOf}
          onClose={actions.dismissSummary}
        />
      ) : null}
    </div>
  );
}
