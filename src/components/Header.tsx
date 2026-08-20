import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { icon } from '@/asset/images';
import LanguageSwitcher from '@/components/LanguageSwitcher';

// Service names come from the shared services.names.* i18n table so they stay
// consistent with Buddy and the footer. Layout uses logical properties so the
// navbar mirrors correctly in RTL (Arabic/Urdu).

const services = [
  { nameKey: 'web-development', path: '/gig/web-development' },
  { nameKey: 'mobile-app-development', path: '/gig/mobile-development' },
  { nameKey: 'digital-marketing', path: '/gig/digital-marketing' },
  { nameKey: 'ui-ux-design', path: '/gig/ui-ux-design' },
  { nameKey: 'cloud-solutions', path: '/gig/cloud-solutions' },
  { nameKey: 'devops-services', path: '/gig/devops-services' },
];

const navLinks = [
  { key: 'nav.home', path: '/' },
  { key: 'nav.products', path: '/products' },
  { key: 'nav.projectEstimate', path: '/project-analysis' },
  { key: 'nav.about', path: '/about' },
  { key: 'nav.contact', path: '/contact' },
  { key: 'nav.career', path: '/careers' },
];

const Header = () => {
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const rtl = i18n.dir() === 'rtl';

  const isActive = (path: string) => location.pathname === path;

  // Logo click: navigate home and scroll back to the top (route change alone
  // doesn't scroll when the user is already on the homepage).
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  const linkCls = (path: string) =>
    `rounded-lg px-1 py-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
      isActive(path) ? 'text-pink-600 font-semibold' : 'text-gray-700 hover:text-pink-600'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/85 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo — never mirrored */}
          <Link
            to="/"
            onClick={scrollToTop}
            className="flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg">
              <img src={icon.logos} alt="SCS Softwares logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-xl font-bold sm:text-2xl">
              Scs <span className="text-gradient-ai">Softwares</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 lg:flex">
            <Link to="/" className={linkCls('/')}>
              {t('nav.home')}
            </Link>

            <div
              className="relative"
              onMouseEnter={() => setIsServicesOpen(true)}
              onMouseLeave={() => setIsServicesOpen(false)}
            >
              <button
                className={`flex items-center gap-1 rounded-lg px-1 py-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
                  location.pathname.startsWith('/gig/') ? 'text-pink-600 font-semibold' : 'text-gray-700 hover:text-pink-600'
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
                <div className="absolute start-0 top-full z-50 w-64 pt-2">
                  <div className="glow-card overflow-hidden rounded-2xl border border-gray-200 bg-white py-2">
                    {services.map((service) => (
                      <Link
                        key={service.path}
                        to={service.path}
                        className={`block px-4 py-2.5 text-sm transition-colors hover:bg-pink-50 hover:text-pink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink-400 ${
                          isActive(service.path) ? 'font-semibold text-pink-600' : 'text-gray-700'
                        }`}
                        onClick={() => setIsServicesOpen(false)}
                      >
                        {t(`services.names.${service.nameKey}`)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link to="/products" className={linkCls('/products')}>
              {t('nav.products')}
            </Link>
            <Link to="/project-analysis" className={linkCls('/project-analysis')}>
              {t('nav.projectEstimate')}
            </Link>
            <Link to="/about" className={linkCls('/about')}>
              {t('nav.about')}
            </Link>
            <Link to="/contact" className={linkCls('/contact')}>
              {t('nav.contact')}
            </Link>
            <Link to="/careers" className={linkCls('/careers')}>
              {t('nav.career')}
            </Link>
            <LanguageSwitcher />
            <Link
              to="/project-analysis"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-pink-400/30 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {t('common.getEstimate')}
            </Link>
          </nav>

          {/* Mobile: language switcher + menu button */}
          <div className="flex items-center gap-2 lg:hidden">
            <LanguageSwitcher compact />
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

      {/* Mobile Drawer — slides in from the logical end side */}
      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />
          <motion.div
            initial={reduceMotion ? false : { x: rtl ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 end-0 z-50 w-80 max-w-full overflow-y-auto border-s border-gray-200 bg-white p-6 shadow-2xl lg:hidden"
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

              <div className="mt-3 border-t border-gray-200 pt-4">
                <span className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">{t('nav.services')}</span>
                <div className="mt-2 flex flex-col gap-1">
                  {services.map((service) => (
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

              <Link
                to="/project-analysis"
                className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-pink-400/30 transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                onClick={() => setIsMenuOpen(false)}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" /> {t('common.getEstimate')}
              </Link>
            </nav>
          </motion.div>
        </>
      )}
    </header>
  );
};

export default Header;
