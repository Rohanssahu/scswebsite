import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Notebook, ArrowRight, PhoneCall } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Reveal from '../components/Reveal';

/**
 * Insights index.
 *
 * This page previously listed 23 invented article headlines whose cards linked
 * to `href={undefined}`, illustrated with images hotlinked from 20 unrelated
 * third-party sites, plus a "View all" button pointing at `/blogs` — a route
 * that does not exist. None of those articles were ever written.
 *
 * Rather than invent articles, the page now states the truth: nothing is
 * published yet, here is what we intend to write, and here is how to reach the
 * team meanwhile. The SEO registry marks the route `noindex,follow` and keeps
 * it out of `sitemap.xml` until real articles exist (Phase 2).
 */
const TOPIC_KEYS = ['blog.t1', 'blog.t2', 'blog.t3', 'blog.t4'];

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-400/40 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';

const BlogPage = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <main id="main-content">
        {/* ===== Hero ===== */}
        <section className="relative overflow-hidden">
          <div className="bg-grid-glow pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[50rem] -translate-x-1/2 animate-pulse-glow rounded-full bg-pink-200/60 blur-3xl" aria-hidden="true" />

          <div className="container relative mx-auto px-4 py-20 text-center sm:py-24">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-pink-50 px-4 py-1.5 text-xs font-medium text-pink-700">
                <Notebook className="h-3.5 w-3.5" aria-hidden="true" /> {t('blog.eyebrow')}
              </span>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                {t('blog.title')}
              </h1>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">{t('blog.sub')}</p>
            </Reveal>
          </div>
        </section>

        {/* ===== Honest empty state + planned topics ===== */}
        <section className="border-t border-gray-200 py-16">
          <div className="container mx-auto px-4">
            <Reveal>
              <div className="mx-auto max-w-2xl rounded-3xl border border-gray-200 bg-white p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900">{t('blog.emptyTitle')}</h2>
                <p className="mt-4 leading-relaxed text-gray-600">{t('blog.emptyText')}</p>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h3 className="mt-14 text-center text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">
                {t('blog.topicsTitle')}
              </h3>
            </Reveal>
            <ul className="mx-auto mt-6 grid max-w-4xl gap-4 sm:grid-cols-2">
              {TOPIC_KEYS.map((key, i) => (
                <Reveal key={key} delay={i * 0.06}>
                  <li className="h-full rounded-2xl border border-gray-200 bg-white p-5 text-sm font-medium text-gray-700">
                    {t(key)}
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="py-20 pt-4">
          <div className="container mx-auto px-4">
            <Reveal>
              <div className="glow-card mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl border border-gray-300 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 p-8 text-center sm:p-12">
                <PhoneCall className="h-9 w-9 text-pink-600" aria-hidden="true" />
                <h2 className="text-2xl font-bold sm:text-3xl">{t('blog.cta')}</h2>
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

export default BlogPage;
