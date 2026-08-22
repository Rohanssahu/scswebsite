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
  Boxes,
  BrainCircuit,
  Layers,
  LayoutDashboard,
  MessagesSquare,
  Mic,
  RefreshCw,
  Video,
  Workflow,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Globe2,
  MapPin,
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
import VisualPlaceholder from '../components/VisualPlaceholder';
import { AI_SERVICE_NAV, CORE_SERVICE_NAV, OTHER_SERVICE_NAV, SERVICES_HUB } from '@/data/serviceNav';
import { LOCATION_NAV, LOCATIONS_HUB } from '@/data/locationNav';
import { homeInternationalSection } from '@/content/locations';

const DEMO_TEAM = [
  { slug: 'requirement-analyst', rate: 5 },
  { slug: 'ui-ux-designer', rate: 10 },
  { slug: 'frontend-developer', rate: 15 },
  { slug: 'backend-developer', rate: 20 },
  { slug: 'qa-tester', rate: 10 },
];

// The five canonical software-development pages lead the section, then the AI
// pages, then the supporting design, cloud, delivery and growth pages. Paths
// come from the same shared nav list the header and footer use.
const CORE_SERVICE_ICONS: Record<string, React.ElementType> = {
  'custom-software-development': Boxes,
  'mobile-app-development': Smartphone,
  'web-application-development': LayoutDashboard,
  'saas-development': Layers,
  'software-modernization': RefreshCw,
};

const CORE_SERVICES = CORE_SERVICE_NAV.map((service) => ({
  icon: CORE_SERVICE_ICONS[service.nameKey] ?? Code,
  nameKey: `services.names.${service.nameKey}`,
  path: service.path,
}));

const AI_SERVICE_ICONS: Record<string, React.ElementType> = {
  'ai-development': Sparkles,
  'machine-learning-development': BrainCircuit,
  'ai-voice-agent-development': Mic,
  'ai-video-consultation-agents': Video,
  'conversational-ai-development': MessagesSquare,
  'ai-automation-integration': Workflow,
};

const AI_SERVICES = AI_SERVICE_NAV.map((service) => ({
  icon: AI_SERVICE_ICONS[service.nameKey] ?? Sparkles,
  nameKey: `services.names.${service.nameKey}`,
  path: service.path,
}));

const OTHER_SERVICE_ICONS: Record<string, React.ElementType> = {
  'ui-ux-design': Palette,
  'cloud-solutions': Cloud,
  'devops-engineering': Settings,
  'digital-marketing': TrendingUp,
};

const OTHER_SERVICES = OTHER_SERVICE_NAV.map((service) => ({
  icon: OTHER_SERVICE_ICONS[service.nameKey] ?? Code,
  nameKey: `services.names.${service.nameKey}`,
  path: service.path,
}));

// Category tiles instead of the stock photos that used to be hotlinked from
// Unsplash and another company's blog CDN — none of them showed our work.
const PORTFOLIO: {
  titleKey: string;
  categoryKey: string;
  icon: React.ElementType;
  gradient: string;
  descKey: string;
}[] = [
  {
    titleKey: 'home.portfolio.p1Title',
    categoryKey: 'services.names.web-development',
    icon: Code,
    gradient: 'from-pink-500 to-purple-600',
    descKey: 'home.portfolio.p1Desc',
  },
  {
    titleKey: 'home.portfolio.p2Title',
    categoryKey: 'services.names.mobile-apps',
    icon: Smartphone,
    gradient: 'from-orange-400 to-pink-500',
    descKey: 'home.portfolio.p2Desc',
  },
  {
    titleKey: 'home.portfolio.p3Title',
    categoryKey: 'services.names.web-development',
    icon: Gauge,
    gradient: 'from-purple-500 to-pink-500',
    descKey: 'home.portfolio.p3Desc',
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

      <main id="main-content">
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
              {/* Every figure here is verifiable on this site: the founding year on
                  the About page, the six service pages, the product catalogue
                  and the three shipped locales. The previous set (500+ clients,
                  1000+ projects, 10+ years, 98% satisfaction) had no evidence
                  behind it and contradicted the 2018 founding date. */}
              {[
                { value: '2018', labelKey: 'home.stats.founded' },
                { value: '6', labelKey: 'home.stats.services' },
                { value: '16', labelKey: 'home.stats.products' },
                { value: '3', labelKey: 'home.stats.languages' },
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

          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">
            {t('nav.softwareDevelopment')}
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {CORE_SERVICES.map((s, i) => (
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

          <h3 className="mb-4 mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">
            {t('nav.aiDevelopment')}
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {AI_SERVICES.map((s, i) => (
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

          <h3 className="mb-4 mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">
            {t('nav.moreServices')}
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {OTHER_SERVICES.map((s, i) => (
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

          <Reveal delay={0.1}>
            <div className="mt-8 text-center">
              <Link
                to={SERVICES_HUB.path}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-pink-700 transition-colors hover:text-pink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              >
                {t('nav.allServices')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== International delivery ===== */}
      <section id="international-delivery" className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow={homeInternationalSection.eyebrow}
            title={homeInternationalSection.title}
            sub={homeInternationalSection.sub}
          />
          <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
            {LOCATION_NAV.map((market, i) => (
              <Reveal key={market.path} delay={i * 0.06}>
                <Link
                  to={market.path}
                  className="group flex h-full items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                >
                  <span className="flex items-center gap-3">
                    <Globe2 className="h-6 w-6 shrink-0 text-pink-600" aria-hidden="true" />
                    <span className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">{market.label}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-pink-600" aria-hidden="true" />
                </Link>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-6 flex max-w-2xl items-start justify-center gap-2 text-center text-sm text-gray-600">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" aria-hidden="true" />
              <span>{homeInternationalSection.note}</span>
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-6 text-center">
              <Link
                to={LOCATIONS_HUB.path}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-pink-700 transition-colors hover:text-pink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              >
                {homeInternationalSection.linkLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
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
                  <VisualPlaceholder icon={item.icon} gradient={item.gradient} />
                  <div className="p-6">
                    <span className="text-xs font-semibold uppercase tracking-wide text-pink-600">
                      {t(item.categoryKey)}
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

      </main>

      <Footer />
    </div>
  );
};

export default Index;
