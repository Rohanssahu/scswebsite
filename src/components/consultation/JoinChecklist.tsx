// =============================================================================
// JoinChecklist — the four conditions that gate "Join consultation".
//
// Shows the REAL status of each item (pending / testing / passed / failed) as
// computed by buildChecklist in deviceCheck.ts. Nothing here is decorative:
// an item is green only when the corresponding check actually passed, and each
// status carries an icon and a word so colour is never the only signal.
// =============================================================================

import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import type { ChecklistItem, ChecklistStatus } from '@/services/deviceCheck';

interface JoinChecklistProps {
  items: ChecklistItem[];
}

const ICONS: Record<ChecklistStatus, typeof CheckCircle2> = {
  pending: Circle,
  testing: Loader2,
  passed: CheckCircle2,
  failed: AlertTriangle,
};

const TEXT: Record<ChecklistStatus, string> = {
  pending: 'text-gray-500',
  testing: 'text-sky-700',
  passed: 'text-emerald-700',
  failed: 'text-rose-700',
};

const JoinChecklist: React.FC<JoinChecklistProps> = ({ items }) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {t('meeting.setup.checklist.title')}
      </p>
      {/* laid out as wrapping chips so the four conditions cost one or two
          lines instead of a four-row list */}
      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
        {items.map((item) => {
          const Icon = ICONS[item.status];
          return (
            <li key={item.id} className="flex items-center gap-1.5 text-xs">
              <Icon
                className={`h-3.5 w-3.5 shrink-0 ${TEXT[item.status]} ${item.status === 'testing' ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span className="text-gray-800">{t(`meeting.setup.checklist.${item.id}`)}</span>
              <span className={`font-medium ${TEXT[item.status]}`}>
                {t(`meeting.setup.checklist.status.${item.status}`)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default JoinChecklist;
