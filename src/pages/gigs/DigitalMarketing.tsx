
import React from 'react';
import { TrendingUp } from 'lucide-react';
import GigPage from '../../components/GigPage';

const DigitalMarketing = () => {
  const gigData = {
    title: 'Digital Marketing',
    description: 'Comprehensive digital marketing strategies to boost your online presence, drive traffic, and increase conversions across all digital channels.',
    icon: TrendingUp,
    features: [
      'Search Engine Optimization (SEO)',
      'Pay-Per-Click Advertising (PPC)',
      'Social Media Marketing',
      'Content Marketing Strategy',
      'Email Marketing Campaigns',
      'Conversion Rate Optimization',
      'Google Analytics Setup',
      'Brand Strategy Development',
      'Influencer Marketing',
      'Video Marketing',
      'Marketing Automation',
      'Performance Tracking & Reporting'
    ],
    technologies: [
      'Google Ads', 'Facebook Ads', 'Google Analytics', 'SEMrush', 'Ahrefs', 
      'Hootsuite', 'Mailchimp', 'HubSpot', 'WordPress', 'Shopify', 'Canva', 'Adobe Creative Suite'
    ],
    process: [
      {
        step: 'Audit',
        description: 'Analyze current digital presence and identify opportunities'
      },
      {
        step: 'Strategy',
        description: 'Develop comprehensive marketing strategy and roadmap'
      },
      {
        step: 'Execute',
        description: 'Implement campaigns across chosen digital channels'
      },
      {
        step: 'Optimize',
        description: 'Monitor performance and continuously optimize for better results'
      }
    ],
    pricing: [
      {
        plan: 'Starter',
        price: '$1,499/mo',
        features: [
          'SEO Optimization',
          'Social Media Management',
          'Basic PPC Campaign',
          'Monthly Reporting',
          'Email Support',
          '2 Platforms Focus'
        ]
      },
      {
        plan: 'Growth',
        price: '$2,199/mo',
        features: [
          'Advanced SEO & PPC',
          'Multi-Platform Campaigns',
          'Content Creation',
          'Lead Generation',
          'Weekly Reporting',
          'Phone Support',
          'Conversion Optimization'
        ]
      },
      {
        plan: 'Enterprise',
        price: 'Custom',
        features: [
          'Full-Service Marketing',
          'Dedicated Account Manager',
          'Custom Strategy',
          'Advanced Analytics',
          'Priority Support',
          'Unlimited Platforms',
          'Marketing Automation'
        ]
      }
    ],
    portfolio: [
      {
        title: 'E-commerce SEO Programme',
        description: 'Technical audit, information architecture, on-page work and content planning for a product catalogue.'
      },
      {
        title: 'B2B Lead Generation',
        description: 'Paid search, landing pages and lifecycle email wired into your CRM so every enquiry is attributable.'
      },
      {
        title: 'Social Media Growth',
        description: 'Content calendar, creative production and paid amplification, reported against agreed goals.'
      }
    ]
  };

  return <GigPage {...gigData} />;
};

export default DigitalMarketing;
