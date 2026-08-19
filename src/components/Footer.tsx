import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';
import { icon } from '@/asset/images';

const services = [
  { name: 'Web Development', path: '/gig/web-development' },
  { name: 'Mobile App Development', path: '/gig/mobile-development' },
  { name: 'Digital Marketing', path: '/gig/digital-marketing' },
  { name: 'UI/UX Design', path: '/gig/ui-ux-design' },
  { name: 'Cloud Solutions', path: '/gig/cloud-solutions' },
  { name: 'DevOps Services', path: '/gig/devops-services' },
];

const quickLinks = [
  { name: 'Home', path: '/' },
  { name: 'About Us', path: '/about' },
  { name: 'Products', path: '/products' },
  { name: 'Project Estimate', path: '/project-analysis' },
  { name: 'Career', path: '/careers' },
  { name: 'Contact', path: '/contact' },
  { name: 'Privacy Policy', path: '/PrivacyPolicy' },
  { name: 'Terms of Service', path: '/TermsAndConditions' },
];

const socials = [
  { name: 'Facebook', icon: Facebook, href: 'https://www.facebook.com/share/19FARSMgHA/?mibextid=wwXIfr' },
  { name: 'Twitter', icon: Twitter, href: 'https://x.com/i/flow/login?redirect_after_login=%2Fscssoftware24' },
  { name: 'LinkedIn', icon: Linkedin, href: 'https://www.linkedin.com/company/105694530' },
  { name: 'Instagram', icon: Instagram, href: 'https://www.instagram.com/scssoftwares24?igsh=MzhiMW15bms3endj' },
];

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12.004 2.001c-5.522 0-10 4.477-10 10 0 1.756.462 3.458 1.341 4.966L2 22l5.142-1.336c1.466.809 3.11 1.229 4.862 1.229 5.523 0 10-4.478 10-10s-4.477-10-10-10zm0 18.25c-1.471 0-2.907-.394-4.164-1.142l-.296-.175-3.049.791.812-2.964-.193-.305C4.38 15.005 4 13.519 4 12.001c0-4.418 3.583-8 8.004-8 4.418 0 7.996 3.582 7.996 8 0 4.417-3.578 8.25-7.996 8.25zm4.137-6.081c-.226-.113-1.336-.659-1.543-.735-.207-.075-.357-.113-.506.113-.15.226-.58.735-.71.885-.132.15-.263.169-.488.056-.225-.113-.949-.35-1.807-1.116-.668-.596-1.118-1.335-1.25-1.56-.131-.225-.014-.346.099-.459.102-.101.226-.263.338-.394.112-.131.15-.225.226-.375.075-.15.037-.281-.019-.394-.056-.112-.506-1.222-.694-1.674-.182-.435-.369-.377-.506-.383-.132-.006-.282-.007-.432-.007-.15 0-.394.057-.6.282s-.788.77-.788 1.878c0 1.108.807 2.179.918 2.33.112.15 1.59 2.428 3.86 3.404 2.27.977 2.27.651 2.675.613.394-.038 1.336-.544 1.522-1.07.188-.525.188-.976.132-1.07-.057-.094-.207-.15-.432-.263z" />
  </svg>
);

const footerLinkCls =
  'text-sm text-gray-400 transition-colors hover:text-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 rounded';

const Footer = () => {
  return (
    <footer className="bg-gray-950 text-white">
      {/* Brand gradient accent line */}
      <div className="h-px bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600" aria-hidden="true" />

      <div className="container mx-auto px-4 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Company Info */}
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
            >
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg">
                <img src={icon.logos} alt="SCS Softwares logo" className="h-full w-full object-contain" />
              </div>
              <span className="text-2xl font-bold">
                Scs <span className="text-gradient-ai">Softwares</span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-gray-400">
              Leading software development company delivering innovative solutions for businesses worldwide. We
              transform ideas into powerful digital experiences.
            </p>
            <div className="mt-5 flex gap-3">
              {socials.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-800 text-gray-400 transition-colors hover:border-pink-400 hover:text-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                >
                  <social.icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">Our Services</h3>
            <ul className="mt-5 space-y-3">
              {services.map((service) => (
                <li key={service.path}>
                  <Link to={service.path} className={footerLinkCls}>
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">Quick Links</h3>
            <ul className="mt-5 space-y-3">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className={footerLinkCls}>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">Contact Info</h3>
            <div className="mt-5 space-y-4 text-sm text-gray-400">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-pink-500" aria-hidden="true" />
                <span className="leading-relaxed">
                  9th Floor, Shekhar Central, Palasia Square, Manorama Ganj, Indore, Madhya Pradesh 452001
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 shrink-0 text-pink-500" aria-hidden="true" />
                <span>+91 7828690192</span>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-pink-500" aria-hidden="true" />
                <span>info@scssoftwares.com</span>
              </div>

              <div className="flex items-center gap-3">
                <WhatsAppIcon className="h-5 w-5 shrink-0 text-emerald-500" />
                <a
                  href="https://wa.me/917828690192"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded"
                >
                  +91 7828690192
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-800 pt-8 text-center">
          <p className="text-sm text-gray-500">
            © 2022 Scs Softwares. All rights reserved. Built with passion and innovation.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
