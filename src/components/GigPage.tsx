import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { valueKey } from '@/i18n/languageConfig';
import Header from './Header';
import Footer from './Footer';
import Reveal from './Reveal';
import VisualPlaceholder from './VisualPlaceholder';
import { ArrowRight, CheckCircle, Sparkles, PhoneCall, Users, Clock, DollarSign, CalendarRange } from 'lucide-react';

interface GigPageProps {
  title: string;
  description: string;
  icon: React.ElementType;
  features: string[];
  technologies: string[];
  process: { step: string; description: string }[];
  pricing: { plan: string; price: string; features: string[] }[];
  /**
   * Representative builds for this service. No image field: the cards used to
   * hotlink unrelated stock photos, and the tile is rendered locally instead.
   */
  portfolio: { title: string; description: string }[];
}

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-400/40 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';

// Rotated across the build cards so three tiles on one row read as three
// distinct entries rather than one repeated block.
const CARD_GRADIENTS = [
  'from-orange-400 to-pink-500',
  'from-pink-500 to-purple-600',
  'from-purple-500 to-pink-500',
];

const SectionHeading = ({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) => (
  <div className="mx-auto mb-12 max-w-2xl text-center">
    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">{eyebrow}</span>
    <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">{title}</h2>
    {sub && <p className="mt-4 text-gray-600">{sub}</p>}
  </div>
);

const GigPage: React.FC<GigPageProps> = ({
  title,
  description,
  icon: Icon,
  features,
  technologies,
  process,
  portfolio,
}) => {
  const { t } = useTranslation();
  const serviceName = t(`services.names.${valueKey(title)}`, { defaultValue: title });
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <main id="main-content">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        <div className="bg-grid-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[50rem] -translate-x-1/2 animate-pulse-glow rounded-full bg-pink-200/60 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-purple-200/50 blur-3xl" aria-hidden="true" />

        <div className="container relative mx-auto px-4 py-20 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-pink-50 px-4 py-1.5 text-xs font-medium text-pink-700">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {t('gig.badge')}
                </span>
              </Reveal>
              <Reveal delay={0.1}>
                <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl">
                  <span className="text-gradient-ai">{serviceName}</span>
                </h1>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="mt-6 text-lg leading-relaxed text-gray-600">{description}</p>
              </Reveal>
              <Reveal delay={0.3}>
                <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                  <Link to="/contact" className={primaryBtn}>
                    {t('gig.getStarted')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link to="/contact" className={secondaryBtn}>
                    {t('gig.getQuote')}
                  </Link>
                </div>
              </Reveal>
            </div>
            <Reveal delay={0.2}>
              <div className="glow-card overflow-hidden rounded-3xl border border-gray-200 bg-white">
                <VisualPlaceholder icon={Icon} className="h-64 sm:h-80 lg:h-96" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow={t('gig.includedEyebrow')}
            title={t('gig.includedTitle', { service: serviceName })}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Reveal key={feature} delay={index * 0.04}>
                <div className="flex h-full items-start gap-3 rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-pink-300">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span className="text-sm font-medium text-gray-700">{feature}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Technologies ===== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <SectionHeading eyebrow={t('gig.techEyebrow')} title={<>{t('gig.techTitle1')} <span className="text-gradient-ai">{t('gig.techTitle2')}</span></>} />
          <Reveal>
            <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-3">
              {technologies.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-pink-400 hover:text-gray-900"
                >
                  {tech}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Process ===== */}
      <section className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <SectionHeading eyebrow={t('gig.processEyebrow')} title={<>{t('gig.processTitle1')} <span className="text-gradient-ai">{t('gig.processTitle2')}</span></>} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {process.map((step, index) => (
              <Reveal key={step.step} delay={index * 0.08}>
                <div className="glow-card h-full rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-pink-300">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-lg font-bold text-white">
                    {index + 1}
                  </div>
                  <h3 className="mt-4 font-semibold text-gray-900">{step.step}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Portfolio ===== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <SectionHeading eyebrow={t('gig.portfolioEyebrow')} title={<>{t('gig.portfolioTitle1')} <span className="text-gradient-ai">{t('gig.portfolioTitle2')}</span></>} />
          <div className="grid gap-6 md:grid-cols-3">
            {portfolio.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.08}>
                <article className="group h-full overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors hover:border-pink-300">
                  <VisualPlaceholder icon={Icon} gradient={CARD_GRADIENTS[index % CARD_GRADIENTS.length]} />
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.description}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Project Estimate ===== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow={t('gig.estimateEyebrow')}
            title={<>{t('gig.estimateTitle1')} <span className="text-gradient-ai">{t('gig.estimateTitle2')}</span></>}
            sub={t('gig.estimateSub', { service: serviceName })}
          />
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: Users, label: t('gig.estimateTeam') },
              { icon: Clock, label: t('gig.estimateHours') },
              { icon: DollarSign, label: t('gig.estimateCost') },
              { icon: CalendarRange, label: t('gig.estimateTimeline') },
            ].map((item, i) => (
              <Reveal key={item.label} delay={i * 0.05}>
                <div className="flex h-full flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-5 text-center transition-colors hover:border-pink-300">
                  <item.icon className="h-6 w-6 text-pink-600" aria-hidden="true" />
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.2}>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/project-analysis" className={primaryBtn}>
                <Sparkles className="h-4 w-4" aria-hidden="true" /> {t('gig.estimateCta')}
              </Link>
              <Link to="/project-analysis?method=manual" className={secondaryBtn}>
                {t('common.startManually')}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 pt-4">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="glow-card mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl border border-gray-300 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 p-8 text-center sm:p-12">
              <PhoneCall className="h-9 w-9 text-pink-600" aria-hidden="true" />
              <h2 className="text-2xl font-bold sm:text-3xl">{t('gig.ctaTitle')}</h2>
              <p className="max-w-xl text-gray-600">
                {t('gig.ctaText', { service: serviceName })}
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/contact" className={primaryBtn}>
                  {t('gig.ctaStart')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link to="/schedule-call" className={secondaryBtn}>
                  {t('common.scheduleCall')}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      </main>

      <Footer />
    </div>
  );
};

export default GigPage;
