import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Award,
  Target,
  Heart,
  Sparkles,
  ArrowRight,
  FileSearch,
  Palette,
  Code,
  Rocket,
  BadgeCheck,
  ShieldCheck,
  Clock,
  PhoneCall,
  Globe2,
  MapPin,
  Lightbulb,
  PackageCheck,
  Handshake,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Reveal from '../components/Reveal';
import { LOCATIONS_HUB } from '@/data/locationNav';
import { aboutRemoteDeliverySection } from '@/content/locations';
import { founderSection } from '@/content/founder';

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

const TEAM = [
  {
    name: 'Rohan Sahu',
    roleKey: 'about.team.role1',
    image: '/images/rohansahu.jpg',
    bioKey: 'about.team.bio1',
  },
  {
    name: 'Raju Burde',
    roleKey: 'about.team.role2',
    image: '/images/cto.jpg',
    bioKey: 'about.team.bio2',
  },
  {
    name: 'Sachin Basaiye',
    roleKey: 'about.team.role3',
    image: '/images/project.jpg',
    bioKey: 'about.team.bio3',
  },
  {
    name: 'Priyanka Dalwani',
    roleKey: 'about.team.role4',
    image: '/images/vp.jpg',
    bioKey: 'about.team.bio4',
  },
];

const VALUES = [
  { icon: Target, titleKey: 'about.values.innovationTitle', textKey: 'about.values.innovationText' },
  { icon: Users, titleKey: 'about.values.collaborationTitle', textKey: 'about.values.collaborationText' },
  { icon: Award, titleKey: 'about.values.excellenceTitle', textKey: 'about.values.excellenceText' },
  { icon: Heart, titleKey: 'about.values.passionTitle', textKey: 'about.values.passionText' },
];

const APPROACH = [
  { icon: FileSearch, titleKey: 'about.approach.s1Title', textKey: 'about.approach.s1Text' },
  { icon: Palette, titleKey: 'about.approach.s2Title', textKey: 'about.approach.s2Text' },
  { icon: Code, titleKey: 'about.approach.s3Title', textKey: 'about.approach.s3Text' },
  { icon: Rocket, titleKey: 'about.approach.s4Title', textKey: 'about.approach.s4Text' },
];

/**
 * One icon per founding reason, positional. The copy itself lives in
 * `@/content/founder` so the story and the tests read the same words; only the
 * decoration is chosen here.
 */
const FOUNDING_REASON_ICONS = [Lightbulb, PackageCheck, Handshake];

