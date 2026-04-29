import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getLinearApiKey,
  removeLinearApiKey,
  setLinearApiKey,
} from '../../repository/localStorage';
import {
  LinearCycle,
  LinearCustomView,
  LinearIssue,
  LinearIssueDetail,
  LinearProject,
  LinearTeam,
  getCycleIssues,
  getCustomViewIssues,
  getCustomViews,
  getIssueDetail,
  getLinearProjects,
  getLinearTeams,
  getProjectIssues,
  getTeamCycles,
  searchLinearIssues,
  validateLinearApiKey,
} from '../../service/linear';
import { IssuePreviewPanel } from './IssuePreviewPanel';

// ── Connect form ───────────────────────────────────────────────────────────────

const ConnectForm: React.FC<{ onConnect: (key: string) => void }> = ({ onConnect }) => {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      await validateLinearApiKey(trimmed);
      onConnect(trimmed);
    } catch {
      setError('Invalid API key — check and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex flex-col gap-4'>
      <p className='text-sm text-gray-600 dark:text-gray-400'>
        Enter your Linear API key. You can create one at{' '}
        <a href='https://linear.app/settings/api' target='_blank' rel='noopener noreferrer'
          className='text-violet-500 hover:underline'>
          Linear → Settings → API
        </a>
        .
      </p>
      <input
        type='password'
        placeholder='lin_api_...'
        autoFocus
        className='w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400 dark:bg-gray-800'
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
      />
      {error && <p className='text-xs text-red-500'>{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={!key.trim() || loading}
        className='bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-semibold transition'
      >
        {loading ? 'Connecting…' : 'Connect'}
      </button>
    </div>
  );
};

// ── Types ──────────────────────────────────────────────────────────────────────

type Screen = 'connect' | 'picker';
type Tab = 'search' | 'projects' | 'cycles' | 'views';

interface LinearIssuePickerProps {
  gameId: string;
  onSelect: (issue: LinearIssue) => void;
  onQueueStart: (issues: LinearIssue[]) => void;
  onClose: () => void;
}

interface IssueListProps {
  issues: LinearIssue[];
  loading: boolean;
  error: string;
  onSelect: (i: LinearIssue) => void;
  onPreview: (i: LinearIssue) => void;
  onQueueStart?: (issues: LinearIssue[]) => void;
}

// ── Root component ─────────────────────────────────────────────────────────────

export const LinearIssuePicker: React.FC<LinearIssuePickerProps> = ({
  gameId,
  onSelect,
  onQueueStart,
  onClose,
}) => {
  const [screen, setScreen] = useState<Screen>(getLinearApiKey() ? 'picker' : 'connect');
  const [tab, setTab] = useState<Tab>('search');
  const [previewIssue, setPreviewIssue] = useState<LinearIssueDetail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleConnect = (key: string) => {
    setLinearApiKey(key);
    setScreen('picker');
  };

  const handleDisconnect = () => {
    removeLinearApiKey();
    setScreen('connect');
  };

  const handleSelect = useCallback(
    (issue: LinearIssue) => { onSelect(issue); onClose(); },
    [onSelect, onClose],
  );

  const handleQueueStart = useCallback(
    (issues: LinearIssue[]) => { onQueueStart(issues); onClose(); },
    [onQueueStart, onClose],
  );

  const handlePreview = useCallback((issue: LinearIssue) => {
    const key = getLinearApiKey();
    if (!key) return;
    setPreviewIssue(null);
    setPreviewLoading(true);
    getIssueDetail(key, issue.id)
      .then(setPreviewIssue)
      .catch(() => setPreviewIssue({ ...issue, description: null, assignee: null, labels: [] }))
      .finally(() => setPreviewLoading(false));
  }, []);

  const hasPreview = previewIssue !== null || previewLoading;

  return (
    <div className='bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden w-full' style={{ minHeight: '420px', maxHeight: '70vh' }}>
      {/* Header */}
      <div className='flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0'>
        <div className='flex items-center gap-2'>
          <LinearIcon className='h-4 w-4' />
          <span className='font-semibold text-sm'>
            {screen === 'connect' ? 'Connect Linear' : 'Import from Linear'}
          </span>
        </div>
        <div className='flex items-center gap-3'>
          {screen === 'picker' && (
            <button onClick={handleDisconnect} className='text-xs text-gray-400 hover:text-red-500 transition'>
              Disconnect
            </button>
          )}
          <button onClick={onClose} className='text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl leading-none'>
            ×
          </button>
        </div>
      </div>

      {screen === 'connect' ? (
        <div className='p-5'>
          <ConnectForm onConnect={handleConnect} />
        </div>
      ) : (
        <div className='flex flex-1 overflow-hidden min-h-0'>
          {/* Left: issue list */}
          <div className={`flex flex-col overflow-hidden flex-shrink-0 ${hasPreview ? 'w-80' : 'flex-1'}`}>
            <div className='flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0'>
              {(['search', 'projects', 'cycles', 'views'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-xs font-medium capitalize transition border-b-2 -mb-px ${
                    tab === t
                      ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className='flex-1 overflow-hidden flex flex-col min-h-0'>
              {tab === 'search'   && <SearchTab   onSelect={handleSelect} onPreview={handlePreview} />}
              {tab === 'projects' && <ProjectsTab onSelect={handleSelect} onQueueStart={handleQueueStart} onPreview={handlePreview} />}
              {tab === 'cycles'   && <CyclesTab   onSelect={handleSelect} onQueueStart={handleQueueStart} onPreview={handlePreview} />}
              {tab === 'views'    && <ViewsTab    onSelect={handleSelect} onQueueStart={handleQueueStart} onPreview={handlePreview} />}
            </div>
          </div>

          {/* Right: preview panel */}
          {hasPreview && (
            <div className='flex-1 border-l border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col min-h-0'>
              <IssuePreviewPanel
                issue={previewIssue}
                loading={previewLoading}
                onSelect={handleSelect}
                onClose={() => { setPreviewIssue(null); setPreviewLoading(false); }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Search tab ─────────────────────────────────────────────────────────────────

const SearchTab: React.FC<{ onSelect: (i: LinearIssue) => void; onPreview: (i: LinearIssue) => void }> = ({ onSelect, onPreview }) => {
  const [teams, setTeams] = useState<LinearTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [issues, setIssues] = useState<LinearIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const key = getLinearApiKey();
    if (!key) return;
    setLoading(true);
    Promise.all([getLinearTeams(key), searchLinearIssues(key, '', undefined)])
      .then(([t, i]) => { setTeams(t); setIssues(i); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const key = getLinearApiKey();
    if (!key) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setLoading(true);
      setError('');
      searchLinearIssues(key, searchQuery, selectedTeamId || undefined)
        .then(setIssues)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [searchQuery, selectedTeamId]);

  return (
    <div className='flex flex-col gap-3 p-4 overflow-hidden flex-1'>
      <div className='flex gap-2'>
        <input
          type='text'
          placeholder='Search issues…'
          autoFocus
          className='flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400 dark:bg-gray-800'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {teams.length > 0 && (
          <select
            className='border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none dark:bg-gray-800'
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
          >
            <option value=''>All teams</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>
      <IssueList issues={issues} loading={loading} error={error} onSelect={onSelect} onPreview={onPreview} />
    </div>
  );
};

// ── Projects tab ───────────────────────────────────────────────────────────────

const ProjectsTab: React.FC<{
  onSelect: (i: LinearIssue) => void;
  onQueueStart: (issues: LinearIssue[]) => void;
  onPreview: (i: LinearIssue) => void;
}> = ({ onSelect, onQueueStart, onPreview }) => {
  const [projects, setProjects] = useState<LinearProject[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<LinearProject | null>(null);
  const [issues, setIssues] = useState<LinearIssue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState('');

  useEffect(() => {
    const key = getLinearApiKey();
    if (!key) return;
    setLoading(true);
    getLinearProjects(key)
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const selectProject = (project: LinearProject) => {
    const key = getLinearApiKey();
    if (!key) return;
    setSelected(project);
    setIssues([]);
    setIssuesLoading(true);
    setIssuesError('');
    getProjectIssues(key, project.id)
      .then(setIssues)
      .catch((e) => setIssuesError(e.message))
      .finally(() => setIssuesLoading(false));
  };

  if (selected) {
    return (
      <div className='flex flex-col overflow-hidden flex-1 p-4 gap-3'>
        <div className='flex items-center justify-between'>
          <button onClick={() => setSelected(null)} className='text-xs text-violet-500 hover:underline'>← Projects</button>
          <span className='text-sm font-medium truncate max-w-[60%]'>{selected.name}</span>
        </div>
        <IssueList issues={issues} loading={issuesLoading} error={issuesError} onSelect={onSelect} onPreview={onPreview} onQueueStart={onQueueStart} />
      </div>
    );
  }

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className='flex flex-col overflow-hidden flex-1 p-4 gap-3'>
      <input
        type='text'
        placeholder='Filter projects…'
        autoFocus
        className='w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400 dark:bg-gray-800'
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <ListState loading={loading} error={error} emptyText='No active projects found'>
        <div className='overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 rounded border border-gray-200 dark:border-gray-700'>
          {filtered.length === 0 && (
            <p className='py-6 text-center text-xs text-gray-400'>No projects match "{filter}"</p>
          )}
          {filtered.map((p) => (
            <button key={p.id} onClick={() => selectProject(p)}
              className='w-full text-left px-4 py-3 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition flex items-center justify-between gap-2'>
              <span className='text-sm font-medium truncate'>{p.name}</span>
              <div className='flex items-center gap-2 flex-shrink-0'>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${projectStateStyle(p.state)}`}>
                  {p.state}
                </span>
                <span className='text-xs text-gray-400'>→</span>
              </div>
            </button>
          ))}
        </div>
      </ListState>
    </div>
  );
};

// ── Cycles tab ─────────────────────────────────────────────────────────────────

const CyclesTab: React.FC<{
  onSelect: (i: LinearIssue) => void;
  onQueueStart: (issues: LinearIssue[]) => void;
  onPreview: (i: LinearIssue) => void;
}> = ({ onSelect, onQueueStart, onPreview }) => {
  const [teams, setTeams] = useState<LinearTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [cycles, setCycles] = useState<LinearCycle[]>([]);
  const [cyclesLoading, setCyclesLoading] = useState(false);
  const [cyclesError, setCyclesError] = useState('');
  const [selectedCycle, setSelectedCycle] = useState<LinearCycle | null>(null);
  const [issues, setIssues] = useState<LinearIssue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState('');

  useEffect(() => {
    const key = getLinearApiKey();
    if (!key) return;
    getLinearTeams(key).then((t) => {
      setTeams(t);
      if (t.length > 0) setSelectedTeamId(t[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedTeamId) return;
    const key = getLinearApiKey();
    if (!key) return;
    setCyclesLoading(true);
    setCyclesError('');
    setSelectedCycle(null);
    setIssues([]);
    getTeamCycles(key, selectedTeamId)
      .then(setCycles)
      .catch((e) => setCyclesError(e.message))
      .finally(() => setCyclesLoading(false));
  }, [selectedTeamId]);

  const selectCycle = (cycle: LinearCycle) => {
    const key = getLinearApiKey();
    if (!key) return;
    setSelectedCycle(cycle);
    setIssues([]);
    setIssuesLoading(true);
    setIssuesError('');
    getCycleIssues(key, cycle.id)
      .then(setIssues)
      .catch((e) => setIssuesError(e.message))
      .finally(() => setIssuesLoading(false));
  };

  const cycleName = (c: LinearCycle) =>
    c.name || `Cycle ${c.number}${c.startsAt ? ` · ${new Date(c.startsAt).toLocaleDateString()}` : ''}`;

  if (selectedCycle) {
    return (
      <div className='flex flex-col overflow-hidden flex-1 p-4 gap-3'>
        <div className='flex items-center justify-between'>
          <button onClick={() => setSelectedCycle(null)} className='text-xs text-violet-500 hover:underline'>← Cycles</button>
          <span className='text-sm font-medium truncate max-w-[60%]'>{cycleName(selectedCycle)}</span>
        </div>
        <IssueList issues={issues} loading={issuesLoading} error={issuesError} onSelect={onSelect} onPreview={onPreview} onQueueStart={onQueueStart} />
      </div>
    );
  }

  return (
    <div className='flex flex-col overflow-hidden flex-1 p-4 gap-3'>
      {teams.length > 1 && (
        <select
          className='border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none dark:bg-gray-800'
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
        >
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      )}
      <ListState loading={cyclesLoading} error={cyclesError} emptyText='No active cycles found'>
        <div className='overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 rounded border border-gray-200 dark:border-gray-700'>
          {cycles.map((c) => (
            <button key={c.id} onClick={() => selectCycle(c)}
              className='w-full text-left px-4 py-3 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition flex items-center justify-between gap-2'>
              <span className='text-sm font-medium'>{cycleName(c)}</span>
              <span className='text-xs text-gray-400'>→</span>
            </button>
          ))}
        </div>
      </ListState>
    </div>
  );
};

// ── Views tab ──────────────────────────────────────────────────────────────────

const ViewsTab: React.FC<{
  onSelect: (i: LinearIssue) => void;
  onQueueStart: (issues: LinearIssue[]) => void;
  onPreview: (i: LinearIssue) => void;
}> = ({ onSelect, onQueueStart, onPreview }) => {
  const [views, setViews] = useState<LinearCustomView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedView, setSelectedView] = useState<LinearCustomView | null>(null);
  const [issues, setIssues] = useState<LinearIssue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState('');

  useEffect(() => {
    const key = getLinearApiKey();
    if (!key) return;
    setLoading(true);
    getCustomViews(key)
      .then(setViews)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const selectView = (view: LinearCustomView) => {
    const key = getLinearApiKey();
    if (!key) return;
    setSelectedView(view);
    setIssues([]);
    setIssuesLoading(true);
    setIssuesError('');
    getCustomViewIssues(key, view.id)
      .then(setIssues)
      .catch((e) => setIssuesError(e.message))
      .finally(() => setIssuesLoading(false));
  };

  if (selectedView) {
    return (
      <div className='flex flex-col overflow-hidden flex-1 p-4 gap-3'>
        <div className='flex items-center justify-between'>
          <button onClick={() => setSelectedView(null)} className='text-xs text-violet-500 hover:underline'>← Views</button>
          <span className='text-sm font-medium truncate max-w-[60%]'>{selectedView.name}</span>
        </div>
        <IssueList issues={issues} loading={issuesLoading} error={issuesError} onSelect={onSelect} onPreview={onPreview} onQueueStart={onQueueStart} />
      </div>
    );
  }

  return (
    <div className='flex flex-col overflow-hidden flex-1 p-4'>
      <ListState loading={loading} error={error} emptyText='No views found'>
        <div className='overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 rounded border border-gray-200 dark:border-gray-700'>
          {views.map((v) => (
            <button key={v.id} onClick={() => selectView(v)}
              className='w-full text-left px-4 py-3 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition flex items-center justify-between gap-2'>
              <div className='min-w-0'>
                <p className='text-sm font-medium truncate'>{v.name}</p>
                <p className='text-xs text-gray-400'>{v.shared ? 'Shared' : 'Personal'}{v.team ? ` · ${v.team.name}` : ''}</p>
              </div>
              <span className='text-xs text-gray-400 flex-shrink-0'>→</span>
            </button>
          ))}
        </div>
      </ListState>
    </div>
  );
};

// ── Shared helpers ─────────────────────────────────────────────────────────────

const QueueBanner: React.FC<{ count: number; loading: boolean; onQueueStart: () => void }> = ({ count, loading, onQueueStart }) => {
  if (loading || count === 0) return null;
  return (
    <div className='flex items-center justify-between bg-violet-50 dark:bg-violet-900/20 rounded px-3 py-2'>
      <span className='text-xs text-gray-600 dark:text-gray-300'>
        {count} issue{count !== 1 ? 's' : ''} · click one to pick it, or:
      </span>
      <button onClick={onQueueStart}
        className='text-xs bg-violet-600 hover:bg-violet-700 text-white rounded px-3 py-1 font-semibold transition flex-shrink-0 ml-2'>
        Estimate All ({count})
      </button>
    </div>
  );
};

const IssueList: React.FC<IssueListProps> = ({ issues, loading, error, onSelect, onPreview, onQueueStart }) => {
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [hideSubIssues, setHideSubIssues] = useState(false);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredIssues = hideSubIssues ? issues.filter((i) => !i.parent?.id) : issues;

  useEffect(() => { setFocusedIdx(0); }, [filteredIssues]);

  useEffect(() => {
    itemRefs.current[focusedIdx]?.scrollIntoView({ block: 'nearest' });
  }, [focusedIdx]);

  // Auto-focus the list when issues load so keyboard nav is ready immediately
  useEffect(() => {
    if (!loading && issues.length > 0) {
      containerRef.current?.focus();
    }
  }, [loading, issues.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredIssues.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx((i) => Math.min(i + 1, filteredIssues.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onSelect(filteredIssues[focusedIdx]);
    } else if (e.key === ' ') {
      e.preventDefault();
      onPreview(filteredIssues[focusedIdx]);
    }
  };

  const subIssueCount = issues.filter((i) => i.parent?.id).length;

  return (
    <div className='flex flex-col flex-1 min-h-0 gap-1'>
      {onQueueStart && (
        <QueueBanner
          count={filteredIssues.length}
          loading={loading}
          onQueueStart={() => onQueueStart(filteredIssues)}
        />
      )}
      {subIssueCount > 0 && (
        <label className='flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none px-1'>
          <input
            type='checkbox'
            checked={hideSubIssues}
            onChange={(e) => setHideSubIssues(e.target.checked)}
            className='rounded border-gray-300 text-violet-600 focus:ring-violet-500'
          />
          Hide sub-issues ({subIssueCount})
        </label>
      )}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className='overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 rounded border border-gray-200 dark:border-gray-700 flex-1 outline-none focus:ring-1 focus:ring-violet-300 dark:focus:ring-violet-700'
      >
      {loading && <div className='flex justify-center items-center py-8 text-sm text-gray-400'>Loading…</div>}
      {!loading && error && <div className='py-6 text-center text-xs text-red-500'>{error}</div>}
      {!loading && !error && filteredIssues.length === 0 && <div className='py-6 text-center text-xs text-gray-400'>No issues found</div>}
      {!loading && filteredIssues.map((issue, idx) => (
        <div
          key={issue.id}
          className={`flex items-start gap-3 px-4 py-2.5 transition ${
            idx === focusedIdx
              ? 'bg-violet-50 dark:bg-violet-900/30'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
          onMouseEnter={() => setFocusedIdx(idx)}
        >
          <button
            ref={(el) => { itemRefs.current[idx] = el; }}
            tabIndex={-1}
            onClick={() => onSelect(issue)}
            className='flex items-start gap-3 flex-1 text-left min-w-0'
          >
            <span className='mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0' style={{ backgroundColor: issue.state.color }} />
            <div className='min-w-0'>
              <div className='flex items-center gap-1.5 flex-wrap'>
                <span className='text-xs font-mono text-gray-400'>{issue.identifier}</span>
                <span className='text-xs text-gray-400'>·</span>
                <span className='text-xs text-gray-400'>{issue.team.name}</span>
                {issue.estimate != null && (
                  <span className='px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 font-semibold text-[10px]'>
                    {issue.estimate} pts
                  </span>
                )}
              </div>
              <p className='text-sm truncate'>{issue.title}</p>
              <p className='text-xs text-gray-400'>{issue.state.name}</p>
            </div>
          </button>
          <button
            tabIndex={-1}
            onClick={() => onPreview(issue)}
            title='Preview issue'
            className='flex-shrink-0 mt-1 p-1 text-gray-300 hover:text-violet-500 dark:text-gray-600 dark:hover:text-violet-400 transition rounded'
          >
            <svg viewBox='0 0 16 16' className='h-3.5 w-3.5' fill='currentColor'>
              <path d='M8 3C4.5 3 1.5 6 1 8c.5 2 3.5 5 7 5s6.5-3 7-5c-.5-2-3.5-5-7-5zm0 8a3 3 0 110-6 3 3 0 010 6zm0-5a2 2 0 100 4 2 2 0 000-4z' />
            </svg>
          </button>
        </div>
      ))}
      {!loading && filteredIssues.length > 0 && (
        <div className='px-4 py-1.5 text-xs text-gray-300 dark:text-gray-600 border-t border-gray-100 dark:border-gray-800 flex gap-3'>
          <span>↑↓ navigate</span>
          <span>Enter select</span>
          <span>Space preview</span>
        </div>
      )}
      </div>
    </div>
  );
};

const projectStateStyle = (state: string): string => {
  switch (state) {
    case 'started':    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'planned':    return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    case 'paused':     return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'completed':  return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'cancelled':  return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300';
    default:           return 'bg-gray-100 text-gray-500';
  }
};

const ListState: React.FC<{ loading: boolean; error: string; emptyText: string; children: React.ReactNode }> = ({ loading, error, emptyText, children }) => {
  if (loading) return <div className='py-8 text-center text-sm text-gray-400'>Loading…</div>;
  if (error) return <div className='py-6 text-center text-xs text-red-500'>{error}</div>;
  return <>{children}</>;
};

// ── Linear icon ────────────────────────────────────────────────────────────────

export const LinearIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <rect width='32' height='32' rx='8' fill='#5E6AD2' />
    <text x='7' y='24' fontFamily='system-ui, sans-serif' fontWeight='800' fontSize='20' fill='white'>L</text>
  </svg>
);
