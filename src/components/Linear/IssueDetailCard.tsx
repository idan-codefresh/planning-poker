import React, { useState } from 'react';
import { LinearIssueDetail } from '../../service/linear';
import { LinearIcon } from './LinearIssuePicker';

// Re-use the same markdown renderer from IssuePreviewPanel
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*(.+)\*\*$/) || part.match(/^__(.+)__$/);
    if (bold) return <strong key={i} className='font-semibold'>{bold[1]}</strong>;
    const code = part.match(/^`(.+)`$/);
    if (code) return <code key={i} className='bg-gray-100 dark:bg-gray-800 text-xs font-mono px-1 py-0.5 rounded'>{code[1]}</code>;
    const image = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) return <img key={i} src={image[2]} alt={image[1]} className='inline max-h-5' />;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <a key={i} href={link[2]} target='_blank' rel='noopener noreferrer' className='text-violet-600 dark:text-violet-400 hover:underline'>{link[1]}</a>;
    return part;
  });
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];

  const flushList = (key: string) => {
    if (!listBuffer.length) return;
    result.push(
      <ul key={key} className='list-disc pl-5 space-y-0.5 my-1'>
        {listBuffer.map((item, i) => (
          <li key={i} className='text-sm text-gray-700 dark:text-gray-300'>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  lines.forEach((line, i) => {
    const key = String(i);
    if (line.startsWith('```')) {
      if (!inCode) { flushList(`list-${key}`); inCode = true; codeLines = []; }
      else {
        inCode = false;
        result.push(
          <pre key={key} className='bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono p-2 overflow-x-auto my-2 whitespace-pre'>
            {codeLines.join('\n')}
          </pre>,
        );
        codeLines = [];
      }
      return;
    }
    if (inCode) { codeLines.push(line); return; }

    const h = line.match(/^(#{1,3}) (.+)/);
    if (h) {
      flushList(`list-${key}`);
      const lvl = h[1].length;
      const cls = lvl === 1 ? 'text-sm font-bold mt-3 mb-1' : lvl === 2 ? 'text-sm font-semibold mt-2 mb-0.5' : 'text-xs font-semibold mt-1';
      result.push(<p key={key} className={`${cls} text-gray-900 dark:text-gray-100`}>{renderInline(h[2])}</p>);
      return;
    }
    const li = line.match(/^[-*] (.+)/);
    if (li) { listBuffer.push(li[1]); return; }
    flushList(`list-before-${key}`);

    const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (img) {
      result.push(<img key={key} src={img[2]} alt={img[1]} className='max-w-full rounded my-2 border border-gray-200 dark:border-gray-700' />);
      return;
    }
    if (/^---+$/.test(line.trim())) {
      result.push(<hr key={key} className='border-gray-200 dark:border-gray-700 my-2' />);
      return;
    }
    if (!line.trim()) { result.push(<div key={key} className='h-1.5' />); return; }
    result.push(
      <p key={key} className='text-sm text-gray-700 dark:text-gray-300 leading-relaxed'>{renderInline(line)}</p>,
    );
  });
  flushList('list-end');
  return result;
}

// ── Component ──────────────────────────────────────────────────────────────────

interface IssueDetailCardProps {
  issue: LinearIssueDetail;
  loading?: boolean;
  showBrowse: boolean;
  onToggleBrowse: () => void;
}

export const IssueDetailCard: React.FC<IssueDetailCardProps> = ({
  issue,
  loading,
  showBrowse,
  onToggleBrowse,
}) => {
  const [descExpanded, setDescExpanded] = useState(true);
  const hasDesc = !!issue.description?.trim();

  return (
    <div
      className='w-full rounded-lg overflow-hidden'
      style={{ background: 'var(--lin-surface)', border: '1px solid var(--lin-border-strong)' }}
    >
      {/* Header row */}
      <div
        className='flex items-center justify-between px-3 py-2'
        style={{ borderBottom: '1px solid var(--lin-border)' }}
      >
        <div className='flex items-center gap-2 min-w-0'>
          <span className='h-2 w-2 rounded-full flex-shrink-0' style={{ background: issue.state.color }} />
          <a
            href={issue.url}
            target='_blank'
            rel='noopener noreferrer'
            className='text-xs font-mono flex-shrink-0 transition'
            style={{ color: 'var(--lin-text-3)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--lin-accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--lin-text-3)')}
          >
            {issue.identifier}
          </a>
          <span style={{ color: 'var(--lin-text-3)' }} className='text-xs'>·</span>
          <span className='text-xs truncate' style={{ color: 'var(--lin-text-3)' }}>{issue.state.name}</span>
          {issue.estimate != null && (
            <>
              <span className='text-xs' style={{ color: 'var(--lin-text-3)' }}>·</span>
              <span
                className='text-[10px] font-semibold px-1.5 py-0.5 rounded-md'
                style={{ background: 'var(--lin-accent-subtle)', color: 'var(--lin-accent)' }}
              >
                {issue.estimate} pts
              </span>
            </>
          )}
        </div>
        <div className='flex items-center gap-2 flex-shrink-0 ml-2'>
          {hasDesc && (
            <button
              onClick={() => setDescExpanded((v) => !v)}
              className='text-xs transition'
              style={{ color: 'var(--lin-text-3)' }}
              title={descExpanded ? 'Collapse' : 'Expand'}
            >
              {descExpanded ? '▲' : '▼'}
            </button>
          )}
          <button
            onClick={onToggleBrowse}
            className='flex items-center gap-1 text-xs font-medium rounded-md px-2.5 py-1 transition'
            style={showBrowse
              ? { background: 'var(--lin-accent)', color: '#fff' }
              : { background: 'var(--lin-accent-subtle)', color: 'var(--lin-accent)' }
            }
          >
            <LinearIcon className='h-3 w-3' />
            {showBrowse ? 'Close' : 'Browse'}
          </button>
        </div>
      </div>

      {/* Title */}
      <div className='px-3 pt-2.5 pb-1.5'>
        <h3 className='text-sm font-semibold leading-snug' style={{ color: 'var(--lin-text)' }}>
          {issue.title}
        </h3>
      </div>

      {/* Labels + assignee */}
      {(issue.labels.length > 0 || issue.assignee) && (
        <div className='px-3 pb-2 flex items-center gap-2 flex-wrap'>
          {issue.labels.map((label) => (
            <span
              key={label.name}
              className='text-[10px] px-2 py-0.5 rounded-full font-medium'
              style={{ background: `${label.color}22`, color: label.color }}
            >
              {label.name}
            </span>
          ))}
          {issue.assignee && (
            <div className='flex items-center gap-1 text-xs' style={{ color: 'var(--lin-text-2)' }}>
              {issue.assignee.avatarUrl ? (
                <img src={issue.assignee.avatarUrl} alt='' className='h-4 w-4 rounded-full' />
              ) : (
                <div
                  className='h-4 w-4 rounded-full text-[9px] flex items-center justify-center font-bold'
                  style={{ background: 'var(--lin-elevated)', color: 'var(--lin-text-2)' }}
                >
                  {issue.assignee.name[0]}
                </div>
              )}
              {issue.assignee.name}
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {hasDesc && descExpanded && (
        <div className='px-3 pb-4 pt-2.5 max-h-56 overflow-y-auto' style={{ borderTop: '1px solid var(--lin-border)' }}>
          {loading
            ? <p className='text-xs' style={{ color: 'var(--lin-text-3)' }}>Loading…</p>
            : renderMarkdown(issue.description!)
          }
        </div>
      )}
    </div>
  );
};
