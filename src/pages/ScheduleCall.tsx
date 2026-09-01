import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Clock, CheckCircle2, Video, Phone, MessageCircle, Bot, Loader2 } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ConsultationScheduler from '@/components/consultation/ConsultationScheduler';
import TurnstileWidget, { TurnstileWidgetHandle } from '../components/forms/TurnstileWidget';
import HoneypotField from '../components/forms/HoneypotField';
import { validateConsultationForm, FieldErrors } from '@/lib/leadValidation';
import { buildConsultationRequest, submitLead, LeadSubmissionError } from '@/services/leadService';
import { isLeadCaptureReady } from '@/services/supabaseClient';
import { saveBooking } from '@/lib/analysisStore';
import { formatDate } from '@/i18n/languageConfig';
import type { DemoBooking } from '@/types/projectAnalysis';
import type { LeadProjectMode, PreferredContactMethod } from '@/types/leads';

// Single consultation page: booking a free call and sending project details are
// one flow here (they used to be two pages, /schedule-call and
// /consultation-form, which visitors read as two different things). The slot
// choice travels with the consultation lead, so one submit does both.

const SLOTS = ['10:00 AM', '11:30 AM', '2:00 PM', '3:30 PM', '5:00 PM', '6:30 PM'];

// The meeting channel doubles as the lead's preferred contact method, so we
// don't ask the visitor the same thing twice.
const MEETING_OPTIONS: Array<{ value: string; icon: typeof Video; contactMethod: PreferredContactMethod }> = [
  { value: 'Google Meet', icon: Video, contactMethod: 'email' },
  { value: 'Phone call', icon: Phone, contactMethod: 'phone' },
  { value: 'WhatsApp', icon: MessageCircle, contactMethod: 'whatsapp' },
];

const SERVICES = [
  'web-development',
  'mobile-development',
  'digital-marketing',
  'ui-ux-design',
  'cloud-solutions',
  'devops-services',
] as const;

// Step 1 of the flow: which kind of meeting. Titles reuse the old tab strings.
const MODE_OPTIONS: Array<{ value: 'ai' | 'human'; icon: typeof Video; titleKey: string; descKey: string }> = [
  { value: 'ai', icon: Bot, titleKey: 'meeting.schedule.tabAi', descKey: 'meeting.schedule.tabAiDesc' },
  { value: 'human', icon: CalendarDays, titleKey: 'meeting.schedule.tabHuman', descKey: 'meeting.schedule.tabHumanDesc' },
];

// The AI flow previews its next steps greyed out on step 1; the human-call form
// is a single page, so it has nothing to preview.
const MODE_STEP_TITLES: Record<'ai' | 'human', string[]> = {
  ai: ['meeting.schedule.chooseOption', 'meeting.schedule.yourDetails', 'meeting.schedule.stepConfirm'],
  human: [],
};

const BUDGET_RANGES = ['Under $1,000', '$1,000 – $5,000', '$5,000 – $15,000', '$15,000 – $50,000', '$50,000+'];
const TIMELINES = ['ASAP', 'Within 1 month', '1–3 months', '3–6 months', 'Flexible'];

interface DayOption {
  iso: string;
  weekday: string;
  day: number;
  month: string;
}

function nextDays(count: number, language: string): DayOption[] {
  const days: DayOption[] = [];
  const d = new Date();
  while (days.length < count) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) continue; // closed on Sundays
    days.push({
      iso: d.toISOString().slice(0, 10),
      weekday: formatDate(d, language, { weekday: 'short' }),
      day: d.getDate(),
      month: formatDate(d, language, { month: 'short' }),
    });
  }
  return days;
}

/** Canonical meeting value → translation slug ('Google Meet' → 'google-meet'). */
function meetingSlug(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-');
}

/** Deterministic dummy availability: a couple of slots per day are "taken". */
function isSlotAvailable(dateIso: string, slotIndex: number): boolean {
  const daySeed = parseInt(dateIso.replace(/-/g, ''), 10);
  return (daySeed + slotIndex) % 4 !== 0;
}

const inputCls =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:outline-none';
const labelCls = 'mb-1 block text-sm text-gray-700';
const errorCls = 'mt-1 text-xs text-rose-600';
const sectionCls = 'flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  company: '',
  projectMode: '',
  service: '',
  budgetRange: '',
  timeline: '',
  meetingPreference: 'Google Meet',
  requirement: '',
  consent: false,
};

