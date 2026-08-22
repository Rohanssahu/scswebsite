
import React from 'react';
import { Palette } from 'lucide-react';
import GigPage from '../../components/GigPage';

const UIUXDesign = () => {
  const gigData = {
    title: 'UI/UX Design',
    description: 'Create beautiful, intuitive, and user-centered designs that enhance user experience and drive engagement across web and mobile platforms.',
    icon: Palette,
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
    portfolio: [
      {
        title: 'Mobile Banking App',
        description: 'Redesign focused on clear task flows, error states and accessible contrast, delivered as a component library.'
      },
      {
        title: 'E-commerce Website',
        description: 'Browse, product and checkout flows designed end to end, with responsive layouts for every breakpoint.'
      },
      {
        title: 'SaaS Dashboard',
        description: 'Data-dense dashboard with a clear information hierarchy, keyboard navigation and empty/loading states.'
      }
    ]
  };

  return <GigPage {...gigData} />;
};

export default UIUXDesign;
