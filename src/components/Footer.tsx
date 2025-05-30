
import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';
import { icon } from '@/asset/images';

const Footer = () => {
  const services = [
    { name: 'Web Development', path: '/gig/web-development' },
    { name: 'Mobile App Development', path: '/gig/mobile-development' },
    { name: 'Digital Marketing', path: '/gig/digital-marketing' },
    { name: 'UI/UX Design', path: '/gig/ui-ux-design' },
    { name: 'Cloud Solutions', path: '/gig/cloud-solutions' },
    { name: 'DevOps Services', path: '/gig/devops-services' }
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10  rounded-lg flex items-center justify-center">
                  <img
                    src={icon.logos}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
              </div>
              <span className="text-2xl font-bold">Scs Softwares</span>
            </div>
            <p className="text-gray-300">
              Leading software development company delivering innovative solutions 
              for businesses worldwide. We transform ideas into powerful digital experiences.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.facebook.com/share/19FARSMgHA/?mibextid=wwXIfr"   target="_blank" className="text-gray-300 hover:text-blue-400 transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://x.com/i/flow/login?redirect_after_login=%2Fscssoftware24"   target="_blank" className="text-gray-300 hover:text-blue-400 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
           
              <a
  href="https://www.linkedin.com/company/105694530"
  target="_blank"
  rel="noopener noreferrer"
  className="text-gray-300 hover:text-blue-400 transition-colors"
>
  <Linkedin className="h-5 w-5" />
</a>
              <a href="https://www.instagram.com/scssoftwares24?igsh=MzhiMW15bms3endj"    target="_blank" className="text-gray-300 hover:text-blue-400 transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Our Services</h3>
            <ul className="space-y-2">
              {services.map((service) => (
                <li key={service.path}>
                  <Link 
                    to={service.path} 
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-300 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <a href="/PrivacyPolicy" className="text-gray-300 hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/TermsAndConditions" className="text-gray-300 hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
        {/* Contact Info */}
<div className="space-y-4">
  <h3 className="text-xl font-semibold">Contact Info</h3>
  <div className="space-y-3">
    <div className="flex space-x-3">
      <MapPin className="h-12 w-12 text-blue-400" />
      <span className="text-gray-300">
     9th Floor, Shekhar central, Palasia Square, Manorama Ganj, Indore, Madhya Pradesh 452001
      </span>
    </div>

    <div className="flex items-center space-x-3">
      <Phone className="h-5 w-5 text-blue-400" />
      <span className="text-gray-300">+91 7828690192</span>
    </div>

    <div className="flex items-center space-x-3">
      <Mail className="h-5 w-5 text-blue-400" />
      <span className="text-gray-300">info@scssoftwares.com</span>
    </div>

    <div className="flex items-center space-x-3">
      <svg
        className="h-5 w-5 text-green-400"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12.004 2.001c-5.522 0-10 4.477-10 10 0 1.756.462 3.458 1.341 4.966L2 22l5.142-1.336c1.466.809 3.11 1.229 4.862 1.229 5.523 0 10-4.478 10-10s-4.477-10-10-10zm0 18.25c-1.471 0-2.907-.394-4.164-1.142l-.296-.175-3.049.791.812-2.964-.193-.305C4.38 15.005 4 13.519 4 12.001c0-4.418 3.583-8 8.004-8 4.418 0 7.996 3.582 7.996 8 0 4.417-3.578 8.25-7.996 8.25zm4.137-6.081c-.226-.113-1.336-.659-1.543-.735-.207-.075-.357-.113-.506.113-.15.226-.58.735-.71.885-.132.15-.263.169-.488.056-.225-.113-.949-.35-1.807-1.116-.668-.596-1.118-1.335-1.25-1.56-.131-.225-.014-.346.099-.459.102-.101.226-.263.338-.394.112-.131.15-.225.226-.375.075-.15.037-.281-.019-.394-.056-.112-.506-1.222-.694-1.674-.182-.435-.369-.377-.506-.383-.132-.006-.282-.007-.432-.007-.15 0-.394.057-.6.282s-.788.77-.788 1.878c0 1.108.807 2.179.918 2.33.112.15 1.59 2.428 3.86 3.404 2.27.977 2.27.651 2.675.613.394-.038 1.336-.544 1.522-1.07.188-.525.188-.976.132-1.07-.057-.094-.207-.15-.432-.263z" />
      </svg>
      <a
        href="https://wa.me/917828690192"
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-300 hover:underline"
      >
        +91 7869742922
      </a>
    </div>
  </div>
</div>

        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-300">
            © 2024 Scs Softwares. All rights reserved. Built with passion and innovation.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
