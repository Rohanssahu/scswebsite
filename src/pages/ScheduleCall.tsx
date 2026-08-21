import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Clock, CheckCircle2, Video, Phone, MessageCircle, Sparkles } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ConsultationScheduler from '@/components/consultation/ConsultationScheduler';
import { saveBooking } from '@/lib/analysisStore';
import { formatDate } from '@/i18n/languageConfig';
import { DemoBooking } from '@/types/projectAnalysis';

const SLOTS = ['10:00 AM', '11:30 AM', '2:00 PM', '3:30 PM', '5:00 PM', '6:30 PM'];

const MEETING_OPTIONS = [
  { value: 'Google Meet', icon: Video },
  { value: 'Phone call', icon: Phone },
  { value: 'WhatsApp', icon: MessageCircle },
];

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
  const daySeed = parseInt(dateIso.replaceAll('-', ''), 10);
  return (daySeed + slotIndex) % 4 !== 0;
}

const inputCls =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:outline-none';

const ScheduleCall = () => {
  const { t, i18n } = useTranslation();
  const days = useMemo(() => nextDays(12, i18n.language), [i18n.language]);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', meetingPreference: 'Google Meet', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<DemoBooking | null>(null);
  // Default to the AI consultation; the existing demo booking form stays
  // available under the second tab.
  const [mode, setMode] = useState<'ai' | 'human'>('ai');

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!date) errs.date = t('schedule.errDate');
    if (!slot) errs.slot = t('schedule.errSlot');
    if (!form.name.trim()) errs.name = t('schedule.errName');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('schedule.errEmail');
    if (form.phone.trim().length < 7) errs.phone = t('schedule.errPhone');
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const booking: DemoBooking = {
      date: date as string,
      slot: slot as string,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      meetingPreference: form.meetingPreference,
      message: form.message.trim() || undefined,
    };
    saveBooking(booking);
    setConfirmed(booking);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <main className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        {confirmed ? (
          <div className="glow-card rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{t('schedule.confirmedTitle', { name: confirmed.name })}</h1>
            <p className="mt-3 text-gray-600">
              {t('schedule.confirmedAt', {
                date: formatDate(new Date(confirmed.date + 'T00:00:00'), i18n.language, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                }),
                slot: confirmed.slot,
                meeting: t(`schedule.meetings.${meetingSlug(confirmed.meetingPreference)}`),
              })}
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
            <div className="text-center">
              <h1 className="text-3xl font-bold sm:text-4xl">
                {t('schedule.title1')} <span className="text-gradient-ai">{t('schedule.title2')}</span>
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-gray-600">
                {t('schedule.sub')}
              </p>
            </div>

            {/* Mode switch: AI consultation meeting (new) vs the existing
                demo booking form. No duplicate CTA is added elsewhere. */}
            <div role="tablist" aria-label={t('meeting.schedule.modeLabel')} className="mx-auto mt-8 flex max-w-md gap-2">
              <button
                role="tab"
                type="button"
                aria-selected={mode === 'ai'}
                onClick={() => setMode('ai')}
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                  mode === 'ai' ? 'border-pink-500 bg-pink-50 text-gray-900' : 'border-gray-300 bg-white text-gray-700 hover:border-pink-400'
                }`}
              >
                <Sparkles className="h-4 w-4 text-pink-600" aria-hidden="true" /> {t('meeting.schedule.tabAi')}
              </button>
              <button
                role="tab"
                type="button"
                aria-selected={mode === 'human'}
                onClick={() => setMode('human')}
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                  mode === 'human' ? 'border-pink-500 bg-pink-50 text-gray-900' : 'border-gray-300 bg-white text-gray-700 hover:border-pink-400'
                }`}
              >
                <CalendarDays className="h-4 w-4 text-pink-600" aria-hidden="true" /> {t('meeting.schedule.tabHuman')}
              </button>
            </div>

            {mode === 'ai' && (
              <div className="mt-6">
                <ConsultationScheduler />
              </div>
            )}

            <form
              data-guide-id="schedule-form"
              onSubmit={submit}
              className={`glow-card mt-10 rounded-2xl border border-gray-200 bg-white p-5 sm:p-8 ${mode === 'ai' ? 'hidden' : ''}`}
            >
              {/* Date */}
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
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
              {errors.date && <p role="alert" className="mt-2 text-sm text-rose-600">{errors.date}</p>}

              {/* Slot */}
              <h2 className="mt-8 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
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
              <p className="mt-2 text-xs text-gray-500">
                {date ? t('schedule.takenNote') : t('schedule.pickDateFirst')}
              </p>
              {errors.slot && <p role="alert" className="mt-2 text-sm text-rose-600">{errors.slot}</p>}

              {/* Details */}
              <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">{t('schedule.yourDetails')}</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="sc-name" className="mb-1 block text-sm text-gray-700">{t('schedule.name')}</label>
                  <input id="sc-name" value={form.name} onChange={set('name')} className={inputCls} placeholder={t('schedule.namePlaceholder')} />
                  {errors.name && <p role="alert" className="mt-1 text-xs text-rose-600">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="sc-email" className="mb-1 block text-sm text-gray-700">{t('schedule.email')}</label>
                  <input id="sc-email" type="email" value={form.email} onChange={set('email')} className={inputCls} placeholder={t('schedule.emailPlaceholder')} />
                  {errors.email && <p role="alert" className="mt-1 text-xs text-rose-600">{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="sc-phone" className="mb-1 block text-sm text-gray-700">{t('schedule.phone')}</label>
                  <input id="sc-phone" value={form.phone} onChange={set('phone')} className={inputCls} placeholder={t('schedule.phonePlaceholder')} />
                  {errors.phone && <p role="alert" className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
                </div>
                <div>
                  <span className="mb-1 block text-sm text-gray-700">{t('schedule.meetingPreference')}</span>
                  <div className="flex gap-2">
                    {MEETING_OPTIONS.map((opt) => {
                      const selected = form.meetingPreference === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setForm((f) => ({ ...f, meetingPreference: opt.value }))}
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
                <div className="sm:col-span-2">
                  <label htmlFor="sc-message" className="mb-1 block text-sm text-gray-700">{t('schedule.message')}</label>
                  <textarea
                    id="sc-message"
                    value={form.message}
                    onChange={set('message')}
                    rows={3}
                    className={`${inputCls} resize-y`}
                    placeholder={t('schedule.messagePlaceholder')}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-8 w-full rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                {t('schedule.confirm')}
              </button>
              <p className="mt-3 text-center text-xs text-gray-500">
                {t('schedule.demoNote')}
              </p>
            </form>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ScheduleCall;
