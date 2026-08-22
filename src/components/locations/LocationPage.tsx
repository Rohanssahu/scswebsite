import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle,
  Globe2,
  HelpCircle,
  Info,
  Mail,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
} from 'lucide-react';
import Header from '../Header';
import Footer from '../Footer';
import Reveal from '../Reveal';
import VisualPlaceholder from '../VisualPlaceholder';
import Breadcrumbs from '../services/Breadcrumbs';
import { LOCATIONS_HUB_PATH, locationBreadcrumb } from '@/content/locations';
import type { LocationContent, LocationSectionHeader } from '@/content/locations/types';

/**
 * Shared shell for every regional landing page.
 *
 * Layout, gradients and cards are the site's existing design system. Every word
 * comes from that country's own content module, so the three pages share a
 * structure without sharing copy — and `locationPages.test.tsx` fails if they
 * start to.
 *
 * Two deliberate design decisions:
 *
 *   - No national flags, skylines or office photography. The regional hero uses
 *     the same locally rendered gradient tile the rest of the site uses, so
 *     nothing on the page can read as a picture of a place we are not in.
 *   - The India-delivery disclosure is the first block under the hero, in normal
 *     body type. It is content, not fine print, and it is what the build's
 *     fabricated-location scan reads.
 *
 * Page copy is English in this phase, like the service pages. The surrounding
 * chrome stays translated and the Arabic and Urdu sites fall back to English
 * here until translations exist; layout uses logical properties so RTL still
 * mirrors correctly.
 */

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-400/40 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';

const SectionHeading = ({ eyebrow, heading, intro }: LocationSectionHeader) => (
  <div className="mx-auto mb-12 max-w-3xl text-center">
    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">{eyebrow}</span>
    <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">{heading}</h2>
    <p className="mt-4 leading-relaxed text-gray-600">{intro}</p>
  </div>
);

const CARD_GRADIENTS = ['from-orange-400 to-pink-500', 'from-pink-500 to-purple-600', 'from-purple-500 to-pink-500'];

