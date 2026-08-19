import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Send, Loader2, MessageCircle, Sparkles, ArrowRight, PhoneCall } from 'lucide-react';
import emailjs from 'emailjs-com';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Reveal from '../components/Reveal';

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-400/40 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-pink-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400';

const inputClass =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200';
const labelClass = 'mb-2 block text-sm font-medium text-gray-700';

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12.004 2.001c-5.522 0-10 4.477-10 10 0 1.756.462 3.458 1.341 4.966L2 22l5.142-1.336c1.466.809 3.11 1.229 4.862 1.229 5.523 0 10-4.478 10-10s-4.477-10-10-10zm0 18.25c-1.471 0-2.907-.394-4.164-1.142l-.296-.175-3.049.791.812-2.964-.193-.305C4.38 15.005 4 13.519 4 12.001c0-4.418 3.583-8 8.004-8 4.418 0 7.996 3.582 7.996 8 0 4.417-3.578 8.25-7.996 8.25zm4.137-6.081c-.226-.113-1.336-.659-1.543-.735-.207-.075-.357-.113-.506.113-.15.226-.58.735-.71.885-.132.15-.263.169-.488.056-.225-.113-.949-.35-1.807-1.116-.668-.596-1.118-1.335-1.25-1.56-.131-.225-.014-.346.099-.459.102-.101.226-.263.338-.394.112-.131.15-.225.226-.375.075-.15.037-.281-.019-.394-.056-.112-.506-1.222-.694-1.674-.182-.435-.369-.377-.506-.383-.132-.006-.282-.007-.432-.007-.15 0-.394.057-.6.282s-.788.77-.788 1.878c0 1.108.807 2.179.918 2.33.112.15 1.59 2.428 3.86 3.404 2.27.977 2.27.651 2.675.613.394-.038 1.336-.544 1.522-1.07.188-.525.188-.976.132-1.07-.057-.094-.207-.15-.432-.263z" />
  </svg>
);

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    service: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState({
    open: false,
    type: '', // success | error
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { name, email, message } = formData;

    if (!name || !email || !message) {
      setDialog({
        open: true,
        type: 'error',
        message: 'Please fill all required fields',
      });
      return;
    }
    setLoading(true);

    try {
      await emailjs.send('service_fz97kyb', 'template_shbutfo', formData, 'np--atCig3crdyD1t');

      setDialog({
        open: true,
        type: 'success',
        message: `Thank you ${name}! Your inquiry has been submitted successfully. Our team will contact you within 24 hours.`,
      });

      setFormData({
        name: '',
        email: '',
        company: '',
        service: '',
        message: '',
      });
    } catch (error) {
      console.error(error);
      setDialog({
        open: true,
        type: 'error',
        message: 'Failed to send message. Try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        <div className="bg-grid-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[50rem] -translate-x-1/2 animate-pulse-glow rounded-full bg-pink-200/60 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-purple-200/50 blur-3xl" aria-hidden="true" />

        <div className="container relative mx-auto px-4 py-20 text-center sm:py-28">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-pink-50 px-4 py-1.5 text-xs font-medium text-pink-700">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> We reply within 24 hours
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Get In <span className="text-gradient-ai">Touch</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              Ready to transform your business with technology? Let's discuss your project and how we can help you
              achieve your goals.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== Contact form + info ===== */}
      <section className="border-t border-gray-200 py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-10 lg:grid-cols-5 lg:gap-12">
            {/* Contact Form */}
            <Reveal className="lg:col-span-3">
              <div className="glow-card rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">Contact form</span>
                <h2 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">Send us a message</h2>
                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className={labelClass}>
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className={inputClass}
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className={labelClass}>
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className={inputClass}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="company" className={labelClass}>
                        Company Name
                      </label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Your company name"
                      />
                    </div>
                    <div>
                      <label htmlFor="service" className={labelClass}>
                        Service Interested In
                      </label>
                      <select id="service" name="service" value={formData.service} onChange={handleChange} className={inputClass}>
                        <option value="">Select a service</option>
                        <option value="web-development">Web Development</option>
                        <option value="mobile-development">Mobile App Development</option>
                        <option value="digital-marketing">Digital Marketing</option>
                        <option value="ui-ux-design">UI/UX Design</option>
                        <option value="cloud-solutions">Cloud Solutions</option>
                        <option value="devops-services">DevOps Services</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className={labelClass}>
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className={inputClass}
                      placeholder="Tell us about your project..."
                    />
                  </div>

                  <button type="submit" disabled={loading} className={`${primaryBtn} w-full ${loading ? 'cursor-not-allowed opacity-70 hover:scale-100' : ''}`}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending...
                      </>
                    ) : (
                      <>
                        Send Message <Send className="h-4 w-4" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </Reveal>

            {/* Contact Info */}
            <div className="lg:col-span-2">
              <Reveal delay={0.1}>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">Contact details</span>
                <h2 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">Other ways to reach us</h2>
              </Reveal>

              <div className="mt-8 space-y-4">
                <Reveal delay={0.15}>
                  <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-pink-300">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600">
                      <MapPin className="h-5 w-5 text-white" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Our Office</h3>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600">
                        9th Floor, Shekhar Central,
                        <br />
                        Palasia Square, Manorama Ganj,
                        <br />
                        Indore, Madhya Pradesh 452001
                      </p>
                    </div>
                  </div>
                </Reveal>

                <Reveal delay={0.2}>
                  <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-pink-300">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-pink-500">
                      <Phone className="h-5 w-5 text-white" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Phone</h3>
                      <p className="mt-1 text-sm text-gray-600">+91 7828690192</p>
                      <p className="mt-1 text-xs text-gray-500">Mon–Fri 10AM–7PM IST</p>
                    </div>
                  </div>
                </Reveal>

                <Reveal delay={0.25}>
                  <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-pink-300">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                      <Mail className="h-5 w-5 text-white" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Email</h3>
                      <p className="mt-1 text-sm text-gray-600">info@scssoftwares.com</p>
                      <p className="mt-1 text-xs text-gray-500">We reply within 24 hours</p>
                    </div>
                  </div>
                </Reveal>

                <Reveal delay={0.3}>
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-emerald-300">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
                        <WhatsAppIcon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">WhatsApp</h3>
                        <p className="mt-1 text-sm text-gray-600">+91 7828690192</p>
                        <p className="mt-1 text-xs text-gray-500">Available anytime on chat</p>
                        <a
                          href="https://wa.me/917828690192"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                        >
                          <MessageCircle className="h-4 w-4" aria-hidden="true" /> Chat on WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Consultation CTA ===== */}
      <section className="py-20 pt-4">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="glow-card mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl border border-gray-300 bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 p-8 text-center sm:p-12">
              <PhoneCall className="h-9 w-9 text-pink-600" aria-hidden="true" />
              <h2 className="text-2xl font-bold sm:text-3xl">Ready to start your project?</h2>
              <p className="max-w-xl text-gray-600">
                Schedule a free consultation with our experts to discuss your requirements and get a personalized
                quote.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/consultation-form" className={primaryBtn}>
                  Schedule Consultation <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link to="/schedule-call" className={secondaryBtn}>
                  Book a free call
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Success / error dialog ===== */}
      {dialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDialog({ ...dialog, open: false })} />

          <div className="glow-card relative w-full max-w-md animate-fade-in rounded-3xl border border-gray-200 bg-white p-8 text-center">
            <div
              className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
                dialog.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'
              }`}
            >
              {dialog.type === 'success' ? (
                <span className="text-2xl text-emerald-600" aria-hidden="true">✔</span>
              ) : (
                <span className="text-2xl text-red-600" aria-hidden="true">✖</span>
              )}
            </div>

            <h3 className="text-lg font-bold text-gray-900">{dialog.type === 'success' ? 'Success' : 'Error'}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{dialog.message}</p>

            <button onClick={() => setDialog({ ...dialog, open: false })} className={`${primaryBtn} mt-6 px-10`}>
              OK
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Contact;
