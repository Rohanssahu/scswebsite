// Route 3's body. Prop-driven so its markup (safe links, the preliminary
// label, the transcript consent gate) is directly testable.
//
// Two rules run through the whole file:
//   * show only what the database actually holds — no invented mappings, and an
//     honest empty state wherever a field was never captured;
//   * client-supplied text is rendered as text, and a client-supplied URL only
//     becomes an anchor after safeExternalUrl() accepts it as https.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  MessageSquare,
  Phone,
} from 'lucide-react';
import { StatusPill } from '@/components/admin/LeadsTable';
import {
  LEAD_STATUS_OPTIONS,
  NOTE_MAX_LENGTH,
  PRELIMINARY_ESTIMATE_DISCLAIMER,
  canEditNote,
  formatCostRange,
  formatDateTime,
  formatRange,
  jsonNumber,
  jsonString,
  jsonStringList,
  leadSourceLabel,
  leadStatusLabel,
  meetingStatusLabel,
  projectTypeLabel,
  resolveProjectMode,
  safeExternalUrl,
  statusNeedsConfirmation,
  telLink,
  toFieldRows,
  whatsAppLink,
} from '@/services/admin/adminLeadsCore';
import type { AdminLeadDetail, AdminNoteRow, LeadStatus } from '@/services/admin/adminTypes';

// --- small building blocks ----------------------------------------------------

const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-gray-800 bg-gray-900">
    <header className="border-b border-gray-800 px-4 py-3">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {description ? <p className="mt-0.5 text-xs text-gray-500">{description}</p> : null}
    </header>
    <div className="p-4">{children}</div>
  </section>
);

const Field = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className="min-w-0">
    <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
    <dd className="mt-0.5 break-words text-sm text-gray-200">{value?.trim() ? value : '—'}</dd>
  </div>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-gray-500">{children}</p>
);

const CopyButton = ({ value, label }: { value: string; label: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the value is still on screen to select */
    }
  };
  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-gray-700 px-2.5 text-xs font-medium text-gray-300 hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {copied ? 'Copied' : label}
    </button>
  );
};

/** Renders an anchor only for an accepted https URL; otherwise plain text. */
const SafeLink = ({ url, label }: { url: string | null; label?: string | null }) => {
  const safe = safeExternalUrl(url);
  if (!safe) {
    return (
      <span className="break-all text-sm text-gray-400">
        {label?.trim() || url?.trim() || '—'}
        {url?.trim() ? (
          <span className="ml-1 text-xs text-gray-600">(not a valid https link)</span>
        ) : null}
      </span>
    );
  }
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-start gap-1 break-all text-sm text-pink-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
    >
      {label?.trim() || safe}
      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
    </a>
  );
};

const PreliminaryBadge = () => (
  <p className="mt-3 flex items-start gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs text-purple-200">
    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    {PRELIMINARY_ESTIMATE_DISCLAIMER}
  </p>
);

// --- props --------------------------------------------------------------------

export interface LeadDetailViewProps {
  detail: AdminLeadDetail;
  currentUserId: string | null;
  statusSaving: boolean;
  statusError: string | null;
  noteSaving: boolean;
  noteError: string | null;
  onStatusChange: (status: LeadStatus) => void;
  onAddNote: (text: string) => void;
  onUpdateNote: (noteId: string, text: string) => void;
}

