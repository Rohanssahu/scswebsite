import React from 'react';
import { GuideAction } from '@/types/virtualGuide';

interface QuickRepliesProps {
  actions: GuideAction[];
  onAction: (action: GuideAction) => void;
  className?: string;
  ariaLabel?: string;
}

const QuickReplies = ({ actions, onAction, className = '', ariaLabel = 'Quick replies' }: QuickRepliesProps) => {
  if (actions.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`} role="group" aria-label={ariaLabel}>
      {actions.map((a) => (
        <button
          key={`${a.kind}-${a.label}`}
          type="button"
          onClick={() => onAction(a)}
          className="rounded-full border border-pink-300 bg-pink-50 px-3 py-1 text-xs font-medium text-pink-700 transition-colors hover:bg-pink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          {a.label}
        </button>
      ))}
    </div>
  );
};

export default QuickReplies;
