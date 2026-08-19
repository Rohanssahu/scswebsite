import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, CheckCircle2, Video, Phone, MessageCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { saveBooking } from '@/lib/analysisStore';
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

function nextDays(count: number): DayOption[] {
  const days: DayOption[] = [];
  const d = new Date();
  while (days.length < count) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) continue; // closed on Sundays
    days.push({
      iso: d.toISOString().slice(0, 10),
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      day: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
    });
  }
  return days;
}

/** Deterministic dummy availability: a couple of slots per day are "taken". */
function isSlotAvailable(dateIso: string, slotIndex: number): boolean {
  const daySeed = parseInt(dateIso.replaceAll('-', ''), 10);
  return (daySeed + slotIndex) % 4 !== 0;
}

const inputCls =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:outline-none';

const ScheduleCall = () => {
  const days = useMemo(() => nextDays(12), []);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', meetingPreference: 'Google Meet', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<DemoBooking | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!date) errs.date = 'Please pick a date.';
    if (!slot) errs.slot = 'Please pick a time slot.';
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address.';
    if (form.phone.trim().length < 7) errs.phone = 'Enter a valid phone / WhatsApp number.';
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
            <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Your call request is noted, {confirmed.name}!</h1>
            <p className="mt-3 text-gray-600">
              {new Date(confirmed.date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}{' '}
              at {confirmed.slot} · {confirmed.meetingPreference}
            </p>
            <p className="mx-auto mt-5 max-w-md rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Demo booking saved locally. Calendar integration will be connected later — no real appointment has been
              created yet.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                to="/project-analysis"
                className="rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                Analyze a project meanwhile
              </Link>
              <Link
                to="/"
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                Back to home
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-3xl font-bold sm:text-4xl">
                Schedule a <span className="text-gradient-ai">free review call</span>
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-gray-600">
                Pick a slot that suits you and an SCS Softwares consultant will walk through your project and estimate.
              </p>
            </div>

            <form data-guide-id="schedule-form" onSubmit={submit} className="glow-card mt-10 rounded-2xl border border-gray-200 bg-white p-5 sm:p-8">
              {/* Date */}
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                <CalendarDays className="h-4 w-4" aria-hidden="true" /> 1. Select a date
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
                <Clock className="h-4 w-4" aria-hidden="true" /> 2. Select a time slot (IST)
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
                {date ? 'Struck-through slots are already taken (demo availability).' : 'Pick a date to see available slots.'}
              </p>
              {errors.slot && <p role="alert" className="mt-2 text-sm text-rose-600">{errors.slot}</p>}

              {/* Details */}
              <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">3. Your details</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="sc-name" className="mb-1 block text-sm text-gray-700">Name *</label>
                  <input id="sc-name" value={form.name} onChange={set('name')} className={inputCls} placeholder="Your full name" />
                  {errors.name && <p role="alert" className="mt-1 text-xs text-rose-600">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="sc-email" className="mb-1 block text-sm text-gray-700">Email *</label>
                  <input id="sc-email" type="email" value={form.email} onChange={set('email')} className={inputCls} placeholder="you@company.com" />
                  {errors.email && <p role="alert" className="mt-1 text-xs text-rose-600">{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="sc-phone" className="mb-1 block text-sm text-gray-700">Phone / WhatsApp *</label>
                  <input id="sc-phone" value={form.phone} onChange={set('phone')} className={inputCls} placeholder="+91 …" />
                  {errors.phone && <p role="alert" className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
                </div>
                <div>
                  <span className="mb-1 block text-sm text-gray-700">Meeting preference</span>
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
                          {opt.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="sc-message" className="mb-1 block text-sm text-gray-700">Message (optional)</label>
                  <textarea
                    id="sc-message"
                    value={form.message}
                    onChange={set('message')}
                    rows={3}
                    className={`${inputCls} resize-y`}
                    placeholder="Anything we should know before the call?"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-8 w-full rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                Confirm demo booking
              </button>
              <p className="mt-3 text-center text-xs text-gray-500">
                Demo scheduling — your booking is saved in this browser only.
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