const WHY_SCS = [
  { icon: BadgeCheck, titleKey: 'home.why.estimateTitle', textKey: 'home.why.estimateText' },
  { icon: ShieldCheck, titleKey: 'home.why.ownTitle', textKey: 'home.why.ownText' },
  { icon: Users, titleKey: 'home.why.teamTitle', textKey: 'home.why.teamText' },
  { icon: Clock, titleKey: 'home.why.demosTitle', textKey: 'home.why.demosText' },
];

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <main id="main-content">
      {/* ===== Hero ===== */}
      <section data-guide-id="about-hero" className="relative overflow-hidden">
        <div className="bg-grid-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[50rem] -translate-x-1/2 animate-pulse-glow rounded-full bg-pink-200/60 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-purple-200/50 blur-3xl" aria-hidden="true" />

        <div className="container relative mx-auto px-4 py-20 text-center sm:py-28">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-pink-50 px-4 py-1.5 text-xs font-medium text-pink-700">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {t('about.badge')}
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              {t('about.heroTitle1')} <span className="text-gradient-ai">SCS Softwares</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              {t('about.heroSub')}
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/contact" className={primaryBtn}>
                {t('about.workWithUs')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/careers" className={secondaryBtn}>
                {t('about.joinTeam')}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Founder & company story =====
          The section that answers "who founded SCS Softwares". Everything
          rendered here is real HTML text, not baked into the photograph, and
          every sentence comes from `@/content/founder` — the single owner-
          verified source the Person JSON-LD and the tests also read. The `id`
          is the fragment the Person node's @id and url point at, so the
          identifier a crawler follows lands on this story. */}
      <section id="founder" className="border-t border-gray-200 py-20 scroll-mt-24">
        <div className="container mx-auto px-4">
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
            <Reveal>
              <div className="glow-card overflow-hidden rounded-3xl border border-gray-200 bg-white">
                <img
                  src={founderSection.imageSrc}
                  alt={founderSection.imageAlt}
                  loading="lazy"
                  width={founderSection.imageWidth}
                  height={founderSection.imageHeight}
                  className="h-72 w-full object-cover sm:h-80"
                />
                <div className="p-6">
                  {/* Name and designation as plain text, so a crawler and a
                      screen reader read exactly what a visitor sees. */}
                  <p className="text-lg font-bold text-gray-900">{founderSection.name}</p>
                  <p className="text-sm font-semibold text-pink-600">{founderSection.jobTitle}</p>
                  <p className="mt-3 flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" aria-hidden="true" />
                    <span>{founderSection.origin}</span>
                  </p>
                  <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                    {founderSection.credentials.map((credential) => (
                      <li key={credential} className="flex items-start gap-2 text-sm text-gray-600">
                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" aria-hidden="true" />
                        <span>{credential}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">
                  {founderSection.eyebrow}
                </span>
                <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
                  {founderSection.heading}
                </h2>
                {founderSection.story.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="mt-5 leading-relaxed text-gray-600">
                    {paragraph}
                  </p>
                ))}

                <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                  {founderSection.trackRecord.map((fact) => (
                    /* `flex-col-reverse` puts the figure above its label
                       visually while keeping the <dt> before its <dd> in the
                       DOM, which is the order a definition list requires. */
                    <div
                      key={fact.label}
                      className="flex flex-col-reverse rounded-2xl border border-gray-200 bg-white px-4 py-5"
                    >
                      <dt className="mt-1 text-xs leading-relaxed text-gray-500">{fact.label}</dt>
                      <dd className="text-2xl font-bold text-gray-900">{fact.value}</dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-8 leading-relaxed text-gray-600">{founderSection.ctaText}</p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link to={founderSection.primaryCta.path} className={primaryBtn}>
                    {founderSection.primaryCta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link to={founderSection.secondaryCta.path} className={secondaryBtn}>
                    {founderSection.secondaryCta.label}
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>

          {/* ===== Why SCS Softwares was founded =====
              A subsection of the founder story, so it stays at H3 under the
              section's single H2. */}
          <div className="mt-16 border-t border-gray-200 pt-12">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <h3 className="text-2xl font-bold text-gray-900 sm:text-3xl">{founderSection.whyHeading}</h3>
                <p className="mt-4 text-gray-600">{founderSection.whyIntro}</p>
              </div>
            </Reveal>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {founderSection.reasons.map((reason, i) => {
                const Icon = FOUNDING_REASON_ICONS[i] ?? Lightbulb;
                return (
                  <Reveal key={reason.title} delay={i * 0.08}>
                    <div className="glow-card h-full rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-pink-300">
                      <Icon className="h-7 w-7 text-pink-600" aria-hidden="true" />
                      <h4 className="mt-4 font-semibold text-gray-900">{reason.title}</h4>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">{reason.body}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Mission & Values ===== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow={t('about.values.eyebrow')}
            title={t('about.values.title')}
            sub={t('about.values.sub')}
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value, i) => (
              <Reveal key={value.titleKey} delay={i * 0.08}>
                <div className="glow-card h-full rounded-2xl border border-gray-200 bg-white p-6 text-center transition-colors hover:border-pink-300">
                  <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600">
                    <value.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-semibold text-gray-900">{t(value.titleKey)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{t(value.textKey)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Team ===== */}
      <section className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow={t('about.team.eyebrow')}
            title={t('about.team.title')}
            sub={t('about.team.sub')}
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((member, i) => (
              <Reveal key={member.name} delay={i * 0.08}>
                <article className="group h-full rounded-2xl border border-gray-200 bg-white p-6 text-center transition-colors hover:border-pink-300">
                  <img
                    src={member.image}
                    alt={member.name}
                    loading="lazy"
                    width={112}
                    height={112}
                    className="mx-auto h-28 w-28 rounded-full object-cover ring-2 ring-gray-100 transition-transform duration-300 group-hover:scale-105 group-hover:ring-pink-200"
                  />
                  <h3 className="mt-4 font-semibold text-gray-900">{member.name}</h3>
                  <p className="text-sm font-medium text-pink-600">{t(member.roleKey)}</p>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{t(member.bioKey)}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Working approach ===== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow={t('about.approach.eyebrow')}
            title={<>{t('about.approach.title1')} <span className="text-gradient-ai">{t('about.approach.title2')}</span></>}
            sub={t('about.approach.sub')}
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {APPROACH.map((step, i) => (
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

      {/* ===== Remote delivery ===== */}
      <section id="remote-delivery" className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="mx-auto max-w-3xl">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">
                {aboutRemoteDeliverySection.eyebrow}
              </span>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
                {aboutRemoteDeliverySection.title}
              </h2>
              {aboutRemoteDeliverySection.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="mt-5 leading-relaxed text-gray-600">
                  {paragraph}
                </p>
              ))}
              <Link
                to={LOCATIONS_HUB.path}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-pink-300 bg-white px-5 py-3 text-sm font-semibold text-pink-700 transition-colors hover:border-pink-400 hover:bg-pink-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              >
                <Globe2 className="h-4 w-4" aria-hidden="true" /> {aboutRemoteDeliverySection.linkLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Why Choose SCS ===== */}
      <section className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <SectionHeading eyebrow={t('home.why.eyebrow')} title={t('home.why.title')} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_SCS.map((item, i) => (
              <Reveal key={item.titleKey} delay={i * 0.08}>
                <div className="h-full rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-pink-300">
                  <item.icon className="h-7 w-7 text-pink-600" aria-hidden="true" />
                  <h3 className="mt-4 font-semibold text-gray-900">{t(item.titleKey)}</h3>
                  <p className="mt-2 text-sm text-gray-600">{t(item.textKey)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Contact CTA ===== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="glow-card mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl border border-gray-300 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 p-8 text-center sm:p-12">
              <PhoneCall className="h-9 w-9 text-pink-600" aria-hidden="true" />
              <h2 className="text-2xl font-bold sm:text-3xl">{t('about.cta.title')}</h2>
              <p className="max-w-xl text-gray-600">
                {t('about.cta.text')}
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/contact" className={primaryBtn}>
                  {t('common.contactUs')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
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

export default About;
