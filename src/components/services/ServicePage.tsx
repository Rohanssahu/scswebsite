import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Boxes,
  CheckCircle,
  ClipboardList,
  Layers,
  LayoutDashboard,
  Mail,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import Header from '../Header';
import Footer from '../Footer';
import Reveal from '../Reveal';
import VisualPlaceholder from '../VisualPlaceholder';
import Breadcrumbs from './Breadcrumbs';
import { serviceBreadcrumb } from '@/content/services';
import type { ServiceContent, ServiceIconKey, ServiceSectionHeader } from '@/content/services/types';

/**
 * Shared shell for the five canonical service pages.
 *
 * Layout, gradients and cards are the site's existing design system; every
 * word on the page comes from that page's own content module, so the five
 * pages share a structure without sharing copy.
 *
 * Page copy is English in this phase. The surrounding chrome (header, footer)
 * stays translated, and the Arabic and Urdu sites fall back to English for
 * these pages until translations exist.
 */

const SERVICE_ICONS: Record<ServiceIconKey, React.ElementType> = {
  'custom-software': Boxes,
  mobile: Smartphone,
  web: LayoutDashboard,
  saas: Layers,
  modernization: RefreshCw,
};

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-400/40 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';

const SectionHeading = ({ eyebrow, heading, intro }: ServiceSectionHeader) => (
  <div className="mx-auto mb-12 max-w-3xl text-center">
    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">{eyebrow}</span>
    <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">{heading}</h2>
    <p className="mt-4 leading-relaxed text-gray-600">{intro}</p>
  </div>
);

const CARD_GRADIENTS = ['from-orange-400 to-pink-500', 'from-pink-500 to-purple-600', 'from-purple-500 to-pink-500'];

const ServicePage = ({ content }: { content: ServiceContent }) => {
  const Icon = SERVICE_ICONS[content.icon];
  const crumbs = serviceBreadcrumb(content);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <main id="main-content">
        {/* ===== Hero ===== */}
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
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {content.serviceType}
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
                  <VisualPlaceholder icon={Icon} className="h-64 sm:h-80 lg:h-96" />
                </div>
              </Reveal>
            </div>
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

        {/* ===== Problems solved ===== */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <SectionHeading {...content.problems} />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {content.problems.items.map((item, index) => (
                <Reveal key={item.title} delay={index * 0.05}>
                  <div className="glow-card h-full rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-pink-300">
                    <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Capabilities / platforms ===== */}
        <section className="border-t border-gray-200 bg-white py-20">
          <div className="container mx-auto px-4">
            <SectionHeading {...content.capabilities} />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {content.capabilities.groups.map((group, index) => (
                <Reveal key={group.title} delay={index * 0.05}>
                  <div className="h-full rounded-2xl border border-gray-200 bg-gray-50 p-6 transition-colors hover:border-pink-300">
                    <h3 className="text-base font-semibold text-gray-900">{group.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{group.body}</p>
                    <ul className="mt-4 space-y-2">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Development approach ===== */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <SectionHeading {...content.approach} />
            <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
              {content.approach.points.map((point, index) => (
                <Reveal key={point.slice(0, 40)} delay={index * 0.04}>
                  <div className="flex h-full items-start gap-3 rounded-2xl border border-gray-200 bg-white p-5">
                    <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-pink-600" aria-hidden="true" />
                    <span className="text-sm leading-relaxed text-gray-700">{point}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Process: discovery → support ===== */}
        <section className="border-t border-gray-200 bg-white py-20">
          <div className="container mx-auto px-4">
            <SectionHeading {...content.process} />
            <div className="mx-auto max-w-5xl space-y-5">
              {content.process.steps.map((step, index) => (
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

        {/* ===== Mid-page CTA ===== */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <Reveal>
              <div className="glow-card mx-auto flex max-w-4xl flex-col items-center gap-5 rounded-3xl border border-gray-300 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 p-8 text-center">
                <Sparkles className="h-8 w-8 text-pink-600" aria-hidden="true" />
                <h2 className="text-2xl font-bold">See the numbers before you commit</h2>
                <p className="max-w-2xl text-gray-700">
                  Answer a few questions and our AI produces an indicative team, effort, cost and timeline range for your
                  project. No signup, and the result is an estimate rather than a quotation.
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

        {/* ===== Engagement options ===== */}
        <section className="border-t border-gray-200 bg-white py-20">
          <div className="container mx-auto px-4">
            <SectionHeading {...content.engagement} />
            <div className="grid gap-6 md:grid-cols-3">
              {content.engagement.options.map((option, index) => (
                <Reveal key={option.name} delay={index * 0.06}>
                  <article className="h-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 transition-colors hover:border-pink-300">
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

        {/* ===== Security ===== */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <SectionHeading {...content.security} />
            <div className="mx-auto max-w-4xl">
              <Reveal>
                <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
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
            </div>
          </div>
        </section>

        {/* ===== FAQs ===== */}
        <section className="border-t border-gray-200 bg-white py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">FAQs</span>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">Questions we are asked most</h2>
            </div>
            <div className="mx-auto max-w-3xl space-y-3">
              {content.faqs.map((faq, index) => (
                <Reveal key={faq.question} delay={index * 0.04}>
                  {/*
                    A native <details> rather than a JavaScript accordion: the
                    answer is present in the prerendered HTML, works with no
                    JavaScript, and is reachable by keyboard for free.
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

        {/* ===== Related services ===== */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">Related services</span>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">Where this connects</h2>
              <p className="mt-4 leading-relaxed text-gray-600">
                Most projects touch more than one of these. Follow whichever describes the next piece of your build.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {content.related.map((related, index) => (
                <Reveal key={related.path} delay={index * 0.05}>
                  <Link
                    to={related.path}
                    className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                  >
                    <h3 className="text-base font-semibold text-gray-900 group-hover:text-pink-700">{related.label}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{related.blurb}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-pink-700">
                      Read more <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Final CTA ===== */}
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

export default ServicePage;
