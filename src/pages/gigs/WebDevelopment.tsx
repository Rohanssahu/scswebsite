
import React from 'react';
import { Code } from 'lucide-react';
import GigPage from '../../components/GigPage';

const WebDevelopment = () => {
  const gigData = {
    title: 'Web Development',
    description: 'Create powerful, responsive, and scalable web applications using the latest technologies and best practices. Our expert team delivers custom solutions tailored to your business needs.',
    icon: Code,
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
    portfolio: [
      {
        title: 'E-commerce Platform',
        description: 'Online store with catalogue, cart, payment gateway integration, order management and an admin back office.'
      },
      {
        title: 'Learning Management System',
        description: 'Course delivery platform with enrolment, lesson content, progress tracking and instructor tooling.'
      },
      {
        title: 'Business Analytics Dashboard',
        description: 'Reporting dashboard that pulls from your existing systems and renders charts, filters and exports.'
      }
    ]
  };

  return <GigPage {...gigData} />;
};

export default WebDevelopment;
