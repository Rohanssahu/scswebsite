import React from 'react';
import { Link } from 'react-router-dom';
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
  { role: 'Requirement Analyst', rate: 5, blurb: 'Turns your idea into a build-ready specification' },
  { role: 'UI/UX Designer', rate: 10, blurb: 'Wireframes and pixel-perfect screens' },
  { role: 'Frontend Developer', rate: 15, blurb: 'React / mobile interfaces your users touch' },
  { role: 'Backend Developer', rate: 20, blurb: 'APIs, databases, payments and security' },
  { role: 'QA Tester', rate: 10, blurb: 'Catches bugs before your customers do' },
];

const SERVICES = [
  { icon: Code, title: 'Web Development', path: '/gig/web-development' },
  { icon: Smartphone, title: 'Mobile Apps', path: '/gig/mobile-development' },
  { icon: Palette, title: 'UI/UX Design', path: '/gig/ui-ux-design' },
  { icon: Cloud, title: 'Cloud Solutions', path: '/gig/cloud-solutions' },
  { icon: Settings, title: 'DevOps', path: '/gig/devops-services' },
  { icon: TrendingUp, title: 'Digital Marketing', path: '/gig/digital-marketing' },
];

const PORTFOLIO = [
  {
    title: 'E-commerce Platform',
    category: 'Web Development',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop',
    description: 'A modern e-commerce platform with advanced features and a seamless checkout experience.',
  },
  {
    title: 'Healthcare Mobile App',
    category: 'Mobile Development',
    image:
      'https://blog.elxoinc.com/hubfs/Website%20Images/Blogs/Modern%20Healthcare%20App%20Development%E2%80%99s%20Role%20in%20Staff%20%26%20IT%20Partnerships.jpg',
    description: 'HIPAA-compliant mobile application for healthcare providers and patients.',
  },
  {
    title: 'FinTech Dashboard',
    category: 'Web Development',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
    description: 'Real-time financial dashboard with advanced analytics and reporting.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Sarah Johnson',
    company: 'TechStart Inc.',
    quote:
      'SCS Softwares delivered an exceptional web application that exceeded our expectations. Professional, responsive and highly skilled.',
  },
  {
    name: 'Michael Chen',
    company: 'Digital Ventures',
    quote:
      'Working with SCS Softwares was a game-changer. They transformed our idea into a powerful mobile app our users love.',
  },
  {
    name: 'Emily Rodriguez',
    company: 'Growth Marketing Co.',
    quote: 'Their upfront estimate matched the final delivery almost exactly — no surprises, just steady weekly progress.',
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
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> AI-style project estimator · Demo analysis
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Know Your Project Cost <span className="text-gradient-ai">Before You Hire</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              Share a new idea or upload an existing project. Get an estimated team, development hours, cost and
              delivery timeline before hiring SCS Softwares.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/project-analysis" className={primaryBtn}>
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Analyze My Project
              </Link>
              <Link to="/project-analysis?method=manual" className={secondaryBtn}>
                <ClipboardList className="h-4 w-4" aria-hidden="true" /> Start Manually
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.4}>
            <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { value: '500+', label: 'Happy clients' },
                { value: '1000+', label: 'Projects delivered' },
                { value: '10+', label: 'Years experience' },
                { value: '98%', label: 'Client satisfaction' },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-gray-200 bg-white px-4 py-5">
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== How It Works ===== */}
      <section className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow="How it works"
            title={<>From idea to estimate in <span className="text-gradient-ai">minutes</span></>}
            sub="No sales calls required to see the numbers. Answer a few questions and get a demo analysis instantly."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: FileSearch, title: '1. Describe your project', text: 'A new idea or an existing app that needs fixing — chat with the demo assistant or fill a short form.' },
              { icon: Bot, title: '2. Demo analysis runs', text: 'Our estimator identifies scope, required skills and effort using transparent example logic.' },
              { icon: Users, title: '3. See team & cost', text: 'Get a recommended team with hours per role, hourly rates, total cost and delivery timeline.' },
              { icon: PhoneCall, title: '4. Confirm on a call', text: 'An SCS consultant reviews everything with you and confirms the final scope and quote.' },
            ].map((step, i) => (
              <Reveal key={step.title} delay={i * 0.08}>
                <div className="glow-card h-full rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-pink-300">
                  <step.icon className="h-7 w-7 text-pink-600" aria-hidden="true" />
                  <h3 className="mt-4 font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.text}</p>
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
            eyebrow="Two ways to start"
            title="Guided by AI, or hands-on manual"
            sub="Both paths ask the same questions and produce the same analysis — switch anytime without losing answers."
          />
          <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
            <Reveal>
              <div className="glow-card h-full rounded-2xl border border-gray-200 bg-white p-7">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600">
                  <Sparkles className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">AI Assistant flow</h3>
                <p className="mt-2 text-sm text-gray-600">
                  A friendly chat asks one question at a time with quick-reply chips, progress tracking and the option
                  to edit any answer. <span className="text-amber-700">Demo assistant — scripted, no live AI.</span>
                </p>
                <Link to="/project-analysis" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-pink-600 hover:text-gray-900">
                  Start with AI <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="glow-card h-full rounded-2xl border border-gray-200 bg-white p-7">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                  <ClipboardList className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">Manual form flow</h3>
                <p className="mt-2 text-sm text-gray-600">
                  A step-by-step form with validation, technology selectors, drag-and-drop references and automatic
                  draft saving in your browser.
                </p>
                <Link to="/project-analysis?method=manual" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-pink-600 hover:text-gray-900">
                  Fill the form <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
            eyebrow="Start anywhere"
            title="New build or project rescue — we do both"
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-3xl border border-gray-200 bg-white p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-pink-500">
                    <Rocket className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl font-semibold">New Project</h3>
                </div>
                <p className="mt-4 text-gray-600">
                  Have an idea for a web or mobile product? Describe what you want to build, who it's for and which
                  features matter — the estimator maps it to a team and timeline.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-gray-600">
                  {['MVP-first scoping to launch faster', 'Web, mobile or both', 'Login, payments and admin panels covered'].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/project-analysis?mode=new" className={`${primaryBtn} mt-7`}>
                  Estimate a new project
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="h-full rounded-3xl border border-gray-200 bg-white p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                    <Wrench className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl font-semibold">Fix Existing Project</h3>
                </div>
                <p className="mt-4 text-gray-600">
                  Stuck with a broken, slow or half-finished app? Tell us what works, what's broken and what's missing —
                  get a demo health check and a rescue plan.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-gray-600">
                  {['Code audit before any new work', 'Critical fixes first, features second', 'Works with React, Node, PHP, WordPress & more'].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/project-analysis?mode=existing" className={`${secondaryBtn} mt-7`}>
                  Analyze my project
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
            eyebrow="Demo analysis"
            title="What your analysis includes"
            sub="Every demo report covers the numbers clients actually ask about."
          />
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { icon: Gauge, label: 'Project health score' },
              { icon: ListChecks, label: 'Requirement summary' },
              { icon: Users, label: 'Recommended team' },
              { icon: Clock, label: 'Hours per role' },
              { icon: DollarSign, label: 'Cost breakdown' },
              { icon: CalendarRange, label: 'Delivery timeline' },
            ].map((item, i) => (
              <Reveal key={item.label} delay={i * 0.05}>
                <div className="flex h-full flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-5 text-center">
                  <item.icon className="h-6 w-6 text-pink-600" aria-hidden="true" />
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
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
            eyebrow="Transparent hourly pricing"
            title={<>A full team, <span className="text-gradient-ai">priced openly</span></>}
            sub="Example roles and demo rates — your analysis recommends the exact mix for your project."
          />
          <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-gray-200">
            {DEMO_TEAM.map((m, i) => (
              <Reveal key={m.role} delay={i * 0.05}>
                <div
                  className={`flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between ${
                    i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-gray-900">{m.role}</p>
                    <p className="text-xs text-gray-500">{m.blurb}</p>
                  </div>
                  <p className="text-lg font-bold text-pink-600">
                    ${m.rate}
                    <span className="text-xs font-normal text-gray-500">/hour</span>
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-gray-400">Demo rates for illustration — confirmed in your final quote.</p>
        </div>
      </section>

      {/* ===== Why Choose SCS ===== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <SectionHeading eyebrow="Why SCS Softwares" title="Built to be the safest way to hire developers" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BadgeCheck, title: 'Estimate before commitment', text: 'See team, cost and timeline before you spend a rupee.' },
              { icon: ShieldCheck, title: 'You own everything', text: 'Source code, designs and infrastructure are yours from day one.' },
              { icon: Users, title: 'Dedicated team', text: 'A project manager plus named developers — not a rotating pool.' },
              { icon: Clock, title: 'Weekly demos', text: 'Progress you can click every week, not status reports.' },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 0.08}>
                <div className="h-full rounded-2xl border border-gray-200 bg-white p-6">
                  <item.icon className="h-7 w-7 text-pink-600" aria-hidden="true" />
                  <h3 className="mt-4 font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Services ===== */}
      <section id="services" className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <SectionHeading eyebrow="Services" title="Everything under one roof" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {SERVICES.map((s, i) => (
              <Reveal key={s.path} delay={i * 0.05}>
                <Link
                  to={s.path}
                  className="group flex h-full flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-5 text-center transition-colors hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                >
                  <s.icon className="h-7 w-7 text-pink-600 transition-transform group-hover:scale-110" aria-hidden="true" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{s.title}</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Portfolio ===== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <SectionHeading eyebrow="Portfolio" title="Recent case studies" />
          <div className="grid gap-6 md:grid-cols-3">
            {PORTFOLIO.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.08}>
                <article className="group h-full overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  <div className="overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <span className="text-xs font-semibold uppercase tracking-wide text-pink-600">{item.category}</span>
                    <h3 className="mt-1 text-lg font-bold text-gray-900">{item.title}</h3>
                    <p className="mt-2 text-sm text-gray-600">{item.description}</p>
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
          <SectionHeading eyebrow="Testimonials" title="What our clients say" />
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.08}>
                <figure className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-7">
                  <div className="flex gap-1" aria-label="5 out of 5 stars">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-current text-amber-400" aria-hidden="true" />
                    ))}
                  </div>
                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-gray-700">“{t.quote}”</blockquote>
                  <figcaption className="mt-5">
                    <p className="font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.company}</p>
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
              <PhoneCall className="h-9 w-9 text-pink-600" aria-hidden="true" />
              <h2 className="text-2xl font-bold sm:text-3xl">Prefer to talk it through?</h2>
              <p className="max-w-xl text-gray-600">
                Book a free 30-minute call. We'll review your idea or existing project, answer questions and confirm a
                real quote — no obligation.
              </p>
              <Link to="/schedule-call" className={primaryBtn}>
                Schedule a Call <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
              Stop guessing. <span className="text-gradient-ai">See your project's numbers today.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-600">
              Free demo analysis · no signup · results in under 3 minutes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/project-analysis" className={primaryBtn}>
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Analyze My Project
              </Link>
              <Link to="/project-analysis?method=manual" className={secondaryBtn}>
                Start Manually
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
