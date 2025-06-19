import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { icon } from '@/asset/images';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);
  const location = useLocation();

  const services = [
    { name: 'Web Development', path: '/gig/web-development' },
    { name: 'Mobile App Development', path: '/gig/mobile-development' },
    { name: 'Digital Marketing', path: '/gig/digital-marketing' },
    { name: 'UI/UX Design', path: '/gig/ui-ux-design' },
    { name: 'Cloud Solutions', path: '/gig/cloud-solutions' },
    { name: 'DevOps Services', path: '/gig/devops-services' },
  ];


  
  
  

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
              <img src={icon.logos} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-2xl font-bold text-gray-800">Scs Softwares</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className={`text-gray-700 hover:text-blue-600 ${isActive('/') && 'text-blue-600 font-semibold'}`}>
              Home
            </Link>

            <div className="relative group"
                    onMouseEnter={() => setIsServicesOpen(true)}
                    
            >
              <button 
                className="flex items-center text-gray-700 hover:text-blue-600"
        
              >
                Services <ChevronDown className="ml-1 h-4 w-4" />
              </button>
              {isServicesOpen && (
                <div 
                  className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border py-2 z-50"
                  onMouseEnter={() => setIsServicesOpen(true)}
                  onMouseLeave={() => setIsServicesOpen(false)}
                >
                  {services.map(service => (
                    <Link key={service.path} to={service.path} className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                      {service.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link to="/products" className={`text-gray-700 hover:text-blue-600 ${isActive('/about') && 'text-blue-600 font-semibold'}`}>
            Products
            </Link>

            <Link to="/about" className={`text-gray-700 hover:text-blue-600 ${isActive('/about') && 'text-blue-600 font-semibold'}`}>
              About
            </Link>
            <Link to="/contact" className={`text-gray-700 hover:text-blue-600 ${isActive('/contact') && 'text-blue-600 font-semibold'}`}>
              Contact
            </Link>
            <Link to="/careers" className={`text-gray-700 hover:text-blue-600 ${isActive('/careers') && 'text-blue-600 font-semibold'}`}>
              Career
            </Link>
            <Link to="/contact" className="bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-white px-6 py-2 rounded-full hover:shadow-lg transition-all hover:scale-105">
              Get Quote
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button className="md:hidden" onClick={() => setIsMenuOpen(true)}>
            <Menu className="h-6 w-6" />
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
          className="fixed inset-0 z-50 bg-white w-80 shadow-2xl p-6 md:hidden"
        >
          <div className="flex justify-between items-center mb-6">
            <span className="text-xl font-semibold text-gray-800">Menu</span>
            <button onClick={() => setIsMenuOpen(false)}>
              <X className="h-6 w-6 text-gray-700" />
            </button>
          </div>
          <nav className="flex flex-col space-y-4">
            <Link to="/" className="text-gray-700 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>Home</Link>
            
            <div>
              <span className="font-medium text-gray-700">Services</span>
              <div className="pl-4 mt-2 space-y-1">
                {services.map(service => (
                  <Link key={service.path} to={service.path} className="block text-gray-600 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>
                    {service.name}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <span className="font-medium text-gray-700">Product</span>
              <div className="pl-4 mt-2 space-y-1">
                {product.map(product => (
                  <Link key={product.path} to={product.path} className="block text-gray-600 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>
                    {product.name}
                  </Link>
                ))}
              </div>
            </div>

            <Link to="/about" className="text-gray-700 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>About</Link>
            <Link to="/contact" className="text-gray-700 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>Contact</Link>
            <Link to="/careers" className="text-gray-700 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>Career</Link>

            <Link to="/contact" className="bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-white px-6 py-2 rounded-full text-center mt-4" onClick={() => setIsMenuOpen(false)}>
              Get Quote
            </Link>
          </nav>
        </motion.div>
      )}
    </header>
  );
};

export default Header;
