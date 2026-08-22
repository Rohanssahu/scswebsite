import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, Sparkles, Bot, ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { icon } from '@/asset/images';
import { AI_SERVICE_NAV, CORE_SERVICE_NAV, OTHER_SERVICE_NAV, SERVICES_HUB, isServicePath } from '@/data/serviceNav';
import { LOCATION_NAV, LOCATIONS_HUB, isLocationPath } from '@/data/locationNav';

// Service names come from the shared services.names.* i18n table so they stay
// consistent with Buddy and the footer. Layout uses logical properties so the
// navbar mirrors correctly in RTL (Arabic/Urdu).
//
// The menu is grouped into software development, AI development and the
// supporting design, cloud, delivery and growth services, with a link to the
// /services hub. Every list comes from src/data/serviceNav.ts, so the header,
// drawer, footer and hub cannot drift apart — and nothing points at the
// retired /gig/* URLs.

// One highest-intent action on the site: an AI meeting that starts immediately.
// "Book a free call" read like "someone will phone me later", so the label says
// what actually happens. One button, one destination, on every page.
const MEETING_PATH = '/schedule-call';

const navLinks = [
  { key: 'nav.home', path: '/' },
  { key: 'nav.products', path: '/products' },
  { key: 'nav.projectEstimate', path: '/project-analysis' },
];

// About / Contact / Insights / Career were four separate top-level links that
// crowded the bar next to Services and Locations. They are one "Company"
// dropdown now — same pattern as Services — so the bar stays short. The list
// is shared by the desktop menu and the mobile drawer so they cannot drift.
const COMPANY_NAV = [
  { key: 'nav.about', path: '/about' },
  { key: 'nav.insights', path: '/insights' },
  { key: 'nav.career', path: '/careers' },
  { key: 'nav.contact', path: '/contact' },
];

const isCompanyPath = (pathname: string) => COMPANY_NAV.some((item) => item.path === pathname);

