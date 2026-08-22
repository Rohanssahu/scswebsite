import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, Mail, Sparkles } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import Breadcrumbs from '@/components/services/Breadcrumbs';
import { formatArticleDate } from '@/components/insights/formatArticleDate';
import { INSIGHT_META, insightsHubBreadcrumb } from '@/content/insights';
import { FOUNDER } from '@/seo/site';

/**
 * The `/insights` hub.
 *
 * It exists because two articles exist. It is deliberately not a blog shell
 * waiting to be filled: the copy below explains the publishing rule that keeps
 * the section small, which is also the honest answer to "why are there only two
 * posts here?" — see `docs/seo/EDITORIAL_PLAN.md`, where ten further topics are
 * planned and marked as needing owner input before they can be written from
 * anything other than second-hand advice.
 *
 * The old `/BlogPage` placeholder forwards here.
 */

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-400/40 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';

const InsightsHub = () => (
  <div className="min-h-screen bg-gray-50 text-gray-900">
    <Header />

    <main id="main-content">
      <section className="relative overflow-hidden border-b border-gray-200 bg-white">
        <div className="bg-grid-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-[24rem] w-[44rem] -translate-x-1/2 animate-pulse-glow rounded-full bg-pink-200/50 blur-3xl"
          aria-hidden="true"
        />
        <div className="container relative mx-auto px-4 py-14 sm:py-20">
          <Breadcrumbs items={insightsHubBreadcrumb()} />
          <div className="mx-auto mt-8 max-w-3xl text-center">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-pink-50 px-4 py-1.5 text-xs font-medium text-pink-700">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Engineering notes
              </span>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl">
                <span className="text-gradient-ai">Insights from what we actually build</span>
              </h1>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mt-6 text-lg leading-relaxed text-gray-700">
                Long-form notes on the parts of AI and software delivery that are hard to get right — written by{' '}
                {FOUNDER.name} from systems this team built, runs and has broken.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* The publishing rule, stated rather than left as an apology for a short list. */}
      <section className="border-b border-gray-200 bg-gray-50 py-10">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 text-sm leading-relaxed text-gray-700">
            <p>
              We publish an article only when we have first-hand experience of the thing it describes. That keeps this
              list short on purpose. There is a great deal of general AI advice on the internet already, and adding a
              summary of it would not help anyone — so what you will find here is limited to work we have done
              ourselves, including the parts that went wrong.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            {INSIGHT_META.map((insight, index) => (
              <Reveal key={insight.path} delay={index * 0.06}>
                <article className="glow-card flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-7 transition-colors hover:border-pink-400">
                  <h2 className="text-xl font-bold text-gray-900">
                    <Link
                      to={insight.path}
                      className="hover:text-pink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                    >
                      {insight.navLabel}
                    </Link>
                  </h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-600">{insight.metaDescription}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-200 pt-4 text-xs text-gray-500">
                    <span>{FOUNDER.name}</span>
                    <time dateTime={insight.datePublished}>{formatArticleDate(insight.datePublished)}</time>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      Long read
                    </span>
                  </div>
                  <Link
                    to={insight.path}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-pink-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                  >
                    Read the article <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="glow-card mx-auto flex max-w-4xl flex-col items-center gap-5 rounded-3xl border border-gray-300 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 p-8 text-center sm:p-12">
              <Sparkles className="h-8 w-8 text-pink-600" aria-hidden="true" />
              <h2 className="text-2xl font-bold sm:text-3xl">Have a project these questions apply to?</h2>
              <p className="max-w-2xl text-gray-700">
                Start with an indicative estimate, talk to our consultation agent, or write to the team. All three go to
                the same place.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Link to="/project-analysis" className={primaryBtn}>
                  Get a free project estimate
                </Link>
                <Link to="/services" className={secondaryBtn}>
                  Browse our services
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

export default InsightsHub;
