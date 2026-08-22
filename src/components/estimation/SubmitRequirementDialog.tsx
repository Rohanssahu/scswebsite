// Review-and-confirm dialog used on the analysis result page for both
// "Submit requirement to SCS" and "Request Human Review". Nothing is sent
// while the visitor answers questions — submission happens only on the
// explicit confirm action here, through the submit-lead Edge Function.
//
// English copy matches the (non-i18n'ed) analysis pages it lives on.

import React, { useRef, useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TurnstileWidget, { TurnstileWidgetHandle } from '@/components/forms/TurnstileWidget';
import HoneypotField from '@/components/forms/HoneypotField';
import { isLeadCaptureReady } from '@/services/supabaseClient';
import {
  buildHumanReviewRequest,
  buildRequirementRequest,
  submitLead,
  LeadSubmissionError,
} from '@/services/leadService';
import { trackConversion } from '@/utils/conversionAnalytics';
import { validateEmail, validateName, validatePhone, validateReviewMessage } from '@/lib/leadValidation';
import { estimatedWeeks, totalCost, totalHours } from '@/data/basicEstimate';
import type { AnalysisResult, AnswerMap } from '@/types/projectAnalysis';

export type SubmitVariant = 'project_requirement' | 'human_review';

interface SubmitRequirementDialogProps {
  variant: SubmitVariant;
  open: boolean;
  onClose: () => void;
  result: AnalysisResult;
  answers: AnswerMap;
}

const inputClass =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200';
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700';
const errorClass = 'mt-1 text-sm text-red-600';

const SubmitRequirementDialog = ({ variant, open, onClose, result, answers }: SubmitRequirementDialogProps) => {
  const { i18n } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ referenceCode: string; reviewStatus?: string } | null>(null);

  if (!open) return null;

  const isReview = variant === 'human_review';
  const title = isReview ? 'Request a human review' : 'Submit your requirement to SCS Softwares';

  const errorText: Record<string, string> = {
    'leadForm.errors.name': 'Please enter your name (2–100 characters).',
    'leadForm.errors.email': 'Please enter a valid email address.',
    'leadForm.errors.phone': 'Please enter a valid phone number (7–15 digits).',
    'leadForm.errors.phoneRequired': 'A phone/WhatsApp number is required for a human review.',
    'leadForm.errors.messageLong': 'Please shorten your message (max 2000 characters).',
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return; // duplicate-click guard
    setSubmitError(null);

    const nextErrors: Record<string, string> = {};
    const nameErr = validateName(name);
    if (nameErr) nextErrors.name = nameErr;
    const emailErr = validateEmail(email);
    if (emailErr) nextErrors.email = emailErr;
    const phoneErr = validatePhone(phone, isReview);
    if (phoneErr) nextErrors.phone = phoneErr;
    if (isReview) {
      const msgErr = validateReviewMessage(message);
      if (msgErr) nextErrors.message = msgErr;
    }
    if (!consent) nextErrors.consent = 'consent';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!isLeadCaptureReady) {
      setSubmitError('Online submission is temporarily unavailable. Please use the contact page or WhatsApp instead.');
      return;
    }
    if (!turnstileToken) {
      setSubmitError('Please complete the human verification check before submitting.');
      return;
    }

    setLoading(true);
    try {
      const input = {
        contact: { name, email, phone: phone || undefined },
        mode: result.mode,
        answers,
        result,
        reviewMessage: message || undefined,
      };
      const context = { route: '/project-analysis/result', language: i18n.language };
      const request = isReview
        ? buildHumanReviewRequest(input, turnstileToken, context, honeypot)
        : buildRequirementRequest(input, turnstileToken, context, honeypot);
      const res = await submitLead(request);
      trackConversion(isReview ? 'human_review_requested' : 'requirement_submitted', isReview ? 'review' : 'requirement');
      setSuccess({ referenceCode: res.referenceCode, reviewStatus: res.reviewStatus });
    } catch (err) {
      setSubmitError(
        err instanceof LeadSubmissionError
          ? err.message
          : 'Something went wrong while submitting. Please try again.',
      );
    } finally {
      turnstileRef.current?.reset();
      setTurnstileToken(null);
      setLoading(false);
    }
  };

  const hours = totalHours(result.team);
  const cost = totalCost(result.team);
  const weeks = estimatedWeeks(result.team, result.weeklyCapacityHours);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {success ? (
            <div className="py-6 text-center" role="status">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-bold text-gray-900">
                Your requirement has been securely submitted to SCS Softwares.
              </h3>
              <p className="mt-3 text-sm text-gray-600">
                Reference ID:{' '}
                <span className="font-mono font-semibold text-gray-900">{success.referenceCode}</span>
              </p>
              {isReview && (
                <p className="mt-2 text-sm text-gray-600">
                  Human review status: <span className="font-semibold text-amber-700">requested</span>
                </p>
              )}
              <p className="mt-4 text-xs text-gray-500">
                This confirms we received your submission — it is not a project approval or a final
                quotation. Our team will get back to you.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-8 py-2.5 text-sm font-semibold text-white"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <HoneypotField value={honeypot} onChange={setHoneypot} />

              {/* Step 1 — review what will be sent */}
              <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-900">Requirement summary (demo estimate)</h3>
                <p className="mt-1 text-xs text-gray-500">
                  {result.mode === 'new' ? 'New project' : 'Existing project'} · ≈ {hours} h · $
                  {cost.toLocaleString()} · ≈ {weeks} week{weeks > 1 ? 's' : ''} — preliminary demo
                  estimate, not a final quotation.
                </p>
                <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-xs text-gray-700">
                  {result.requirementSummary.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </section>

              {/* Step 2 — confirm contact info */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="req-name" className={labelClass}>Full name *</label>
                  <input
                    id="req-name"
                    type="text"
                    className={inputClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'req-name-error' : undefined}
                  />
                  {errors.name && <p id="req-name-error" role="alert" className={errorClass}>{errorText[errors.name]}</p>}
                </div>
                <div>
                  <label htmlFor="req-email" className={labelClass}>Email *</label>
                  <input
                    id="req-email"
                    type="email"
                    className={inputClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'req-email-error' : undefined}
                  />
                  {errors.email && <p id="req-email-error" role="alert" className={errorClass}>{errorText[errors.email]}</p>}
                </div>
              </div>
              <div>
                <label htmlFor="req-phone" className={labelClass}>
                  Phone / WhatsApp {isReview ? '*' : '(optional)'}
                </label>
                <input
                  id="req-phone"
                  type="tel"
                  className={inputClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? 'req-phone-error' : undefined}
                />
                {errors.phone && <p id="req-phone-error" role="alert" className={errorClass}>{errorText[errors.phone]}</p>}
              </div>

              {/* Step 3 — optional message (human review only) */}
              {isReview && (
                <div>
                  <label htmlFor="req-message" className={labelClass}>Message for our team (optional)</label>
                  <textarea
                    id="req-message"
                    rows={3}
                    className={inputClass}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Anything specific you want a human expert to look at?"
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={errors.message ? 'req-message-error' : undefined}
                  />
                  {errors.message && <p id="req-message-error" role="alert" className={errorClass}>{errorText[errors.message]}</p>}
                </div>
              )}

              {/* Step 4 — consent + verification + explicit confirm */}
              <div>
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    aria-invalid={Boolean(errors.consent)}
                    aria-describedby={errors.consent ? 'req-consent-error' : undefined}
                  />
                  I agree that SCS Softwares stores my contact details and this requirement to
                  respond to my request.
                </label>
                {errors.consent && (
                  <p id="req-consent-error" role="alert" className={errorClass}>
                    Please accept the consent checkbox to continue.
                  </p>
                )}
              </div>

              {isLeadCaptureReady ? (
                <TurnstileWidget ref={turnstileRef} onToken={setTurnstileToken} key={i18n.language} />
              ) : (
                <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Online submission is temporarily unavailable. Please use the contact page or WhatsApp instead.
                </p>
              )}

              {submitError && (
                <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !isLeadCaptureReady}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Submitting…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    {isReview ? 'Confirm & request human review' : 'Confirm & submit securely'}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmitRequirementDialog;
