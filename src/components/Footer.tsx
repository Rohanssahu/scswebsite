import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { icon } from '@/asset/images';
import LanguageSwitcher from '@/components/LanguageSwitcher';
// One shared service list with the header, so the footer can never keep
// advertising a service URL the navigation has already retired.
import { ALL_SERVICE_NAV, SERVICES_HUB } from '@/data/serviceNav';
// The markets that actually have a page. Nothing here is hand-maintained, so
// the footer cannot advertise a country page that was never written.
import { LOCATION_NAV, LOCATIONS_HUB } from '@/data/locationNav';
import { CONTACT } from '@/seo/site';

const quickLinks = [
  { key: 'nav.home', path: '/' },
  { key: 'nav.aboutUs', path: '/about' },
  { key: 'nav.products', path: '/products' },
  { key: 'nav.projectEstimate', path: '/project-analysis' },
  { key: 'nav.career', path: '/careers' },
  { key: 'nav.insights', path: '/insights' },
  { key: 'nav.contact', path: '/contact' },
  { key: 'nav.privacyPolicy', path: '/PrivacyPolicy' },
  { key: 'nav.termsOfService', path: '/TermsAndConditions' },
];

const socials = [
  { name: 'Facebook', icon: Facebook, href: 'https://www.facebook.com/share/19FARSMgHA/?mibextid=wwXIfr' },
  { name: 'Twitter', icon: Twitter, href: 'https://x.com/i/flow/login?redirect_after_login=%2Fscssoftware24' },
  { name: 'LinkedIn', icon: Linkedin, href: 'https://www.linkedin.com/company/105694530' },
  { name: 'Instagram', icon: Instagram, href: 'https://www.instagram.com/scssoftwares24?igsh=MzhiMW15bms3endj' },
];

const footerLinkCls =
  'text-sm text-gray-400 transition-colors hover:text-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 rounded';

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-gray-950 text-white">
      {/* Brand gradient accent line */}
      <div className="h-px bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600" aria-hidden="true" />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Company Info */}
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
            >
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
                <img src={icon.logos} alt="SCS Softwares logo" width={32} height={32} loading="lazy" decoding="async" className="h-full w-full object-contain" />
              </div>
              <span className="text-xl font-bold">
                Scs <span className="text-gradient-ai">Softwares</span>
              </span>
            </Link>
            <div className="mt-4 flex gap-2">
              {socials.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-800 text-gray-400 transition-colors hover:border-pink-400 hover:text-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                >
                  <social.icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">{t('footer.ourServices')}</h3>
            {/* Two columns so the full service list stays compact */}
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              <li className="col-span-2">
                <Link to={SERVICES_HUB.path} className="text-sm font-semibold text-pink-400 transition-colors hover:text-pink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 rounded">
                  {t('nav.allServices')}
                </Link>
              </li>
              {ALL_SERVICE_NAV.map((service) => (
                <li key={service.path}>
                  <Link to={service.path} className={footerLinkCls}>
                    {t(`services.names.${service.nameKey}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">{t('footer.quickLinks')}</h3>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className={footerLinkCls}>
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">{t('footer.contactInfo')}</h3>
            <div className="mt-3 space-y-1.5 text-sm text-gray-400">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-pink-500" aria-hidden="true" />
                <span>9th Floor, Shekhar Central, Palasia Square, Indore, MP 452001</span>
              </div>

              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-pink-500" aria-hidden="true" />
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="transition-colors hover:text-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 rounded"
                >
                  {CONTACT.email}
                </a>
              </div>

            </div>
          </div>

          {/* Markets — the hub first, then every market with a live page.
              A wrapping single line held six markets comfortably and nine
              badly, so the markets sit in their own column grid underneath the
              hub link rather than trailing off the end of it. */}
          <div className="sm:col-span-2 lg:col-span-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">{t('nav.markets')}</h3>
            <Link
              to={LOCATIONS_HUB.path}
              className="mt-3 inline-block rounded text-sm font-semibold text-pink-400 transition-colors hover:text-pink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
            >
              {t('nav.locations')}
            </Link>
            <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
              {LOCATION_NAV.map((market) => (
                <li key={market.path}>
                  <Link to={market.path} className={footerLinkCls}>
                    {market.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              Based in Indore, India. International projects are delivered remotely — we hold no office outside India.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 border-t border-gray-800 pt-4 text-center sm:flex-row sm:justify-between sm:text-start">
          <p className="text-xs text-gray-500">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          {/* Language choice lives here so the navbar stays focused on the CTAs */}
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
