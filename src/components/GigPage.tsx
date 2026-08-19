import React from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Reveal from './Reveal';
import { ArrowRight, CheckCircle, Star, Sparkles, PhoneCall, Users, Clock, DollarSign, CalendarRange } from 'lucide-react';

interface GigPageProps {
  title: string;
  description: string;
  icon: React.ElementType;
  heroImage: string;
  features: string[];
  technologies: string[];
  process: { step: string; description: string }[];
  pricing: { plan: string; price: string; features: string[] }[];
  testimonials: { name: string; company: string; quote: string; image: string }[];
  portfolio: { title: string; description: string; image: string }[];
}

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

const GigPage: React.FC<GigPageProps> = ({
  title,
  description,
  icon: Icon,
  heroImage,
  features,
  technologies,
  process,
  testimonials,
  portfolio,
}) => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

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
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" /> Our services
                </span>
              </Reveal>
              <Reveal delay={0.1}>
                <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl">
                  <span className="text-gradient-ai">{title}</span>
                </h1>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="mt-6 text-lg leading-relaxed text-gray-600">{description}</p>
              </Reveal>
              <Reveal delay={0.3}>
                <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                  <Link to="/contact" className={primaryBtn}>
                    Get Started <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link to="/contact" className={secondaryBtn}>
                    Get Quote
                  </Link>
                </div>
              </Reveal>
            </div>
            <Reveal delay={0.2}>
              <div className="glow-card overflow-hidden rounded-3xl border border-gray-200 bg-white">
                <img
                  src={heroImage}
                  alt={title}
                  loading="lazy"
                  className="h-64 w-full object-cover transition-transform duration-300 hover:scale-105 sm:h-80 lg:h-96"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow="What's included"
            title={<>Why choose our <span className="text-gradient-ai">{title}</span> services?</>}
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
          <SectionHeading eyebrow="Tech stack" title={<>Technologies we <span className="text-gradient-ai">use</span></>} />
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
          <SectionHeading eyebrow="How we work" title={<>Our <span className="text-gradient-ai">process</span></>} />
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
          <SectionHeading eyebrow="Portfolio" title={<>Related <span className="text-gradient-ai">projects</span></>} />
          <div className="grid gap-6 md:grid-cols-3">
            {portfolio.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.08}>
                <article className="group h-full overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors hover:border-pink-300">
                  <div className="overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
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

      {/* ===== Testimonials ===== */}
      <section className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <SectionHeading eyebrow="Testimonials" title="What our clients say" />
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Reveal key={testimonial.name} delay={index * 0.08}>
                <figure className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-7">
                  <div className="flex gap-1" aria-label="5 out of 5 stars">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current text-amber-400" aria-hidden="true" />
                    ))}
                  </div>
                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-gray-700">“{testimonial.quote}”</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-sm font-bold text-white">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{testimonial.name}</p>
                      <p className="text-xs text-gray-500">{testimonial.company}</p>
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Project Estimate ===== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow="Project estimate"
            title={<>Know your project cost <span className="text-gradient-ai">before you hire</span></>}
            sub={`Share your ${title.toLowerCase()} idea and get an estimated team, development hours, cost and delivery timeline — free, no signup.`}
          />
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: Users, label: 'Recommended team' },
              { icon: Clock, label: 'Hours per role' },
              { icon: DollarSign, label: 'Cost breakdown' },
              { icon: CalendarRange, label: 'Delivery timeline' },
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
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Estimate My Project
              </Link>
              <Link to="/project-analysis?method=manual" className={secondaryBtn}>
                Start Manually
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
              <h2 className="text-2xl font-bold sm:text-3xl">Ready to get started?</h2>
              <p className="max-w-xl text-gray-600">
                Let's discuss your {title.toLowerCase()} project and how we can help you achieve your goals.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/contact" className={primaryBtn}>
                  Start Your Project Today <ArrowRight className="h-4 w-4" aria-hidden="true" />
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

export default GigPage;
