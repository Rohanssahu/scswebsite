// Route 3 — /admin/leads/:id

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Loader2, RotateCcw } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import LeadDetailView from '@/components/admin/LeadDetailView';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';
import { adminQueryKeys, validateNote } from '@/services/admin/adminLeadsCore';
import {
  AdminDataError,
  addLeadNote,
  fetchLeadDetail,
  isSessionExpired,
  updateLeadNote,
  updateLeadStatus,
} from '@/services/admin/adminLeadsService';
import type { LeadStatus } from '@/services/admin/adminTypes';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const safeMessage = (error: unknown): string =>
  error instanceof AdminDataError ? error.message : 'Something went wrong. Please try again.';

const Notice = ({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) => (
  <div className="mx-auto max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
    <AlertTriangle className="mx-auto h-7 w-7 text-orange-400" aria-hidden="true" />
    <h1 className="mt-3 text-base font-semibold text-white">{title}</h1>
    <p className="mt-1 text-sm text-gray-400">{body}</p>
    <div className="mt-5 flex flex-wrap justify-center gap-2">
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-700 px-4 text-sm font-medium text-gray-200 hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      ) : null}
      <Link
        to="/admin"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-700 px-4 text-sm font-medium text-gray-200 hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to leads
      </Link>
    </div>
  </div>
);

const AdminLeadDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { userId, setNotice, refresh } = useAdminAuth();
  const queryClient = useQueryClient();
  const [statusError, setStatusError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  const validId = typeof id === 'string' && UUID_PATTERN.test(id) ? id : null;

  const detailQuery = useQuery({
    queryKey: adminQueryKeys.leadDetail(validId ?? 'invalid'),
    queryFn: () => fetchLeadDetail(validId as string),
    enabled: Boolean(validId),
  });

  const expired = isSessionExpired(detailQuery.error);
  useEffect(() => {
    if (!expired) return;
    setNotice('Your session expired. Please sign in again.');
    void refresh();
  }, [expired, refresh, setNotice]);

  /** Both list and detail caches are invalidated so the table never goes stale. */
  const invalidate = () => {
    if (validId) void queryClient.invalidateQueries({ queryKey: adminQueryKeys.leadDetail(validId) });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'leads'] });
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats() });
  };

  const statusMutation = useMutation({
    mutationFn: (status: LeadStatus) => updateLeadStatus(validId as string, status),
    onSuccess: () => {
      setStatusError(null);
      invalidate();
    },
    onError: (error) => setStatusError(safeMessage(error)),
  });

  const addNoteMutation = useMutation({
    mutationFn: (text: string) => addLeadNote(validId as string, text),
    onSuccess: () => {
      setNoteError(null);
      invalidate();
    },
    onError: (error) => setNoteError(safeMessage(error)),
  });

  const editNoteMutation = useMutation({
    mutationFn: (input: { noteId: string; text: string }) =>
      updateLeadNote(input.noteId, input.text),
    onSuccess: () => {
      setNoteError(null);
      invalidate();
    },
    onError: (error) => setNoteError(safeMessage(error)),
  });

  if (!validId) {
    return (
      <AdminLayout title="Lead">
        <Notice title="Lead not found" body="That link does not point at a valid lead." />
      </AdminLayout>
    );
  }

  if (detailQuery.isPending) {
    return (
      <AdminLayout title="Lead">
        <div className="mx-auto max-w-5xl space-y-4" role="status" aria-live="polite">
          <span className="sr-only">Loading lead…</span>
          <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-800" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-2xl bg-gray-900" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    const notFound = detailQuery.error instanceof AdminDataError && detailQuery.error.code === 'not_found';
    return (
      <AdminLayout title="Lead">
        <Notice
          title={notFound ? 'Lead not found' : 'Could not load this lead'}
          body={notFound ? 'It may have been removed.' : safeMessage(detailQuery.error)}
          onRetry={notFound ? undefined : () => void detailQuery.refetch()}
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={detailQuery.data.lead.reference_code}>
      {statusMutation.isPending || addNoteMutation.isPending || editNoteMutation.isPending ? (
        <span className="sr-only" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Saving changes…
        </span>
      ) : null}
      <LeadDetailView
        detail={detailQuery.data}
        currentUserId={userId}
        statusSaving={statusMutation.isPending}
        statusError={statusError}
        noteSaving={addNoteMutation.isPending || editNoteMutation.isPending}
        noteError={noteError}
        onStatusChange={(status) => statusMutation.mutate(status)}
        onAddNote={(text) => {
          const problem = validateNote(text);
          if (problem) {
            setNoteError(problem);
            return;
          }
          if (!userId) {
            setNoteError('Your session expired. Please sign in again.');
            return;
          }
          addNoteMutation.mutate(text);
        }}
        onUpdateNote={(noteId, text) => {
          const problem = validateNote(text);
          if (problem) {
            setNoteError(problem);
            return;
          }
          editNoteMutation.mutate({ noteId, text });
        }}
      />
    </AdminLayout>
  );
};

export default AdminLeadDetail;
