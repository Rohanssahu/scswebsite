
import React from 'react';
import { Cloud } from 'lucide-react';
import GigPage from '../../components/GigPage';

const CloudSolutions = () => {
  const gigData = {
    title: 'Cloud Solutions',
    description: 'Comprehensive cloud services including migration, infrastructure setup, and optimization for scalable, secure, and cost-effective business operations.',
    icon: Cloud,
    heroImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=400&fit=crop',
    features: [
      'Cloud Migration Services',
      'Infrastructure as Code',
      'Auto-scaling Solutions',
      'Disaster Recovery Planning',
      'Cloud Security Implementation',
      'Cost Optimization',
      'Multi-cloud Strategy',
      'Serverless Architecture',
      'Database Migration',
      'Monitoring & Alerting',
      'Backup & Recovery',
      '24/7 Cloud Support'
    ],
    technologies: [
      'AWS', 'Microsoft Azure', 'Google Cloud Platform', 'Kubernetes', 'Docker', 
      'Terraform', 'Ansible', 'Jenkins', 'CloudFormation', 'Serverless Framework', 'Prometheus', 'Grafana'
    ],
    process: [
      {
        step: 'Assessment',
        description: 'Evaluate current infrastructure and cloud readiness'
      },
      {
        step: 'Planning',
        description: 'Design cloud architecture and migration strategy'
      },
      {
        step: 'Migration',
        description: 'Execute cloud migration with minimal downtime'
      },
      {
        step: 'Optimization',
        description: 'Optimize performance, security, and costs'
      }
    ],
    pricing: [
      {
        plan: 'Cloud Starter',
        price: '$1,999',
        features: [
          'Basic Cloud Setup',
          'Single Cloud Provider',
          'Standard Migration',
          'Basic Monitoring',
          '3 Months Support',
          'Documentation'
        ]
      },
      {
        plan: 'Cloud Professional',
        price: '$2,999',
        features: [
          'Advanced Cloud Architecture',
          'Multi-cloud Strategy',
          'Auto-scaling Setup',
          'Security Implementation',
          'Cost Optimization',
          '6 Months Support',
          'Performance Monitoring'
        ]
      },
      {
        plan: 'Enterprise Cloud',
        price: 'Custom',
        features: [
          'Complex Cloud Infrastructure',
          'Disaster Recovery',
          'Advanced Security',
          'Compliance Setup',
          'Dedicated Support Team',
          '12 Months Support',
          'Custom Solutions'
        ]
      }
    ],
    testimonials: [
      {
        name: 'Thomas Anderson',
        company: 'DataCorp Inc',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
        quote: 'Scs Softwares migrated our entire infrastructure to the cloud seamlessly. Our costs decreased by 40% while performance improved significantly.'
      },
      {
        name: 'Maria Gonzalez',
        company: 'GlobalTech',
        image: 'https://ayaladelatorreabogados.com/wp-content/uploads/2021/05/maria-gonzalez-romero.jpg',
        quote: 'The cloud solution Scs Softwares implemented scales automatically with our business needs. No more worrying about server capacity.'
      },
      {
        name: 'John Mitchell',
        company: 'StartupXYZ',
        image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        quote: 'Our disaster recovery plan saved us during a recent outage. Scs Softwares\'s cloud architecture is robust and reliable.'
      }
    ],
    portfolio: [
      {
        title: 'Enterprise Cloud Migration',
        description: 'Migrated legacy systems to AWS with 99.9% uptime and 50% cost reduction.',
        image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=400&fit=crop'
      },
      {
        title: 'Serverless Application',
        description: 'Built scalable serverless application handling millions of requests per day.',
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop'
      },
      {
        title: 'Multi-Cloud Strategy',
        description: 'Implemented multi-cloud architecture for improved redundancy and performance.',
        image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=400&fit=crop'
      }
    ]
  };

  return <GigPage {...gigData} />;
};

export default CloudSolutions;