type FormState = typeof emptyForm;

const ScheduleCall = () => {
  const { t, i18n } = useTranslation();
  const days = useMemo(() => nextDays(12, i18n.language), [i18n.language]);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ booking: DemoBooking; referenceCode: string } | null>(null);
  // Every CTA promises a meeting that starts now, so the instant AI
  // consultation is what opens; a human call stays one tab away for whoever
  // wants a person instead.
  const [mode, setMode] = useState<'ai' | 'human'>('ai');
  // Meeting type is step 1 of one continuous flow; the chosen flow's own steps
  // continue from there, so nothing on this page needs scrolling to reach.
  const [modeChosen, setModeChosen] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const fieldError = (key: string) => (errors[key] ? t(errors[key]) : null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return; // duplicate-click guard
    setSubmitError(null);

    const meeting = MEETING_OPTIONS.find((o) => o.value === form.meetingPreference) ?? MEETING_OPTIONS[0];
    const nextErrors: FieldErrors = {
      ...validateConsultationForm({ ...form, contactMethod: meeting.contactMethod }),
    };
    if (!date) nextErrors.date = 'schedule.errDate';
    if (!slot) nextErrors.slot = 'schedule.errSlot';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!isLeadCaptureReady) {
      setSubmitError(t('leadForm.unavailable'));
      return;
    }
    if (!turnstileToken) {
      setSubmitError(t('leadForm.turnstileRequired'));
      return;
    }

    setLoading(true);
    try {
      // The requested slot rides along in the project summary — the lead wire
      // format has no dedicated slot column, and the team reads this text.
      const requirement = `Preferred call: ${date} at ${slot} (${form.meetingPreference})\n\n${form.requirement.trim()}`;
      const request = buildConsultationRequest(
        {
          name: form.name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          projectMode: form.projectMode as LeadProjectMode,
          service: form.service,
          requirement,
          budgetRange: form.budgetRange,
          timeline: form.timeline,
          contactMethod: meeting.contactMethod,
        },
        turnstileToken,
        { route: '/schedule-call', language: i18n.language },
        honeypot,
      );
      const result = await submitLead(request);

      const booking: DemoBooking = {
        date: date as string,
        slot: slot as string,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        meetingPreference: form.meetingPreference,
        message: form.requirement.trim() || undefined,
      };
      saveBooking(booking);
      setConfirmed({ booking, referenceCode: result.referenceCode });
      setForm(emptyForm);
      setDate(null);
      setSlot(null);
      window.scrollTo({ top: 0 });
    } catch (err) {
      const message =
        err instanceof LeadSubmissionError
          ? err.code === 'rate_limited'
            ? t('leadForm.rateLimited')
            : err.code === 'turnstile_failed'
              ? t('leadForm.turnstileRequired')
              : err.code === 'not_configured'
                ? t('leadForm.unavailable')
                : err.message
          : t('leadForm.genericError');
      setSubmitError(message);
    } finally {
      // Tokens are single-use — always ask for a fresh check.
      turnstileRef.current?.reset();
      setTurnstileToken(null);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <main id="main-content">
      <main className="container mx-auto max-w-4xl px-4 py-8 sm:py-10">
        {confirmed ? (
          <div className="glow-card rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
              {t('schedule.confirmedTitle', { name: confirmed.booking.name })}
            </h1>
            <p className="mt-3 text-gray-600">
              {t('schedule.confirmedAt', {
                date: formatDate(new Date(confirmed.booking.date + 'T00:00:00'), i18n.language, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                }),
                slot: confirmed.booking.slot,
                meeting: t(`schedule.meetings.${meetingSlug(confirmed.booking.meetingPreference)}`),
              })}
            </p>
            <p className="mt-4 text-sm text-gray-500">
              {t('consultation.referenceLabel')}:{' '}
              <span className="font-mono font-semibold text-gray-900">{confirmed.referenceCode}</span>
            </p>
            <p className="mx-auto mt-5 max-w-md rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {t('schedule.confirmedNote')}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                to="/project-analysis"
                className="rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                {t('schedule.analyzeMeanwhile')}
              </Link>
              <Link
                to="/"
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                {t('common.backToHome')}
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* The visible title lives inside the step-1 card so the whole flow
                is one block that fits a screen; the page keeps an h1 for
                screen readers and search engines. */}
            <h1 className="sr-only">
              {t('schedule.title1')} {t('schedule.title2')}
            </h1>

            {/* Step 1 — instant AI consultation vs. a call with the team. Both
                live on this page; there is no second consultation page. */}
            {!modeChosen && (
              <div className="glow-card mt-4 flex flex-col rounded-2xl border border-gray-200 bg-white p-6 sm:h-[32rem] sm:p-8">
                <ol className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 text-xs">
                  {[t('meeting.schedule.stepMode'), ...MODE_STEP_TITLES[mode].map((k) => t(k))].map((title, i) => (
                    <li key={title} className="flex items-center gap-1">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-medium ${
                          i === 0 ? 'bg-pink-50 text-pink-700' : 'text-gray-400'
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                            i === 0 ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-600'
                          }`}
                          aria-hidden="true"
                        >
                          {i + 1}
                        </span>
                        <span className="hidden sm:inline">{title}</span>
                      </span>
                      {i === 0 && (
                        <span className="text-gray-300" aria-hidden="true">
                          ›
                        </span>
                      )}
                    </li>
                  ))}
                </ol>

                <div className="mt-6 text-center">
                  <p className="text-xl font-bold text-gray-900 sm:text-2xl">
                    {t('schedule.title1')} <span className="text-gradient-ai">{t('schedule.title2')}</span>
                  </p>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-gray-600">{t('schedule.sub')}</p>
                </div>

                <fieldset className="mt-6 flex-1">
                  <legend className="sr-only">{t('meeting.schedule.modeLabel')}</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {MODE_OPTIONS.map((opt) => {
                      const selected = mode === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setMode(opt.value)}
                          className={`flex min-h-11 flex-col items-start gap-1.5 rounded-xl border p-4 text-start transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                            selected ? 'border-pink-500 bg-pink-50' : 'border-gray-300 bg-white hover:border-pink-400'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <opt.icon className="h-4 w-4 text-pink-600" aria-hidden="true" />
                            <span className="text-sm font-semibold text-gray-900">{t(opt.titleKey)}</span>
                          </span>
                          <span className="text-xs text-gray-600">{t(opt.descKey)}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="mt-6 flex items-center justify-end border-t border-gray-100 pt-5">
                  <button
                    type="button"
                    onClick={() => setModeChosen(true)}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                  >
                    {t('meeting.schedule.stepNext')}
                  </button>
                </div>
                <p className="mt-3 text-center text-xs leading-relaxed text-gray-500">{t('meeting.schedule.aiDisclosure')}</p>
              </div>
            )}

            <div className={modeChosen && mode === 'ai' ? 'mt-4' : 'hidden'}>
              <ConsultationScheduler
                leadingStepTitle={t('meeting.schedule.stepMode')}
                onLeadingStep={() => setModeChosen(false)}
              />
            </div>

            <form
              data-guide-id="schedule-form"
              onSubmit={submit}
              noValidate
              className={`glow-card mt-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-8 ${
                modeChosen && mode === 'human' ? '' : 'hidden'
              }`}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <button
                  type="button"
                  onClick={() => setModeChosen(false)}
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:text-pink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] text-white"
                    aria-hidden="true"
                  >
                    1
                  </span>
                  {t('meeting.schedule.stepMode')}
                </button>
                <span className="text-xs font-medium text-gray-500">{t('meeting.schedule.tabHuman')}</span>
              </div>

              <HoneypotField value={honeypot} onChange={setHoneypot} />

              {!isLeadCaptureReady && (
                <p role="alert" className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {t('leadForm.unavailable')}
                </p>
              )}

              {/* 1 — Date */}
              <h2 className={sectionCls}>
                <CalendarDays className="h-4 w-4" aria-hidden="true" /> {t('schedule.selectDate')}
              </h2>
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {days.map((d) => {
                  const selected = date === d.iso;
                  return (
                    <button
                      key={d.iso}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setDate(d.iso);
                        setSlot(null);
                      }}
                      className={`rounded-xl border px-2 py-2.5 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                        selected
                          ? 'border-pink-500 bg-pink-50 text-gray-900'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-pink-400'
                      }`}
                    >
                      <span className="block text-[11px] uppercase text-gray-500">{d.weekday}</span>
                      <span className="block text-lg font-semibold">{d.day}</span>
                      <span className="block text-[11px] text-gray-500">{d.month}</span>
                    </button>
                  );
                })}
              </div>
              {fieldError('date') && <p role="alert" className="mt-2 text-sm text-rose-600">{fieldError('date')}</p>}

              {/* 2 — Slot */}
              <h2 className={`mt-8 ${sectionCls}`}>
                <Clock className="h-4 w-4" aria-hidden="true" /> {t('schedule.selectSlot')}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {SLOTS.map((s, i) => {
                  const available = date ? isSlotAvailable(date, i) : true;
                  const selected = slot === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={!date || !available}
                      aria-pressed={selected}
                      onClick={() => setSlot(s)}
                      className={`rounded-full border px-4 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                        selected
                          ? 'border-pink-500 bg-pink-50 text-gray-900'
                          : available
                            ? 'border-gray-300 bg-white text-gray-700 hover:border-pink-400 disabled:opacity-40'
                            : 'border-gray-200 bg-gray-100 text-gray-400 line-through'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-500">{date ? t('schedule.takenNote') : t('schedule.pickDateFirst')}</p>
              {fieldError('slot') && <p role="alert" className="mt-2 text-sm text-rose-600">{fieldError('slot')}</p>}

              {/* 3 — Your details */}
              <h2 className={`mt-8 ${sectionCls}`}>{t('schedule.yourDetails')}</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="sc-name" className={labelCls}>{t('schedule.name')}</label>
                  <input
                    id="sc-name"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    className={inputCls}
                    placeholder={t('schedule.namePlaceholder')}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'sc-name-error' : undefined}
                  />
                  {fieldError('name') && <p id="sc-name-error" role="alert" className={errorCls}>{fieldError('name')}</p>}
                </div>
                <div>
                  <label htmlFor="sc-email" className={labelCls}>{t('schedule.email')}</label>
                  <input
                    id="sc-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    className={inputCls}
                    placeholder={t('schedule.emailPlaceholder')}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'sc-email-error' : undefined}
                  />
                  {fieldError('email') && <p id="sc-email-error" role="alert" className={errorCls}>{fieldError('email')}</p>}
                </div>
                <div>
                  <label htmlFor="sc-phone" className={labelCls}>{t('schedule.phone')}</label>
                  <input
                    id="sc-phone"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    className={inputCls}
                    placeholder={t('schedule.phonePlaceholder')}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? 'sc-phone-error' : undefined}
                  />
                  {fieldError('phone') && <p id="sc-phone-error" role="alert" className={errorCls}>{fieldError('phone')}</p>}
                </div>
                <div>
                  <label htmlFor="sc-company" className={labelCls}>{t('consultation.company')}</label>
                  <input
                    id="sc-company"
                    value={form.company}
                    onChange={(e) => set('company', e.target.value)}
                    className={inputCls}
                    aria-invalid={Boolean(errors.company)}
                    aria-describedby={errors.company ? 'sc-company-error' : undefined}
                  />
                  {fieldError('company') && <p id="sc-company-error" role="alert" className={errorCls}>{fieldError('company')}</p>}
                </div>
                <div className="sm:col-span-2">
                  <span className={labelCls}>{t('schedule.meetingPreference')}</span>
                  <div className="flex gap-2">
                    {MEETING_OPTIONS.map((opt) => {
                      const selected = form.meetingPreference === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => set('meetingPreference', opt.value)}
                          className={`flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                            selected
                              ? 'border-pink-500 bg-pink-50 text-gray-900'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-pink-400'
                          }`}
                        >
                          <opt.icon className="h-4 w-4" aria-hidden="true" />
                          {t(`schedule.meetings.${meetingSlug(opt.value)}`)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4 — Your project (used to be the separate consultation form) */}
              <h2 className={`mt-8 ${sectionCls}`}>{t('schedule.yourProject')}</h2>
              <fieldset className="mt-3">
                <legend className={labelCls}>{t('consultation.projectMode')}</legend>
                <div className="flex gap-6">
                  {(['new', 'existing'] as const).map((m) => (
                    <label key={m} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="projectMode"
                        value={m}
                        checked={form.projectMode === m}
                        onChange={() => set('projectMode', m)}
                      />
                      {m === 'new' ? t('consultation.modeNew') : t('consultation.modeExisting')}
                    </label>
                  ))}
                </div>
                {fieldError('projectMode') && <p role="alert" className={errorCls}>{fieldError('projectMode')}</p>}
              </fieldset>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="sc-service" className={labelCls}>{t('consultation.service')}</label>
                  <select
                    id="sc-service"
                    className={inputCls}
                    value={form.service}
                    onChange={(e) => set('service', e.target.value)}
                    aria-invalid={Boolean(errors.service)}
                    aria-describedby={errors.service ? 'sc-service-error' : undefined}
                  >
                    <option value="">{t('consultation.selectService')}</option>
                    {SERVICES.map((s) => (
                      <option key={s} value={s}>
                        {t(`services.names.${s === 'mobile-development' ? 'mobile-app-development' : s}`)}
                      </option>
                    ))}
                  </select>
                  {fieldError('service') && <p id="sc-service-error" role="alert" className={errorCls}>{fieldError('service')}</p>}
                </div>
                <div>
                  <label htmlFor="sc-budget" className={labelCls}>{t('consultation.budget')}</label>
                  <select
                    id="sc-budget"
                    className={inputCls}
                    value={form.budgetRange}
                    onChange={(e) => set('budgetRange', e.target.value)}
                    aria-invalid={Boolean(errors.budgetRange)}
                    aria-describedby={errors.budgetRange ? 'sc-budget-error' : undefined}
                  >
                    <option value="">{t('consultation.selectBudget')}</option>
                    {BUDGET_RANGES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  {fieldError('budgetRange') && <p id="sc-budget-error" role="alert" className={errorCls}>{fieldError('budgetRange')}</p>}
                </div>
                <div>
                  <label htmlFor="sc-timeline" className={labelCls}>{t('consultation.timeline')}</label>
                  <select
                    id="sc-timeline"
                    className={inputCls}
                    value={form.timeline}
                    onChange={(e) => set('timeline', e.target.value)}
                    aria-invalid={Boolean(errors.timeline)}
                    aria-describedby={errors.timeline ? 'sc-timeline-error' : undefined}
                  >
                    <option value="">{t('consultation.selectTimeline')}</option>
                    {TIMELINES.map((tl) => (
                      <option key={tl} value={tl}>{tl}</option>
                    ))}
                  </select>
                  {fieldError('timeline') && <p id="sc-timeline-error" role="alert" className={errorCls}>{fieldError('timeline')}</p>}
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="sc-brief" className={labelCls}>{t('consultation.projectBrief')}</label>
                <textarea
                  id="sc-brief"
                  rows={4}
                  className={`${inputCls} resize-y`}
                  value={form.requirement}
                  onChange={(e) => set('requirement', e.target.value)}
                  placeholder={t('consultation.briefPlaceholder')}
                  aria-invalid={Boolean(errors.requirement)}
                  aria-describedby={errors.requirement ? 'sc-brief-error' : undefined}
                />
                {fieldError('requirement') && <p id="sc-brief-error" role="alert" className={errorCls}>{fieldError('requirement')}</p>}
              </div>

              <div className="mt-4">
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={form.consent}
                    onChange={(e) => set('consent', e.target.checked)}
                    aria-invalid={Boolean(errors.consent)}
                    aria-describedby={errors.consent ? 'sc-consent-error' : undefined}
                  />
                  {t('leadForm.consentLabel')}
                </label>
                {fieldError('consent') && <p id="sc-consent-error" role="alert" className={errorCls}>{fieldError('consent')}</p>}
              </div>

              {isLeadCaptureReady && (
                <div className="mt-4">
                  <TurnstileWidget ref={turnstileRef} onToken={setTurnstileToken} key={i18n.language} />
                </div>
              )}

              {submitError && (
                <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !isLeadCaptureReady}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {loading ? t('common.sending') : t('schedule.confirm')}
              </button>
              <p className="mt-3 text-center text-xs text-gray-500">{t('schedule.demoNote')}</p>
            </form>
          </>
        )}
      </main>

      {/* The agent that runs this page is a service we build for other companies too. */}
      <section className="border-t border-gray-200 py-10">
        <div className="container mx-auto px-4 text-center">
          <p className="mx-auto max-w-2xl text-sm text-gray-600">
            {t('schedule.aiAgentNote')}{' '}
            <Link
              to="/services/ai-video-consultation-agents"
              className="rounded font-medium text-pink-700 underline underline-offset-4 transition-colors hover:text-pink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
            >
              {t('schedule.aiAgentLink')}
            </Link>
          </p>
        </div>
      </section>

      </main>

      <Footer />
    </div>
  );
};

export default ScheduleCall;
