// =============================================================================
// ConsultationScheduler — the AI-consultation scheduling flow rendered inside
// the existing /schedule-call route (no duplicate CTA is introduced).
//
// Prefilled with the project-analysis context from localStorage when present;
// without it the client can still book a general consultation and the UI says
// clearly that no analysis is attached.
// =============================================================================

import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileWarning,
  Loader2,
  Sparkles,
  UserCheck,
  Video,
} from 'lucide-react';
import HoneypotField from '@/components/forms/HoneypotField';
import TurnstileWidget, { type TurnstileWidgetHandle } from '@/components/forms/TurnstileWidget';
import { loadDraft, loadResult } from '@/lib/analysisStore';
import { isLeadCaptureReady } from '@/services/supabaseClient';
import {
  buildAnalysisSnapshot,
  buildGoogleCalendarUrl,
  buildIcsFile,
  detectTimezone,
  formatInTimezone,
  localToUtcIso,
  saveAccessToken,
  CONSULTATION_LANGUAGES,
  type MeetingView,
} from '@/services/consultationCore';
import { ConsultationError, createMeeting } from '@/services/consultationService';
import { trackConsultation } from '@/utils/consultationAnalytics';

type MeetingChoice = 'now' | 'later' | 'human_followup';

const SLOT_TIMES = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00', '18:30'];

const inputCls =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:outline-none';

interface DayOption {
  iso: string;
  weekday: string;
  day: number;
  month: string;
}

function nextDays(count: number, locale: string): DayOption[] {
  const days: DayOption[] = [];
  const d = new Date();
  while (days.length < count) {
    d.setDate(d.getDate() + 1);
    days.push({
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d),
      day: d.getDate(),
      month: new Intl.DateTimeFormat(locale, { month: 'short' }).format(d),
    });
  }
  return days;
}