const Header = () => {
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const rtl = i18n.dir() === 'rtl';

  const isActive = (path: string) => location.pathname === path;

  // Hold the page still while the drawer covers it.
  useEffect(() => {
    if (!isMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMenuOpen]);

  // Logo click: navigate home and scroll back to the top (route change alone
  // doesn't scroll when the user is already on the homepage).
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  // One class for every link inside the services panel, so the three groups
  // stay visually identical.
  const menuItemCls = (path: string) =>
    `block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-pink-50 hover:text-pink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink-400 ${
      isActive(path) ? 'font-semibold text-pink-600' : 'text-gray-700'
    }`;

  const linkCls = (path: string) =>
    `whitespace-nowrap rounded-lg px-1 py-1 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 xl:text-sm ${
      isActive(path) ? 'text-pink-600 font-semibold' : 'text-gray-700 hover:text-pink-600'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/85 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo — never mirrored */}
          <Link
            to="/"
            onClick={scrollToTop}
            className="flex shrink-0 items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg">
              <img src={icon.logos} alt="SCS Softwares logo" width={40} height={40} decoding="async" className="h-full w-full object-contain" />
            </div>
            <span className="text-xl font-bold xl:text-2xl">
              Scs <span className="text-gradient-ai">Softwares</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-3.5 lg:flex xl:gap-6">
            <Link to="/" className={linkCls('/')}>
              {t('nav.home')}
            </Link>

            <div
              className="relative"
              onMouseEnter={() => setIsServicesOpen(true)}
              onMouseLeave={() => setIsServicesOpen(false)}
            >
              <button
                className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-1 py-1 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 xl:text-sm ${
                  isServicePath(location.pathname) ? 'text-pink-600 font-semibold' : 'text-gray-700 hover:text-pink-600'
                }`}
                aria-expanded={isServicesOpen}
                onClick={() => setIsServicesOpen((o) => !o)}
              >
                {t('nav.services')}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isServicesOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {isServicesOpen && (
                <div className="absolute start-0 top-full z-50 w-[min(46rem,calc(100vw-2rem))] pt-2">
                  <div className="glow-card overflow-hidden rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                      <div>
                        <span className="block px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-pink-600">
                          {t('nav.softwareDevelopment')}
                        </span>
                        {CORE_SERVICE_NAV.map((service) => (
                          <Link
                            key={service.path}
                            to={service.path}
                            className={menuItemCls(service.path)}
                            onClick={() => setIsServicesOpen(false)}
                          >
                            {t(`services.names.${service.nameKey}`)}
                          </Link>
                        ))}
                      </div>
                      <div>
                        <span className="block px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-pink-600">
                          {t('nav.aiDevelopment')}
                        </span>
                        {AI_SERVICE_NAV.map((service) => (
                          <Link
                            key={service.path}
                            to={service.path}
                            className={menuItemCls(service.path)}
                            onClick={() => setIsServicesOpen(false)}
                          >
                            {t(`services.names.${service.nameKey}`)}
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 border-t border-gray-200 pt-3">
                      <span className="block px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-pink-600">
                        {t('nav.moreServices')}
                      </span>
                      <div className="grid gap-x-6 sm:grid-cols-2">
                        {OTHER_SERVICE_NAV.map((service) => (
                          <Link
                            key={service.path}
                            to={service.path}
                            className={menuItemCls(service.path)}
                            onClick={() => setIsServicesOpen(false)}
                          >
                            {t(`services.names.${service.nameKey}`)}
                          </Link>
                        ))}
                      </div>
                    </div>

                    <Link
                      to={SERVICES_HUB.path}
                      className="mt-3 flex items-center gap-1.5 rounded-xl border-t border-gray-200 px-3 pt-3 text-sm font-semibold text-pink-700 transition-colors hover:text-pink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                      onClick={() => setIsServicesOpen(false)}
                    >
                      {t('nav.allServices')}
                      <ArrowRight className={`h-3.5 w-3.5 ${rtl ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* One top-level link only: the /locations hub is the gateway, and the
                individual market pages live inside it rather than in this bar. */}
            <Link
              to={LOCATIONS_HUB.path}
              className={`whitespace-nowrap rounded-lg px-1 py-1 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 xl:text-sm ${
                isLocationPath(location.pathname) ? 'text-pink-600 font-semibold' : 'text-gray-700 hover:text-pink-600'
              }`}
            >
              {t('nav.locations')}
            </Link>

            <Link to="/products" className={linkCls('/products')}>
              {t('nav.products')}
            </Link>
            <Link to="/project-analysis" className={linkCls('/project-analysis')}>
              {t('nav.projectEstimate')}
            </Link>
            <div
              className="relative"
              onMouseEnter={() => setIsCompanyOpen(true)}
              onMouseLeave={() => setIsCompanyOpen(false)}
            >
              <button
                className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-1 py-1 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 xl:text-sm ${
                  isCompanyPath(location.pathname) ? 'text-pink-600 font-semibold' : 'text-gray-700 hover:text-pink-600'
                }`}
                aria-expanded={isCompanyOpen}
                onClick={() => setIsCompanyOpen((o) => !o)}
              >
                {t('nav.company')}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isCompanyOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {isCompanyOpen && (
                <div className="absolute end-0 top-full z-50 w-56 pt-2">
                  <div className="glow-card overflow-hidden rounded-2xl border border-gray-200 bg-white p-2">
                    {COMPANY_NAV.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={menuItemCls(item.path)}
                        onClick={() => setIsCompanyOpen(false)}
                      >
                        {t(item.key)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Primary CTA: the meeting starts immediately, so it leads the pair */}
            <Link
              to={MEETING_PATH}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-3 py-2 text-[13px] font-semibold text-white shadow-md shadow-pink-400/30 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 xl:px-4 xl:py-2.5 xl:text-sm"
            >
              <Bot className="h-4 w-4 shrink-0" aria-hidden="true" />
              {/* Short label between lg and xl, where the full one would crowd the links */}
              <span className="xl:hidden">{t('common.startAiMeetingShort')}</span>
              <span className="hidden xl:inline">{t('common.startAiMeeting')}</span>
            </Link>
            <Link
              to="/project-analysis"
              className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-pink-300 bg-white px-4 py-2.5 text-sm font-semibold text-pink-700 transition-colors hover:border-pink-400 hover:bg-pink-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 xl:inline-flex"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {t('common.getEstimate')}
            </Link>
          </nav>

          {/* Compact: menu button */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              className="rounded-lg p-1.5 text-gray-700 transition-colors hover:text-pink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              onClick={() => setIsMenuOpen(true)}
              aria-label={t('a11y.openMenu')}
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Drawer — portalled out of the header: the header's backdrop-blur is a
          containing block for fixed children, which would pin the drawer inside
          the bar instead of over the page. */}
      {isMenuOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setIsMenuOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={reduceMotion ? false : { x: rtl ? '-100%' : '100%' }}
              animate={{ x: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 end-0 z-[70] w-full overflow-y-auto border-s border-gray-200 bg-white p-6 shadow-2xl sm:w-80 lg:hidden"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="text-lg font-bold">
                  Scs <span className="text-gradient-ai">Softwares</span>
                </span>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  aria-label={t('a11y.closeMenu')}
                  className="rounded-lg p-1.5 text-gray-700 transition-colors hover:text-pink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              {/* The AI-meeting CTA leads the drawer so it is the first thing found */}
              <Link
                to={MEETING_PATH}
                onClick={() => setIsMenuOpen(false)}
                className="mb-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-pink-400/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              >
                <Bot className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t('common.startAiMeeting')}
                <ArrowRight className={`ms-auto h-4 w-4 ${rtl ? 'rotate-180' : ''}`} aria-hidden="true" />
              </Link>

              <Link
                to="/project-analysis"
                onClick={() => setIsMenuOpen(false)}
                className="mb-5 inline-flex items-center gap-2 rounded-xl border border-pink-300 bg-white px-4 py-3 text-sm font-semibold text-pink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              >
                <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t('common.getEstimate')}
              </Link>

              <nav className="flex flex-col gap-1">
                {navLinks.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
                      isActive(item.path) ? 'bg-pink-50 font-semibold text-pink-600' : 'text-gray-700 hover:bg-gray-50 hover:text-pink-600'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t(item.key)}
                  </Link>
                ))}

                {/* Same four links the desktop "Company" dropdown holds */}
                {COMPANY_NAV.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
                      isActive(item.path) ? 'bg-pink-50 font-semibold text-pink-600' : 'text-gray-700 hover:bg-gray-50 hover:text-pink-600'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t(item.key)}
                  </Link>
                ))}

                <div className="mt-3 border-t border-gray-200 pt-4">
                  <Link
                    to={SERVICES_HUB.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`mb-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
                      isActive(SERVICES_HUB.path) ? 'bg-pink-50 text-pink-600' : 'text-pink-700 hover:bg-pink-50'
                    }`}
                  >
                    {t('nav.allServices')}
                    <ArrowRight className={`ms-auto h-4 w-4 ${rtl ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </Link>

                  <span className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">{t('nav.softwareDevelopment')}</span>
                  <div className="mt-2 flex flex-col gap-1">
                    {CORE_SERVICE_NAV.map((service) => (
                      <Link
                        key={service.path}
                        to={service.path}
                        className={`rounded-xl px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
                          isActive(service.path) ? 'bg-pink-50 font-semibold text-pink-600' : 'text-gray-600 hover:bg-gray-50 hover:text-pink-600'
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {t(`services.names.${service.nameKey}`)}
                      </Link>
                    ))}
                  </div>

                  <span className="mt-4 block px-3 text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">{t('nav.aiDevelopment')}</span>
                  <div className="mt-2 flex flex-col gap-1">
                    {AI_SERVICE_NAV.map((service) => (
                      <Link
                        key={service.path}
                        to={service.path}
                        className={`rounded-xl px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
                          isActive(service.path) ? 'bg-pink-50 font-semibold text-pink-600' : 'text-gray-600 hover:bg-gray-50 hover:text-pink-600'
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {t(`services.names.${service.nameKey}`)}
                      </Link>
                    ))}
                  </div>

                  <span className="mt-4 block px-3 text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">{t('nav.moreServices')}</span>
                  <div className="mt-2 flex flex-col gap-1">
                    {OTHER_SERVICE_NAV.map((service) => (
                      <Link
                        key={service.path}
                        to={service.path}
                        className={`rounded-xl px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
                          isActive(service.path) ? 'bg-pink-50 font-semibold text-pink-600' : 'text-gray-600 hover:bg-gray-50 hover:text-pink-600'
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {t(`services.names.${service.nameKey}`)}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="mt-3 border-t border-gray-200 pt-4">
                  <Link
                    to={LOCATIONS_HUB.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
                      isActive(LOCATIONS_HUB.path) ? 'bg-pink-50 text-pink-600' : 'text-pink-700 hover:bg-pink-50'
                    }`}
                  >
                    {t('nav.locations')}
                    <ArrowRight className={`ms-auto h-4 w-4 ${rtl ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </Link>
                  {/* Nine markets is too many to leave permanently expanded in
                      a phone drawer that already lists sixteen services, so
                      they live inside a native <details>. It is collapsed
                      unless the visitor is already on a market page, needs no
                      JavaScript, and stays keyboard-reachable for free. The
                      hub link above it is always visible, because that is the
                      gateway the site actually navigates through. */}
                  <details
                    open={isLocationPath(location.pathname)}
                    className="mt-2 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-pink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400">
                      {t('nav.markets')}
                      <ChevronDown className="ms-auto h-4 w-4 transition-transform" aria-hidden="true" />
                    </summary>
                    <div className="mt-1 grid grid-cols-2 gap-1">
                      {LOCATION_NAV.map((market) => (
                        <Link
                          key={market.path}
                          to={market.path}
                          className={`rounded-xl px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
                            isActive(market.path) ? 'bg-pink-50 font-semibold text-pink-600' : 'text-gray-600 hover:bg-gray-50 hover:text-pink-600'
                          }`}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {market.label}
                        </Link>
                      ))}
                    </div>
                  </details>
                </div>
              </nav>
            </motion.div>
          </>,
          document.body,
        )}
    </header>
  );
};

export default Header;
