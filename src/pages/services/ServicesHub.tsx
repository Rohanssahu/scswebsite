import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BadgeCheck, Mail, PhoneCall, Sparkles } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import Breadcrumbs from '@/components/services/Breadcrumbs';
import { SERVICE_CONTENT_BY_PATH, hubBreadcrumb, servicesHub } from '@/content/services';
import type { HubEntry } from '@/content/services';

/**
 * The `/services` hub: one page listing every service and linking to it.
 *
 * Names come from the service content itself, so a card, a breadcrumb and the
 * Service JSON-LD can never disagree about what a page is called. Every entry
 * now points at a `/services/*` page; the translated `services.names` table is
 * only a fallback for an entry with no content module.
 */

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-400/40 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';

const GROUP_ACCENTS: Record<string, string> = {
  software: 'from-orange-400 to-pink-500',
  ai: 'from-pink-500 to-purple-600',
  delivery: 'from-purple-500 to-pink-500',
  growth: 'from-orange-400 to-purple-500',
};

const ServicesHub = () => {
  const { t } = useTranslation();

  /** Display name for a hub entry, from the page's own content where we have it. */
  const nameFor = (entry: HubEntry): string => {
    const service = SERVICE_CONTENT_BY_PATH[entry.path];
    if (service) return service.navLabel;
    return t(`services.names.${entry.path.replace('/services/', '')}`);
  };

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

          <div className="container relative mx-auto px-4 py-14 sm:py-20">
            <Breadcrumbs items={hubBreadcrumb()} />

            <div className="mt-8 max-w-3xl">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-pink-50 px-4 py-1.5 text-xs font-medium text-pink-700">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {servicesHub.navLabel}
                </span>
              </Reveal>
              <Reveal delay={0.1}>
                <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl">
                  <span className="text-gradient-ai">{servicesHub.h1}</span>
                </h1>
              </Reveal>
              <Reveal delay={0.15}>
                <p className="mt-6 text-lg leading-relaxed text-gray-700">{servicesHub.valueProp}</p>
              </Reveal>
              <Reveal delay={0.2}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link to="/project-analysis" className={primaryBtn}>
                    <Sparkles className="h-4 w-4" aria-hidden="true" /> Get a free project estimate
                  </Link>
                  <Link to="/schedule-call" className={secondaryBtn}>
                    Start an AI consultation
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ===== Overview ===== */}
        <section className="border-t border-gray-200 bg-white py-14">
          <div className="container mx-auto px-4">
            <Reveal>
              <div className="mx-auto max-w-3xl space-y-5">
                {servicesHub.intro.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="text-base leading-relaxed text-gray-700">
                    {paragraph}
                  </p>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== Grouped service listing ===== */}
        {servicesHub.groups.map((group, groupIndex) => (
          <section
            key={group.id}
            id={group.id}
            className={`border-t border-gray-200 py-16 ${groupIndex % 2 === 1 ? 'bg-white' : ''}`}
          >
            <div className="container mx-auto px-4">
              <div className="mx-auto mb-10 max-w-3xl text-center">
                <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">{group.title}</h2>
                <p className="mt-3 leading-relaxed text-gray-600">{group.intro}</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.entries.map((entry, index) => (
                  <Reveal key={entry.path} delay={index * 0.05}>
                    <Link
                      to={entry.path}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 transition-colors hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                    >
                      <div className={`h-1.5 w-full bg-gradient-to-r ${GROUP_ACCENTS[group.id]}`} aria-hidden="true" />
                      <div className="flex flex-1 flex-col p-6">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-pink-700">
                          {nameFor(entry)}
                        </h3>
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{entry.blurb}</p>
                        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-pink-700">
                          Read more <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* ===== How engagements run ===== */}
        <section className="border-t border-gray-200 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">{servicesHub.howWeWork.title}</h2>
            </div>
            <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {servicesHub.howWeWork.points.map((point, index) => (
                <Reveal key={point.title} delay={index * 0.05}>
                  <div className="h-full rounded-2xl border border-gray-200 bg-white p-6">
                    <BadgeCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                    <h3 className="mt-3 text-base font-semibold text-gray-900">{point.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{point.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="py-16 pb-20">
          <div className="container mx-auto px-4">
            <Reveal>
              <div className="glow-card mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl border border-gray-300 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 p-8 text-center sm:p-12">
                <PhoneCall className="h-9 w-9 text-pink-600" aria-hidden="true" />
                <h2 className="text-2xl font-bold sm:text-3xl">{servicesHub.cta.title}</h2>
                <p className="max-w-2xl text-gray-700">{servicesHub.cta.body}</p>
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

export default ServicesHub;
