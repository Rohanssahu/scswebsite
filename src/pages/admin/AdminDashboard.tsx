// Route 2 — /admin
//
// Summary tiles, the recent-leads list with server-side search/filter/paging,
// and the "unsubmitted consultations" section. Every request is paginated: the
// dashboard never downloads the leads table.

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, RotateCcw, Search } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminStatCards from '@/components/admin/AdminStatCards';
import LeadsTable from '@/components/admin/LeadsTable';
import UnsubmittedConsultations from '@/components/admin/UnsubmittedConsultations';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';
import {
  ADMIN_PAGE_SIZE,
  DATE_RANGE_OPTIONS,
  DEFAULT_LEAD_FILTERS,
  LEAD_STATUS_OPTIONS,
  LEAD_TYPE_OPTIONS,
  adminQueryKeys,
  leadStatusLabel,
  leadTypeLabel,
  rangeSummary,
  sanitizeSearchTerm,
  totalPages,
  type AdminLeadFilters,
  type DateRangeKey,
} from '@/services/admin/adminLeadsCore';
import {
  AdminDataError,
  fetchLeadStats,
  fetchLeads,
  fetchUnsubmittedConsultations,
  isSessionExpired,
} from '@/services/admin/adminLeadsService';
import type { LeadStatus, LeadType } from '@/services/admin/adminTypes';

const SELECT_CLASS =
  'min-h-11 rounded-xl border border-gray-700 bg-gray-950 px-3 text-sm text-gray-200 focus:border-pink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500';

const safeMessage = (error: unknown): string =>
  error instanceof AdminDataError ? error.message : 'Something went wrong. Please try again.';

const AdminDashboard = () => {
  const { setNotice, refresh } = useAdminAuth();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<AdminLeadFilters>(DEFAULT_LEAD_FILTERS);

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) =>
        sanitizeSearchTerm(current.search) === sanitizeSearchTerm(searchInput)
          ? current
          : { ...current, search: searchInput, page: 1 },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const statsQuery = useQuery({
    queryKey: adminQueryKeys.stats(),
    queryFn: () => fetchLeadStats(),
  });

  const leadsQuery = useQuery({
    queryKey: adminQueryKeys.leads(filters),
    queryFn: () => fetchLeads(filters),
  });

  const consultationsQuery = useQuery({
    queryKey: adminQueryKeys.unsubmittedConsultations(),
    queryFn: () => fetchUnsubmittedConsultations(10),
  });

  // A JWT that expired while the tab sat open: ask the provider to re-check,
  // which either silently refreshes the session or sends us to the login page.
  const expired =
    isSessionExpired(leadsQuery.error) ||
    isSessionExpired(statsQuery.error) ||
    isSessionExpired(consultationsQuery.error);

  useEffect(() => {
    if (!expired) return;
    setNotice('Your session expired. Please sign in again.');
    void refresh();
  }, [expired, refresh, setNotice]);

  const total = leadsQuery.data?.total ?? 0;
  const rows = leadsQuery.data?.rows ?? [];
  const pages = totalPages(total, filters.pageSize);
  const searching = useMemo(
    () =>
      Boolean(sanitizeSearchTerm(filters.search)) ||
      filters.leadType !== 'all' ||
      filters.status !== 'all' ||
      filters.dateRange !== 'all',
    [filters],
  );

  const updateFilters = (patch: Partial<AdminLeadFilters>) =>
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));

  const resetFilters = () => {
    setSearchInput('');
    setFilters(DEFAULT_LEAD_FILTERS);
  };

  return (
    <AdminLayout title="Overview">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Overview</h1>
          <p className="mt-1 text-sm text-gray-400">
            Everything clients submitted through the website, newest first.
          </p>
        </div>

        <AdminStatCards stats={statsQuery.data ?? null} loading={statsQuery.isPending} />

        <section className="rounded-2xl border border-gray-800 bg-gray-900">
          <header className="space-y-3 border-b border-gray-800 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">Recent leads</h2>
              <button
                type="button"
                onClick={() => {
                  void queryClient.invalidateQueries({ queryKey: ['admin'] });
                }}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-gray-700 px-3 text-xs font-medium text-gray-300 hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Refresh
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="relative">
                <label htmlFor="lead-search" className="sr-only">
                  Search by reference, name or email
                </label>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                  aria-hidden="true"
                />
                <input
                  id="lead-search"
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Reference, name or email"
                  className="min-h-11 w-full rounded-xl border border-gray-700 bg-gray-950 pl-9 pr-3 text-sm text-gray-200 placeholder:text-gray-600 focus:border-pink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                />
              </div>

              <div>
                <label htmlFor="lead-source" className="sr-only">
                  Filter by source
                </label>
                <select
                  id="lead-source"
                  value={filters.leadType}
                  onChange={(event) =>
                    updateFilters({ leadType: event.target.value as LeadType | 'all' })
                  }
                  className={`${SELECT_CLASS} w-full`}
                >
                  <option value="all">All sources</option>
                  {LEAD_TYPE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {leadTypeLabel(value)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="lead-status" className="sr-only">
                  Filter by status
                </label>
                <select
                  id="lead-status"
                  value={filters.status}
                  onChange={(event) =>
                    updateFilters({ status: event.target.value as LeadStatus | 'all' })
                  }
                  className={`${SELECT_CLASS} w-full`}
                >
                  <option value="all">All statuses</option>
                  {LEAD_STATUS_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {leadStatusLabel(value)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="lead-date" className="sr-only">
                  Filter by date
                </label>
                <select
                  id="lead-date"
                  value={filters.dateRange}
                  onChange={(event) =>
                    updateFilters({ dateRange: event.target.value as DateRangeKey })
                  }
                  className={`${SELECT_CLASS} w-full`}
                >
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {searching ? (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-pink-400 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                Clear search and filters
              </button>
            ) : null}
          </header>

          <LeadsTable
            rows={rows}
            loading={leadsQuery.isPending}
            errorMessage={leadsQuery.isError ? safeMessage(leadsQuery.error) : null}
            searching={searching}
            onRetry={() => void leadsQuery.refetch()}
          />

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-800 px-4 py-3">
            <p className="text-xs text-gray-500">
              {leadsQuery.isPending
                ? 'Loading…'
                : rangeSummary(total, filters.page, filters.pageSize, rows.length)}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateFilters({ page: Math.max(filters.page - 1, 1) })}
                disabled={filters.page <= 1 || leadsQuery.isPending}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-gray-700 px-3 text-xs font-medium text-gray-300 disabled:opacity-40 hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Previous
              </button>
              <span className="text-xs text-gray-500">
                Page {filters.page} of {pages}
              </span>
              <button
                type="button"
                onClick={() => updateFilters({ page: Math.min(filters.page + 1, pages) })}
                disabled={filters.page >= pages || leadsQuery.isPending}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-gray-700 px-3 text-xs font-medium text-gray-300 disabled:opacity-40 hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </footer>
        </section>

        <UnsubmittedConsultations
          rows={consultationsQuery.data ?? []}
          loading={consultationsQuery.isPending}
        />

        <p className="pb-4 text-xs text-gray-600">
          Page size {ADMIN_PAGE_SIZE}. All figures shown here are preliminary estimates generated
          from client answers, never final quotations.
        </p>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
