import React from 'react';

interface EstimationGuideProps {
  onClose: () => void;
}

const POINTS = [
  {
    value: 1,
    size: 'Small',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    dot: 'bg-green-500',
    description: 'Extremely easy task. No unknowns, can be done in an hour or less.',
  },
  {
    value: 2,
    size: 'Small / Medium',
    color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
    dot: 'bg-teal-500',
    description:
      'Simple logic change. It is clear what needs to be done — just needs to be executed.',
  },
  {
    value: 3,
    size: 'Medium',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
    description:
      'Standard user story. The goal is clear, but not always HOW. Technical decisions need to be made. More than one person can be involved (e.g. design discussions or meetings).',
  },
  {
    value: 5,
    size: 'Medium / Large',
    color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-500',
    description: 'Complex task. Research is needed before or during the work.',
  },
  {
    value: 8,
    size: 'Large',
    color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
    description:
      'High effort, significant risk, large change. Consider breaking it down if possible.',
  },
];

export const EstimationGuide: React.FC<EstimationGuideProps> = ({ onClose }) => (
  <div
    className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div className='bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden'>
      {/* Header */}
      <div className='flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700'>
        <span className='font-semibold text-sm'>Story Point Guide</span>
        <button
          onClick={onClose}
          className='text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl leading-none'
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className='p-5 flex flex-col gap-3'>
        {POINTS.map(({ value, size, color, dot, description }) => (
          <div key={value} className={`rounded-lg px-4 py-3 flex gap-3 items-start ${color}`}>
            <div className='flex flex-col items-center gap-1 flex-shrink-0'>
              <span className='text-2xl font-bold leading-none'>{value}</span>
              <span
                className={`h-2 w-2 rounded-full flex-shrink-0 ${dot}`}
              />
            </div>
            <div>
              <p className='text-xs font-semibold uppercase tracking-wide opacity-70 mb-0.5'>
                {size}
              </p>
              <p className='text-sm leading-snug'>{description}</p>
            </div>
          </div>
        ))}
        <p className='text-xs text-gray-400 text-center mt-1'>
          If you can't agree — that's a signal to discuss, not just average.
        </p>
      </div>
    </div>
  </div>
);
