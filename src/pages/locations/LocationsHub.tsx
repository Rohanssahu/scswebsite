import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Globe2, Mail, MapPin, PhoneCall, ShieldOff, Sparkles } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import Breadcrumbs from '@/components/services/Breadcrumbs';
import { LOCATION_META_BY_PATH, locationsHubBreadcrumb } from '@/content/locations';
import { locationsHub, type MarketEntry } from '@/content/locations/hub';

/**
 * The `/locations` hub: one page that states where SCS Softwares actually is,
 * how a remote international engagement is arranged, and which markets have a
 * page of their own.
 *
 * It links only to markets that exist — which, since Phase 3C, is every market
 * we name anywhere on the site. The future-markets block that used to sit below
 * the card grid is gone rather than empty: Germany, the Netherlands and Turkey
 * were the only countries in it, and all three now have a page of their own.
 *
 * Structured data for this route is a BreadcrumbList and nothing else — the hub
 * describes no single service and claims no location.
 */

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-400/40 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';

const MARKET_ACCENTS = ['from-orange-400 to-pink-500', 'from-pink-500 to-purple-600', 'from-purple-500 to-pink-500'];

const LocationsHub = () => {
  /** Display name for a market card, from the country page's own content. */
  const nameFor = (market: MarketEntry): string => LOCATION_META_BY_PATH[market.path].navLabel;

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
            <Breadcrumbs items={locationsHubBreadcrumb()} />

            <div className="mt-8 max-w-3xl">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-pink-50 px-4 py-1.5 text-xs font-medium text-pink-700">
                  <Globe2 className="h-3.5 w-3.5" aria-hidden="true" /> {locationsHub.navLabel}
                </span>
              </Reveal>
              <Reveal delay={0.1}>
                <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl">
                  <span className="text-gradient-ai">{locationsHub.h1}</span>
                </h1>
              </Reveal>
              <Reveal delay={0.15}>
                <p className="mt-6 text-lg leading-relaxed text-gray-700">{locationsHub.valueProp}</p>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="mt-5 inline-flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-gray-800">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                  <span>
                    SCS Softwares operates from Indore, India. International projects are delivered remotely, and no
                    local office is represented in any of the markets below.
                  </span>
                </p>
              </Reveal>
              <Reveal delay={0.25}>
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
                {locationsHub.intro.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="text-base leading-relaxed text-gray-700">
                    {paragraph}
                  </p>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== How remote delivery works ===== */}
        <section className="border-t border-gray-200 py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">
                {locationsHub.howRemoteWorks.eyebrow}
              </span>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
                {locationsHub.howRemoteWorks.heading}
              </h2>
              <p className="mt-4 leading-relaxed text-gray-600">{locationsHub.howRemoteWorks.intro}</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {locationsHub.howRemoteWorks.points.map((point, index) => (
                <Reveal key={point.title} delay={index * 0.05}>
                  <div className="glow-card h-full rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-pink-300">
                    <Building2 className="h-5 w-5 text-pink-600" aria-hidden="true" />
                    <h3 className="mt-3 text-base font-semibold text-gray-900">{point.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{point.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Active markets ===== */}
        <section className="border-t border-gray-200 bg-white py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">Active markets</span>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">Markets with a page of their own</h2>
              <p className="mt-4 leading-relaxed text-gray-600">
                Each page describes the services available to businesses in that country and how we run a project from
                India — not an office, an entity or a team on the ground.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {locationsHub.markets.map((market, index) => (
                <Reveal key={market.path} delay={index * 0.06}>
                  <Link
                    to={market.path}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 transition-colors hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                  >
                    <div
                      className={`h-1.5 w-full bg-gradient-to-r ${MARKET_ACCENTS[index % MARKET_ACCENTS.length]}`}
                      aria-hidden="true"
                    />
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-pink-700">
                        {nameFor(market)}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{market.blurb}</p>
                      <p className="mt-4 text-sm font-medium text-pink-700">{market.distinctive}</p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-pink-700">
                        Open this market page <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== What these pages will not claim ===== */}
        <section className="border-t border-gray-200 bg-white py-16">
          <div className="container mx-auto px-4">
            <Reveal>
              <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-900">{locationsHub.boundaries.heading}</h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {locationsHub.boundaries.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
                      <ShieldOff className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" aria-hidden="true" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="py-16 pb-20">
          <div className="container mx-auto px-4">
            <Reveal>
              <div className="glow-card mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl border border-gray-300 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 p-8 text-center sm:p-12">
                <PhoneCall className="h-9 w-9 text-pink-600" aria-hidden="true" />
                <h2 className="text-2xl font-bold sm:text-3xl">{locationsHub.cta.title}</h2>
                <p className="max-w-2xl text-gray-700">{locationsHub.cta.body}</p>
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

export default LocationsHub;
