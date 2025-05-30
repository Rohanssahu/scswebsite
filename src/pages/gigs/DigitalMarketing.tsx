
import React from 'react';
import { TrendingUp } from 'lucide-react';
import GigPage from '../../components/GigPage';

const DigitalMarketing = () => {
  const gigData = {
    title: 'Digital Marketing',
    description: 'Comprehensive digital marketing strategies to boost your online presence, drive traffic, and increase conversions across all digital channels.',
    icon: TrendingUp,
    heroImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
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
    testimonials: [
      {
        name: 'Michael Thompson',
        company: 'TechStartup Co',
        image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        quote: 'Scs Softwares increased our website traffic by 400% and our leads by 250% within 6 months. Their digital marketing expertise is exceptional.'
      },
      {
        name: 'Amanda Davis',
        company: 'E-commerce Plus',
        image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
        quote: 'Our online sales have tripled since working with Scs Softwares. Their comprehensive approach to digital marketing delivers real results.'
      },
      {
        name: 'Robert Lee',
        company: 'Local Business Hub',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
        quote: 'The ROI on our marketing spend has improved dramatically. Scs Softwares knows how to drive quality traffic that converts.'
      }
    ],
    portfolio: [
      {
        title: 'E-commerce SEO Campaign',
        description: 'Increased organic traffic by 500% for online retail store through comprehensive SEO strategy.',
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop'
      },
      {
        title: 'SaaS Lead Generation',
        description: 'Generated 1000+ qualified leads monthly for B2B software company through multi-channel approach.',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop'
      },
      {
        title: 'Social Media Growth',
        description: 'Grew social media following from 5k to 100k+ and increased engagement by 800%.',
        image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&h=400&fit=crop'
      }
    ]
  };

  return <GigPage {...gigData} />;
};

export default DigitalMarketing;
