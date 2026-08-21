// Four summary tiles. Values come straight from public.admin_lead_stats — the
// counts are computed in SQL under the same RLS as everything else.

import { CalendarClock, Inbox, Sparkles, UserCheck } from 'lucide-react';
import type { AdminLeadStats } from '@/services/admin/adminTypes';

const TILES: Array<{
  key: keyof AdminLeadStats;
  label: string;
  hint: string;
  Icon: typeof Inbox;
  ring: string;
}> = [
  {
    key: 'new_leads',
    label: 'New leads',
    hint: 'Status “new”',
    Icon: Inbox,
    ring: 'from-orange-500 to-pink-500',
  },
  {
    key: 'consultations',
    label: 'Consultations',
    hint: 'AI meetings created',
    Icon: CalendarClock,
    ring: 'from-pink-500 to-purple-500',
  },
  {
    key: 'reviews_requested',
    label: 'Human reviews',
    hint: 'Requested or in review',
    Icon: Sparkles,
    ring: 'from-purple-500 to-indigo-500',
  },
  {
    key: 'qualified_leads',
    label: 'Qualified / converted',
    hint: 'Qualified, proposal sent or hired',
    Icon: UserCheck,
    ring: 'from-orange-500 to-purple-600',
  },
];

const AdminStatCards = ({
  stats,
  loading,
}: {
  stats: AdminLeadStats | null;
  loading: boolean;
}) => (
  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {TILES.map(({ key, label, hint, Icon, ring }) => (
      <div
        key={key}
        className="rounded-2xl border border-gray-800 bg-gray-900 p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
            <dd className="mt-2 text-2xl font-semibold text-white">
              {loading ? (
                <span
                  className="block h-7 w-12 animate-pulse rounded bg-gray-800"
                  aria-label={`${label} loading`}
                />
              ) : (
                (stats?.[key] ?? 0)
              )}
            </dd>
            <p className="mt-1 text-xs text-gray-500">{hint}</p>
          </div>
          <span
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ring}`}
          >
            <Icon className="h-4 w-4 text-white" aria-hidden="true" />
          </span>
        </div>
      </div>
    ))}
  </dl>
);

export default AdminStatCards;
