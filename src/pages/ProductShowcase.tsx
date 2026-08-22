import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Smartphone,
  Code,
  Cloud,
  TrendingUp,
  Settings,
  Sparkles,
  ArrowRight,
  Package,
  PhoneCall,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Reveal from '../components/Reveal';
import VisualPlaceholder from '../components/VisualPlaceholder';
import { CORE_SERVICE_NAV } from '@/data/serviceNav';

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-400/40 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';

interface Product {
  title: string;
  slug: string;
  type: 'mobile' | 'web' | 'cloud' | 'marketing' | 'devops';
  /**
   * Only set for products that really have a detail page. Fifteen of the
   * sixteen cards used to link to routes that were never registered
   * (`/QRMenuDetailsPage`, `/HRMSDetailsPage`, ...), so every one of them
   * landed on the 404 screen. Cards without a page now stay on this page and
   * offer a route to `/contact` instead of inventing product pages.
   */
  detailPath?: string;
}

// Product titles are brand/product names and stay in English.
// Subtitle/description come from translations via products.items.<slug>.
const products: Product[] = [
  {
    title: 'RoomJi',
    slug: 'roomji',
    type: 'mobile',
    detailPath: '/ProductDetailsPage',
  },
  {
    title: 'Smart Service Booking App',
    slug: 'smart-service-booking-app',
    type: 'mobile',
  },
  {
    title: 'Digital Business Card App',
    slug: 'digital-business-card-app',
    type: 'web',
  },
  {
    title: 'Clinic/Doctor Appointment System',
    slug: 'clinic-doctor-appointment-system',
    type: 'web',
  },
  {
    title: 'QR Menu App',
    slug: 'qr-menu-app',
    type: 'web',
  },
  {
    title: 'E-learning Platform',
    slug: 'e-learning-platform',
    type: 'web',
  },
  {
    title: 'Real Estate Listing App',
    slug: 'real-estate-listing-app',
    type: 'mobile',
  },
  {
    title: 'HR Management System',
    slug: 'hr-management-system',
    type: 'cloud',
  },
  {
    title: 'Inventory & Billing Software',
    slug: 'inventory-billing-software',
    type: 'cloud',
  },
  {
    title: 'Gym Management System',
    slug: 'gym-management-system',
    type: 'mobile',
  },
  {
    title: 'Online Grocery Store',
    slug: 'online-grocery-store',
    type: 'mobile',
  },
  {
    title: 'Online Donation Platform',
    slug: 'online-donation-platform',
    type: 'web',
  },
  {
    title: 'Online Food Delivery App',
    slug: 'online-food-delivery-app',
    type: 'mobile',
  },
  {
    title: 'Online Exam/Test Portal',
    slug: 'online-exam-test-portal',
    type: 'cloud',
  },
  {
    title: 'SEO & Digital Marketing Tools',
    slug: 'seo-digital-marketing-tools',
    type: 'marketing',
  },
  {
    title: 'DevOps Dashboard System',
    slug: 'devops-dashboard-system',
    type: 'devops',
  },
];

const categories = ['all', 'mobile', 'web', 'cloud', 'marketing', 'devops'] as const;

const TYPE_META: Record<Product['type'], { icon: React.ElementType; gradient: string }> = {
  mobile: { icon: Smartphone, gradient: 'from-orange-400 to-pink-500' },
  web: { icon: Code, gradient: 'from-pink-500 to-purple-600' },
  cloud: { icon: Cloud, gradient: 'from-purple-500 to-pink-500' },
  marketing: { icon: TrendingUp, gradient: 'from-orange-500 to-purple-500' },
  devops: { icon: Settings, gradient: 'from-pink-400 to-purple-500' },
};

const ProductShowcase = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');

  const filteredProducts = filter === 'all' ? products : products.filter((product) => product.type === filter);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <main id="main-content">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        <div className="bg-grid-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[50rem] -translate-x-1/2 animate-pulse-glow rounded-full bg-pink-200/60 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-purple-200/50 blur-3xl" aria-hidden="true" />

        <div className="container relative mx-auto px-4 py-20 text-center sm:py-24">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-pink-50 px-4 py-1.5 text-xs font-medium text-pink-700">
              <Package className="h-3.5 w-3.5" aria-hidden="true" /> {t('products.badge')}
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              {t('products.heroTitle1')} <span className="text-gradient-ai">{t('products.heroTitle2')}</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              {t('products.heroSub')}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== Filter + Grid ===== */}
      <section data-guide-id="products-grid" className="border-t border-gray-200 py-16">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="mb-12 flex flex-wrap justify-center gap-2.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilter(cat)}
                  aria-pressed={filter === cat}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
                    filter === cat
                      ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white shadow-md shadow-pink-400/30'
                      : 'border border-gray-300 bg-white text-gray-700 hover:border-pink-400 hover:text-gray-900'
                  }`}
                >
                  {t(`products.categories.${cat}`)}
                </button>
              ))}
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product, i) => {
              const meta = TYPE_META[product.type];
              const TypeIcon = meta.icon;
              return (
                <Reveal key={product.slug} delay={(i % 3) * 0.06}>
                  <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors hover:border-pink-300">
                    <VisualPlaceholder icon={TypeIcon} gradient={meta.gradient} />
                    <div className="flex flex-1 flex-col p-6">
                      <span className="text-xs font-semibold uppercase tracking-wide text-pink-600">{t(`products.types.${product.type}`)}</span>
                      <h3 className="mt-1 text-lg font-bold text-gray-900">{product.title}</h3>
                      <p className="mt-1 text-sm font-medium text-gray-700">{t(`products.items.${product.slug}.subtitle`)}</p>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{t(`products.items.${product.slug}.description`)}</p>
                      <Link
                        to={product.detailPath ?? '/contact'}
                        className="mt-4 inline-flex items-center gap-1.5 rounded text-sm font-medium text-pink-600 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                      >
                        {product.detailPath ? t('common.viewDetails') : t('products.discuss')}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Build something custom instead ===== */}
      <section className="border-t border-gray-200 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">
              {t('products.buildCustom.eyebrow')}
            </span>
            <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">{t('products.buildCustom.title')}</h2>
            <p className="mt-4 text-gray-600">{t('products.buildCustom.text')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {CORE_SERVICE_NAV.map((service, i) => (
              <Reveal key={service.path} delay={i * 0.05}>
                <Link
                  to={service.path}
                  className="group flex h-full items-center justify-center rounded-2xl border border-gray-200 bg-white p-5 text-center text-sm font-medium text-gray-700 transition-colors hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                >
                  {t(`services.names.${service.nameKey}`)}
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 pt-4">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="glow-card mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl border border-gray-300 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 p-8 text-center sm:p-12">
              <PhoneCall className="h-9 w-9 text-pink-600" aria-hidden="true" />
              <h2 className="text-2xl font-bold sm:text-3xl">{t('products.cta.title')}</h2>
              <p className="max-w-xl text-gray-600">
                {t('products.cta.text')}
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/contact" className={primaryBtn}>
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> {t('products.cta.talk')}
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

export default ProductShowcase;
