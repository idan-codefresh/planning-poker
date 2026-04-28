import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { updatePlayerValue } from '../../../service/players';
import { Game } from '../../../types/game';
import { Player } from '../../../types/player';
import { Status } from '../../../types/status';
import { CardConfig, getCards, getRandomEmoji } from './CardConfigs';

interface CardPickerProps {
  game: Game;
  players: Player[];
  currentPlayerId: string;
  maxValue?: number; // filter out cards with value >= maxValue (keeps special cards value < 0)
  isMod?: boolean;
}

export const CardPicker: React.FC<CardPickerProps> = ({ game, players, currentPlayerId, maxValue, isMod }) => {
  const { t } = useTranslation();
  const [randomEmoji, setRandomEmoji] = useState(getRandomEmoji);
  const playPlayer = (gameId: string, playerId: string, card: CardConfig) => {
    if (game.gameStatus !== Status.Finished) {
      updatePlayerValue(gameId, playerId, card.value, randomEmoji);
    }
  };

  useEffect(() => {
    if (game.gameStatus === Status.Started) {
      setRandomEmoji(getRandomEmoji);
    }
  }, [game.gameStatus]);

  const allCards = game.cards?.length ? game.cards : getCards(game.gameType);
  const cards = maxValue !== undefined
    ? allCards.filter((c) => c.value < maxValue || c.value < 0)
    : allCards;

  return (
    <div className='w-full max-w-full animate-fade-in-down'>
      {(!isMod || game.gameStatus !== Status.Finished) && (
        <div className='text-center text-lg font-semibold my-4'>
          {game.gameStatus !== Status.Finished
            ? t('CardPicker.ClickOnTheCardToVote')
            : t('CardPicker.SessionNotReadyForVotingWaitForModeratorToStart')}
        </div>
      )}
      <div className='flex flex-wrap justify-center items-center gap-3 py-4'>
        {cards.map((card: CardConfig) => {
          const isSelected = players.find((p) => p.id === currentPlayerId)?.value === card.value;
          return (
            <div
              key={card.value}
              id={`card-${card.displayValue}`}
              className={`
                cursor-pointer select-none transition-all duration-300
                rounded shadow-md border border-gray-300
                flex flex-col items-center justify-center bg-white text-gray-800
                hover:scale-115
                w-14 h-20
                ${isSelected ? 'border-dashed border-2 border-gray-800 z-10 shadow-lg scale-115' : 'shadow-md scale-100'}
                ${game.gameStatus === Status.Finished ? 'pointer-events-none opacity-50 cursor-not-allowed' : ''}
              `}
              style={{ backgroundColor: card.color }}
              onClick={() => playPlayer(game.id, currentPlayerId, card)}
            >
              <div className='flex flex-col justify-between h-full w-full p-1'>
                {card.value >= 0 && (
                  <>
                    <span className='text-xs text-gray-800 flex justify-start'>{card.displayValue}</span>
                    <span className={`w-full text-center ${card.displayValue.length < 2 ? 'text-3xl' : 'text-2xl'}`}>{card.displayValue}</span>
                    <span className='flex justify-end w-full text-xs text-gray-800'>{card.displayValue}</span>
                  </>
                )}
                {card.value === -1 && (
                  <span className='flex flex-col justify-center items-center h-full text-3xl'>{randomEmoji}</span>
                )}
                {card.value === -2 && (
                  <span className='flex flex-col justify-center items-center h-full text-3xl'>❓</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
