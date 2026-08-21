import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Code,
  Smartphone,
  TrendingUp,
  Palette,
  Cloud,
  Settings,
  ArrowRight,
  CheckCircle,
  Star,
  Sparkles,
  ClipboardList,
  Rocket,
  Wrench,
  Users,
  Clock,
  DollarSign,
  CalendarRange,
  Gauge,
  ShieldCheck,
  PhoneCall,
  FileSearch,
  Bot,
  ListChecks,
  BadgeCheck,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Reveal from '../components/Reveal';

const DEMO_TEAM = [
  { slug: 'requirement-analyst', rate: 5 },
  { slug: 'ui-ux-designer', rate: 10 },
  { slug: 'frontend-developer', rate: 15 },
  { slug: 'backend-developer', rate: 20 },
  { slug: 'qa-tester', rate: 10 },
];

const SERVICES = [
  { icon: Code, nameKey: 'services.names.web-development', path: '/gig/web-development' },
  { icon: Smartphone, nameKey: 'services.names.mobile-apps', path: '/gig/mobile-development' },
  { icon: Palette, nameKey: 'services.names.ui-ux-design', path: '/gig/ui-ux-design' },
  { icon: Cloud, nameKey: 'services.names.cloud-solutions', path: '/gig/cloud-solutions' },
  { icon: Settings, nameKey: 'services.names.devops', path: '/gig/devops-services' },
  { icon: TrendingUp, nameKey: 'services.names.digital-marketing', path: '/gig/digital-marketing' },
];

const PORTFOLIO: {
  titleKey: string;
  categoryKey?: string;
  category?: string;
  image: string;
  descKey: string;
}[] = [
  {
    titleKey: 'home.portfolio.p1Title',
    categoryKey: 'services.names.web-development',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop',
    descKey: 'home.portfolio.p1Desc',
  },
  {
    titleKey: 'home.portfolio.p2Title',
    category: 'Mobile Development',
    image:
      'https://blog.elxoinc.com/hubfs/Website%20Images/Blogs/Modern%20Healthcare%20App%20Development%E2%80%99s%20Role%20in%20Staff%20%26%20IT%20Partnerships.jpg',
    descKey: 'home.portfolio.p2Desc',
  },
  {
    titleKey: 'home.portfolio.p3Title',
    categoryKey: 'services.names.web-development',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
    descKey: 'home.portfolio.p3Desc',
  },
];

const TESTIMONIALS = [
  {
    name: 'Sarah Johnson',
    company: 'TechStart Inc.',
    quoteKey: 'home.testimonials.q1',
  },
  {
    name: 'Michael Chen',
    company: 'Digital Ventures',
    quoteKey: 'home.testimonials.q2',
  },
  {
    name: 'Emily Rodriguez',
    company: 'Growth Marketing Co.',
    quoteKey: 'home.testimonials.q3',
  },
];

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

