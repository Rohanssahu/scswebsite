// =============================================================================
// voice-lead — pure email builders (Resend payloads).
//
// Recipients are STRUCTURALLY restricted: the client email always comes from
// the validated lead record and the admin email always comes from the
// server-side LEAD_ADMIN_EMAIL configuration. There is no code path by which
// visitor speech, model output or request fields can choose a recipient.
//
// Dependency-free so vitest unit-tests the exact code the function runs.
// =============================================================================

import type { ValidatedVoiceEstimate, ValidatedVoiceSubmission } from './validation.ts';

export interface EmailPayload {
  from: string;
  to: [string]; // exactly one recipient per message, by construction
  subject: string;
  text: string;
}

const esc = (v: string): string => v.replace(/[\r\n]+/g, ' ').trim();

function money(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}

export function formatEstimateLines(estimate: ValidatedVoiceEstimate): string[] {
  return [
    `Estimated effort: ${estimate.total_hours_min}–${estimate.total_hours_max} hours`,
    `Estimated cost range: ${money(estimate.total_cost_min)}–${money(estimate.total_cost_max)} USD`,
    `Estimated duration: ${estimate.duration_weeks_min}–${estimate.duration_weeks_max} weeks (at ${estimate.weekly_capacity_hours} hours/week)`,
    `Confidence: ${estimate.confidence}`,
  ];
}

export interface NotificationInput {
  submission: ValidatedVoiceSubmission;
  referenceCode: string;
  fromAddress: string;
  adminEmail: string;
  siteUrl: string;
}

/** Thank-you email to the visitor. Recipient = the validated lead email. */
export function buildClientEmail(input: NotificationInput): EmailPayload {
  const { submission, referenceCode, fromAddress, siteUrl } = input;
  const e = submission.estimate;
  const lines = [
    `Hi ${esc(submission.lead.name)},`,
    '',
    'Thank you for talking with Buddy, the SCS Softwares IT Manager assistant.',
    '',
    `Your reference code: ${referenceCode}`,
    '',
    'What you told us:',
    submission.requirement.requirement_summary,
    '',
    'Preliminary estimate:',
    ...formatEstimateLines(e),
    '',
    ...(e.assumptions.length ? ['Assumptions:', ...e.assumptions.map((a) => `- ${a}`), ''] : []),
    ...(e.exclusions.length ? ['Not included:', ...e.exclusions.map((x) => `- ${x}`), ''] : []),
    'IMPORTANT: This is a preliminary estimate, not a final quotation. An SCS',
    'Softwares consultant will review your requirements and confirm the final',
    'scope, cost and timeline with you.',
    '',
    `Review or schedule a call: ${siteUrl}/schedule-call`,
    '',
    'Warm regards,',
    'SCS Softwares',
  ];
  return {
    from: fromAddress,
    to: [submission.lead.email],
    subject: `SCS Softwares — your preliminary estimate (${referenceCode})`,
    text: lines.join('\n'),
  };
}

/** Internal notification. Recipient = configured LEAD_ADMIN_EMAIL only. */
export function buildAdminEmail(input: NotificationInput): EmailPayload {
  const { submission, referenceCode, fromAddress, adminEmail, siteUrl } = input;
  const e = submission.estimate;
  const lead = submission.lead;
  const lines = [
    `New Buddy voice lead: ${referenceCode}`,
    '',
    `Name: ${esc(lead.name)}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone}`,
    `Company: ${lead.company ?? '—'}`,
    `Preferred contact: ${lead.preferred_contact_method}`,
    `Language: ${lead.preferred_language ?? '—'}`,
    `Mode: ${lead.project_mode} / intent: ${submission.requirement.answers.intent ?? '—'}`,
    `Human review requested: ${lead.human_review_requested ? 'YES' : 'no'}`,
    '',
    'Requirement summary:',
    submission.requirement.requirement_summary,
    '',
    'Preliminary estimate:',
    ...formatEstimateLines(e),
    ...(e.risks.length ? ['', 'Risks:', ...e.risks.map((r) => `- ${r}`)] : []),
    '',
    `Requested next action: ${lead.human_review_requested ? 'human review of the preliminary estimate' : 'follow-up contact'}`,
    '',
    `Review the record: Supabase → leads / preliminary_estimates, reference ${referenceCode}.`,
    `Site: ${siteUrl}`,
  ];
  return {
    from: fromAddress,
    to: [adminEmail],
    subject: `[Buddy lead] ${referenceCode} — ${esc(lead.name)}${lead.human_review_requested ? ' (review requested)' : ''}`,
    text: lines.join('\n'),
  };
}
