
import React from 'react';
import { Palette } from 'lucide-react';
import GigPage from '../../components/GigPage';

const UIUXDesign = () => {
  const gigData = {
    title: 'UI/UX Design',
    description: 'Create beautiful, intuitive, and user-centered designs that enhance user experience and drive engagement across web and mobile platforms.',
    icon: Palette,
    heroImage: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop',
    features: [
      'User Experience Research',
      'User Interface Design',
      'Wireframing & Prototyping',
      'Design Systems Creation',
      'Usability Testing',
      'Mobile-First Design',
      'Accessibility Compliance',
      'Brand Identity Design',
      'Icon & Illustration Design',
      'Interactive Prototypes',
      'Design Documentation',
      'Design Handoff to Developers'
    ],
    technologies: [
      'Figma', 'Adobe XD', 'Sketch', 'InVision', 'Principle', 'Framer', 
      'Adobe Creative Suite', 'Zeplin', 'Marvel', 'Axure', 'Miro', 'Hotjar'
    ],
    process: [
      {
        step: 'Research',
        description: 'Understand users, market, and business requirements'
      },
      {
        step: 'Design',
        description: 'Create wireframes, prototypes, and visual designs'
      },
      {
        step: 'Test',
        description: 'Conduct usability testing and gather feedback'
      },
      {
        step: 'Deliver',
        description: 'Finalize designs and provide development handoff'
      }
    ],
    pricing: [
      {
        plan: 'Basic Design',
        price: '$799',
        features: [
          'Up to 10 Screen Designs',
          'Basic Wireframes',
          'Style Guide',
          'Mobile Responsive',
          '2 Revisions',
          'Design Files Delivery'
        ]
      },
      {
        plan: 'Complete UX',
        price: '$999',
        features: [
          'User Research & Testing',
          'Complete UI/UX Design',
          'Interactive Prototypes',
          'Design System',
          'Unlimited Revisions',
          'Developer Handoff',
          '3 Months Support'
        ]
      },
      {
        plan: 'Enterprise Design',
        price: 'Custom',
        features: [
          'Comprehensive UX Strategy',
          'Multi-Platform Design',
          'Advanced Prototyping',
          'Usability Testing',
          'Design Team',
          'Ongoing Design Support',
          'Design Workshop'
        ]
      }
    ],
    testimonials: [
      {
        name: 'Jennifer Walsh',
        company: 'AppVenture',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4d2xX5dTILvyXS2gKL9fZqOLGiCs_POUGJQ&s',
        quote: 'The UI/UX design Scs Softwares created for our app increased user engagement by 60%. The design is both beautiful and functional.'
      },
      {
        name: 'Kevin Park',
        company: 'SaaS Solutions',
        image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        quote: 'Scs Softwares transformed our complex software into an intuitive, user-friendly platform. Our customer satisfaction scores have improved significantly.'
      },
      {
        name: 'Rachel Green',
        company: 'E-learning Pro',
        image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
        quote: 'The design system Scs Softwares created helps us maintain consistency across all our products. Their attention to detail is remarkable.'
      }
    ],
    portfolio: [
      {
        title: 'Mobile Banking App',
        description: 'Complete redesign of mobile banking app with focus on security and ease of use.',
        image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&h=400&fit=crop'
      },
      {
        title: 'E-commerce Website',
        description: 'Modern e-commerce design with improved conversion rate and user experience.',
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop'
      },
      {
        title: 'SaaS Dashboard',
        description: 'Complex data visualization dashboard with intuitive navigation and clear information hierarchy.',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop'
      }
    ]
  };

  return <GigPage {...gigData} />;
};

export default UIUXDesign;
