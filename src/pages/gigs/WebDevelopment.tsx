
import React from 'react';
import { Code } from 'lucide-react';
import GigPage from '../../components/GigPage';

const WebDevelopment = () => {
  const gigData = {
    title: 'Web Development',
    description: 'Create powerful, responsive, and scalable web applications using the latest technologies and best practices. Our expert team delivers custom solutions tailored to your business needs.',
    icon: Code,
    heroImage: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&h=400&fit=crop',
    features: [
      'Custom Web Application Development',
      'Responsive Design for All Devices',
      'SEO-Optimized Architecture',
      'Fast Loading Performance',
      'Cross-Browser Compatibility',
      'Progressive Web Apps (PWA)',
      'E-commerce Solutions',
      'Content Management Systems',
      'API Development & Integration',
      'Database Design & Optimization',
      'Security Implementation',
      'Ongoing Maintenance & Support'
    ],
    technologies: [
      'React', 'Vue.js', 'Angular', 'Node.js', 'Python', 'PHP', 'Laravel', 
      'Django', 'Express.js', 'MongoDB', 'PostgreSQL', 'MySQL', 'AWS', 'Docker'
    ],
    process: [
      {
        step: 'Discovery',
        description: 'Understanding your requirements, goals, and target audience'
      },
      {
        step: 'Design',
        description: 'Creating wireframes, mockups, and user experience design'
      },
      {
        step: 'Development',
        description: 'Building your web application with clean, scalable code'
      },
      {
        step: 'Deployment',
        description: 'Launching your application and providing ongoing support'
      }
    ],
    pricing: [
      {
        plan: 'Basic',
        price: '$1,299',
        features: [
          '5-10 Pages Website',
          'Responsive Design',
          'Basic SEO Setup',
          'Contact Form',
          '3 Months Support',
          'Admin Panel'
        ]
      },
      {
        plan: 'Professional',
        price: '$2,999',
        features: [
          'Custom Web Application',
          'Advanced Features',
          'Database Integration',
          'User Authentication',
          'Payment Gateway',
          '6 Months Support',
          'Performance Optimization'
        ]
      },
      {
        plan: 'Enterprise',
        price: 'Custom',
        features: [
          'Complex Web Platform',
          'Microservices Architecture',
          'Advanced Security',
          'Third-party Integrations',
          'Scalable Infrastructure',
          '12 Months Support',
          'Dedicated Team'
        ]
      }
    ],
    testimonials: [
      {
        name: 'David Smith',
        company: 'RetailMax Corp',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
        quote: 'The web application Scs Softwares built for us increased our online sales by 150%. Their attention to detail and technical expertise is outstanding.'
      },
      {
        name: 'Lisa Chen',
        company: 'EducaTech',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNvglVm2g2-1kuzF1YinSFHQBc2llXJarnig&s',
        quote: 'Working with Scs Softwares was seamless. They delivered a beautiful, fast, and user-friendly platform that our students love.'
      },
      {
        name: 'Marcus Johnson',
        company: 'FinanceFlow',
        image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        quote: 'The custom dashboard Scs Softwares created helps us manage our financial data efficiently. Highly recommend their web development services.'
      }
    ],
    portfolio: [
      {
        title: 'E-commerce Platform',
        description: 'Full-featured online store with inventory management, payment processing, and analytics.',
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop'
      },
      {
        title: 'Learning Management System',
        description: 'Comprehensive LMS with course management, student tracking, and interactive features.',
        image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop'
      },
      {
        title: 'Business Analytics Dashboard',
        description: 'Real-time dashboard with data visualization, reporting, and business intelligence.',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop'
      }
    ]
  };

  return <GigPage {...gigData} />;
};

export default WebDevelopment;
