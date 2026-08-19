import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-400/40 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';

interface Product {
  title: string;
  subtitle: string;
  description: string;
  image?: string;
  path: string;
  type: 'mobile' | 'web' | 'cloud' | 'marketing' | 'devops';
}

const products: Product[] = [
  {
    title: 'RoomJi',
    subtitle: 'Find & Book Rooms and Flats Online',
    description: 'Search nearby rooms, flats, and all types of properties.',
    image: 'https://www.scssoftwares.com/images/roomji.png',
    path: '/ProductDetailsPage',
    type: 'mobile',
  },
  {
    title: 'Smart Service Booking App',
    subtitle: 'Book Local Services like Electricians, Plumbers, and More',
    description: 'Scalable multi-vendor local services platform.',
    path: '/ServiceBookingDetailsPage',
    type: 'mobile',
  },
  {
    title: 'Digital Business Card App',
    subtitle: 'Modern Networking with QR & Analytics',
    description: 'Create and share digital cards with QR codes and analytics.',
    path: '/DigitalCardDetailsPage',
    type: 'web',
  },
  {
    title: 'Clinic/Doctor Appointment System',
    subtitle: 'Online Booking + Patient Record',
    description: 'Booking, reminders, and digital records.',
    path: '/DoctorAppDetailsPage',
    type: 'web',
  },
  {
    title: 'QR Menu App',
    subtitle: 'Contactless Digital Menus',
    description: 'Multi-vendor QR menu and ordering solution.',
    path: '/QRMenuDetailsPage',
    type: 'web',
  },
  {
    title: 'E-learning Platform',
    subtitle: 'Online Courses with Quizzes',
    description: 'Create courses like Udemy with quizzes & certificates.',
    path: '/ElearningPlatformDetailsPage',
    type: 'web',
  },
  {
    title: 'Real Estate Listing App',
    subtitle: 'Buy, Sell, and Rent Properties Easily',
    description: 'List properties with map, images, and contact.',
    path: '/RealEstateAppDetailsPage',
    type: 'mobile',
  },
  {
    title: 'HR Management System',
    subtitle: 'Manage Employees & Payroll',
    description: 'Web-based HRMS with attendance and payroll.',
    path: '/HRMSDetailsPage',
    type: 'cloud',
  },
  {
    title: 'Inventory & Billing Software',
    subtitle: 'POS & Inventory for Small Businesses',
    description: 'Billing, stock, and GST-ready invoices.',
    path: '/InventoryBillingDetailsPage',
    type: 'cloud',
  },
  {
    title: 'Gym Management System',
    subtitle: 'Track Memberships, Fees & Workouts',
    description: 'Mobile/web solution for gyms and trainers.',
    path: '/GymAppDetailsPage',
    type: 'mobile',
  },
  {
    title: 'Online Grocery Store',
    subtitle: 'Daily Needs Delivered to Your Door',
    description: 'eCommerce for grocery sellers with delivery slots.',
    path: '/GroceryAppDetailsPage',
    type: 'mobile',
  },
  {
    title: 'Online Donation Platform',
    subtitle: 'Crowdfunding for NGOs & Causes',
    description: 'Campaigns, donations, and tracking.',
    path: '/DonationPlatformDetailsPage',
    type: 'web',
  },
  {
    title: 'Online Food Delivery App',
    subtitle: 'Restaurant Listings, Orders & Delivery',
    description: 'Zomato/Swiggy style ordering and delivery tracking.',
    path: '/FoodDeliveryDetailsPage',
    type: 'mobile',
  },
  {
    title: 'Online Exam/Test Portal',
    subtitle: 'Host Timed Tests with Auto Evaluation',
    description: 'Timed exams with scoring and reports.',
    path: '/ExamPortalDetailsPage',
    type: 'cloud',
  },
  {
    title: 'SEO & Digital Marketing Tools',
    subtitle: 'Boost Your Online Visibility',
    description: 'Campaign tracking, keyword planner, SEO audit.',
    path: '/MarketingToolsDetailsPage',
    type: 'marketing',
  },
  {
    title: 'DevOps Dashboard System',
    subtitle: 'CI/CD & Infra Monitoring',
    description: 'Manage builds, servers, and deployments.',
    path: '/DevOpsDetailsPage',
    type: 'devops',
  },
];

