import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock, Info, Mail, Sparkles, UserRound } from 'lucide-react';
import Header from '../Header';
import Footer from '../Footer';
import Reveal from '../Reveal';
import Breadcrumbs from '../services/Breadcrumbs';
import { formatArticleDate } from './formatArticleDate';
import { insightBreadcrumb } from '@/content/insights';
import { FOUNDER } from '@/seo/site';
import type { InsightContent } from '@/content/insights/types';

/**
 * Shared shell for one published article.
 *
 * Three things here are deliberate rather than decorative.
 *
 * **The byline is a factual claim.** It renders the founder's real name, real
 * job title and real photograph, and it links to the `/about` section that is
 * also the `@id` of the `Person` node in the article's JSON-LD. Visible byline
 * and structured data therefore describe the same person, and the markup points
 * at a page that proves it.
 *
 * **The basis note is visible.** Rather than implying authority through tone, an
 * article states what first-hand experience it is written from, in the reader's
 * view, before the first section.
 *
 * **The contents list is real anchors, not JavaScript.** Each section's `id` is
 * the same one the list links to, so deep links work in the prerendered HTML
 * with no bundle loaded.
 */

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-400/40 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';

const ArticlePage = ({ content }: { content: InsightContent }) => {
  const crumbs = insightBreadcrumb(content);
  const updated = content.dateModified !== content.datePublished;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <main id="main-content">
        <article>
          {/* ===== Header ===== */}
          <section className="relative overflow-hidden border-b border-gray-200 bg-white">
            <div className="bg-grid-glow pointer-events-none absolute inset-0" aria-hidden="true" />
            <div className="container relative mx-auto px-4 py-12 sm:py-16">
              <Breadcrumbs items={crumbs} />

              <div className="mx-auto mt-8 max-w-3xl">
                <Reveal>
                  <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                    <span className="text-gradient-ai">{content.h1}</span>
                  </h1>
                </Reveal>
                <Reveal delay={0.1}>
                  <p className="mt-6 text-lg leading-relaxed text-gray-700">{content.standfirst}</p>
                </Reveal>

                {/* Byline — the same person as the Article.author in the JSON-LD. */}
                <Reveal delay={0.15}>
                  <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-gray-200 pt-6 text-sm text-gray-600">
                    <Link
                      to="/about#founder"
                      className="group inline-flex items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                    >
                      <img
                        src={FOUNDER.imagePath}
                        alt={FOUNDER.imageAlt}
                        width={40}
                        height={40}
                        loading="lazy"
                        decoding="async"
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <span>
                        <span className="block font-semibold text-gray-900 group-hover:text-pink-700">
                          {FOUNDER.name}
                        </span>
                        <span className="block text-xs">{FOUNDER.jobTitle}, SCS Softwares</span>
                      </span>
                    </Link>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      Published{' '}
                      <time dateTime={content.datePublished}>{formatArticleDate(content.datePublished)}</time>
                    </span>
                    {updated && (
                      <span className="inline-flex items-center gap-1.5">
                        Updated{' '}
                        <time dateTime={content.dateModified}>{formatArticleDate(content.dateModified)}</time>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      {content.readingMinutes} min read
                    </span>
                  </div>
                </Reveal>

                {/* What this article is written from — stated, not implied. */}
                <Reveal delay={0.2}>
                  <div className="mt-6 flex items-start gap-3 rounded-2xl border border-purple-200 bg-purple-50/60 p-5">
                    <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" aria-hidden="true" />
                    <p className="text-sm leading-relaxed text-gray-700">
                      <span className="font-semibold text-gray-900">What this is based on: </span>
                      {content.basis}
                    </p>
                  </div>
                </Reveal>
              </div>
            </div>
          </section>

          {/* ===== Contents ===== */}
          <section className="border-b border-gray-200 bg-white py-10">
            <div className="container mx-auto px-4">
              <nav aria-label="On this page" className="mx-auto max-w-3xl">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">On this page</h2>
                <ol className="mt-4 space-y-2">
                  {content.sections.map((section, index) => (
                    <li key={section.id} className="text-sm">
                      <a
                        href={`#${section.id}`}
                        className="text-gray-700 underline-offset-4 hover:text-pink-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                      >
                        <span className="mr-2 font-semibold text-gray-400">{index + 1}.</span>
                        {section.heading}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </section>

          {/* ===== Body ===== */}
          <section className="py-14">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-3xl space-y-14">
                {content.sections.map((section) => (
                  <section key={section.id} id={section.id} className="scroll-mt-24">
                    <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{section.heading}</h2>
                    <div className="mt-5 space-y-4">
                      {section.body.map((paragraph) => (
                        <p key={paragraph.slice(0, 40)} className="text-base leading-relaxed text-gray-700">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                    {section.points && (
                      <ul className="mt-6 space-y-3">
                        {section.points.map((point) => (
                          <li
                            key={point.slice(0, 40)}
                            className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-700"
                          >
                            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" aria-hidden="true" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {section.note && (
                      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                        <p className="text-sm leading-relaxed text-gray-800">{section.note}</p>
                      </div>
                    )}
                  </section>
                ))}
              </div>
            </div>
          </section>

          {/* ===== FAQs ===== */}
          <section className="border-t border-gray-200 bg-white py-16">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-3xl">
                <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Questions this raises</h2>
                <div className="mt-8 space-y-3">
                  {content.faqs.map((faq, index) => (
                    <details
                      key={faq.question}
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
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ===== Related services ===== */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-5xl">
                <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
                  The services this connects to
                </h2>
                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {content.related.map((related) => (
                    <Link
                      key={related.path}
                      to={related.path}
                      className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                    >
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-pink-700">
                        {related.label}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{related.blurb}</p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-pink-700">
                        Read more <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ===== CTA ===== */}
          <section className="pb-20">
            <div className="container mx-auto px-4">
              <Reveal>
                <div className="glow-card mx-auto flex max-w-4xl flex-col items-center gap-5 rounded-3xl border border-gray-300 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 p-8 text-center sm:p-12">
                  <Sparkles className="h-8 w-8 text-pink-600" aria-hidden="true" />
                  <h2 className="text-2xl font-bold sm:text-3xl">{content.cta.title}</h2>
                  <p className="max-w-2xl text-gray-700">{content.cta.body}</p>
                  <div className="flex flex-col items-center gap-3 sm:flex-row">
                    <Link to="/project-analysis" className={primaryBtn}>
                      Get a free project estimate
                    </Link>
                    <Link to="/schedule-call" className={secondaryBtn}>
                      Start an AI consultation
                    </Link>
                    <Link to="/contact" className={secondaryBtn}>
                      <Mail className="h-4 w-4" aria-hidden="true" /> Contact the team
                    </Link>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default ArticlePage;
