import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { AlertDialog } from '../../../components/AlertDialog/AlertDialog';
import { EstimationGuide } from '../../../components/Linear/EstimationGuide';
import { LinearIcon } from '../../../components/Linear/LinearIssuePicker';
import {
  finishGame,
  removeGame,
  updateGame,
} from '../../../service/games';
import { LinearIssue } from '../../../service/linear';
import { Game, GameType, TimerProps } from '../../../types/game';
import { Player } from '../../../types/player';
import { Status } from '../../../types/status';
import { isModerator } from '../../../utils/isModerator';
import { ExitSVG } from '../../SVGs/Exit';
import { LinkSVG } from '../../SVGs/Link';
import { TrashSVG } from '../../SVGs/Trash';
import { Timer } from './Timer/TimerInput/Timer';

interface GameControllerProps {
  game: Game;
  players: Player[];
  currentPlayerId: string;
  issueQueue?: LinearIssue[];
  queueIndex?: number;
  onQueueNext?: () => void;
  onQueuePrev?: () => void;
  onClearQueue?: () => void;
  hasLinearDetail?: boolean;
  onToggleLinearPicker?: () => void;
  showLinearPicker?: boolean;
}

export const GameController: React.FC<GameControllerProps> = ({
  game,
  players,
  currentPlayerId,
  hasLinearDetail = false,
  onToggleLinearPicker,
  showLinearPicker = false,
}) => {
  const history = useHistory();
  const { t } = useTranslation();
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [showEstimationGuide, setShowEstimationGuide] = useState(false);

  // Auto-reveal
  useEffect(() => {
    if (
      game.autoReveal &&
      game.gameStatus === 'In Progress' &&
      Array.isArray(players) &&
      players.length > 0 &&
      players.every((p: Player) => p.status === Status.Finished)
    ) {
      finishGame(game.id);
    }
  }, [
    game.autoReveal,
    game,
    JSON.stringify(players.map((p) => ({ id: p.id, value: p.value, status: p.status }))),
  ]);

  const onUpdatedTimerProps = useCallback(
    (timer: TimerProps) => updateGame(game.id, { timerProps: timer }),
    [game.id],
  );

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${game.id}`);
    setShowCopiedMessage(true);
    setTimeout(() => setShowCopiedMessage(false), 3000);
  };

  const leaveGame = () => history.push('/');
  const handleRemoveGame = async (id: string) => {
    await removeGame(id);
    window.location.href = '/';
  };

  const isMod = isModerator(game.createdById, currentPlayerId, game.isAllowMembersToManageSession);

  const timerProps = {
    isMod,
    timerVisible: game.timerProps?.timerVisible,
    timerPaused: game.timerProps?.timerPaused,
    currentSeconds: game.timerProps?.currentSeconds,
    totalSeconds: game.timerProps?.totalSeconds,
    soundOn: game.timerProps?.soundOn,
  };

  const gameAverage = getAverage(game, players);
  const canShowAverage =
    game.gameType !== GameType.TShirt && game.gameType !== GameType.TShirtAndNumber;
  const average =
    canShowAverage && game.gameStatus === Status.Finished && gameAverage
      ? gameAverage.toFixed(2)
      : null;

  return (
    <>
      {/* Fixed bottom bar */}
      <div className='fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg'>
        <div className='flex items-center justify-between px-4 h-12 gap-4'>
          {/* Left: game name + status */}
          <div className='flex items-center gap-2 min-w-0 flex-shrink-0'>
            <span className='font-semibold text-sm truncate max-w-[140px]'>{game.name}</span>
            <span className='text-xs text-gray-500 hidden sm:inline'>
              {getGameStatusIcon(game.gameStatus)} {game.gameStatus}
            </span>
            {average && (
              <span className='ml-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 font-bold border border-gray-200 dark:border-gray-700'>
                Avg {average}
              </span>
            )}
          </div>

          {/* Center: timer */}
          <div className='flex items-center'>
            <Timer timerProps={timerProps} onTimerUpdate={onUpdatedTimerProps} />
          </div>

          {/* Right: compact action buttons */}
          <div className='flex items-center gap-1 flex-shrink-0'>
            {isMod && (
              <>
                <AlertDialog
                  id={game.id}
                  message={t('GameController.areYouSureDelete')}
                  onConfirm={() => handleRemoveGame(game.id)}
                >
                  <button
                    className='p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition'
                    title={t('GameController.delete')}
                  >
                    <TrashSVG className='h-5 w-5 text-red-500' />
                  </button>
                </AlertDialog>
                <label className='flex items-center gap-1 cursor-pointer ml-1 mr-1' title='Auto Reveal'>
                  <span className='text-xs text-gray-400 hidden sm:inline'>Auto</span>
                  <button
                    type='button'
                    role='switch'
                    aria-checked={game.autoReveal}
                    onClick={() => updateGame(game.id, { autoReveal: !game.autoReveal })}
                    className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${
                      game.autoReveal ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                        game.autoReveal ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>
              </>
            )}

            <div className='w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1' />

            <BarButton onClick={leaveGame} title={t('GameController.exit')} className='hover:bg-orange-100 dark:hover:bg-orange-900/30'>
              <ExitSVG className='h-5 w-5 text-orange-500' />
            </BarButton>
            <BarButton onClick={copyInviteLink} title={t('GameController.invite')} className='hover:bg-blue-100 dark:hover:bg-blue-900/30'>
              <LinkSVG className='h-5 w-5 text-blue-500' />
            </BarButton>
            {isMod && !hasLinearDetail && (
              <BarButton
                onClick={onToggleLinearPicker}
                title='Browse Linear issues'
                className={`hover:bg-violet-100 dark:hover:bg-violet-900/30 ${showLinearPicker ? 'bg-violet-100 dark:bg-violet-900/30' : ''}`}
              >
                <LinearIcon className='h-5 w-5' />
              </BarButton>
            )}
            <BarButton
              onClick={() => setShowEstimationGuide(true)}
              title='Estimation guide'
              className='hover:bg-gray-100 dark:hover:bg-gray-800'
            >
              <GuideIcon className='h-5 w-5 text-gray-500' />
            </BarButton>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEstimationGuide && <EstimationGuide onClose={() => setShowEstimationGuide(false)} />}
      {showCopiedMessage && (
        <div className='fixed top-4 right-4 z-50 bg-green-100 border border-green-200 text-gray-800 px-4 py-2 text-xs rounded shadow'>
          <span className='font-bold'>{t('GameController.inviteLinkCopied')}!</span>
        </div>
      )}
    </>
  );
};

// ── Bar button ─────────────────────────────────────────────────────────────────

const BarButton: React.FC<{
  onClick?: () => void;
  title?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ onClick, title, className, children }) => (
  <button
    type='button'
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded-lg transition ${className ?? ''}`}
  >
    {children}
  </button>
);

