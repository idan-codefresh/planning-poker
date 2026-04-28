import React, { useEffect, useState } from 'react';
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
  const [showQueueList, setShowQueueList] = useState(false);

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
        estimate: undefined,
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
      setLinearUpdateStatus('saved');
      setTimeout(() => setLinearUpdateStatus('idle'), 3000);
    } catch {
      setLinearUpdateStatus('error');
      setTimeout(() => setLinearUpdateStatus('idle'), 3000);
    }
  };

  const adj = game.linearIssueId && game.gameStatus === 'Finished'
    ? getAdjacentEstimates(game, players)
    : null;

  return (
    // pb-12 to clear the fixed bottom bar
    <div className='flex flex-col pb-12'>
      {/* Top: player status cards */}
      <Players game={game} players={players} currentPlayerId={currentPlayerId} />

      {/* Middle: two-column split */}
      <div className='flex min-h-0 gap-0 border-t border-gray-100 dark:border-gray-800'>

        {/* Left half: Linear panel */}
        <div className='w-1/2 border-r border-gray-100 dark:border-gray-800 flex flex-col p-4 gap-3'>
          {currentIssueDetail ? (
            <>
              <IssueDetailCard
                issue={currentIssueDetail}
                showBrowse={showLinearPicker}
                onToggleBrowse={() => setShowLinearPicker((v) => !v)}
              />
              {/* Queue nav */}
              {issueQueue.length > 0 && (
                <div className='rounded-lg overflow-hidden border border-violet-200 dark:border-violet-800'>
                  <div className='flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 px-3 py-2'>
                    <button
                      onClick={handleQueuePrev}
                      disabled={queueIndex === 0}
                      className='text-violet-600 disabled:opacity-30 hover:bg-violet-100 dark:hover:bg-violet-800 rounded p-0.5 transition'
                    >←</button>
                    <button
                      onClick={() => setShowQueueList((v) => !v)}
                      className='text-xs flex-1 text-center font-medium hover:text-violet-700 dark:hover:text-violet-300 transition flex items-center justify-center gap-1'
                      title='Show issue list'
                    >
                      {queueIndex + 1} / {issueQueue.length}
                      <span className='text-gray-400'>{showQueueList ? '▲' : '▼'}</span>
                    </button>
                    <button
                      onClick={handleQueueNext}
                      disabled={queueIndex >= issueQueue.length - 1}
                      className='text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-30 text-white rounded px-2 py-0.5 font-semibold transition'
                    >Next →</button>
                    <button
                      onClick={handleClearQueue}
                      className='text-gray-400 hover:text-red-500 transition text-xs'
                    >✕</button>
                  </div>
                  {showQueueList && (
                    <div className='max-h-56 overflow-y-auto border-t border-violet-100 dark:border-violet-800 bg-white dark:bg-gray-900'>
                      {issueQueue.map((issue, idx) => (
                        <button
                          key={issue.id}
                          onClick={() => handleQueueJump(idx)}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition text-xs border-b border-gray-100 dark:border-gray-800 last:border-0 ${
                            idx === queueIndex ? 'bg-violet-50 dark:bg-violet-900/20 font-semibold text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {idx === queueIndex && <span className='text-violet-500 flex-shrink-0'>▶</span>}
                          <span className='font-mono text-gray-400 flex-shrink-0 w-14 text-right'>{issue.identifier}</span>
                          <span className='truncate'>{issue.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Write-back */}
              {adj && (
                <div className='flex flex-wrap items-center gap-2'>
                  {adj.lower && (
                    <button
                      onClick={() => handleLinearWriteBack(adj.lower!.value)}
                      disabled={linearUpdateStatus === 'saving'}
                      className='text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 rounded-lg px-3 py-1.5 font-semibold transition shadow-sm'
                    >↓ {adj.lower.displayValue}</button>
                  )}
                  <button
                    onClick={() => handleLinearWriteBack(adj.current.value)}
                    disabled={linearUpdateStatus === 'saving'}
                    className='flex items-center gap-1.5 text-sm bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 font-semibold transition shadow-sm'
                  >
                    <LinearIcon className='h-4 w-4 brightness-0 invert' />
                    {linearUpdateStatus === 'saving' ? 'Saving…' : `Set ${adj.current.displayValue} in Linear`}
                  </button>
                  {adj.higher && (
                    <button
                      onClick={() => handleLinearWriteBack(adj.higher!.value)}
                      disabled={linearUpdateStatus === 'saving'}
                      className='text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 rounded-lg px-3 py-1.5 font-semibold transition shadow-sm'
                    >↑ {adj.higher.displayValue}</button>
                  )}
                  {linearUpdateStatus === 'saved' && (
                    <span className='text-sm text-green-600 font-medium'>✓ Saved!</span>
                  )}
                  {linearUpdateStatus === 'error' && (
                    <span className='text-sm text-red-500'>Failed</span>
                  )}
                </div>
              )}
            </>
          ) : (
            /* No issue linked yet — show a prompt */
            <div className='flex flex-col items-center justify-center h-full gap-3 text-gray-400'>
              <LinearIcon className='h-10 w-10 opacity-40' />
              <p className='text-sm'>No issue selected</p>
              <button
                onClick={() => setShowLinearPicker((v) => !v)}
                className='flex items-center gap-1.5 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-4 py-2 font-semibold transition'
              >
                <LinearIcon className='h-4 w-4 brightness-0 invert' />
                Browse issues
              </button>
            </div>
          )}

          {/* Issue list picker */}
          {showLinearPicker && (
            <LinearIssuePicker
              gameId={game.id}
              onSelect={handleLinearIssueSelect}
              onQueueStart={handleQueueStart}
              onClose={() => setShowLinearPicker(false)}
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
            <div className='flex items-center gap-3 mt-2'>
              <button
                onClick={() => finishGame(game.id)}
                disabled={game.gameStatus === Status.Finished}
                className='flex items-center gap-2 px-5 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow transition text-sm'
              >
                <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                  <path d='M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z' fill='currentColor'/>
                </svg>
                Reveal
              </button>
              <button
                onClick={() => resetGame(game.id)}
                className='flex items-center gap-2 px-5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl shadow transition text-sm'
              >
                <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                  <path d='M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z' fill='currentColor'/>
                </svg>
                Restart
              </button>
            </div>
          )}
        </div>
      </div>

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
