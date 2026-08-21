// Consultation meetings that never produced a lead.
//
// The backend only creates a lead when a meeting is finalized
// (finalize_consultation_tx). Scheduling, joining or abandoning a meeting
// therefore leaves a consultation_meetings row with lead_id = null. Rather than
// manufacture placeholder leads, the dashboard surfaces those rows here, as
// what they are: incomplete sessions.

import { CalendarClock } from 'lucide-react';
import { formatDateTime, meetingStatusLabel } from '@/services/admin/adminLeadsCore';
import type { AdminUnsubmittedConsultationRow } from '@/services/admin/adminTypes';

const UnsubmittedConsultations = ({
  rows,
  loading,
}: {
  rows: AdminUnsubmittedConsultationRow[];
  loading: boolean;
}) => (
  <section className="rounded-2xl border border-gray-800 bg-gray-900">
    <header className="flex items-start gap-3 border-b border-gray-800 px-4 py-3">
      <CalendarClock className="mt-0.5 h-4 w-4 text-pink-400" aria-hidden="true" />
      <div>
        <h2 className="text-sm font-semibold text-white">Unsubmitted consultations</h2>
        <p className="text-xs text-gray-500">
          Meetings that never reached “End &amp; submit”, so no lead record exists yet.
        </p>
      </div>
    </header>

    {loading ? (
      <div className="space-y-2 p-4" role="status" aria-live="polite">
        <span className="sr-only">Loading consultations…</span>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-10 animate-pulse rounded-xl bg-gray-800/70" />
        ))}
      </div>
    ) : rows.length === 0 ? (
      <p className="px-4 py-8 text-center text-xs text-gray-500">
        Every consultation so far has been submitted.
      </p>
    ) : (
      <ul className="divide-y divide-gray-800">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
            <span className="font-mono text-xs text-gray-300">{row.public_reference}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-white">{row.name}</span>
              <span className="block truncate text-xs text-gray-500">{row.email}</span>
            </span>
            <span className="text-xs text-gray-400">
              {row.meeting_kind === 'scheduled' ? 'Scheduled' : 'Instant'} ·{' '}
              {meetingStatusLabel(row.status)}
              {row.review_status === 'requested' ? ' · review requested' : ''}
            </span>
            <span className="text-xs text-gray-500">
              {formatDateTime(row.scheduled_at ?? row.created_at)}
            </span>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export default UnsubmittedConsultations;