// ── Helpers ────────────────────────────────────────────────────────────────────

const getGameStatusIcon = (gameStatus: string) => {
  switch (gameStatus) {
    case 'In Progress': return '⏱️';
    case 'Finished': return '🎉';
    default: return '🚀';
  }
};

export const getAverage = (game: Game, players: Player[]): number => {
  let values = 0;
  let numberOfPlayersPlayed = 0;
  const cards = game.cards;
  players.forEach((player) => {
    const value =
      game.gameType === GameType.Custom
        ? Number(cards.find((card) => card.value === player.value)?.displayValue)
        : player.value;
    if (player.status === Status.Finished && value !== undefined && !isNaN(value) && value && value >= 0) {
      values += value;
      numberOfPlayersPlayed++;
    }
  });
  return Math.round((values / numberOfPlayersPlayed) * 100) / 100;
};

export const getAdjacentEstimates = (
  game: Game,
  players: Player[],
): { lower: { value: number; displayValue: string } | null; current: { value: number; displayValue: string }; higher: { value: number; displayValue: string } | null } | null => {
  const avg = getAverage(game, players);
  const validCards = game.cards.filter((c) => c.value >= 0).sort((a, b) => a.value - b.value);
  if (validCards.length === 0) return null;
  let closestIdx = 0;
  let minDiff = Infinity;
  validCards.forEach((card, idx) => {
    const diff = Math.abs(card.value - avg);
    if (diff < minDiff) { minDiff = diff; closestIdx = idx; }
  });
  return {
    lower: closestIdx > 0 ? validCards[closestIdx - 1] : null,
    current: validCards[closestIdx],
    higher: closestIdx < validCards.length - 1 ? validCards[closestIdx + 1] : null,
  };
};

export function areAllFinishedPlayersDisplayValuesNumeric(game: Game, players: Player[]): boolean {
  return players
    .filter((player) => player.status === Status.Finished)
    .every((player) => {
      const value =
        game.gameType === GameType.Custom
          ? Number(game.cards.find((card) => card.value === player.value)?.displayValue)
          : player.value;
      if (!value) return false;
      const num = typeof value === 'number' ? value : Number(value);
      return !isNaN(num);
    });
}

// kept for tests
export const ControllerButton = ({
  onClick, icon, label, className, testId, title, children,
}: {
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  className: string;
  testId?: string;
  title?: string;
  children?: React.ReactNode;
}) => (
  <div className='flex flex-col items-center'>
    {children ? children : (
      <button type='button' role='button' aria-label={label} id={testId} key={testId}
        onClick={onClick} data-testid={testId}
        className={`p-2 cursor-pointer rounded-full bg-white dark:bg-gray-900 ${className} transition`}
        title={title || label}>
        {icon}
      </button>
    )}
    <span className='text-xs mt-1'>{label}</span>
  </div>
);

export const AutoReveal: React.FC<{ autoReveal: boolean; onAutoReveal: (v: boolean) => void }> = ({ autoReveal, onAutoReveal }) => {
  const { t } = useTranslation();
  return (
    <div className='flex flex-col items-center'>
      <label className='flex items-center cursor-pointer'>
        <span className='mr-1 text-xs'>{t('GameController.autoReveal')}</span>
        <button type='button' role='switch' aria-checked={autoReveal}
          onClick={() => onAutoReveal(!autoReveal)}
          className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none ${autoReveal ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
          style={{ minWidth: '2rem' }}>
          <span className={`inline-block h-3 w-3 cursor-pointer transform rounded-full bg-white shadow transition-transform ${autoReveal ? 'translate-x-4' : 'translate-x-1'}`} />
        </button>
      </label>
    </div>
  );
};

const GuideIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z' fill='currentColor' />
  </svg>
);
