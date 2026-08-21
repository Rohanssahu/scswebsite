// The recent-leads list. A real table on desktop, stacked cards on mobile, with
// explicit loading / empty / no-result / error states — the four things that
// actually happen when a dashboard talks to a database.

import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Inbox, RotateCcw, SearchX } from 'lucide-react';
import {
  formatCostRange,
  formatDate,
  leadSourceLabel,
  leadStatusLabel,
  leadStatusTone,
  projectTypeLabel,
  resolveProjectMode,
} from '@/services/admin/adminLeadsCore';
import type { AdminLeadRow } from '@/services/admin/adminTypes';

const COLUMNS = [
  'Reference',
  'Client',
  'Project type',
  'Source',
  'Status',
  'Preliminary estimate',
  'Created',
  '',
];

export const StatusPill = ({ status }: { status: string | null }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${leadStatusTone(status)}`}
  >
    {leadStatusLabel(status)}
  </span>
);

const EstimateCell = ({ row }: { row: AdminLeadRow }) => {
  const range = formatCostRange(row.estimate_cost_min, row.estimate_cost_max, row.estimate_currency);
  if (!range) return <span className="text-gray-500">Not estimated</span>;
  return (
    <span className="text-gray-200">
      {range}
      <span className="block text-[11px] text-gray-500">Preliminary</span>
    </span>
  );
};

const LeadsSkeleton = () => (
  <div className="space-y-2 p-4" role="status" aria-live="polite">
    <span className="sr-only">Loading leads…</span>
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="h-12 animate-pulse rounded-xl bg-gray-800/70" />
    ))}
  </div>
);

const EmptyState = ({ searching }: { searching: boolean }) => (
  <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
    {searching ? (
      <SearchX className="h-7 w-7 text-gray-500" aria-hidden="true" />
    ) : (
      <Inbox className="h-7 w-7 text-gray-500" aria-hidden="true" />
    )}
    <p className="text-sm font-medium text-gray-200">
      {searching ? 'No leads match this search' : 'No leads yet'}
    </p>
    <p className="max-w-sm text-xs text-gray-500">
      {searching
        ? 'Try a different reference code, name or email, or clear the filters.'
        : 'Submissions from the contact form, project analysis and AI consultations will appear here.'}
    </p>
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="flex flex-col items-center gap-3 px-6 py-14 text-center" role="alert">
    <AlertTriangle className="h-7 w-7 text-orange-400" aria-hidden="true" />
    <p className="text-sm font-medium text-gray-200">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-700 px-4 text-sm font-medium text-gray-200 hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
    >
      <RotateCcw className="h-4 w-4" aria-hidden="true" />
      Try again
    </button>
  </div>
);

export interface LeadsTableProps {
  rows: AdminLeadRow[];
  loading: boolean;
  errorMessage: string | null;
  searching: boolean;
  onRetry: () => void;
}

const LeadsTable = ({ rows, loading, errorMessage, searching, onRetry }: LeadsTableProps) => {
  if (errorMessage) return <ErrorState message={errorMessage} onRetry={onRetry} />;
  if (loading) return <LeadsSkeleton />;
  if (rows.length === 0) return <EmptyState searching={searching} />;

  return (
    <>
      {/* Desktop: a real table, so screen readers announce row/column context. */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Leads, newest first</caption>
          <thead>
            <tr className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500">
              {COLUMNS.map((column, index) => (
                <th key={column || `actions-${index}`} scope="col" className="px-4 py-3 font-medium">
                  {column || <span className="sr-only">Actions</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-800/40">
                <td className="px-4 py-3 font-mono text-xs text-gray-300">{row.reference_code}</td>
                <td className="px-4 py-3">
                  <span className="block font-medium text-white">{row.name}</span>
                  <span className="block text-xs text-gray-500">{row.email}</span>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {projectTypeLabel(resolveProjectMode(row))}
                </td>
                <td className="px-4 py-3 text-gray-300">{leadSourceLabel(row)}</td>
                <td className="px-4 py-3">
                  <StatusPill status={row.status} />
                </td>
                <td className="px-4 py-3">
                  <EstimateCell row={row} />
                </td>
                <td className="px-4 py-3 text-gray-400">{formatDate(row.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/admin/leads/${row.id}`}
                    className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-gray-700 px-3 text-xs font-medium text-gray-200 hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                  >
                    View
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: the same data as cards. */}
      <ul className="divide-y divide-gray-800 md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{row.name}</p>
                <p className="truncate text-xs text-gray-500">{row.email}</p>
              </div>
              <StatusPill status={row.status} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-gray-500">Reference</dt>
                <dd className="font-mono text-gray-300">{row.reference_code}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Source</dt>
                <dd className="text-gray-300">{leadSourceLabel(row)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Project</dt>
                <dd className="text-gray-300">{projectTypeLabel(resolveProjectMode(row))}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-300">{formatDate(row.created_at)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-500">Preliminary estimate</dt>
                <dd className="text-gray-300">
                  <EstimateCell row={row} />
                </dd>
              </div>
            </dl>
            <Link
              to={`/admin/leads/${row.id}`}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl border border-gray-700 text-sm font-medium text-gray-200 hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            >
              View lead
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
};

export default LeadsTable;