const categories = [
  { label: 'All', value: 'all' },
  { label: 'Mobile Apps', value: 'mobile' },
  { label: 'Web Apps', value: 'web' },
  { label: 'Cloud Solutions', value: 'cloud' },
  { label: 'Digital Marketing', value: 'marketing' },
  { label: 'DevOps Tools', value: 'devops' },
];

const TYPE_META: Record<Product['type'], { icon: React.ElementType; label: string; gradient: string }> = {
  mobile: { icon: Smartphone, label: 'Mobile App', gradient: 'from-orange-400 to-pink-500' },
  web: { icon: Code, label: 'Web App', gradient: 'from-pink-500 to-purple-600' },
  cloud: { icon: Cloud, label: 'Cloud Solution', gradient: 'from-purple-500 to-pink-500' },
  marketing: { icon: TrendingUp, label: 'Digital Marketing', gradient: 'from-orange-500 to-purple-500' },
  devops: { icon: Settings, label: 'DevOps Tool', gradient: 'from-pink-400 to-purple-500' },
};

const ProductShowcase = () => {
  const [filter, setFilter] = useState('all');

  const filteredProducts = filter === 'all' ? products : products.filter((product) => product.type === filter);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        <div className="bg-grid-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[50rem] -translate-x-1/2 animate-pulse-glow rounded-full bg-pink-200/60 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-purple-200/50 blur-3xl" aria-hidden="true" />

        <div className="container relative mx-auto px-4 py-20 text-center sm:py-24">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-pink-50 px-4 py-1.5 text-xs font-medium text-pink-700">
              <Package className="h-3.5 w-3.5" aria-hidden="true" /> Ready-made solutions
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Our <span className="text-gradient-ai">Products</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              Proven, customizable products for mobile, web, cloud, marketing and DevOps — ready to launch for your
              business.
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
                  key={cat.value}
                  type="button"
                  onClick={() => setFilter(cat.value)}
                  aria-pressed={filter === cat.value}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
                    filter === cat.value
                      ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white shadow-md shadow-pink-400/30'
                      : 'border border-gray-300 bg-white text-gray-700 hover:border-pink-400 hover:text-gray-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product, i) => {
              const meta = TYPE_META[product.type];
              const TypeIcon = meta.icon;
              return (
                <Reveal key={product.path} delay={(i % 3) * 0.06}>
                  <Link
                    to={product.path}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors hover:border-pink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                  >
                    {product.image ? (
                      <div className="overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.title}
                          loading="lazy"
                          className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className={`flex h-48 w-full items-center justify-center bg-gradient-to-br ${meta.gradient}`}>
                        <TypeIcon className="h-14 w-14 text-white/90 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-6">
                      <span className="text-xs font-semibold uppercase tracking-wide text-pink-600">{meta.label}</span>
                      <h3 className="mt-1 text-lg font-bold text-gray-900">{product.title}</h3>
                      <p className="mt-1 text-sm font-medium text-gray-700">{product.subtitle}</p>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{product.description}</p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-pink-600 group-hover:text-gray-900">
                        View details <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 pt-4">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="glow-card mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl border border-gray-300 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 p-8 text-center sm:p-12">
              <PhoneCall className="h-9 w-9 text-pink-600" aria-hidden="true" />
              <h2 className="text-2xl font-bold sm:text-3xl">Need a custom version of a product?</h2>
              <p className="max-w-xl text-gray-600">
                Every product can be tailored to your brand, features and workflow. Tell us what you need and we'll
                make it yours.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/contact" className={primaryBtn}>
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> Talk to us
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

export default ProductShowcase;