const LocationPage = ({ content }: { content: LocationContent }) => {
  const crumbs = locationBreadcrumb(content);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <main id="main-content">
        {/* ===== Regional hero ===== */}
        <section className="relative overflow-hidden">
          <div className="bg-grid-glow pointer-events-none absolute inset-0" aria-hidden="true" />
          <div
            className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[50rem] -translate-x-1/2 animate-pulse-glow rounded-full bg-pink-200/60 blur-3xl"
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-purple-200/50 blur-3xl" aria-hidden="true" />

          <div className="container relative mx-auto px-4 py-14 sm:py-20">
            <Breadcrumbs items={crumbs} />

            <div className="mt-8 grid items-center gap-12 lg:grid-cols-2">
              <div>
                <Reveal>
                  <span className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-pink-50 px-4 py-1.5 text-xs font-medium text-pink-700">
                    <Globe2 className="h-3.5 w-3.5" aria-hidden="true" /> {content.serviceType}
                  </span>
                </Reveal>
                <Reveal delay={0.1}>
                  <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl">
                    <span className="text-gradient-ai">{content.h1}</span>
                  </h1>
                </Reveal>
                <Reveal delay={0.15}>
                  <p className="mt-6 text-lg leading-relaxed text-gray-700">{content.valueProp}</p>
                </Reveal>
                <Reveal delay={0.2}>
                  <ul className="mt-6 space-y-2">
                    {content.heroHighlights.map((highlight) => (
                      <li key={highlight} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </Reveal>
                <Reveal delay={0.25}>
                  <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                    <Link to="/project-analysis" className={primaryBtn}>
                      <Sparkles className="h-4 w-4" aria-hidden="true" /> Get a free project estimate
                    </Link>
                    <Link to="/schedule-call" className={secondaryBtn}>
                      Start an AI consultation
                    </Link>
                  </div>
                </Reveal>
              </div>

              <Reveal delay={0.2}>
                <div className="glow-card overflow-hidden rounded-3xl border border-gray-200 bg-white">
                  {/* A gradient tile, never a flag, a skyline or an office photo. */}
                  <VisualPlaceholder icon={Globe2} className="h-64 sm:h-80 lg:h-96" />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ===== India-delivery disclosure ===== */}
        <section className="border-t border-gray-200 bg-white py-14">
          <div className="container mx-auto px-4">
            <Reveal>
              <div className="mx-auto max-w-4xl rounded-3xl border border-amber-200 bg-amber-50/60 p-6 sm:p-8">
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" aria-hidden="true" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{content.disclosure.title}</h2>
                    <p className="mt-3 text-base leading-relaxed text-gray-800">{content.disclosure.body}</p>
                  </div>
                </div>
                <ul className="mt-5 space-y-3 border-t border-amber-200 pt-5">
                  {content.disclosure.points.map((point) => (
                    <li key={point.slice(0, 40)} className="flex items-start gap-2 text-sm leading-relaxed text-gray-800">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== Overview ===== */}
        <section className="border-t border-gray-200 bg-white py-16">
          <div className="container mx-auto px-4">
            <Reveal>
              <div className="mx-auto max-w-3xl space-y-5">
                {content.intro.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="text-base leading-relaxed text-gray-700">
                    {paragraph}
                  </p>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== Regional buyer concerns ===== */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <SectionHeading {...content.concerns} />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {content.concerns.items.map((item, index) => (
                <Reveal key={item.title} delay={index * 0.05}>
                  <div className="glow-card h-full rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-pink-300">
                    <HelpCircle className="h-5 w-5 text-pink-600" aria-hidden="true" />
                    <h3 className="mt-3 text-base font-semibold text-gray-900">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Relevant global services ===== */}
        <section className="border-t border-gray-200 bg-white py-20">
          <div className="container mx-auto px-4">
            <SectionHeading {...content.services} />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {content.services.items.map((service, index) => (
                <Reveal key={service.path} delay={index * 0.04}>
                  <Link
                    to={service.path}
                    className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-gray-50 p-6 transition-colors hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                  >
                    <h3 className="text-base font-semibold text-gray-900 group-hover:text-pink-700">{service.label}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{service.blurb}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-pink-700">
                      Read the service page <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Project fit ===== */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <SectionHeading {...content.projectTypes} />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {content.projectTypes.items.map((item, index) => (
                <Reveal key={item.title} delay={index * 0.05}>
                  <div className="h-full rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-pink-300">
                    <Target className="h-5 w-5 text-purple-600" aria-hidden="true" />
                    <h3 className="mt-3 text-base font-semibold text-gray-900">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Collaboration process ===== */}
        <section className="border-t border-gray-200 bg-white py-20">
          <div className="container mx-auto px-4">
            <SectionHeading {...content.collaboration} />
            <div className="mx-auto max-w-5xl space-y-5">
              {content.collaboration.steps.map((step, index) => (
                <Reveal key={step.title} delay={index * 0.05}>
                  <article className="glow-card rounded-2xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
                    <div className="flex items-start gap-4">
                      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-lg font-bold text-white">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.body}</p>
                      </div>
                    </div>
                    <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                      {step.points.map((point) => (
                        <li key={point} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Timezone and communication ===== */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <SectionHeading {...content.communication} />
            <div className="mx-auto max-w-4xl">
              <Reveal>
                <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {content.communication.points.map((point) => (
                      <li key={point.slice(0, 40)} className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
                        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" aria-hidden="true" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 border-t border-gray-200 pt-5 text-sm leading-relaxed text-gray-600">
                    {content.communication.note}
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ===== Mid-page CTA ===== */}
        <section className="pb-4">
          <div className="container mx-auto px-4">
            <Reveal>
              <div className="glow-card mx-auto flex max-w-4xl flex-col items-center gap-5 rounded-3xl border border-gray-300 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 p-8 text-center">
                <Sparkles className="h-8 w-8 text-pink-600" aria-hidden="true" />
                <h2 className="text-2xl font-bold">See an indicative number before you commit</h2>
                <p className="max-w-2xl text-gray-700">
                  Answer a few questions and our AI produces an indicative team, effort, cost and timeline range. No
                  signup, and the result is an estimate rather than a quotation.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link to="/project-analysis" className={primaryBtn}>
                    Start the free analysis <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link to="/schedule-call" className={secondaryBtn}>
                    Talk to our AI consultation agent
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== Security, privacy and AI oversight ===== */}
        <section className="border-t border-gray-200 bg-white py-20">
          <div className="container mx-auto px-4">
            <SectionHeading {...content.security} />
            <div className="mx-auto max-w-4xl">
              <Reveal>
                <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {content.security.points.map((point) => (
                      <li key={point.slice(0, 40)} className="flex items-start gap-2 text-sm text-gray-700">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" aria-hidden="true" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 border-t border-gray-200 pt-5 text-sm leading-relaxed text-gray-600">
                    {content.security.note}
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="mt-5 rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
                  <h3 className="text-lg font-semibold text-gray-900">{content.oversight.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-700">{content.oversight.body}</p>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {content.oversight.points.map((point) => (
                      <li key={point.slice(0, 40)} className="flex items-start gap-2 text-sm text-gray-700">
                        <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ===== Engagement options ===== */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <SectionHeading {...content.engagement} />
            <div className="grid gap-6 md:grid-cols-3">
              {content.engagement.options.map((option, index) => (
                <Reveal key={option.name} delay={index * 0.06}>
                  <article className="h-full overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors hover:border-pink-300">
                    <div className={`h-1.5 w-full bg-gradient-to-r ${CARD_GRADIENTS[index % CARD_GRADIENTS.length]}`} aria-hidden="true" />
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900">{option.name}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-gray-600">{option.body}</p>
                      <p className="mt-4 text-sm font-medium text-pink-700">{option.bestFor}</p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FAQs ===== */}
        <section className="border-t border-gray-200 bg-white py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">FAQs</span>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
                Working with us from {content.countryName}
              </h2>
            </div>
            <div className="mx-auto max-w-3xl space-y-3">
              {content.faqs.map((faq, index) => (
                <Reveal key={faq.question} delay={index * 0.04}>
                  {/*
                    A native <details>: the answer is in the prerendered HTML,
                    works without JavaScript and is keyboard-reachable for free.
                    No FAQPage markup — Phase 3A ships none by decision.
                  */}
                  <details
                    open={index === 0}
                    className="group rounded-2xl border border-gray-200 bg-gray-50 p-5 transition-colors hover:border-pink-300 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded text-base font-semibold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400">
                      <h3 className="text-base font-semibold">{faq.question}</h3>
                      <span
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-xl leading-none text-pink-600 transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-gray-700">{faq.answer}</p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Other markets ===== */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-8 max-w-2xl text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">Other markets</span>
              <h2 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">Where else we work remotely</h2>
            </div>
            <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
              {content.otherMarkets.map((market, index) => (
                <Reveal key={market.path} delay={index * 0.05}>
                  <Link
                    to={market.path}
                    className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                  >
                    <h3 className="text-base font-semibold text-gray-900 group-hover:text-pink-700">{market.label}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{market.blurb}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-pink-700">
                      Open this market page <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link
                to={LOCATIONS_HUB_PATH}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-pink-700 transition-colors hover:text-pink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              >
                All locations we serve <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* ===== Conversion CTA ===== */}
        <section className="pb-20">
          <div className="container mx-auto px-4">
            <Reveal>
              <div className="glow-card mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl border border-gray-300 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 p-8 text-center sm:p-12">
                <PhoneCall className="h-9 w-9 text-pink-600" aria-hidden="true" />
                <h2 className="text-2xl font-bold sm:text-3xl">{content.cta.title}</h2>
                <p className="max-w-2xl text-gray-700">{content.cta.body}</p>
                <div className="flex flex-col items-center gap-3 sm:flex-row">
                  <Link to="/project-analysis" className={primaryBtn}>
                    <Sparkles className="h-4 w-4" aria-hidden="true" /> Get a project estimate
                  </Link>
                  <Link to="/schedule-call" className={secondaryBtn}>
                    Book or start a consultation
                  </Link>
                  <Link to="/contact" className={secondaryBtn}>
                    <Mail className="h-4 w-4" aria-hidden="true" /> Contact the team
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

export default LocationPage;
