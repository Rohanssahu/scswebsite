
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    service: '',
    message: ''
  });
  const [loading, setLoading] = useState(false); // <-- loading state added

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { name, email, message } = formData;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      alert("Please fill in your name, email, and message.");
      return;
    }

    setLoading(true); // start loading

    try {
      const response = await fetch("https://www.scssoftwares.com/scsapi/send_email.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        alert(errorResult.message || "Failed to send email.");
        setLoading(false);
        return;
      }

      const result = await response.json();
      alert(result.message);

      // Reset form after successful submission
      setFormData({
        name: '',
        email: '',
        company: '',
        service: '',
        message: ''
      });
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false); // stop loading in all cases
    }
  };

  
  

  

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 to-indigo-700 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">Get In Touch</h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Ready to transform your business with technology? Let's discuss your 
            project and how we can help you achieve your goals.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-8">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="company" className="block text-gray-700 font-medium mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your company name"
                    />
                  </div>
                  <div>
                    <label htmlFor="service" className="block text-gray-700 font-medium mb-2">
                      Service Interested In
                    </label>
                    <select
                      id="service"
                      name="service"
                      value={formData.service}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
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
                  <label htmlFor="message" className="block text-gray-700 font-medium mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tell us about your project..."
                  />
                </div>

                <button
          type="submit"
          disabled={loading}  // disable when loading
          className={`w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-8 rounded-lg font-semibold hover:shadow-lg transition-all transform hover:scale-105 flex items-center justify-center
            ${loading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
          `}
        >
          {loading ? 'Sending...' : 'Send Message'}
          {!loading && <Send className="ml-2 h-5 w-5" />}
        </button>
              </form>
            </div>

            {/* Contact Info */}
            <div>
  <h2 className="text-3xl font-bold text-gray-800 mb-8">Get in touch</h2>

  <div className="space-y-8">
    {/* Office */}
    <div className="flex items-start space-x-4">
      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
        <MapPin className="h-6 w-6 text-blue-600" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Our Office</h3>
        <p className="text-gray-600">
        9th Floor, Shekhar central, <br />Palasia Square, Manorama Ganj, <br />Indore, Madhya Pradesh 452001<br />
          
        </p>
      </div>
    </div>

    {/* Phone */}
    <div className="flex items-start space-x-4">
      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
        <Phone className="h-6 w-6 text-green-600" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Phone</h3>
        <p className="text-gray-600">+91 7828690192</p>
        <p className="text-sm text-gray-500 mt-1">Mon–Fri 10AM–7PM IST</p>
      </div>
    </div>

    {/* Email */}
    <div className="flex items-start space-x-4">
      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
        <Mail className="h-6 w-6 text-purple-600" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Email</h3>
        <p className="text-gray-600">info@scssoftwares.com</p>
        <p className="text-sm text-gray-500 mt-1">We reply within 24 hours</p>
      </div>
    </div>

    {/* WhatsApp */}
    <div className="flex items-start space-x-4">
      <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
        <svg
          className="h-6 w-6 text-green-500"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12.004 2.001c-5.522 0-10 4.477-10 10 0 1.756.462 3.458 1.341 4.966L2 22l5.142-1.336c1.466.809 3.11 1.229 4.862 1.229 5.523 0 10-4.478 10-10s-4.477-10-10-10zm0 18.25c-1.471 0-2.907-.394-4.164-1.142l-.296-.175-3.049.791.812-2.964-.193-.305C4.38 15.005 4 13.519 4 12.001c0-4.418 3.583-8 8.004-8 4.418 0 7.996 3.582 7.996 8 0 4.417-3.578 8.25-7.996 8.25zm4.137-6.081c-.226-.113-1.336-.659-1.543-.735-.207-.075-.357-.113-.506.113-.15.226-.58.735-.71.885-.132.15-.263.169-.488.056-.225-.113-.949-.35-1.807-1.116-.668-.596-1.118-1.335-1.25-1.56-.131-.225-.014-.346.099-.459.102-.101.226-.263.338-.394.112-.131.15-.225.226-.375.075-.15.037-.281-.019-.394-.056-.112-.506-1.222-.694-1.674-.182-.435-.369-.377-.506-.383-.132-.006-.282-.007-.432-.007-.15 0-.394.057-.6.282s-.788.77-.788 1.878c0 1.108.807 2.179.918 2.33.112.15 1.59 2.428 3.86 3.404 2.27.977 2.27.651 2.675.613.394-.038 1.336-.544 1.522-1.07.188-.525.188-.976.132-1.07-.057-.094-.207-.15-.432-.263z" />
        </svg>
      </div>
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">WhatsApp</h3>
        <a
          href="https://wa.me/917828690192"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 hover:underline"
        >
          +91 7869742922
        </a>
        <p className="text-sm text-gray-500 mt-1">Available anytime on chat</p>
      </div>
    </div>
  </div>

  {/* Schedule Consultation */}
  {/* <div className="mt-12 p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl">
    <h3 className="text-xl font-bold text-gray-800 mb-4">Ready to start your project?</h3>
    <p className="text-gray-600 mb-6">
      Schedule a free consultation with our experts to discuss your 
      requirements and get a personalized quote.
    </p>
    <button
      onClick={() => window.location.href = "/consultation-form"}
      className="bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition"
    >
      Schedule Consultation
    </button>
  </div> */}
</div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
