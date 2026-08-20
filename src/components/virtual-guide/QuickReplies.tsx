import React from 'react';
import { useTranslation } from 'react-i18next';
import { valueKey } from '@/i18n/languageConfig';
import { GuideAction } from '@/types/virtualGuide';

interface QuickRepliesProps {
  actions: GuideAction[];
  onAction: (action: GuideAction) => void;
  className?: string;
  ariaLabel?: string;
}

// Action labels are canonical English in state; they render translated via
// the actions.* lookup (falling back to the label itself).

const QuickReplies = ({ actions, onAction, className = '', ariaLabel }: QuickRepliesProps) => {
  const { t } = useTranslation();
  if (actions.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`} role="group" aria-label={ariaLabel ?? t('guide.chat.quickReplies')}>
      {actions.map((a) => (
        <button
          key={`${a.kind}-${a.label}`}
          type="button"
          onClick={() => onAction(a)}
          className="min-h-9 rounded-full border border-pink-300 bg-pink-50 px-3 py-1 text-xs font-medium text-pink-700 transition-colors hover:bg-pink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          {t(`actions.${valueKey(a.label)}`, { defaultValue: a.label })}
        </button>
      ))}
    </div>
  );
};

export default QuickReplies;