const LeadDetailView = ({
  detail,
  currentUserId,
  statusSaving,
  statusError,
  noteSaving,
  noteError,
  onStatusChange,
  onAddNote,
  onUpdateNote,
}: LeadDetailViewProps) => {
  const { lead, requirements, estimates, reviews, consultations, proposals, artifacts, transcript, notes } =
    detail;
  const requirement = requirements[0] ?? null;
  const meeting = consultations[0] ?? null;
  const proposal = proposals[0] ?? null;
  const estimate = estimates[0] ?? null;
  const review = reviews[0] ?? null;

  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const snapshot = meeting?.analysis_snapshot ?? null;
  const answerRows = toFieldRows(requirement?.answers);
  const agentStateRows = toFieldRows(meeting?.requirements);

  // Primary figures: a recomputed consultation proposal wins over a voice
  // estimate; both are server-computed, neither is a quotation.
  const costRange = proposal
    ? formatCostRange(proposal.total_cost_min, proposal.total_cost_max, proposal.currency)
    : estimate
      ? formatCostRange(estimate.total_cost_min, estimate.total_cost_max, estimate.currency)
      : null;
  const hoursRange = proposal
    ? formatRange(proposal.total_hours_min, proposal.total_hours_max, 'hours')
    : estimate
      ? formatRange(estimate.total_hours_min, estimate.total_hours_max, 'hours')
      : null;
  const weeksRange = proposal
    ? formatRange(proposal.duration_weeks_min, proposal.duration_weeks_max, 'weeks')
    : estimate
      ? formatRange(estimate.duration_weeks_min, estimate.duration_weeks_max, 'weeks')
      : null;
  const capacity = proposal ? `${proposal.weekly_capacity_hours} hours / week` : null;
  const confidence = proposal?.confidence ?? estimate?.confidence ?? null;
  const healthScore = jsonNumber(requirement?.demo_estimate, 'health_score');
  const teamRoles = [
    ...jsonStringList(proposal?.proposal, 'human_roles'),
    ...jsonStringList(proposal?.proposal, 'ai_roles'),
  ];
  const risks = [
    ...jsonStringList(proposal?.proposal, 'risks'),
    ...jsonStringList(meeting?.requirements, 'risks'),
  ];
  const missing = [
    ...jsonStringList(meeting?.requirements, 'deferred_decisions'),
    ...jsonStringList(meeting?.requirements, 'contradictions'),
    ...jsonStringList(snapshot, 'missingFeatures'),
  ];
  const analysisSource = jsonString(snapshot, 'source');

  const submitStatus = (value: string) => {
    if (!LEAD_STATUS_OPTIONS.includes(value as LeadStatus)) return;
    const next = value as LeadStatus;
    if (next === lead.status) return;
    if (statusNeedsConfirmation(next)) {
      const ok =
        typeof window === 'undefined' ||
        window.confirm(`Mark ${lead.reference_code} as “${leadStatusLabel(next)}”?`);
      if (!ok) return;
    }
    onStatusChange(next);
  };

  const startEdit = (note: AdminNoteRow) => {
    setEditingId(note.id);
    setEditingText(note.note);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin"
          className="inline-flex min-h-9 items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to leads
        </Link>
        <StatusPill status={lead.status} />
      </div>

      <div>
        <h1 className="font-mono text-lg font-semibold text-white">{lead.reference_code}</h1>
        <p className="mt-1 text-sm text-gray-400">
          {lead.name} · {leadSourceLabel(lead)} · {formatDateTime(lead.created_at)}
        </p>
      </div>

      {/* ---------------------------------------------------------------- client */}
      <Section title="Client">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Name" value={lead.name} />
          <Field label="Email" value={lead.email} />
          <Field label="Phone" value={lead.phone} />
          <Field label="Company" value={lead.company} />
          <Field label="Country" value={lead.country} />
          <Field label="Preferred contact" value={lead.preferred_contact_method} />
          <Field label="Reference code" value={lead.reference_code} />
          <Field label="Submission source" value={lead.source ?? leadSourceLabel(lead)} />
          <Field label="Submitted" value={formatDateTime(lead.created_at)} />
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <CopyButton value={lead.email} label="Copy email" />
          {lead.phone ? <CopyButton value={lead.phone} label="Copy phone" /> : null}
          <CopyButton value={lead.reference_code} label="Copy reference" />
          {telLink(lead.phone) ? (
            <a
              href={telLink(lead.phone) as string}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-gray-700 px-2.5 text-xs font-medium text-gray-300 hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              Call
            </a>
          ) : null}
          {whatsAppLink(lead.phone) ? (
            <a
              href={whatsAppLink(lead.phone) as string}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-700/60 bg-emerald-500/10 px-2.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            >
              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
              WhatsApp
            </a>
          ) : null}
        </div>
      </Section>

      {/* --------------------------------------------------------------- project */}
      <Section title="Project" description="Exactly what the client submitted.">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Project type" value={projectTypeLabel(resolveProjectMode(lead))} />
          <Field label="Service" value={lead.service} />
          <Field label="Budget" value={lead.budget_range ?? jsonString(meeting?.requirements, 'budget_range')} />
          <Field label="Timeline" value={lead.timeline ?? jsonString(meeting?.requirements, 'deadline')} />
          <Field label="Language" value={lead.preferred_language} />
        </dl>

        <div className="mt-4 space-y-3">
          <div>
            <h3 className="text-xs uppercase tracking-wide text-gray-500">Requirement summary</h3>
            {requirement?.requirement_summary || meeting?.requirement_summary || lead.project_summary ? (
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-200">
                {requirement?.requirement_summary ??
                  meeting?.requirement_summary ??
                  lead.project_summary}
              </p>
            ) : (
              <Empty>No requirement summary was captured for this lead.</Empty>
            )}
          </div>

          {answerRows.length > 0 ? (
            <div>
              <h3 className="text-xs uppercase tracking-wide text-gray-500">
                Project-analysis answers
              </h3>
              <dl className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {answerRows.map((row) => (
                  <Field key={row.key} label={row.label} value={row.value} />
                ))}
              </dl>
            </div>
          ) : null}

          {agentStateRows.length > 0 ? (
            <div>
              <h3 className="text-xs uppercase tracking-wide text-gray-500">
                Requirements captured in the consultation
              </h3>
              <dl className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {agentStateRows.map((row) => (
                  <Field key={row.key} label={row.label} value={row.value} />
                ))}
              </dl>
            </div>
          ) : null}

          <div>
            <h3 className="text-xs uppercase tracking-wide text-gray-500">Links and documents</h3>
            {artifacts.length === 0 ? (
              <Empty>The client did not share any links or documents.</Empty>
            ) : (
              <ul className="mt-2 space-y-2">
                {artifacts.map((artifact) => (
                  <li key={artifact.id} className="rounded-xl border border-gray-800 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      {artifact.kind.replace(/_/g, ' ')}
                      {artifact.host ? ` · ${artifact.host}` : ''}
                    </p>
                    {artifact.url ? (
                      <SafeLink url={artifact.url} label={artifact.label} />
                    ) : null}
                    {artifact.note ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-300">
                        {artifact.note}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      {/* --------------------------------------------------- analysis & estimate */}
      <Section
        title="Analysis and preliminary estimate"
        description="Server-computed from the client’s own answers."
      >
        {!proposal && !estimate && !requirement ? (
          <Empty>No analysis or estimate exists for this lead.</Empty>
        ) : (
          <>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label="Analysis source"
                value={
                  proposal
                    ? `AI consultation (proposal v${proposal.version})`
                    : estimate
                      ? 'Buddy voice session'
                      : analysisSource === 'ai'
                        ? 'AI project analysis'
                        : 'Website project analysis'
                }
              />
              <Field
                label="Analysis status"
                value={proposal?.status ?? estimate?.status ?? requirement?.status ?? null}
              />
              <Field
                label="Project health"
                value={healthScore === null ? null : `${healthScore} / 100`}
              />
              <Field label="Estimated hours" value={hoursRange} />
              <Field label="Estimated cost" value={costRange} />
              <Field label="Estimated duration" value={weeksRange} />
              <Field label="Weekly capacity" value={capacity} />
              <Field label="Confidence" value={confidence} />
              <Field
                label="Engine version"
                value={proposal?.config_version ?? estimate?.config_version ?? requirement?.estimate_version ?? null}
              />
            </dl>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-xs uppercase tracking-wide text-gray-500">Recommended team</h3>
                {teamRoles.length === 0 ? (
                  <Empty>No team recommendation was generated.</Empty>
                ) : (
                  <ul className="mt-1 list-inside list-disc text-sm text-gray-200">
                    {teamRoles.map((role, index) => (
                      <li key={`${role}-${index}`}>{role}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wide text-gray-500">
                  Risks and missing requirements
                </h3>
                {risks.length === 0 && missing.length === 0 ? (
                  <Empty>No risks or gaps were recorded.</Empty>
                ) : (
                  <ul className="mt-1 list-inside list-disc text-sm text-gray-200">
                    {[...risks, ...missing].map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <PreliminaryBadge />
          </>
        )}
      </Section>

      {/* ---------------------------------------------------------- consultation */}
      <Section title="Consultation">
        {!meeting ? (
          <Empty>This lead did not come from an AI consultation meeting.</Empty>
        ) : (
          <>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Meeting reference" value={meeting.public_reference} />
              <Field label="Meeting status" value={meetingStatusLabel(meeting.status)} />
              <Field label="Kind" value={meeting.meeting_kind === 'scheduled' ? 'Scheduled' : 'Instant'} />
              <Field label="Scheduled" value={formatDateTime(meeting.scheduled_at)} />
              <Field label="Started" value={formatDateTime(meeting.started_at)} />
              <Field label="Ended" value={formatDateTime(meeting.ended_at)} />
              <Field label="Client timezone" value={meeting.client_timezone} />
              <Field label="Joins" value={String(meeting.join_count)} />
              <Field
                label="Transcript consent"
                value={meeting.transcript_consent ? 'Given' : 'Not given'}
              />
            </dl>

            <div className="mt-4">
              <h3 className="text-xs uppercase tracking-wide text-gray-500">Conversation summary</h3>
              {meeting.requirement_summary ? (
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-200">
                  {meeting.requirement_summary}
                </p>
              ) : (
                <Empty>No conversation summary was saved for this meeting.</Empty>
              )}
            </div>

            <div className="mt-4">
              <h3 className="text-xs uppercase tracking-wide text-gray-500">Transcript</h3>
              {!meeting.transcript_consent ? (
                <Empty>
                  The client did not consent to transcript storage, so no transcript exists.
                </Empty>
              ) : transcript.length === 0 ? (
                <Empty>Consent was given, but no transcript lines were recorded.</Empty>
              ) : (
                <ol className="mt-2 max-h-96 space-y-2 overflow-y-auto pr-1">
                  {transcript.map((line) => (
                    <li key={line.id} className="rounded-xl border border-gray-800 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">
                        {line.sender === 'buddy' ? 'Buddy' : line.sender === 'client' ? 'Client' : 'System'}
                        {' · '}
                        {formatDateTime(line.created_at)}
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-200">
                        {line.content}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-2 text-xs text-gray-600">
                Audio is never stored — only text, and only with consent.
              </p>
            </div>
          </>
        )}
      </Section>

      {/* --------------------------------------------------------- human review */}
      <Section title="Human review">
        {!review && !lead.human_review_requested ? (
          <Empty>No human review was requested.</Empty>
        ) : (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Requested" value={lead.human_review_requested ? 'Yes' : 'No'} />
            <Field label="Review status" value={review?.status ?? lead.review_status ?? null} />
            <Field label="Assigned to" value={review?.assigned_to} />
            <Field label="Reviewed" value={formatDateTime(review?.reviewed_at)} />
            <Field label="Reason" value={review?.reason} />
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs uppercase tracking-wide text-gray-500">Client message</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm text-gray-200">
                {review?.visitor_message?.trim() || '—'}
              </dd>
            </div>
          </dl>
        )}
      </Section>

      {/* -------------------------------------------------------- owner actions */}
      <Section title="Owner actions" description="Status and internal notes only.">
        <div className="space-y-5">
          <div>
            <label htmlFor="lead-status-select" className="block text-xs uppercase tracking-wide text-gray-500">
              Lead status
            </label>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <select
                id="lead-status-select"
                value={LEAD_STATUS_OPTIONS.includes(lead.status as LeadStatus) ? lead.status : ''}
                disabled={statusSaving}
                onChange={(event) => submitStatus(event.target.value)}
                className="min-h-11 rounded-xl border border-gray-700 bg-gray-950 px-3 text-sm text-gray-200 disabled:opacity-60 focus:border-pink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                {!LEAD_STATUS_OPTIONS.includes(lead.status as LeadStatus) ? (
                  <option value="">{leadStatusLabel(lead.status)} (legacy)</option>
                ) : null}
                {LEAD_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {leadStatusLabel(status)}
                  </option>
                ))}
              </select>
              {statusSaving ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Saving…
                </span>
              ) : null}
            </div>
            {statusError ? (
              <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-orange-300">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {statusError}
              </p>
            ) : null}
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-wide text-gray-500">Internal notes</h3>
            <p className="mt-0.5 text-xs text-gray-600">
              Staff-only. Never shown to the client and never merged into their submission.
            </p>

            {notes.length === 0 ? (
              <Empty>No internal notes yet.</Empty>
            ) : (
              <ul className="mt-3 space-y-2">
                {notes.map((note) => (
                  <li key={note.id} className="rounded-xl border border-gray-800 p-3">
                    {editingId === note.id ? (
                      <>
                        <label htmlFor={`note-edit-${note.id}`} className="sr-only">
                          Edit note
                        </label>
                        <textarea
                          id={`note-edit-${note.id}`}
                          value={editingText}
                          maxLength={NOTE_MAX_LENGTH}
                          onChange={(event) => setEditingText(event.target.value)}
                          rows={3}
                          className="w-full rounded-xl border border-gray-700 bg-gray-950 p-2 text-sm text-gray-200 focus:border-pink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            disabled={noteSaving}
                            onClick={() => {
                              onUpdateNote(note.id, editingText);
                              setEditingId(null);
                            }}
                            className="inline-flex min-h-9 items-center rounded-lg bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-3 text-xs font-semibold text-white disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                          >
                            Save note
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex min-h-9 items-center rounded-lg border border-gray-700 px-3 text-xs font-medium text-gray-300 hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap text-sm text-gray-200">{note.note}</p>
                        <p className="mt-1 text-[11px] text-gray-500">
                          {formatDateTime(note.created_at)}
                          {note.updated_at !== note.created_at
                            ? ` · edited ${formatDateTime(note.updated_at)}`
                            : ''}
                        </p>
                        {canEditNote(note, currentUserId) ? (
                          <button
                            type="button"
                            onClick={() => startEdit(note)}
                            className="mt-2 text-xs text-pink-400 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                          >
                            Edit
                          </button>
                        ) : null}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3">
              <label htmlFor="new-note" className="sr-only">
                Add an internal note
              </label>
              <textarea
                id="new-note"
                value={newNote}
                rows={3}
                maxLength={NOTE_MAX_LENGTH}
                placeholder="Add an internal note…"
                onChange={(event) => setNewNote(event.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-gray-950 p-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-pink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              />
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  disabled={noteSaving || !newNote.trim()}
                  onClick={() => {
                    onAddNote(newNote);
                    setNewNote('');
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                >
                  {noteSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  Add note
                </button>
                <span className="text-xs text-gray-600">
                  {newNote.length}/{NOTE_MAX_LENGTH}
                </span>
              </div>
              {noteError ? (
                <p role="alert" className="mt-2 text-xs text-orange-300">
                  {noteError}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default LeadDetailView;