const Index = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      {/* ===== Hero ===== */}
      <section data-guide-id="home-hero" className="relative overflow-hidden">
        <div className="bg-grid-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[50rem] -translate-x-1/2 animate-pulse-glow rounded-full bg-pink-200/60 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-purple-200/50 blur-3xl" aria-hidden="true" />

        <div className="container relative mx-auto px-4 py-20 text-center sm:py-28">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-pink-50 px-4 py-1.5 text-xs font-medium text-pink-700">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {t('home.heroBadge')}
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              {t('home.heroTitle1')} <span className="text-gradient-ai">{t('home.heroTitle2')}</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              {t('home.heroSub')}
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/project-analysis" className={primaryBtn}>
                <Sparkles className="h-4 w-4" aria-hidden="true" /> {t('common.analyzeMyProject')}
              </Link>
              <Link to="/project-analysis?method=manual" className={secondaryBtn}>
                <ClipboardList className="h-4 w-4" aria-hidden="true" /> {t('common.startManually')}
              </Link>
              {/* Visitors who would rather talk it through start here — instantly */}
              <Link to="/schedule-call" className={`${secondaryBtn} border-pink-400 bg-white text-pink-700 hover:bg-pink-50 hover:text-pink-800`}>
                <Bot className="h-4 w-4" aria-hidden="true" /> {t('common.startAiMeeting')}
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.4}>
            <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { value: '500+', labelKey: 'home.stats.clients' },
                { value: '1000+', labelKey: 'home.stats.projects' },
                { value: '10+', labelKey: 'home.stats.years' },
                { value: '98%', labelKey: 'home.stats.satisfaction' },
              ].map((s) => (
                <div key={s.labelKey} className="rounded-2xl border border-gray-200 bg-white px-4 py-5">
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{t(s.labelKey)}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== How It Works ===== */}
      <section data-guide-id="home-process" className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow={t('home.how.eyebrow')}
            title={<>{t('home.how.title1')} <span className="text-gradient-ai">{t('home.how.title2')}</span></>}
            sub={t('home.how.sub')}
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: FileSearch, titleKey: 'home.how.step1Title', textKey: 'home.how.step1Text' },
              { icon: Bot, titleKey: 'home.how.step2Title', textKey: 'home.how.step2Text' },
              { icon: Users, titleKey: 'home.how.step3Title', textKey: 'home.how.step3Text' },
              { icon: PhoneCall, titleKey: 'home.how.step4Title', textKey: 'home.how.step4Text' },
            ].map((step, i) => (
              <Reveal key={step.titleKey} delay={i * 0.08}>
                <div className="glow-card h-full rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-pink-300">
                  <step.icon className="h-7 w-7 text-pink-600" aria-hidden="true" />
                  <h3 className="mt-4 font-semibold text-gray-900">{t(step.titleKey)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{t(step.textKey)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== AI-Guided and Manual Options ===== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow={t('home.ways.eyebrow')}
            title={t('home.ways.title')}
            sub={t('home.ways.sub')}
          />
          <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
            <Reveal>
              <div className="glow-card h-full rounded-2xl border border-gray-200 bg-white p-7">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600">
                  <Sparkles className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">{t('home.ways.aiTitle')}</h3>
                <p className="mt-2 text-sm text-gray-600">
                  {t('home.ways.aiText')} <span className="text-amber-700">{t('home.ways.aiNote')}</span>
                </p>
                <Link to="/project-analysis" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-pink-600 hover:text-gray-900">
                  {t('home.ways.aiCta')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="glow-card h-full rounded-2xl border border-gray-200 bg-white p-7">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                  <ClipboardList className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">{t('home.ways.manualTitle')}</h3>
                <p className="mt-2 text-sm text-gray-600">
                  {t('home.ways.manualText')}
                </p>
                <Link to="/project-analysis?method=manual" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-pink-600 hover:text-gray-900">
                  {t('home.ways.manualCta')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== New Project / Fix Existing ===== */}
      <section className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow={t('home.modes.eyebrow')}
            title={t('home.modes.title')}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-3xl border border-gray-200 bg-white p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-pink-500">
                    <Rocket className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl font-semibold">{t('home.modes.newTitle')}</h3>
                </div>
                <p className="mt-4 text-gray-600">
                  {t('home.modes.newText')}
                </p>
                <ul className="mt-5 space-y-2 text-sm text-gray-600">
                  {[t('home.modes.newF1'), t('home.modes.newF2'), t('home.modes.newF3')].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/project-analysis?mode=new" className={`${primaryBtn} mt-7`}>
                  {t('home.modes.newCta')}
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="h-full rounded-3xl border border-gray-200 bg-white p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                    <Wrench className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl font-semibold">{t('home.modes.fixTitle')}</h3>
                </div>
                <p className="mt-4 text-gray-600">
                  {t('home.modes.fixText')}
                </p>
                <ul className="mt-5 space-y-2 text-sm text-gray-600">
                  {[t('home.modes.fixF1'), t('home.modes.fixF2'), t('home.modes.fixF3')].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/project-analysis?mode=existing" className={`${secondaryBtn} mt-7`}>
                  {t('home.modes.fixCta')}
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== What Your Analysis Includes ===== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow={t('home.includes.eyebrow')}
            title={t('home.includes.title')}
            sub={t('home.includes.sub')}
          />
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { icon: Gauge, labelKey: 'home.includes.health' },
              { icon: ListChecks, labelKey: 'home.includes.summary' },
              { icon: Users, labelKey: 'home.includes.team' },
              { icon: Clock, labelKey: 'home.includes.hours' },
              { icon: DollarSign, labelKey: 'home.includes.cost' },
              { icon: CalendarRange, labelKey: 'home.includes.timeline' },
            ].map((item, i) => (
              <Reveal key={item.labelKey} delay={i * 0.05}>
                <div className="flex h-full flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-5 text-center">
                  <item.icon className="h-6 w-6 text-pink-600" aria-hidden="true" />
                  <span className="text-sm font-medium text-gray-700">{t(item.labelKey)}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Recommended Team + Pricing ===== */}
      <section className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow={t('home.pricing.eyebrow')}
            title={<>{t('home.pricing.title1')} <span className="text-gradient-ai">{t('home.pricing.title2')}</span></>}
            sub={t('home.pricing.sub')}
          />
          <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-gray-200">
            {DEMO_TEAM.map((m, i) => (
              <Reveal key={m.slug} delay={i * 0.05}>
                <div
                  className={`flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between ${
                    i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-gray-900">{t(`roles.${m.slug}`)}</p>
                    <p className="text-xs text-gray-500">{t(`home.pricing.blurbs.${m.slug}`)}</p>
                  </div>
                  <p className="text-lg font-bold text-pink-600">
                    ${m.rate}
                    <span className="text-xs font-normal text-gray-500">{t('common.perHour')}</span>
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-gray-400">{t('home.pricing.note')}</p>
        </div>
      </section>

      {/* ===== Why Choose SCS ===== */}
      <section id="why-scs" data-guide-id="home-benefits" className="py-20">
        <div className="container mx-auto px-4">
          <SectionHeading eyebrow={t('home.why.eyebrow')} title={t('home.why.title')} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BadgeCheck, titleKey: 'home.why.estimateTitle', textKey: 'home.why.estimateText' },
              { icon: ShieldCheck, titleKey: 'home.why.ownTitle', textKey: 'home.why.ownText' },
              { icon: Users, titleKey: 'home.why.teamTitle', textKey: 'home.why.teamText' },
              { icon: Clock, titleKey: 'home.why.demosTitle', textKey: 'home.why.demosText' },
            ].map((item, i) => (
              <Reveal key={item.titleKey} delay={i * 0.08}>
                <div className="h-full rounded-2xl border border-gray-200 bg-white p-6">
                  <item.icon className="h-7 w-7 text-pink-600" aria-hidden="true" />
                  <h3 className="mt-4 font-semibold text-gray-900">{t(item.titleKey)}</h3>
                  <p className="mt-2 text-sm text-gray-600">{t(item.textKey)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Services ===== */}
      <section id="services" data-guide-id="home-services" className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <SectionHeading eyebrow={t('home.servicesSection.eyebrow')} title={t('home.servicesSection.title')} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {SERVICES.map((s, i) => (
              <Reveal key={s.path} delay={i * 0.05}>
                <Link
                  to={s.path}
                  className="group flex h-full flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-5 text-center transition-colors hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                >
                  <s.icon className="h-7 w-7 text-pink-600 transition-transform group-hover:scale-110" aria-hidden="true" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{t(s.nameKey)}</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Portfolio ===== */}
      <section data-guide-id="home-portfolio" className="py-20">
        <div className="container mx-auto px-4">
          <SectionHeading eyebrow={t('home.portfolio.eyebrow')} title={t('home.portfolio.title')} />
          <div className="grid gap-6 md:grid-cols-3">
            {PORTFOLIO.map((item, i) => (
              <Reveal key={item.titleKey} delay={i * 0.08}>
                <article className="group h-full overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  <div className="overflow-hidden">
                    <img
                      src={item.image}
                      alt={t(item.titleKey)}
                      loading="lazy"
                      className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <span className="text-xs font-semibold uppercase tracking-wide text-pink-600">
                      {item.categoryKey ? t(item.categoryKey) : item.category}
                    </span>
                    <h3 className="mt-1 text-lg font-bold text-gray-900">{t(item.titleKey)}</h3>
                    <p className="mt-2 text-sm text-gray-600">{t(item.descKey)}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Testimonials ===== */}
      <section className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <SectionHeading eyebrow={t('home.testimonials.eyebrow')} title={t('home.testimonials.title')} />
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((item, i) => (
              <Reveal key={item.name} delay={i * 0.08}>
                <figure className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-7">
                  <div className="flex gap-1" aria-label={t('a11y.fiveStars')}>
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-current text-amber-400" aria-hidden="true" />
                    ))}
                  </div>
                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-gray-700">“{t(item.quoteKey)}”</blockquote>
                  <figcaption className="mt-5">
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.company}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Schedule a Call ===== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="glow-card mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl border border-gray-300 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 p-8 text-center sm:p-12">
              <Bot className="h-9 w-9 text-pink-600" aria-hidden="true" />
              <h2 className="text-2xl font-bold sm:text-3xl">{t('home.call.title')}</h2>
              <p className="max-w-xl text-gray-600">
                {t('home.call.text')}
              </p>
              <Link to="/schedule-call" className={primaryBtn}>
                {t('home.call.cta')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="relative overflow-hidden border-t border-gray-200 py-24">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-pink-100/70 to-transparent" aria-hidden="true" />
        <div className="container relative mx-auto px-4 text-center">
          <Reveal>
            <h2 className="mx-auto max-w-3xl text-3xl font-bold sm:text-4xl">
              {t('home.finalCta.title1')} <span className="text-gradient-ai">{t('home.finalCta.title2')}</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-600">
              {t('home.finalCta.sub')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/project-analysis" className={primaryBtn}>
                <Sparkles className="h-4 w-4" aria-hidden="true" /> {t('common.analyzeMyProject')}
              </Link>
              <Link to="/project-analysis?method=manual" className={secondaryBtn}>
                {t('common.startManually')}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
