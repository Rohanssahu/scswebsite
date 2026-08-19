import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, MapPin, ArrowRight, Smartphone, Sparkles, PhoneCall } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Reveal from '../components/Reveal';

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-400/40 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';

const images = [
  'https://www.scssoftwares.com/images/roomji1.png',
  'https://www.scssoftwares.com/images/roomji2.png',
  'https://www.scssoftwares.com/images/roomji3.png',
  'https://www.scssoftwares.com/images/roomji4.png',
  'https://www.scssoftwares.com/images/roomji5.png',
];

const product = {
  title: 'RoomJi',
  subtitle: 'Find & Book Rooms and Flats Online',
  description:
    'Search nearby rooms, flats, and all types of properties, with easy online booking and image galleries.',
  location: 'Indore MP, India',
  features: [
    'Instant booking confirmation',
    'High-quality images with virtual tours',
    '24/7 customer support',
    'Flexible cancellation policies',
  ],
};

const ProductDetailsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        <div className="bg-grid-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[50rem] -translate-x-1/2 animate-pulse-glow rounded-full bg-pink-200/60 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-purple-200/50 blur-3xl" aria-hidden="true" />

        <div className="container relative mx-auto px-4 py-20 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-pink-50 px-4 py-1.5 text-xs font-medium text-pink-700">
                  <Smartphone className="h-3.5 w-3.5" aria-hidden="true" /> Mobile App · Product
                </span>
              </Reveal>
              <Reveal delay={0.1}>
                <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl">
                  <span className="text-gradient-ai">{product.title}</span>
                </h1>
              </Reveal>
              <Reveal delay={0.15}>
                <p className="mt-3 text-xl font-semibold text-gray-800">{product.subtitle}</p>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="mt-5 text-lg leading-relaxed text-gray-600">{product.description}</p>
              </Reveal>
              <Reveal delay={0.25}>
                <p className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MapPin className="h-4 w-4 text-pink-600" aria-hidden="true" /> {product.location}
                </p>
              </Reveal>
              <Reveal delay={0.3}>
                <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                  <Link to="/contact" className={primaryBtn}>
                    Book Now <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link to="/products" className={secondaryBtn}>
                    All Products
                  </Link>
                </div>
              </Reveal>
            </div>
            <Reveal delay={0.2}>
              <div className="glow-card overflow-hidden rounded-3xl border border-gray-200 bg-white">
                <img
                  src={images[0]}
                  alt={`${product.title} app preview`}
                  loading="lazy"
                  className="h-72 w-full object-cover transition-transform duration-300 hover:scale-105 sm:h-96"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">Features</span>
            <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything you need to <span className="text-gradient-ai">find a room</span>
            </h2>
          </div>
          <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
            {product.features.map((feature, i) => (
              <Reveal key={feature} delay={i * 0.06}>
                <div className="flex h-full items-start gap-3 rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-pink-300">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span className="text-sm font-medium text-gray-700">{feature}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Screenshots ===== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">Gallery</span>
            <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">A look inside the app</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {images.map((img, i) => (
              <Reveal key={img} delay={i * 0.05}>
                <div className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors hover:border-pink-300">
                  <img
                    src={img}
                    alt={`${product.title} screenshot ${i + 1}`}
                    loading="lazy"
                    className="h-56 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-64"
                  />
                </div>
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
              <h2 className="text-2xl font-bold sm:text-3xl">Want an app like {product.title}?</h2>
              <p className="max-w-xl text-gray-600">
                We can customize this product for your brand or build one from scratch. Get in touch and let's talk
                about it.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/contact" className={primaryBtn}>
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> Contact us
                </Link>
                <Link to="/schedule-call" className={secondaryBtn}>
                  Schedule a call
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ProductDetailsPage;
