import React from 'react';
import { Link } from 'react-router-dom';
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

const TEAM = [
  {
    name: 'Rohan Sahu',
    role: 'CEO & Founder',
    image: 'https://scssoftwares.com/images/rohansahu.jpeg',
    bio: 'Tech entrepreneur with 9+ years of experience in software development and business strategy.',
  },
  {
    name: 'Raju Burde',
    role: 'CTO',
    image: 'https://scssoftwares.com/images/cto.png',
    bio: 'Expert in scalable architecture and emerging technologies with a passion for innovation.',
  },
  {
    name: 'Sachin Basaiye',
    role: 'Project Manager',
    image: 'https://scssoftwares.com/images/project.png',
    bio: 'Creative Project Manager focused on user-centered strategies and delivering exceptional digital experiences.',
  },
  {
    name: 'Priyanka Dalwani',
    role: 'VP of Marketing',
    image: 'https://scssoftwares.com/images/vp.png',
    bio: 'Digital marketing strategist helping businesses grow their online presence and reach.',
  },
];

const VALUES = [
  { icon: Target, title: 'Innovation', description: 'We stay ahead of technology trends to deliver cutting-edge solutions.' },
  { icon: Users, title: 'Collaboration', description: 'We work closely with our clients as partners in their success.' },
  { icon: Award, title: 'Excellence', description: 'We maintain the highest standards in everything we do.' },
  { icon: Heart, title: 'Passion', description: 'We love what we do and it shows in our work quality.' },
];

const APPROACH = [
  { icon: FileSearch, title: '1. Discover', text: 'We start by understanding your business, users and goals before writing a single line of code.' },
  { icon: Palette, title: '2. Design', text: 'Wireframes and pixel-perfect screens shape the product together with you, iteration by iteration.' },
  { icon: Code, title: '3. Build', text: 'A dedicated team develops in short cycles with weekly demos, so you always see real progress.' },
  { icon: Rocket, title: '4. Launch & support', text: 'We ship, monitor and keep improving — your product stays fast, secure and up to date.' },
];

const WHY_SCS = [
  { icon: BadgeCheck, title: 'Estimate before commitment', text: 'See team, cost and timeline before you spend a rupee.' },
  { icon: ShieldCheck, title: 'You own everything', text: 'Source code, designs and infrastructure are yours from day one.' },
  { icon: Users, title: 'Dedicated team', text: 'A project manager plus named developers — not a rotating pool.' },
  { icon: Clock, title: 'Weekly demos', text: 'Progress you can click every week, not status reports.' },
];

const About = () => {
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
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> About us
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              About <span className="text-gradient-ai">SCS Softwares</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              We're a passionate team of developers, designers and digital strategists committed to transforming
              businesses through innovative technology solutions.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/contact" className={primaryBtn}>
                Work with us <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/careers" className={secondaryBtn}>
                Join the team
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Story ===== */}
      <section className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">Our story</span>
                <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
                  From a small team to a <span className="text-gradient-ai">trusted partner</span>
                </h2>
                <p className="mt-6 leading-relaxed text-gray-600">
                  Founded in 2018, SCS Softwares began as a small team of passionate developers who believed technology
                  could solve complex business challenges. Today, we've grown into a leading software development
                  company serving clients worldwide.
                </p>
                <p className="mt-4 leading-relaxed text-gray-600">
                  Our journey has been marked by continuous learning, innovation and a commitment to delivering
                  exceptional results. We've helped over 500 businesses transform their operations and achieve their
                  digital goals.
                </p>
                <p className="mt-4 leading-relaxed text-gray-600">
                  At SCS Softwares, we don't just write code — we craft solutions that make a real difference in
                  people's lives and businesses.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="glow-card overflow-hidden rounded-3xl border border-gray-200 bg-white">
                <img
                  src="https://www.scssoftwares.com/images/inside.jpeg"
                  alt="Inside the SCS Softwares office"
                  loading="lazy"
                  className="h-72 w-full object-cover transition-transform duration-300 hover:scale-105 sm:h-96"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== Mission & Values ===== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow="Mission & values"
            title="What we stand for"
            sub="These core values guide everything we do and shape our company culture."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value, i) => (
              <Reveal key={value.title} delay={i * 0.08}>
                <div className="glow-card h-full rounded-2xl border border-gray-200 bg-white p-6 text-center transition-colors hover:border-pink-300">
                  <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600">
                    <value.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-semibold text-gray-900">{value.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{value.description}</p>
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
            eyebrow="Our team"
            title="Meet the people behind SCS"
            sub="Our diverse team of experts brings together years of experience and a shared passion for excellence."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((member, i) => (
              <Reveal key={member.name} delay={i * 0.08}>
                <article className="group h-full rounded-2xl border border-gray-200 bg-white p-6 text-center transition-colors hover:border-pink-300">
                  <img
                    src={member.image}
                    alt={member.name}
                    loading="lazy"
                    className="mx-auto h-28 w-28 rounded-full object-cover ring-2 ring-gray-100 transition-transform duration-300 group-hover:scale-105 group-hover:ring-pink-200"
                  />
                  <h3 className="mt-4 font-semibold text-gray-900">{member.name}</h3>
                  <p className="text-sm font-medium text-pink-600">{member.role}</p>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{member.bio}</p>
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
            eyebrow="How we work"
            title={<>A clear path from idea to <span className="text-gradient-ai">launch</span></>}
            sub="Every project follows the same transparent process, so you always know what happens next."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {APPROACH.map((step, i) => (
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

      {/* ===== Why Choose SCS ===== */}
      <section className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <SectionHeading eyebrow="Why SCS Softwares" title="Built to be the safest way to hire developers" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_SCS.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.08}>
                <div className="h-full rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-pink-300">
                  <item.icon className="h-7 w-7 text-pink-600" aria-hidden="true" />
                  <h3 className="mt-4 font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{item.text}</p>
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
              <h2 className="text-2xl font-bold sm:text-3xl">Let's build something together</h2>
              <p className="max-w-xl text-gray-600">
                Tell us about your idea or existing project — we'll get back to you within 24 hours with the next
                steps.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/contact" className={primaryBtn}>
                  Contact us <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link to="/schedule-call" className={secondaryBtn}>
                  Schedule a call
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
