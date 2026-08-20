import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  ArrowRight,
  MapPin,
  Clock,
  Users,
  GraduationCap,
  HeartHandshake,
  Scale,
  PartyPopper,
  FileText,
  PhoneCall,
  MessagesSquare,
  BadgeCheck,
  Briefcase,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Reveal from '../components/Reveal';

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-400/40 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';

const SectionHeading = ({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) => (
  <div className="mx-auto mb-12 max-w-2xl text-center">
    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">{eyebrow}</span>
    <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">{title}</h2>
    {sub && <p className="mt-4 text-gray-600">{sub}</p>}
  </div>
);

// Job titles contain technology names and stay in English; location stays "Indore".
const JOBS = [
  { title: 'React Native Developer Intern', openings: 2, location: 'Indore' },
  { title: 'React.js Intern', openings: 2, location: 'Indore' },
  { title: 'MERN Stack Intern', openings: 2, location: 'Indore' },
  { title: 'UI/UX Designer Intern', openings: 1, location: 'Indore' },
  { title: 'Business Development Executive (BDE) Intern', openings: 1, location: 'Indore' },
  { title: 'Python Developer Intern', openings: 2, location: 'Indore' },
  { title: 'AI/ML Developer Intern', openings: 1, location: 'Indore' },
];

const BENEFITS = [
  { icon: GraduationCap, key: 'b1' },
  { icon: HeartHandshake, key: 'b2' },
  { icon: Scale, key: 'b3' },
  { icon: PartyPopper, key: 'b4' },
];

const EVENTS = [
  { key: 'e1', image: 'https://www.scssoftwares.com/images/aa.png' },
  { key: 'e2', image: 'https://www.scssoftwares.com/images/cc.png' },
  { key: 'e3', image: 'https://www.scssoftwares.com/images/bb2.png' },
  { key: 'e4', image: 'https://www.scssoftwares.com/images/dd.png' },
  { key: 'e5', image: 'https://www.scssoftwares.com/images/ff.png' },
];

const HIRING_STEPS = [
  { icon: FileText, key: 's1' },
  { icon: PhoneCall, key: 's2' },
  { icon: MessagesSquare, key: 's3' },
  { icon: BadgeCheck, key: 's4' },
];

const CareersPage = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        <div className="bg-grid-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[50rem] -translate-x-1/2 animate-pulse-glow rounded-full bg-pink-200/60 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-purple-200/50 blur-3xl" aria-hidden="true" />

        <div className="container relative mx-auto px-4 py-20 text-center sm:py-28">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-pink-50 px-4 py-1.5 text-xs font-medium text-pink-700">
              <Briefcase className="h-3.5 w-3.5" aria-hidden="true" /> {t('careers.badge')}
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              {t('careers.heroTitle1')} <span className="text-gradient-ai">{t('careers.heroTitle2')}</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              {t('careers.heroSub')}
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="#openings" className={primaryBtn}>
                <Sparkles className="h-4 w-4" aria-hidden="true" /> {t('careers.explorePositions')}
              </a>
              <Link to="/ApplicationForm" className={secondaryBtn}>
                {t('common.applyNow')}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Culture ===== */}
      <section className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow={t('careers.culture.eyebrow')}
            title={t('careers.culture.title')}
            sub={t('careers.culture.sub')}
          />

          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <div className="glow-card overflow-hidden rounded-3xl border border-gray-200 bg-white">
                <img
                  src="https://www.scssoftwares.com/images/reception.jpeg"
                  alt={t('careers.culture.imageAlt')}
                  loading="lazy"
                  className="h-64 w-full object-cover transition-transform duration-300 hover:scale-105 sm:h-80"
                />
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">{t('careers.culture.inclusionEyebrow')}</span>
                <h3 className="mt-3 text-2xl font-bold text-gray-900">{t('careers.culture.inclusionTitle')}</h3>
                <p className="mt-4 leading-relaxed text-gray-600">
                  {t('careers.culture.p1')}
                </p>
                <p className="mt-4 leading-relaxed text-gray-600">
                  {t('careers.culture.p2')}
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== Benefits ===== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow={t('careers.benefits.eyebrow')}
            title={<>{t('careers.benefits.title1')} <span className="text-gradient-ai">{t('careers.benefits.title2')}</span></>}
            sub={t('careers.benefits.sub')}
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b, i) => (
              <Reveal key={b.key} delay={i * 0.08}>
                <div className="glow-card h-full rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-pink-300">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600">
                    <b.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-semibold text-gray-900">{t(`careers.benefits.${b.key}Title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{t(`careers.benefits.${b.key}Text`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Life & events ===== */}
      <section className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow={t('careers.events.eyebrow')}
            title={t('careers.events.title')}
            sub={t('careers.events.sub')}
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {EVENTS.map((event, i) => (
              <Reveal key={event.key} delay={i * 0.08}>
                <article className="group h-full overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors hover:border-pink-300">
                  <div className="overflow-hidden">
                    <img
                      src={event.image}
                      alt={t(`careers.events.${event.key}Title`)}
                      loading="lazy"
                      className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-gray-900">{t(`careers.events.${event.key}Title`)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{t(`careers.events.${event.key}Text`)}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Open positions ===== */}
      <section id="openings" className="py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow={t('careers.openings.eyebrow')}
            title={t('careers.openings.title')}
            sub={t('careers.openings.sub')}
          />
          <div className="mx-auto max-w-4xl space-y-4">
            {JOBS.map((job, i) => (
              <Reveal key={job.title} delay={i * 0.05}>
                <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-pink-300 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{job.title}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-pink-600" aria-hidden="true" />{' '}
                        {t('careers.openings.opening', { count: job.openings })}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-pink-600" aria-hidden="true" /> {job.location}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-pink-600" aria-hidden="true" /> {t('careers.openings.experience')}
                      </span>
                    </div>
                  </div>
                  <Link
                    to="/ApplicationForm"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-pink-400/30 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                  >
                    {t('common.applyNow')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Hiring process ===== */}
      <section className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow={t('careers.process.eyebrow')}
            title={<>{t('careers.process.title1')} <span className="text-gradient-ai">{t('careers.process.title2')}</span></>}
            sub={t('careers.process.sub')}
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HIRING_STEPS.map((step, i) => (
              <Reveal key={step.key} delay={i * 0.08}>
                <div className="glow-card h-full rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-pink-300">
                  <step.icon className="h-7 w-7 text-pink-600" aria-hidden="true" />
                  <h3 className="mt-4 font-semibold text-gray-900">{t(`careers.process.${step.key}Title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{t(`careers.process.${step.key}Text`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Application CTA ===== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="glow-card mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl border border-gray-300 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 p-8 text-center sm:p-12">
              <Briefcase className="h-9 w-9 text-pink-600" aria-hidden="true" />
              <h2 className="text-2xl font-bold sm:text-3xl">{t('careers.cta.title')}</h2>
              <p className="max-w-xl text-gray-600">
                {t('careers.cta.text')}
              </p>
              <Link to="/ApplicationForm" className={primaryBtn}>
                {t('careers.cta.send')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CareersPage;
