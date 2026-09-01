import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, MapPin, Send, Loader2, Sparkles, ArrowRight, Bot } from 'lucide-react';
import emailjs from 'emailjs-com';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Reveal from '../components/Reveal';
import TurnstileWidget, { TurnstileWidgetHandle } from '../components/forms/TurnstileWidget';
import HoneypotField from '../components/forms/HoneypotField';
import { validateContactForm } from '@/lib/leadValidation';
import { buildContactRequest, submitLead, LeadSubmissionError } from '@/services/leadService';
import { trackConversion } from '@/utils/conversionAnalytics';
import { isLeadCaptureReady } from '@/services/supabaseClient';

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-400/40 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';

const inputClass =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200';
const labelClass = 'mb-2 block text-sm font-medium text-gray-700';

const Contact = () => {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    service: '',
    message: '',
  });
  // One-time prefill written by Buddy — Your SCS Guide (demo) — nothing is sent
  // automatically; the visitor still reviews and submits the form themselves.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('scs-guide-contact-prefill');
      if (!raw) return;
      const prefill = JSON.parse(raw) as { service?: string; message?: string };
      setFormData((prev) => ({
        ...prev,
        service: prev.service || prefill.service || '',
        message: prev.message || prefill.message || '',
      }));
      localStorage.removeItem('scs-guide-contact-prefill');
    } catch {
      /* ignore malformed prefill */
    }
  }, []);

  const [loading, setLoading] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const [dialog, setDialog] = useState({
    open: false,
    type: '', // success | error
    message: '',
    reference: '',
    note: '',
  });

  const emptyForm = { name: '', email: '', company: '', service: '', message: '' };

  // Secondary email notification — fired only AFTER the lead is stored.
  // Its failure never affects the stored lead or the success dialog.
  const sendNotificationEmail = async (): Promise<boolean> => {
    try {
      await emailjs.send('service_fz97kyb', 'template_shbutfo', formData, 'np--atCig3crdyD1t');
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return; // duplicate-click guard

    const { name, email, message } = formData;

    if (!name || !email || !message) {
      setDialog({ open: true, type: 'error', message: t('contact.fillRequired'), reference: '', note: '' });
      return;
    }

    // Secure database path (primary) — used whenever Supabase + Turnstile
    // public config is present. Otherwise the legacy EmailJS-only path keeps
    // the form working exactly as before.
    if (isLeadCaptureReady) {
      const errors = validateContactForm({ name, email, message, company: formData.company });
      const firstError = Object.values(errors)[0];
      if (firstError) {
        setDialog({ open: true, type: 'error', message: t(firstError), reference: '', note: '' });
        return;
      }
      if (!turnstileToken) {
        setDialog({ open: true, type: 'error', message: t('leadForm.turnstileRequired'), reference: '', note: '' });
        return;
      }

      setLoading(true);
      try {
        const request = buildContactRequest(
          { name, email, company: formData.company, service: formData.service, message },
          turnstileToken,
          { route: '/contact', language: i18n.language },
          honeypot,
        );
        const result = await submitLead(request);
        // The submission is accepted at this point; the email notification below
        // is a courtesy and its failure does not undo the conversion.
        trackConversion('contact_submitted');
        const emailSent = await sendNotificationEmail();
        setDialog({
          open: true,
          type: 'success',
          message: t('contact.successMessage', { name }),
          reference: result.referenceCode,
          note: emailSent ? '' : t('contact.emailNotifyFailed'),
        });
        setFormData(emptyForm);
      } catch (error) {
        const message =
          error instanceof LeadSubmissionError
            ? error.code === 'rate_limited'
              ? t('leadForm.rateLimited')
              : error.code === 'turnstile_failed'
                ? t('leadForm.turnstileRequired')
                : error.message
            : t('contact.failedMessage');
        setDialog({ open: true, type: 'error', message, reference: '', note: '' });
      } finally {
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        setLoading(false);
      }
      return;
    }

    // Legacy path (Supabase not configured): EmailJS only, as before.
    setLoading(true);
    try {
      await emailjs.send('service_fz97kyb', 'template_shbutfo', formData, 'np--atCig3crdyD1t');
      setDialog({ open: true, type: 'success', message: t('contact.successMessage', { name }), reference: '', note: '' });
      setFormData(emptyForm);
    } catch {
      setDialog({ open: true, type: 'error', message: t('contact.failedMessage'), reference: '', note: '' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <main id="main-content">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        <div className="bg-grid-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[50rem] -translate-x-1/2 animate-pulse-glow rounded-full bg-pink-200/60 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-purple-200/50 blur-3xl" aria-hidden="true" />

        <div className="container relative mx-auto px-4 py-20 text-center sm:py-28">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-pink-50 px-4 py-1.5 text-xs font-medium text-pink-700">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {t('contact.badge')}
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              {t('contact.heroTitle1')} <span className="text-gradient-ai">{t('contact.heroTitle2')}</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              {t('contact.heroSub')}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== Contact form + info ===== */}
      <section className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-10 lg:grid-cols-5 lg:gap-12">
            {/* Contact Form */}
            <Reveal className="lg:col-span-3">
              <div className="glow-card rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">{t('contact.formEyebrow')}</span>
                <h2 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">{t('contact.formTitle')}</h2>
                <form data-guide-id="contact-form" onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <HoneypotField value={honeypot} onChange={setHoneypot} />
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className={labelClass}>
                        {t('contact.fullName')}
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className={inputClass}
                        placeholder={t('contact.fullNamePlaceholder')}
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className={labelClass}>
                        {t('contact.email')}
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className={inputClass}
                        placeholder={t('contact.emailPlaceholder')}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="company" className={labelClass}>
                        {t('contact.company')}
                      </label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder={t('contact.companyPlaceholder')}
                      />
                    </div>
                    <div>
                      <label htmlFor="service" className={labelClass}>
                        {t('contact.service')}
                      </label>
                      <select id="service" name="service" value={formData.service} onChange={handleChange} className={inputClass}>
                        <option value="">{t('contact.selectService')}</option>
                        <option value="web-development">{t('services.names.web-development')}</option>
                        <option value="mobile-development">{t('services.names.mobile-app-development')}</option>
                        <option value="digital-marketing">{t('services.names.digital-marketing')}</option>
                        <option value="ui-ux-design">{t('services.names.ui-ux-design')}</option>
                        <option value="cloud-solutions">{t('services.names.cloud-solutions')}</option>
                        <option value="devops-services">{t('services.names.devops-services')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className={labelClass}>
                      {t('contact.message')}
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className={inputClass}
                      placeholder={t('contact.messagePlaceholder')}
                    />
                  </div>

                  {isLeadCaptureReady && (
                    <TurnstileWidget ref={turnstileRef} onToken={setTurnstileToken} key={i18n.language} />
                  )}

                  <p className="text-xs text-gray-500">{t('leadForm.consentNote')}</p>

                  <button type="submit" disabled={loading} className={`${primaryBtn} w-full ${loading ? 'cursor-not-allowed opacity-70 hover:scale-100' : ''}`}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {t('common.sending')}
                      </>
                    ) : (
                      <>
                        {t('contact.sendMessage')} <Send className="h-4 w-4" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </Reveal>

            {/* Contact Info */}
            <div className="lg:col-span-2">
              <Reveal delay={0.1}>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">{t('contact.detailsEyebrow')}</span>
                <h2 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">{t('contact.detailsTitle')}</h2>
              </Reveal>

              <div className="mt-8 space-y-4">
                <Reveal delay={0.15}>
                  <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-pink-300">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600">
                      <MapPin className="h-5 w-5 text-white" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{t('contact.office')}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600">
                        9th Floor, Shekhar Central,
                        <br />
                        Palasia Square, Manorama Ganj,
                        <br />
                        Indore, Madhya Pradesh 452001
                      </p>
                    </div>
                  </div>
                </Reveal>

                <Reveal delay={0.2}>
                  <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-pink-300">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                      <Mail className="h-5 w-5 text-white" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{t('contact.emailLabel')}</h3>
                      <p className="mt-1 text-sm text-gray-600">info@scssoftwares.com</p>
                      <p className="mt-1 text-xs text-gray-500">{t('contact.emailNote')}</p>
                    </div>
                  </div>
                </Reveal>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Consultation CTA ===== */}
      <section className="py-20 pt-4">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="glow-card mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl border border-gray-300 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 p-8 text-center sm:p-12">
              <Bot className="h-9 w-9 text-pink-600" aria-hidden="true" />
              <h2 className="text-2xl font-bold sm:text-3xl">{t('contact.ctaTitle')}</h2>
              <p className="max-w-xl text-gray-600">
                {t('contact.ctaText')}
              </p>
              {/* One button, one page — the AI meeting starts immediately */}
              <Link to="/schedule-call" className={primaryBtn}>
                {t('common.startAiMeeting')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Success / error dialog ===== */}
      {dialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDialog({ ...dialog, open: false })} />

          <div className="glow-card relative w-full max-w-md animate-fade-in rounded-3xl border border-gray-200 bg-white p-8 text-center">
            <div
              className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
                dialog.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'
              }`}
            >
              {dialog.type === 'success' ? (
                <span className="text-2xl text-emerald-600" aria-hidden="true">✔</span>
              ) : (
                <span className="text-2xl text-red-600" aria-hidden="true">✖</span>
              )}
            </div>

            <h3 className="text-lg font-bold text-gray-900">{dialog.type === 'success' ? t('common.success') : t('common.error')}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{dialog.message}</p>
            {dialog.reference && (
              <p className="mt-3 text-sm text-gray-700">
                {t('contact.referenceLabel')}: <span className="font-mono font-semibold text-gray-900">{dialog.reference}</span>
              </p>
            )}
            {dialog.note && <p className="mt-2 text-xs text-amber-700">{dialog.note}</p>}

            <button onClick={() => setDialog({ ...dialog, open: false })} className={`${primaryBtn} mt-6 px-10`}>
              {t('common.ok')}
            </button>
          </div>
        </div>
      )}

      </main>

      <Footer />
    </div>
  );
};

export default Contact;
