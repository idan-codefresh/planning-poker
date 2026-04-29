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
      <div
        className='fixed bottom-0 left-0 right-0 z-50'
        style={{ background: 'var(--lin-surface)', borderTop: '1px solid var(--lin-border)' }}
      >
        <div className='flex items-center justify-between px-4 h-11 gap-4'>
          {/* Left: game name + status */}
          <div className='flex items-center gap-2 min-w-0 flex-shrink-0'>
            <span className='text-xs font-semibold truncate max-w-[140px]' style={{ color: 'var(--lin-text)' }}>
              {game.name}
            </span>
            <StatusPill status={game.gameStatus} />
            {average && (
              <span
                className='px-2 py-0.5 text-xs font-semibold rounded-md'
                style={{ background: 'var(--lin-accent-subtle)', color: 'var(--lin-accent)' }}
              >
                avg {average}
              </span>
            )}
          </div>

          {/* Center: timer */}
          <div className='relative flex items-center'>
            <Timer timerProps={timerProps} onTimerUpdate={onUpdatedTimerProps} />
          </div>

          {/* Right: action buttons */}
          <div className='flex items-center gap-0.5 flex-shrink-0'>
            {isMod && (
              <>
                <AlertDialog
                  id={game.id}
                  message={t('GameController.areYouSureDelete')}
                  onConfirm={() => handleRemoveGame(game.id)}
                >
                  <BarButton title={t('GameController.delete')}>
                    <TrashSVG className='h-4 w-4 text-red-500 dark:text-red-400' />
                  </BarButton>
                </AlertDialog>
                <label className='flex items-center gap-1.5 cursor-pointer px-2' title='Auto Reveal'>
                  <span className='text-[11px] font-medium' style={{ color: 'var(--lin-text-3)' }}>Auto</span>
                  <button
                    type='button'
                    role='switch'
                    aria-checked={game.autoReveal}
                    onClick={() => updateGame(game.id, { autoReveal: !game.autoReveal })}
                    className='relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none'
                    style={{ background: game.autoReveal ? 'var(--lin-green)' : 'var(--lin-border-strong)' }}
                  >
                    <span
                      className='inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform'
                      style={{ transform: game.autoReveal ? 'translateX(14px)' : 'translateX(2px)' }}
                    />
                  </button>
                </label>
              </>
            )}

            <div className='w-px h-4 mx-1' style={{ background: 'var(--lin-border-strong)' }} />

            <BarButton onClick={leaveGame} title={t('GameController.exit')}>
              <ExitSVG className='h-4 w-4 text-gray-500 dark:text-gray-400' />
            </BarButton>
            <BarButton onClick={copyInviteLink} title={t('GameController.invite')}>
              <LinkSVG className='h-4 w-4 text-gray-500 dark:text-gray-400' />
            </BarButton>
            {isMod && !hasLinearDetail && (
              <BarButton
                onClick={onToggleLinearPicker}
                title='Browse Linear issues'
                active={showLinearPicker}
              >
                <LinearIcon className={`h-4 w-4 ${showLinearPicker ? 'text-violet-500' : 'text-gray-500 dark:text-gray-400'}`} />
              </BarButton>
            )}
            <BarButton onClick={() => setShowEstimationGuide(true)} title='Estimation guide'>
              <GuideIcon className='h-4 w-4 text-gray-500 dark:text-gray-400' />
            </BarButton>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEstimationGuide && <EstimationGuide onClose={() => setShowEstimationGuide(false)} />}
      {showCopiedMessage && (
        <div
          className='fixed top-4 right-4 z-50 px-4 py-2 text-xs rounded-lg shadow-lg'
          style={{ background: 'var(--lin-surface)', border: '1px solid var(--lin-border-strong)', color: 'var(--lin-text)' }}
        >
          <span className='font-semibold'>{t('GameController.inviteLinkCopied')}!</span>
        </div>
      )}
    </>
  );
};

// ── Bar button ─────────────────────────────────────────────────────────────────

const BarButton: React.FC<{
  onClick?: () => void;
  title?: string;
  active?: boolean;
  children: React.ReactNode;
}> = ({ onClick, title, active, children }) => (
  <button
    type='button'
    onClick={onClick}
    title={title}
    className='p-1.5 rounded-md transition'
    style={{ background: active ? 'var(--lin-accent-subtle)' : 'transparent' }}
    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--lin-elevated)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'var(--lin-accent-subtle)' : 'transparent'; }}
  >
    {children}
  </button>
);

// ── Status pill ────────────────────────────────────────────────────────────────

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const cfg: Record<string, { dot: string; label: string }> = {
    'In Progress': { dot: 'var(--lin-accent)',  label: 'In Progress' },
    'Finished':    { dot: 'var(--lin-green)',   label: 'Finished' },
    'Started':     { dot: 'var(--lin-text-3)',  label: 'Started' },
  };
  const c = cfg[status] ?? { dot: 'var(--lin-text-3)', label: status };
  return (
    <span className='hidden sm:flex items-center gap-1.5'>
      <span className='h-1.5 w-1.5 rounded-full' style={{ background: c.dot }} />
      <span className='text-[11px]' style={{ color: 'var(--lin-text-3)' }}>{c.label}</span>
    </span>
  );
};

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