const ConsultationScheduler: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const turnstileRef = React.useRef<TurnstileWidgetHandle>(null);

  const analysis = useMemo(loadResult, []);
  const draftAnswers = useMemo(() => loadDraft().answers, []);
  const snapshot = useMemo(
    () => (analysis ? buildAnalysisSnapshot(analysis, draftAnswers) : null),
    [analysis, draftAnswers],
  );

  const timezone = useMemo(detectTimezone, []);
  const days = useMemo(() => nextDays(14, i18n.language), [i18n.language]);

  const [choice, setChoice] = useState<MeetingChoice>('now');
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    language: 'en',
    consent: false,
    transcriptConsent: false,
  });
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ meeting: MeetingView; accessToken: string } | null>(null);

  const isScheduled = choice === 'later';

  const set = (key: 'name' | 'email' | 'phone' | 'company') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = t('meeting.schedule.errName');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) errs.email = t('meeting.schedule.errEmail');
    if (form.phone.trim() && !/^\+?[\d\s().-]{7,20}$/.test(form.phone.trim())) {
      errs.phone = t('meeting.schedule.errPhone');
    }
    if (isScheduled && !date) errs.date = t('meeting.schedule.errDate');
    if (isScheduled && !time) errs.time = t('meeting.schedule.errTime');
    if (!form.consent) errs.consent = t('meeting.schedule.errConsent');
    if (!turnstileToken) errs.turnstile = t('meeting.schedule.errTurnstile');
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    let scheduledAtUtc: string | undefined;
    if (isScheduled && date && time) {
      const utc = localToUtcIso(date, time, timezone);
      if (!utc) {
        setErrors({ date: t('meeting.schedule.errDate') });
        return;
      }
      scheduledAtUtc = utc;
    }

    setSubmitting(true);
    trackConsultation('consultation_schedule_started', {
      kind: isScheduled ? 'scheduled' : 'instant',
      hasAnalysis: Boolean(snapshot),
    });
    try {
      const result = await createMeeting({
        turnstileToken: turnstileToken as string,
        honeypot,
        meetingKind: isScheduled ? 'scheduled' : 'instant',
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        ...(form.company.trim() ? { company: form.company.trim() } : {}),
        clientTimezone: timezone,
        ...(scheduledAtUtc ? { scheduledAtUtc } : {}),
        preferredLanguage: form.language,
        transcriptConsent: form.transcriptConsent,
        analysisSnapshot: snapshot,
      });
      saveAccessToken(sessionStorage, result.meeting.reference, result.accessToken);
      trackConsultation('consultation_scheduled', {
        kind: isScheduled ? 'scheduled' : 'instant',
        hasAnalysis: Boolean(snapshot),
      });
      if (choice === 'human_followup') {
        // A human follow-up is a REQUEST attached to the AI consultation — it
        // is never presented as a confirmed employee meeting.
        setCreated(result);
      } else if (choice === 'now') {
        navigate(`/ai-consultation/${result.meeting.reference}`);
        return;
      } else {
        setCreated(result);
      }
      window.scrollTo({ top: 0 });
    } catch (err) {
      const code = err instanceof ConsultationError ? err.code : 'network';
      trackConsultation('consultation_failed', {
        category:
          code === 'turnstile_failed'
            ? 'verification_failed'
            : code === 'rate_limited'
              ? 'rate_limited'
              : code === 'consultation_disabled'
                ? 'service_unavailable'
                : 'unknown',
      });
      setErrors({ submit: t(`meeting.errors.${code}`, { defaultValue: t('meeting.errors.network') }) });
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- confirmation view --------------------------------------------------
  if (created) {
    const meeting = created.meeting;
    const joinUrl = `${window.location.origin}/ai-consultation/${meeting.reference}`;
    const calendarInput = meeting.scheduledAtUtc
      ? { reference: meeting.reference, scheduledAtUtc: meeting.scheduledAtUtc, durationMinutes: 30, joinUrl }
      : null;

    const downloadIcs = () => {
      if (!calendarInput) return;
      const blob = new Blob([buildIcsFile(calendarInput)], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scs-ai-consultation-${meeting.reference}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="glow-card rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" aria-hidden="true" />
        <h2 className="mt-4 text-center text-2xl font-bold">{t('meeting.schedule.confirmedTitle')}</h2>
        <p className="mt-2 text-center text-gray-600">
          {t('meeting.schedule.reference')}{' '}
          <span className="font-mono font-semibold text-gray-900">{meeting.reference}</span>
        </p>

        {meeting.scheduledAtUtc && (
          <p className="mt-3 text-center text-sm text-gray-700">
            {formatInTimezone(meeting.scheduledAtUtc, meeting.clientTimezone ?? timezone, i18n.language)}
            <span className="ms-1 text-gray-500">({meeting.clientTimezone ?? timezone})</span>
          </p>
        )}

        <p className="mx-auto mt-4 max-w-md rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
          {choice === 'human_followup'
            ? t('meeting.schedule.humanFollowupNote')
            : t('meeting.schedule.earlyJoinNote', { minutes: meeting.earlyJoinMinutes })}
        </p>

        <p className="mt-3 text-center text-xs text-gray-500">{t('meeting.schedule.saveLinkNote')}</p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to={`/ai-consultation/${meeting.reference}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <Video className="h-4 w-4" aria-hidden="true" /> {t('meeting.schedule.openLobby')}
          </Link>
          {calendarInput && (
            <>
              <button
                type="button"
                onClick={downloadIcs}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" /> {t('meeting.schedule.downloadIcs')}
              </button>
              <a
                href={buildGoogleCalendarUrl(calendarInput)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                <CalendarClock className="h-4 w-4" aria-hidden="true" /> {t('meeting.schedule.addGoogle')}
              </a>
            </>
          )}
        </div>
        {calendarInput && <p className="mt-3 text-center text-xs text-gray-500">{t('meeting.schedule.calendarNote')}</p>}
      </div>
    );
  }

  // ---- form view -----------------------------------------------------------
  if (!isLeadCaptureReady) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-800">
        {t('meeting.errors.consultation_disabled')}
      </div>
    );
  }

  const options: Array<{ value: MeetingChoice; icon: typeof Sparkles; title: string; desc: string }> = [
    { value: 'now', icon: Sparkles, title: t('meeting.schedule.optionNow'), desc: t('meeting.schedule.optionNowDesc') },
    { value: 'later', icon: Clock, title: t('meeting.schedule.optionLater'), desc: t('meeting.schedule.optionLaterDesc') },
    {
      value: 'human_followup',
      icon: UserCheck,
      title: t('meeting.schedule.optionHuman'),
      desc: t('meeting.schedule.optionHumanDesc'),
    },
  ];

  return (
    <form onSubmit={submit} data-guide-id="schedule-form" className="glow-card rounded-2xl border border-gray-200 bg-white p-5 sm:p-8">
      {/* analysis context */}
      {snapshot ? (
        <p className="flex gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t('meeting.schedule.analysisAttached')}
        </p>
      ) : (
        <p className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <FileWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t('meeting.schedule.noAnalysis')}{' '}
          <Link to="/project-analysis" className="underline">
            {t('meeting.schedule.runAnalysis')}
          </Link>
        </p>
      )}

      {/* choice */}
      <fieldset className="mt-6">
        <legend className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t('meeting.schedule.chooseOption')}
        </legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {options.map((opt) => {
            const selected = choice === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setChoice(opt.value)}
                className={`flex min-h-11 flex-col items-start gap-1 rounded-xl border p-3 text-start transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                  selected ? 'border-pink-500 bg-pink-50' : 'border-gray-300 bg-white hover:border-pink-400'
                }`}
              >
                <opt.icon className="h-4 w-4 text-pink-600" aria-hidden="true" />
                <span className="text-sm font-semibold text-gray-900">{opt.title}</span>
                <span className="text-xs text-gray-600">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* date + time (scheduled only) */}
      {isScheduled && (
        <>
          <h3 className="mt-7 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            <CalendarDays className="h-4 w-4" aria-hidden="true" /> {t('meeting.schedule.selectDate')}
          </h3>
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
            {days.map((d) => {
              const selected = date === d.iso;
              return (
                <button
                  key={d.iso}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setDate(d.iso)}
                  className={`min-h-11 rounded-xl border px-2 py-2 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                    selected ? 'border-pink-500 bg-pink-50' : 'border-gray-300 bg-white hover:border-pink-400'
                  }`}
                >
                  <span className="block text-[11px] uppercase text-gray-500">{d.weekday}</span>
                  <span className="block text-lg font-semibold">{d.day}</span>
                  <span className="block text-[11px] text-gray-500">{d.month}</span>
                </button>
              );
            })}
          </div>
          {errors.date && <p role="alert" className="mt-2 text-sm text-rose-600">{errors.date}</p>}

          <h3 className="mt-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            <Clock className="h-4 w-4" aria-hidden="true" /> {t('meeting.schedule.selectTime')}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {SLOT_TIMES.map((s) => {
              const selected = time === s;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTime(s)}
                  className={`min-h-11 rounded-full border px-4 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                    selected ? 'border-pink-500 bg-pink-50' : 'border-gray-300 bg-white hover:border-pink-400'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-gray-500">{t('meeting.schedule.timezoneNote', { timezone })}</p>
          {errors.time && <p role="alert" className="mt-2 text-sm text-rose-600">{errors.time}</p>}
        </>
      )}

      {/* details */}
      <h3 className="mt-7 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {t('meeting.schedule.yourDetails')}
      </h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ac-name" className="mb-1 block text-sm text-gray-700">
            {t('meeting.schedule.name')}
          </label>
          <input id="ac-name" value={form.name} onChange={set('name')} autoComplete="name" className={inputCls} />
          {errors.name && <p role="alert" className="mt-1 text-xs text-rose-600">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="ac-email" className="mb-1 block text-sm text-gray-700">
            {t('meeting.schedule.email')}
          </label>
          <input id="ac-email" type="email" value={form.email} onChange={set('email')} autoComplete="email" className={inputCls} />
          {errors.email && <p role="alert" className="mt-1 text-xs text-rose-600">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="ac-phone" className="mb-1 block text-sm text-gray-700">
            {t('meeting.schedule.phone')}
          </label>
          <input id="ac-phone" value={form.phone} onChange={set('phone')} autoComplete="tel" className={inputCls} />
          {errors.phone && <p role="alert" className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
        </div>
        <div>
          <label htmlFor="ac-company" className="mb-1 block text-sm text-gray-700">
            {t('meeting.schedule.company')}
          </label>
          <input id="ac-company" value={form.company} onChange={set('company')} autoComplete="organization" className={inputCls} />
        </div>
        <div>
          <label htmlFor="ac-language" className="mb-1 block text-sm text-gray-700">
            {t('meeting.schedule.language')}
          </label>
          <select
            id="ac-language"
            value={form.language}
            onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
            className={inputCls}
          >
            {CONSULTATION_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {t(`meeting.languages.${code}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="mb-1 block text-sm text-gray-700">{t('meeting.schedule.timezone')}</span>
          <p className={`${inputCls} bg-gray-50 text-gray-600`}>{timezone}</p>
        </div>
      </div>

      {/* consent */}
      <div className="mt-6 space-y-3">
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
          />
          <span>{t('meeting.schedule.consent')}</span>
        </label>
        {errors.consent && <p role="alert" className="text-xs text-rose-600">{errors.consent}</p>}
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.transcriptConsent}
            onChange={(e) => setForm((f) => ({ ...f, transcriptConsent: e.target.checked }))}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
          />
          <span>{t('meeting.schedule.transcriptConsent')}</span>
        </label>
        <p className="text-xs text-gray-500">{t('meeting.schedule.privacyNote')}</p>
      </div>

      <HoneypotField value={honeypot} onChange={setHoneypot} />

      <div className="mt-5">
        <TurnstileWidget ref={turnstileRef} onToken={setTurnstileToken} />
        {errors.turnstile && <p role="alert" className="mt-1 text-xs text-rose-600">{errors.turnstile}</p>}
      </div>

      {errors.submit && (
        <p role="alert" className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errors.submit}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.01] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {choice === 'now' ? t('meeting.schedule.startNow') : t('meeting.schedule.confirm')}
      </button>
      <p className="mt-3 text-center text-xs text-gray-500">{t('meeting.schedule.aiDisclosure')}</p>
    </form>
  );
};

export default ConsultationScheduler;
