import React from 'react';
import { Link } from 'react-router-dom';
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

const JOBS = [
  { title: 'React Native Developer Intern', openings: 2, location: 'Indore', experience: '0 - 1 Year' },
  { title: 'React.js Intern', openings: 2, location: 'Indore', experience: '0 - 1 Year' },
  { title: 'MERN Stack Intern', openings: 2, location: 'Indore', experience: '0 - 1 Year' },
  { title: 'UI/UX Designer Intern', openings: 1, location: 'Indore', experience: '0 - 1 Year' },
  { title: 'Business Development Executive (BDE) Intern', openings: 1, location: 'Indore', experience: '0 - 1 Year' },
  { title: 'Python Developer Intern', openings: 2, location: 'Indore', experience: '0 - 1 Year' },
  { title: 'AI/ML Developer Intern', openings: 1, location: 'Indore', experience: '0 - 1 Year' },
];

const BENEFITS = [
  {
    icon: GraduationCap,
    title: 'Learning & certifications',
    text: 'We encourage technical training and certifications to expose you to best practices in the industry.',
  },
  {
    icon: HeartHandshake,
    title: 'People-first mentoring',
    text: 'We focus on nurturing people skills so you can give your best performance at work.',
  },
  {
    icon: Scale,
    title: 'Work-life balance',
    text: 'We encourage and support a healthy balance between your work and your life.',
  },
  {
    icon: PartyPopper,
    title: 'Celebrations together',
    text: 'Diwali, Independence Day, birthdays, New Year and our Foundation Day — we celebrate as a team.',
  },
];

const EVENTS = [
  {
    title: 'Diwali Celebration',
    text: 'At SCS, we make sure the entire team celebrates Diwali by amalgamating prosperity and safety together.',
    image: 'https://www.scssoftwares.com/images/aa.png',
  },
  {
    title: 'Independence Day',
    text: 'Team SCS celebrated Independence Day with pride, honoring our freedom fighters and enjoying patriotic performances.',
    image: 'https://www.scssoftwares.com/images/cc.png',
  },
  {
    title: 'Birthday Celebrations',
    text: 'We celebrate every team member’s birthday with joy and appreciation — cake cutting, laughter and warm wishes.',
    image: 'https://www.scssoftwares.com/images/bb2.png',
  },
  {
    title: 'New Year Celebration',
    text: 'We welcome the New Year with positivity, team bonding and exciting celebrations — reflecting on achievements and setting new goals.',
    image: 'https://www.scssoftwares.com/images/dd.png',
  },
  {
    title: 'Foundation Day (22 December)',
    text: 'Foundation Day marks the beginning of our journey. We celebrate with gratitude, team spirit and pride in our achievements.',
    image: 'https://www.scssoftwares.com/images/ff.png',
  },
];

const HIRING_STEPS = [
  { icon: FileText, title: '1. Apply online', text: 'Send your application through our form — it takes just a few minutes.' },
  { icon: PhoneCall, title: '2. Screening call', text: 'A short call to get to know you, your interests and your availability.' },
  { icon: MessagesSquare, title: '3. Interview', text: 'A technical and culture-fit conversation with the team you’d join.' },
  { icon: BadgeCheck, title: '4. Offer & onboarding', text: 'Receive your offer and get a guided start with a mentor by your side.' },
];

const CareersPage = () => {
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
              <Briefcase className="h-3.5 w-3.5" aria-hidden="true" /> Careers at SCS Softwares
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Take Your Career to <span className="text-gradient-ai">New Heights</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              Join our team and shape the future of technology with us!
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="#openings" className={primaryBtn}>
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Explore Open Positions
              </a>
              <Link to="/ApplicationForm" className={secondaryBtn}>
                Apply Now
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Culture ===== */}
      <section className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow="Our culture"
            title="A Happy Place To Work"
            sub="At SCS, we believe in delivering remarkable experiences to both our customers and our team members."
          />

          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <div className="glow-card overflow-hidden rounded-3xl border border-gray-200 bg-white">
                <img
                  src="https://www.scssoftwares.com/images/reception.jpeg"
                  alt="SCS Softwares office reception"
                  loading="lazy"
                  className="h-64 w-full object-cover transition-transform duration-300 hover:scale-105 sm:h-80"
                />
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">Inclusion & diversity</span>
                <h3 className="mt-3 text-2xl font-bold text-gray-900">Everyone belongs here</h3>
                <p className="mt-4 leading-relaxed text-gray-600">
                  SCS believes that a diverse and inclusive environment establishes a sense of belonging among
                  employees. When people feel more connected at the workplace, it unleashes innovation and allows our
                  team to perform better every day.
                </p>
                <p className="mt-4 leading-relaxed text-gray-600">
                  Our purpose in conducting business is to serve our people, clients and communities while accelerating
                  equality for all. This commitment drives our innovation agenda and ensures we act as a responsible
                  business in society.
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
            eyebrow="Benefits"
            title={<>Why you'll love <span className="text-gradient-ai">working here</span></>}
            sub="Equal opportunities for everyone — and real support to grow, professionally and personally."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b, i) => (
              <Reveal key={b.title} delay={i * 0.08}>
                <div className="glow-card h-full rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-pink-300">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600">
                    <b.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-semibold text-gray-900">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{b.text}</p>
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
            eyebrow="Life @ SCS"
            title="We work hard, we celebrate harder"
            sub="A look at the moments that make SCS feel like family."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {EVENTS.map((event, i) => (
              <Reveal key={event.title} delay={i * 0.08}>
                <article className="group h-full overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors hover:border-pink-300">
                  <div className="overflow-hidden">
                    <img
                      src={event.image}
                      alt={event.title}
                      loading="lazy"
                      className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-gray-900">{event.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{event.text}</p>
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
            eyebrow="Open positions"
            title="Join our team"
            sub="Begin a professionally, financially and personally rewarding career with us. Find the right role for you and apply."
          />
          <div className="mx-auto max-w-4xl space-y-4">
            {JOBS.map((job, i) => (
              <Reveal key={job.title} delay={i * 0.05}>
                <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-pink-300 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{job.title}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-pink-600" aria-hidden="true" /> {job.openings}{' '}
                        {job.openings === 1 ? 'opening' : 'openings'}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-pink-600" aria-hidden="true" /> {job.location}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-pink-600" aria-hidden="true" /> {job.experience}
                      </span>
                    </div>
                  </div>
                  <Link
                    to="/ApplicationForm"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-pink-400/30 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                  >
                    Apply Now <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
            eyebrow="Hiring process"
            title={<>From application to offer in <span className="text-gradient-ai">4 steps</span></>}
            sub="A simple, transparent process — you'll always know where you stand."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HIRING_STEPS.map((step, i) => (
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

      {/* ===== Application CTA ===== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="glow-card mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl border border-gray-300 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 p-8 text-center sm:p-12">
              <Briefcase className="h-9 w-9 text-pink-600" aria-hidden="true" />
              <h2 className="text-2xl font-bold sm:text-3xl">Don't see your role listed?</h2>
              <p className="max-w-xl text-gray-600">
                We're always happy to hear from talented people. Send us your application and we'll reach out when a
                matching position opens up.
              </p>
              <Link to="/ApplicationForm" className={primaryBtn}>
                Send Your Application <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
