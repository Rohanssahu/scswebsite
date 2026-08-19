import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { icon } from '@/asset/images';

interface HeaderProps {
  /** "dark" renders the navy AI-first styling used on the new estimator pages. */
  variant?: 'light' | 'dark';
}

const Header = ({ variant = 'light' }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const location = useLocation();
  const dark = variant === 'dark';

  const services = [
    { name: 'Web Development', path: '/gig/web-development' },
    { name: 'Mobile App Development', path: '/gig/mobile-development' },
    { name: 'Digital Marketing', path: '/gig/digital-marketing' },
    { name: 'UI/UX Design', path: '/gig/ui-ux-design' },
    { name: 'Cloud Solutions', path: '/gig/cloud-solutions' },
    { name: 'DevOps Services', path: '/gig/devops-services' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const linkCls = (path: string) =>
    dark
      ? `text-blue-200 hover:text-white ${isActive(path) ? 'text-white font-semibold' : ''}`
      : `text-gray-700 hover:text-blue-600 ${isActive(path) ? 'text-blue-600 font-semibold' : ''}`;

  return (
    <header
      className={
        dark
          ? 'sticky top-0 z-50 border-b border-blue-400/15 bg-navy-950/85 backdrop-blur'
          : 'bg-white shadow-lg sticky top-0 z-50'
      }
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
              <img src={icon.logos} alt="SCS Softwares logo" className="w-full h-full object-contain" />
            </div>
            <span className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-800'}`}>Scs Softwares</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className={linkCls('/')}>
              Home
            </Link>

            <div className="relative group" onMouseEnter={() => setIsServicesOpen(true)}>
              <button
                className={`flex items-center ${dark ? 'text-blue-200 hover:text-white' : 'text-gray-700 hover:text-blue-600'}`}
                aria-expanded={isServicesOpen}
                onClick={() => setIsServicesOpen((o) => !o)}
              >
                Services <ChevronDown className="ml-1 h-4 w-4" aria-hidden="true" />
              </button>
              {isServicesOpen && (
                <div
                  className={`absolute top-full left-0 mt-2 w-64 rounded-lg shadow-xl border py-2 z-50 ${
                    dark ? 'border-blue-400/20 bg-navy-900' : 'bg-white'
                  }`}
                  onMouseEnter={() => setIsServicesOpen(true)}
                  onMouseLeave={() => setIsServicesOpen(false)}
                >
                  {services.map((service) => (
                    <Link
                      key={service.path}
                      to={service.path}
                      className={
                        dark
                          ? 'block px-4 py-2 text-blue-200 hover:bg-blue-400/10 hover:text-white'
                          : 'block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                      }
                    >
                      {service.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link to="/products" className={linkCls('/products')}>
              Products
            </Link>
            <Link to="/project-analysis" className={linkCls('/project-analysis')}>
              Project Estimate
            </Link>
            <Link to="/about" className={linkCls('/about')}>
              About
            </Link>
            <Link to="/contact" className={linkCls('/contact')}>
              Contact
            </Link>
            <Link to="/careers" className={linkCls('/careers')}>
              Career
            </Link>
            <Link
              to="/project-analysis"
              className={
                dark
                  ? 'bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600 text-white px-6 py-2 rounded-full hover:shadow-lg transition-all hover:scale-105'
                  : 'bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-white px-6 py-2 rounded-full hover:shadow-lg transition-all hover:scale-105'
              }
            >
              Get Estimate
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className={`md:hidden ${dark ? 'text-white' : ''}`}
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`fixed inset-y-0 right-0 z-50 w-80 max-w-full shadow-2xl p-6 md:hidden overflow-y-auto ${
            dark ? 'bg-navy-900 text-blue-100' : 'bg-white'
          }`}
        >
          <div className="flex justify-between items-center mb-6">
            <span className={`text-xl font-semibold ${dark ? 'text-white' : 'text-gray-800'}`}>Menu</span>
            <button onClick={() => setIsMenuOpen(false)} aria-label="Close menu">
              <X className={`h-6 w-6 ${dark ? 'text-blue-200' : 'text-gray-700'}`} aria-hidden="true" />
            </button>
          </div>
          <nav className="flex flex-col space-y-4">
            {[
              { name: 'Home', path: '/' },
              { name: 'Project Estimate', path: '/project-analysis' },
              { name: 'Products', path: '/products' },
              { name: 'About', path: '/about' },
              { name: 'Contact', path: '/contact' },
              { name: 'Career', path: '/careers' },
            ].map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={dark ? 'text-blue-100 hover:text-white' : 'text-gray-700 hover:text-blue-600'}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            <div>
              <span className={`font-medium ${dark ? 'text-blue-100' : 'text-gray-700'}`}>Services</span>
              <div className="pl-4 mt-2 space-y-1">
                {services.map((service) => (
                  <Link
                    key={service.path}
                    to={service.path}
                    className={dark ? 'block text-blue-300 hover:text-white' : 'block text-gray-600 hover:text-blue-600'}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {service.name}
                  </Link>
                ))}
              </div>
            </div>

            <Link
              to="/project-analysis"
              className={
                dark
                  ? 'bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600 text-white px-6 py-2 rounded-full text-center mt-4'
                  : 'bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-white px-6 py-2 rounded-full text-center mt-4'
              }
              onClick={() => setIsMenuOpen(false)}
            >
              Get Estimate
            </Link>
          </nav>
        </motion.div>
      )}
    </header>
  );
};

export default Header;
