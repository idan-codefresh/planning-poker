import React, { useEffect, useRef, useState } from 'react';
import { IssueDetailCard } from '../../../components/Linear/IssueDetailCard';
import { LinearIcon, LinearIssuePicker } from '../../../components/Linear/LinearIssuePicker';
import {
  clearLinearIssueQueue,
  getLinearApiKey,
  getLinearIssueQueue,
  getLinearQueueIndex,
  setLinearIssueQueue,
  updateLinearQueueIndex,
} from '../../../repository/localStorage';
import { finishGame, resetGame, updateGame, updateStoryName } from '../../../service/games';
import {
  LinearIssue,
  LinearIssueDetail,
  getIssueDetail,
  updateLinearIssueEstimate,
} from '../../../service/linear';
import { getAdjacentEstimates } from '../GameController/GameController';
import { Game } from '../../../types/game';
import { Player } from '../../../types/player';
import { isModerator } from '../../../utils/isModerator';
import { Status } from '../../../types/status';
import { CardPicker } from '../../Players/CardPicker/CardPicker';
import { Players } from '../../Players/Players';
import { GameController } from '../GameController/GameController';

interface GameAreaProps {
  game: Game;
  players: Player[];
  currentPlayerId: string;
}

export const GameArea: React.FC<GameAreaProps> = ({ game, players, currentPlayerId }) => {
  const [showLinearPicker, setShowLinearPicker] = useState(false);
  const [linearUpdateStatus, setLinearUpdateStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [linearUpdateError, setLinearUpdateError] = useState<string | null>(null);
  const [showQueueList, setShowQueueList] = useState(false);
  const [queueSearch, setQueueSearch] = useState('');

  const [issueQueue, setIssueQueue] = useState<LinearIssue[]>(
    () => (getLinearIssueQueue(game.id) as LinearIssue[]) ?? [],
  );
  const [queueIndex, setQueueIndex] = useState<number>(
    () => getLinearQueueIndex(game.id),
  );

  // Build detail from Firestore fields — no API key needed, visible to all players
  const currentIssueDetail: LinearIssueDetail | null = game.linearIssueId
    ? {
        id: game.linearIssueId,
        identifier: game.linearIssueIdentifier ?? '',
        title: game.linearIssueTitle ?? game.storyName ?? '',
        url: game.linearIssueUrl ?? '',
        estimate: game.linearIssueEstimate ?? undefined,
        state: {
          name: game.linearIssueStateName ?? '',
          color: game.linearIssueStateColor ?? '#94a3b8',
        },
        team: { id: '', name: '' },
        description: game.linearIssueDescription ?? null,
        assignee: game.linearIssueAssigneeName
          ? { name: game.linearIssueAssigneeName, avatarUrl: game.linearIssueAssigneeAvatar }
          : null,
        labels: game.linearIssueLabels ?? [],
      }
    : null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleLinearIssueSelect = async (issue: LinearIssue) => {
    await updateStoryName(game.id, issue.title);

    const key = getLinearApiKey();
    let detail: LinearIssueDetail | null = null;
    if (key) {
      try { detail = await getIssueDetail(key, issue.id); } catch { /* ok */ }
    }

    await updateGame(game.id, {
      linearIssueId: issue.id,
      linearIssueUrl: issue.url,
      linearIssueIdentifier: issue.identifier,
      linearIssueTitle: issue.title,
      linearIssueEstimate: detail?.estimate ?? issue.estimate ?? null,
      linearIssueDescription: detail?.description ?? null,
      linearIssueStateName: detail?.state.name ?? issue.state.name,
      linearIssueStateColor: detail?.state.color ?? issue.state.color,
      linearIssueAssigneeName: detail?.assignee?.name ?? null,
      linearIssueAssigneeAvatar: detail?.assignee?.avatarUrl ?? null,
      linearIssueLabels: detail?.labels ?? [],
    });
    setShowLinearPicker(false);
  };

  const handleQueueStart = async (issues: LinearIssue[]) => {
    setLinearIssueQueue(game.id, issues, 0);
    setIssueQueue(issues);
    setQueueIndex(0);
    if (issues.length > 0) await handleLinearIssueSelect(issues[0]);
  };

  const handleQueueNext = async () => {
    const nextIdx = queueIndex + 1;
    if (nextIdx >= issueQueue.length) return;
    updateLinearQueueIndex(game.id, nextIdx);
    setQueueIndex(nextIdx);
    await handleLinearIssueSelect(issueQueue[nextIdx]);
    await resetGame(game.id);
  };

  const handleQueuePrev = async () => {
    const prevIdx = queueIndex - 1;
    if (prevIdx < 0) return;
    updateLinearQueueIndex(game.id, prevIdx);
    setQueueIndex(prevIdx);
    await handleLinearIssueSelect(issueQueue[prevIdx]);
  };

  const handleClearQueue = () => {
    clearLinearIssueQueue(game.id);
    setIssueQueue([]);
    setQueueIndex(0);
    setShowQueueList(false);
  };

  const handleQueueJump = async (idx: number) => {
    updateLinearQueueIndex(game.id, idx);
    setQueueIndex(idx);
    setShowQueueList(false);
    await handleLinearIssueSelect(issueQueue[idx]);
  };

  const handleLinearWriteBack = async (estimate: number) => {
    const key = getLinearApiKey();
    if (!key || !game.linearIssueId) return;
    setLinearUpdateStatus('saving');
    try {
      await updateLinearIssueEstimate(key, game.linearIssueId, estimate);
      await updateGame(game.id, { linearIssueEstimate: estimate });
      setLinearUpdateStatus('saved');
      setLinearUpdateError(null);
      setTimeout(() => setLinearUpdateStatus('idle'), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Linear write-back]', msg);
      setLinearUpdateError(msg);
      setLinearUpdateStatus('error');
      setTimeout(() => { setLinearUpdateStatus('idle'); setLinearUpdateError(null); }, 6000);
    }
  };

  const adj = game.linearIssueId && game.gameStatus === 'Finished'
    ? getAdjacentEstimates(game, players)
    : null;

  // Arrow key navigation for issue queue
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); handleQueuePrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); handleQueueNext(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [queueIndex, issueQueue]);

  return (
    // pb-12 to clear the fixed bottom bar
    <div className='flex flex-col pb-12'>
      {/* Top: player status cards */}
      <Players game={game} players={players} currentPlayerId={currentPlayerId} />

      {/* Middle: two-column split */}
      <div className='flex min-h-0 gap-0' style={{ borderTop: '1px solid var(--lin-border)' }}>

        {/* Left half: Linear panel */}
        <div className='w-1/2 flex flex-col p-4 gap-3' style={{ borderRight: '1px solid var(--lin-border)' }}>
          {currentIssueDetail ? (
            <>
              <IssueDetailCard
                issue={currentIssueDetail}
                showBrowse={showLinearPicker}
                onToggleBrowse={() => setShowLinearPicker((v) => !v)}
              />
              {/* Queue nav */}
              {issueQueue.length > 0 && (
                <div
                  className='flex items-center gap-2 rounded-lg px-3 py-2'
                  style={{ background: 'var(--lin-accent-subtle)', border: '1px solid var(--lin-border-strong)' }}
                >
                  <button
                    onClick={handleQueuePrev}
                    disabled={queueIndex === 0}
                    className='rounded p-0.5 transition disabled:opacity-30'
                    style={{ color: 'var(--lin-accent)' }}
                  >←</button>
                  <button
                    onClick={() => setShowQueueList((v) => !v)}
                    className='text-xs flex-1 text-center font-medium transition flex items-center justify-center gap-1'
                    style={{ color: 'var(--lin-text-2)' }}
                    title='Show issue list'
                  >
                    {queueIndex + 1} / {issueQueue.length}
                    <span style={{ color: 'var(--lin-text-3)' }}>{showQueueList ? '▲' : '▼'}</span>
                  </button>
                  <button
                    onClick={handleQueueNext}
                    disabled={queueIndex >= issueQueue.length - 1}
                    className='text-xs text-white rounded px-2 py-0.5 font-semibold transition disabled:opacity-30'
                    style={{ background: 'var(--lin-accent)' }}
                  >Next →</button>
                </div>
              )}
              {/* Write-back */}
              {adj && (
                <div className='flex flex-wrap items-center gap-2'>
                  {adj.lower && (
                    <button
                      onClick={() => handleLinearWriteBack(adj.lower!.value)}
                      disabled={linearUpdateStatus === 'saving'}
                      className='text-xs font-semibold rounded-md px-3 py-1.5 transition disabled:opacity-50'
                      style={{ background: 'var(--lin-elevated)', border: '1px solid var(--lin-border-strong)', color: 'var(--lin-text-2)' }}
                    >↓ {adj.lower.displayValue}</button>
                  )}
                  <button
                    onClick={() => handleLinearWriteBack(adj.current.value)}
                    disabled={linearUpdateStatus === 'saving'}
                    className='flex items-center gap-1.5 text-xs font-semibold text-white rounded-md px-3 py-1.5 transition disabled:opacity-50'
                    style={{ background: 'var(--lin-accent)' }}
                  >
                    <LinearIcon className='h-3.5 w-3.5 brightness-0 invert' />
                    {linearUpdateStatus === 'saving' ? 'Saving…' : `Set ${adj.current.displayValue} pts`}
                  </button>
                  {adj.higher && (
                    <button
                      onClick={() => handleLinearWriteBack(adj.higher!.value)}
                      disabled={linearUpdateStatus === 'saving'}
                      className='text-xs font-semibold rounded-md px-3 py-1.5 transition disabled:opacity-50'
                      style={{ background: 'var(--lin-elevated)', border: '1px solid var(--lin-border-strong)', color: 'var(--lin-text-2)' }}
                    >↑ {adj.higher.displayValue}</button>
                  )}
                  {linearUpdateStatus === 'saved' && (
                    <span className='text-xs font-medium' style={{ color: 'var(--lin-green)' }}>✓ Saved</span>
                  )}
                  {linearUpdateStatus === 'error' && (
                    <span className='text-xs' style={{ color: 'var(--lin-red)' }} title={linearUpdateError ?? undefined}>
                      Failed{linearUpdateError ? `: ${linearUpdateError}` : ''}
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            /* No issue linked yet — show a prompt */
            <div className='flex flex-col items-center justify-center h-full gap-3'>
              <LinearIcon className='h-9 w-9 text-gray-400 dark:text-gray-600' />
              <p className='text-xs font-medium' style={{ color: 'var(--lin-text-2)' }}>No issue selected</p>
              {isModerator(game.createdById, currentPlayerId, game.isAllowMembersToManageSession) && (
                <button
                  onClick={() => setShowLinearPicker((v) => !v)}
                  className='flex items-center gap-1.5 text-xs font-semibold text-white rounded-md px-4 py-2 transition'
                  style={{ background: 'var(--lin-accent)' }}
                >
                  <LinearIcon className='h-3.5 w-3.5 brightness-0 invert' />
                  Browse issues
                </button>
              )}
            </div>
          )}

          {/* Issue list picker */}
          {showLinearPicker && (
            <LinearIssuePicker
              gameId={game.id}
              onSelect={handleLinearIssueSelect}
              onQueueStart={handleQueueStart}
              onClose={() => setShowLinearPicker(false)}
              isMod={isModerator(game.createdById, currentPlayerId, game.isAllowMembersToManageSession)}
            />
          )}
        </div>

        {/* Right half: card picker + action buttons */}
        <div className='w-1/2 flex flex-col items-center justify-start p-4'>
          <CardPicker
            game={game}
            players={players}
            currentPlayerId={currentPlayerId}
            maxValue={21}
            isMod={isModerator(game.createdById, currentPlayerId, game.isAllowMembersToManageSession)}
          />
          {isModerator(game.createdById, currentPlayerId, game.isAllowMembersToManageSession) && (
            <div className='flex items-center gap-2 mt-3'>
              <button
                onClick={() => finishGame(game.id)}
                disabled={game.gameStatus === Status.Finished}
                className='flex items-center gap-2 px-5 py-2 text-white text-sm font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed'
                style={{ background: 'var(--lin-green)' }}
              >
                <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none'>
                  <path d='M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z' fill='currentColor'/>
                </svg>
                Reveal
              </button>
              <button
                onClick={() => resetGame(game.id)}
                className='flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition'
                style={{ background: 'var(--lin-elevated)', border: '1px solid var(--lin-border-strong)', color: 'var(--lin-text-2)' }}
              >
                <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none'>
                  <path d='M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z' fill='currentColor'/>
                </svg>
                Restart
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Queue list — fixed right-side drawer */}
      {showQueueList && issueQueue.length > 0 && (
        <>
          {/* Backdrop */}
          <div className='fixed inset-0 z-40' onClick={() => { setShowQueueList(false); setQueueSearch(''); }} />
          {/* Panel */}
          <div className='fixed top-0 right-0 bottom-12 z-50 w-[420px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl flex flex-col'>
            {/* Header */}
            <div className='flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0'>
              <span className='text-sm font-semibold text-gray-800 dark:text-gray-100'>
                Issues ({issueQueue.length})
              </span>
              <button
                onClick={() => { setShowQueueList(false); setQueueSearch(''); }}
                className='text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition text-lg leading-none'
              >✕</button>
            </div>
            {/* Search */}
            <div className='px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0'>
              <div className='relative'>
                <svg className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400' viewBox='0 0 24 24' fill='none'>
                  <path d='M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/>
                </svg>
                <input
                  autoFocus
                  type='text'
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  placeholder='Search issues…'
                  className='w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400'
                />
                {queueSearch && (
                  <button
                    onClick={() => setQueueSearch('')}
                    className='absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs'
                  >✕</button>
                )}
              </div>
            </div>
            {/* List */}
            <div className='overflow-y-auto flex-1'>
              {(() => {
                const q = queueSearch.trim().toLowerCase();
                const filtered = q
                  ? issueQueue.filter((i) => i.title.toLowerCase().includes(q) || i.identifier.toLowerCase().includes(q))
                  : issueQueue;
                if (filtered.length === 0) {
                  return <p className='text-center text-xs text-gray-400 py-8'>No issues match "{queueSearch}"</p>;
                }
                return filtered.map((issue) => {
                  const idx = issueQueue.indexOf(issue);
                  return (
                    <button
                      key={issue.id}
                      onClick={() => handleQueueJump(idx)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition border-b border-gray-100 dark:border-gray-800 last:border-0 ${
                        idx === queueIndex ? 'bg-violet-50 dark:bg-violet-900/20' : ''
                      }`}
                    >
                      <span className='flex-shrink-0 w-3 text-violet-500 text-sm'>{idx === queueIndex ? '▶' : ''}</span>
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-2'>
                          <span className='font-mono text-xs text-gray-400 flex-shrink-0'>{issue.identifier}</span>
                          {issue.estimate != null && (
                            <span className='flex-shrink-0 px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 font-semibold text-[10px]'>
                              {issue.estimate} pts
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mt-0.5 ${idx === queueIndex ? 'font-semibold text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-300'}`}>
                          {issue.title}
                        </p>
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </>
      )}

      {/* Fixed bottom bar */}
      <GameController
        game={game}
        players={players}
        currentPlayerId={currentPlayerId}
        issueQueue={issueQueue}
        queueIndex={queueIndex}
        onQueueNext={handleQueueNext}
        onQueuePrev={handleQueuePrev}
        onClearQueue={handleClearQueue}
        hasLinearDetail={!!currentIssueDetail}
        onToggleLinearPicker={() => setShowLinearPicker((v) => !v)}
        showLinearPicker={showLinearPicker}
      />
    </div>
  );
};

export default GameArea;
