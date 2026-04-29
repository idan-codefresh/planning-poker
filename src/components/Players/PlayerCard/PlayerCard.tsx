import React from 'react';
import { removePlayer } from '../../../service/players';
import { Game } from '../../../types/game';
import { Player } from '../../../types/player';
import { Status } from '../../../types/status';
import { isModerator } from '../../../utils/isModerator';
import { TrashSVG } from '../../SVGs/Trash';
import { getCards } from '../CardPicker/CardConfigs';

interface PlayerCardProps {
  game: Game;
  player: Player;
  currentPlayerId: string;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ game, player, currentPlayerId }) => {
  const isCurrentPlayer = player.id === currentPlayerId;
  const isMod = isModerator(game.createdById, currentPlayerId, game.isAllowMembersToManageSession);
  const cardValue = getCardValue(player, game);
  const isFinished = game.gameStatus === Status.Finished;
  const voted = player.status === Status.Finished;

  return (
    <div
      className='relative flex flex-col rounded-lg transition-all duration-200 w-[82px]'
      style={{
        background: isFinished ? getCardColor(game, player.value) || 'var(--lin-surface)' : 'var(--lin-surface)',
        border: `1px solid ${isCurrentPlayer ? 'var(--lin-accent)' : 'var(--lin-border-strong)'}`,
        boxShadow: isCurrentPlayer ? '0 0 0 1px var(--lin-accent)' : 'none',
      }}
    >
      {/* Name row */}
      <div
        className='flex items-center justify-between gap-1 px-2 pt-2 pb-1'
        style={{ borderBottom: '1px solid var(--lin-border)' }}
      >
        <span
          className='text-xs font-medium truncate flex-1'
          style={{ color: 'var(--lin-text)' }}
          title={player.name}
        >
          {player.name}
        </span>
        {isMod && !isCurrentPlayer && (
          <button
            title='Remove'
            className='flex-shrink-0 rounded p-0.5 transition hover:bg-red-500/10'
            onClick={() => removePlayer(game.id, player.id)}
            data-testid='remove-button'
          >
            <TrashSVG className='h-3 w-3 text-red-400' />
          </button>
        )}
      </div>

      {/* Value area */}
      <div className='flex items-center justify-center py-4'>
        {!voted && !isFinished ? (
          <span className='text-2xl opacity-40'>·</span>
        ) : (
          <span
            className={`font-semibold leading-none ${cardValue.length < 2 ? 'text-3xl' : 'text-2xl'}`}
            style={{ color: isFinished ? 'var(--lin-text)' : 'var(--lin-text-2)' }}
          >
            {cardValue}
          </span>
        )}
      </div>

      {/* Status dot */}
      <div className='flex justify-center pb-2'>
        <span
          className='inline-block h-1.5 w-1.5 rounded-full'
          style={{ background: voted ? 'var(--lin-green)' : 'var(--lin-text-3)' }}
        />
      </div>
    </div>
  );
};

const getCardColor = (game: Game, value: number | undefined): string => {
  if (game.gameStatus === Status.Finished) {
    const card = getCards(game.gameType).find((card) => card.value === value);
    return card?.color ?? '';
  }
  return '';
};

const getCardValue = (player: Player, game: Game): string => {
  if (game.gameStatus !== Status.Finished) {
    return player.status === Status.Finished ? '👍' : '🤔';
  }
  if (player.status !== Status.Finished) return '🤔';
  if (player.value === -1) return player.emoji || '☕';
  return getCardDisplayValue(game, player.value);
};

const getCardDisplayValue = (game: Game, cardValue: number | undefined): string => {
  const cards = game.cards?.length > 0 ? game.cards : getCards(game.gameType);
  return cards.find((card) => card.value === cardValue)?.displayValue || cardValue?.toString() || '';
};
