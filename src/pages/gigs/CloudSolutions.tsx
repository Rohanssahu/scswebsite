
import React from 'react';
import { Cloud } from 'lucide-react';
import GigPage from '../../components/GigPage';

const CloudSolutions = () => {
  const gigData = {
    title: 'Cloud Solutions',
    description: 'Comprehensive cloud services including migration, infrastructure setup, and optimization for scalable, secure, and cost-effective business operations.',
    icon: Cloud,
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
    portfolio: [
      {
        title: 'Cloud Migration',
        description: 'Lift-and-shift or re-architecture of an existing application onto AWS, Azure or Google Cloud.'
      },
      {
        title: 'Serverless Application',
        description: 'Event-driven backend built on managed functions and queues, with infrastructure defined as code.'
      },
      {
        title: 'Multi-Cloud Architecture',
        description: 'Workloads spread across providers for redundancy, with shared monitoring and deployment tooling.'
      }
    ]
  };

  return <GigPage {...gigData} />;
};

export default CloudSolutions;
