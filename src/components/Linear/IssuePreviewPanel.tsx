import React from 'react';
import { LinearIssue } from '../../service/linear';
import { LinearIssueDetail } from '../../service/linear';

// ── Minimal markdown renderer ──────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    result.push(
      <ul key={key} className='list-disc pl-5 space-y-0.5 my-1'>
        {listBuffer.map((item, i) => (
          <li key={i} className='text-sm text-gray-700 dark:text-gray-300'>
            {renderInline(item)}
          </li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  lines.forEach((line, i) => {
    const key = String(i);

    // Fenced code block
    if (line.startsWith('```')) {
      if (!inCode) {
        flushList(`list-${key}`);
        inCode = true;
        codeLines = [];
      } else {
        inCode = false;
        result.push(
          <pre key={key} className='bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono p-3 overflow-x-auto my-2 whitespace-pre'>
            {codeLines.join('\n')}
          </pre>,
        );
        codeLines = [];
      }
      return;
    }
    if (inCode) { codeLines.push(line); return; }

    // Headings
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    if (h1 || h2 || h3) {
      flushList(`list-${key}`);
      const text = (h1 || h2 || h3)![1];
      const cls = h1
        ? 'text-base font-bold mt-4 mb-1 text-gray-900 dark:text-gray-100'
        : h2
        ? 'text-sm font-bold mt-3 mb-1 text-gray-900 dark:text-gray-100'
        : 'text-sm font-semibold mt-2 mb-0.5 text-gray-800 dark:text-gray-200';
      result.push(<p key={key} className={cls}>{renderInline(text)}</p>);
      return;
    }

    // List items
    const li = line.match(/^[-*] (.+)/);
    if (li) { listBuffer.push(li[1]); return; }

    // Flush pending list before non-list line
    flushList(`list-before-${key}`);

    // Image: ![alt](url)
    const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (img) {
      result.push(
        <img key={key} src={img[2]} alt={img[1]}
          className='max-w-full rounded my-2 border border-gray-200 dark:border-gray-700' />,
      );
      return;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      result.push(<hr key={key} className='border-gray-200 dark:border-gray-700 my-3' />);
      return;
    }

    // Empty line
    if (line.trim() === '') {
      result.push(<div key={key} className='h-2' />);
      return;
    }

    // Normal paragraph
    result.push(
      <p key={key} className='text-sm text-gray-700 dark:text-gray-300 leading-relaxed'>
        {renderInline(line)}
      </p>,
    );
  });

  flushList('list-end');
  return result;
}

function renderInline(text: string): React.ReactNode {
  // Split on bold, italic, inline code, links, images
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*(.+)\*\*$/) || part.match(/^__(.+)__$/);
    if (bold) return <strong key={i} className='font-semibold'>{bold[1]}</strong>;

    const code = part.match(/^`(.+)`$/);
    if (code) return <code key={i} className='bg-gray-100 dark:bg-gray-800 text-xs font-mono px-1 py-0.5 rounded'>{code[1]}</code>;

    const image = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) return <img key={i} src={image[2]} alt={image[1]} className='inline max-h-6' />;

    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <a key={i} href={link[2]} target='_blank' rel='noopener noreferrer' className='text-violet-600 dark:text-violet-400 hover:underline'>{link[1]}</a>;

    return part;
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

interface IssuePreviewPanelProps {
  issue: LinearIssueDetail | null;
  loading: boolean;
  onSelect: (issue: LinearIssue) => void;
  onClose: () => void;
}

export const IssuePreviewPanel: React.FC<IssuePreviewPanelProps> = ({
  issue,
  loading,
  onSelect,
  onClose,
}) => {
  return (
    <div className='flex flex-col h-full'>
      {/* Panel header */}
      <div className='flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0'>
        <span className='text-xs text-gray-500 font-medium'>Issue Preview</span>
        <button
          onClick={onClose}
          className='text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-lg leading-none'
        >
          ×
        </button>
      </div>

      {loading && (
        <div className='flex-1 flex items-center justify-center text-sm text-gray-400'>
          Loading…
        </div>
      )}

      {!loading && issue && (
        <div className='flex-1 overflow-y-auto p-4 space-y-3'>
          {/* Title & meta */}
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <span className='h-2.5 w-2.5 rounded-full flex-shrink-0' style={{ backgroundColor: issue.state.color }} />
              <span className='text-xs font-mono text-gray-400'>{issue.identifier}</span>
              <span className='text-xs text-gray-400'>·</span>
              <span className='text-xs text-gray-500'>{issue.state.name}</span>
              {issue.estimate != null && (
                <>
                  <span className='text-xs text-gray-400'>·</span>
                  <span className='text-xs text-violet-500 font-semibold'>{issue.estimate} pts</span>
                </>
              )}
            </div>
            <h2 className='text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug'>
              {issue.title}
            </h2>
          </div>

          {/* Labels */}
          {issue.labels.length > 0 && (
            <div className='flex flex-wrap gap-1'>
              {issue.labels.map((label) => (
                <span
                  key={label.name}
                  className='text-xs px-2 py-0.5 rounded-full font-medium'
                  style={{ backgroundColor: `${label.color}22`, color: label.color }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}

          {/* Assignee */}
          {issue.assignee && (
            <div className='flex items-center gap-2 text-xs text-gray-500'>
              {issue.assignee.avatarUrl ? (
                <img src={issue.assignee.avatarUrl} alt='' className='h-4 w-4 rounded-full' />
              ) : (
                <div className='h-4 w-4 rounded-full bg-gray-200 dark:bg-gray-700' />
              )}
              {issue.assignee.name}
            </div>
          )}

          {/* Description */}
          {issue.description ? (
            <div className='border-t border-gray-100 dark:border-gray-800 pt-3'>
              {renderMarkdown(issue.description)}
            </div>
          ) : (
            <p className='text-xs text-gray-400 italic border-t border-gray-100 dark:border-gray-800 pt-3'>
              No description
            </p>
          )}
        </div>
      )}

      {/* Footer actions */}
      {!loading && issue && (
        <div className='flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0'>
          <button
            onClick={() => onSelect(issue)}
            className='flex-1 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded px-3 py-1.5 transition'
          >
            Use this issue
          </button>
          <a
            href={issue.url}
            target='_blank'
            rel='noopener noreferrer'
            className='text-xs text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 transition underline-offset-2 hover:underline'
          >
            Open in Linear ↗
          </a>
        </div>
      )}
    </div>
  );
};
