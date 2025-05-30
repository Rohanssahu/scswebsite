
import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { 
  Code, 
  Smartphone, 
  TrendingUp, 
  Palette, 
  Cloud, 
  Settings,
  ArrowRight,
  CheckCircle,
  Star,
  Users,
  Award,
  Zap
} from 'lucide-react';

const Index = () => {
  const services = [
    {
      icon: Code,
      title: 'Web Development',
      description: 'Custom web applications built with modern technologies and best practices.',
      path: '/gig/web-development',
      features: ['React/Vue/Angular', 'Node.js/Python', 'Responsive Design', 'SEO Optimized']
    },
    {
      icon: Smartphone,
      title: 'Mobile App Development',
      description: 'Native and cross-platform mobile apps for iOS and Android.',
      path: '/gig/mobile-development',
      features: ['React Native', 'Flutter', 'Native iOS/Android', 'App Store Optimization']
    },
    {
      icon: TrendingUp,
      title: 'Digital Marketing',
      description: 'Comprehensive digital marketing strategies to grow your business.',
      path: '/gig/digital-marketing',
      features: ['SEO/SEM', 'Social Media', 'Content Marketing', 'Analytics']
    },
    {
      icon: Palette,
      title: 'UI/UX Design',
      description: 'Beautiful, user-centered designs that enhance user experience.',
      path: '/gig/ui-ux-design',
      features: ['User Research', 'Wireframing', 'Prototyping', 'Design Systems']
    },
    {
      icon: Cloud,
      title: 'Cloud Solutions',
      description: 'Scalable cloud infrastructure and migration services.',
      path: '/gig/cloud-solutions',
      features: ['AWS/Azure/GCP', 'Cloud Migration', 'Serverless', 'Monitoring']
    },
    {
      icon: Settings,
      title: 'DevOps Services',
      description: 'Streamline your development and deployment processes.',
      path: '/gig/devops-services',
      features: ['CI/CD Pipelines', 'Containerization', 'Infrastructure as Code', 'Monitoring']
    }
  ];

  const portfolioItems = [
    {
      title: 'E-commerce Platform',
      category: 'Web Development',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop',
      description: 'A modern e-commerce platform with advanced features and seamless user experience.'
    },
    {
      title: 'Healthcare Mobile App',
      category: 'Mobile Development',
      
      image: 'https://blog.elxoinc.com/hubfs/Website%20Images/Blogs/Modern%20Healthcare%20App%20Development%E2%80%99s%20Role%20in%20Staff%20%26%20IT%20Partnerships.jpg',
      description: 'HIPAA-compliant mobile application for healthcare providers and patients.'
    },
    {
      title: 'FinTech Dashboard',
      category: 'Web Development',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
      description: 'Real-time financial dashboard with advanced analytics and reporting.'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      company: 'TechStart Inc.',
      image: 'data:image/jpeg;base64,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',
      quote: 'Scs Softwares delivered an exceptional web application that exceeded our expectations. Their team is professional, responsive, and highly skilled.'
    },
    {
      name: 'Michael Chen',
      company: 'Digital Ventures',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      quote: 'Working with Scs Softwares was a game-changer for our business. They transformed our ideas into a powerful mobile app that our users love.'
    },
    {
      name: 'Emily Rodriguez',
      company: 'Growth Marketing Co.',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      quote: 'The digital marketing strategies implemented by Scs Softwares increased our online presence by 300%. Highly recommend their services!'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 to-indigo-700 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Transform Your 
                <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent"> Business</span> 
                <br />With Digital Excellence
              </h1>
              <p className="text-xl text-blue-100 leading-relaxed">
                We're a leading software development company that helps businesses 
                innovate and grow through cutting-edge technology solutions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  to="/contact" 
                  className="bg-white text-blue-600 px-8 py-4 rounded-full font-semibold hover:bg-blue-50 transition-all transform hover:scale-105 flex items-center justify-center"
                >
                  Get Started Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link 
                  to="/about" 
                  className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-blue-600 transition-all"
                >
                  Learn More
                </Link>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&h=400&fit=crop" 
                alt="Team working on digital solutions"
                className="rounded-2xl shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-300"
              />
              <div className="absolute -bottom-6 -left-6 bg-yellow-400 text-black p-4 rounded-xl shadow-lg">
                <div className="flex items-center space-x-2">
                  <Star className="h-6 w-6 fill-current" />
                  <span className="font-bold">500+ Projects Delivered</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800">500+</h3>
              <p className="text-gray-600">Happy Clients</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
                <Award className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800">1000+</h3>
              <p className="text-gray-600">Projects Completed</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mx-auto mb-4">
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800">10+</h3>
              <p className="text-gray-600">Years Experience</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mx-auto mb-4">
                <Star className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800">98%</h3>
              <p className="text-gray-600">Client Satisfaction</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-6">
              Our <span className="text-blue-600">Services</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We offer comprehensive software development services to help your business 
              thrive in the digital landscape.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div 
                key={index} 
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 group hover:border-blue-200"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <service.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{service.title}</h3>
                <p className="text-gray-600 mb-6">{service.description}</p>
                
                <div className="space-y-2 mb-6">
                  {service.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Link 
                  to={service.path}
                  className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                >
                  Learn More 
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-6">
              Our <span className="text-blue-600">Portfolio</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover some of our recent projects and see how we've helped businesses 
              achieve their digital transformation goals.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {portfolioItems.map((item, index) => (
              <div 
                key={index} 
                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group"
              >
                <div className="relative overflow-hidden">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-6">
                  <span className="text-blue-600 text-sm font-semibold">{item.category}</span>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-6">
              What Our <span className="text-blue-600">Clients Say</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Don't just take our word for it. Here's what our satisfied clients 
              have to say about working with us.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 relative"
              >
                <div className="flex items-center mb-6">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div>
                    <h4 className="font-bold text-gray-800">{testimonial.name}</h4>
                    <p className="text-gray-600 text-sm">{testimonial.company}</p>
                  </div>
                </div>
                <p className="text-gray-700 italic">"{testimonial.quote}"</p>
                <div className="flex mt-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Let's discuss how we can help you achieve your digital goals. 
            Get in touch with our experts today for a free consultation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/contact" 
              className="bg-white text-blue-600 px-8 py-4 rounded-full font-semibold hover:bg-blue-50 transition-all transform hover:scale-105"
            >
              Start Your Project
            </Link>
            <Link 
              to="/contact" 
              className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-blue-600 transition-all"
            >
              Schedule a Call
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
