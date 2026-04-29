import React, { useEffect, useRef, useState } from 'react';
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
  maxValue?: number;
  isMod?: boolean;
}

// Derives a rich color for tinting from the original pastel
const tintFromColor = (color: string): string => {
  const map: Record<string, string> = {
    '#e7edf3': '100,116,139',   // slate
    '#9EC8FE': '59,130,246',    // blue
    '#A3DFF2': '6,182,212',     // cyan
    '#9DD49A': '34,197,94',     // green
    '#F4DD94': '234,179,8',     // yellow
    '#F39893': '239,68,68',     // red
    '#D96C6C': '220,38,38',     // dark red
    '#9B59B6': '168,85,247',    // purple
  };
  return map[color] ?? '100,116,139';
};

export const CardPicker: React.FC<CardPickerProps> = ({ game, players, currentPlayerId, maxValue, isMod }) => {
  const { t } = useTranslation();
  const [randomEmoji, setRandomEmoji] = useState(getRandomEmoji);

  const keyBufferRef = useRef('');
  const keyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDisabled = game.gameStatus === Status.Finished;

  const playPlayer = (gameId: string, playerId: string, card: CardConfig) => {
    if (game.gameStatus !== Status.Finished) {
      updatePlayerValue(gameId, playerId, card.value, randomEmoji);
    }
  };

  useEffect(() => {
    if (game.gameStatus === Status.Started) setRandomEmoji(getRandomEmoji);
  }, [game.gameStatus]);

  // Number-key shortcuts to select a card
  useEffect(() => {
    if (isDisabled) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!/^[\d½]$/.test(e.key)) return;

      if (keyTimeoutRef.current) clearTimeout(keyTimeoutRef.current);
      keyBufferRef.current += e.key;

      const allCards = game.cards?.length ? game.cards : getCards(game.gameType);
      const eligible = maxValue !== undefined
        ? allCards.filter((c) => c.value < maxValue || c.value < 0)
        : allCards;

      const match = eligible.find(c => c.displayValue === keyBufferRef.current);
      if (match) {
        updatePlayerValue(game.id, currentPlayerId, match.value, randomEmoji);
        keyBufferRef.current = '';
        return;
      }

      // If no full match yet, wait briefly for another digit
      keyTimeoutRef.current = setTimeout(() => {
        keyBufferRef.current = '';
      }, 700);
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (keyTimeoutRef.current) clearTimeout(keyTimeoutRef.current);
    };
  }, [game, currentPlayerId, randomEmoji, maxValue, isDisabled]);

  const allCards = game.cards?.length ? game.cards : getCards(game.gameType);
  const cards = maxValue !== undefined
    ? allCards.filter((c) => c.value < maxValue || c.value < 0)
    : allCards;

  return (
    <div className='w-full max-w-full animate-fade-in-down'>
      {(!isMod || !isDisabled) && (
        <p className='text-center text-sm font-medium mb-5' style={{ color: 'var(--lin-text-2)' }}>
          {!isDisabled
            ? t('CardPicker.ClickOnTheCardToVote')
            : t('CardPicker.SessionNotReadyForVotingWaitForModeratorToStart')}
        </p>
      )}

      <div className='flex flex-wrap justify-center items-end gap-3' id='card-picker-grid'>
        {cards.map((card: CardConfig) => {
          const isSelected = players.find((p) => p.id === currentPlayerId)?.value === card.value;
          const tint = tintFromColor(card.color);
          const isSpecial = card.value < 0;

          return (
            <button
              key={card.value}
              id={`card-${card.displayValue}`}
              disabled={isDisabled}
              onClick={() => playPlayer(game.id, currentPlayerId, card)}
              className='select-none relative flex flex-col overflow-hidden rounded-xl'
              style={{
                width: '64px',
                height: '88px',
                // Frosted glass: semi-transparent tinted surface
                background: isSelected
                  ? `rgba(${tint}, 0.85)`
                  : `rgba(${tint}, 0.10)`,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: isSelected
                  ? `1px solid rgba(${tint}, 0.8)`
                  : `1px solid rgba(${tint}, 0.25)`,
                boxShadow: isSelected
                  ? `0 0 0 2px rgba(${tint}, 0.3), 0 8px 24px rgba(${tint}, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)`
                  : `0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.06)`,
                transform: isSelected ? 'translateY(-6px)' : 'translateY(0)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease',
                opacity: isDisabled ? 0.35 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isDisabled && !isSelected) {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.background = `rgba(${tint}, 0.18)`;
                  e.currentTarget.style.boxShadow = `0 6px 16px rgba(${tint}, 0.2), inset 0 1px 0 rgba(255,255,255,0.08)`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = `rgba(${tint}, 0.10)`;
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.06)';
                }
              }}
            >
              {/* Inner glass sheen */}
              <span
                className='absolute inset-0 rounded-xl pointer-events-none'
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)',
                }}
              />

              {/* Card content */}
              <div className='relative flex flex-col justify-between h-full w-full px-2 py-2'>
                {!isSpecial && (
                  <>
                    <span
                      className='text-[9px] font-semibold tabular-nums text-left'
                      style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : `rgba(${tint}, 0.9)` }}
                    >
                      {card.displayValue}
                    </span>
                    <span
                      className={`w-full text-center font-bold leading-none ${card.displayValue.length < 2 ? 'text-3xl' : 'text-2xl'}`}
                      style={{ color: isSelected ? '#ffffff' : `rgba(${tint}, 1)` }}
                    >
                      {card.displayValue}
                    </span>
                    <span
                      className='text-[9px] font-semibold text-right w-full tabular-nums'
                      style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : `rgba(${tint}, 0.9)` }}
                    >
                      {card.displayValue}
                    </span>
                  </>
                )}
                {card.value === -1 && (
                  <span className='flex flex-col justify-center items-center h-full text-2xl leading-none'>
                    {randomEmoji}
                  </span>
                )}
                {card.value === -2 && (
                  <span className='flex flex-col justify-center items-center h-full text-2xl leading-none'>
                    ❓
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Keyboard shortcut hint */}
      <div className='flex items-center justify-center gap-3 mt-5 flex-wrap'>
        <ShortcutHint keys={['1', '2', '3', '…']} label='vote' />
        <span style={{ color: 'var(--lin-text-3)' }} className='text-[10px]'>·</span>
        <ShortcutHint keys={['←', '→']} label='prev / next issue' />
      </div>
    </div>
  );
};

const ShortcutHint: React.FC<{ keys: string[]; label: string }> = ({ keys, label }) => (
  <span className='flex items-center gap-1'>
    {keys.map((k) => (
      <kbd
        key={k}
        className='inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold'
        style={{
          background: 'var(--lin-elevated)',
          border: '1px solid var(--lin-border-strong)',
          color: 'var(--lin-text-2)',
          minWidth: '20px',
        }}
      >
        {k}
      </kbd>
    ))}
    <span className='text-[10px] ml-1' style={{ color: 'var(--lin-text-3)' }}>{label}</span>
  </span>
);
