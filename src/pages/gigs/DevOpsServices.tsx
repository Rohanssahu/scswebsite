
import React from 'react';
import { Settings } from 'lucide-react';
import GigPage from '../../components/GigPage';

const DevOpsServices = () => {
  const gigData = {
    title: 'DevOps Services',
    description: 'Streamline your development lifecycle with comprehensive DevOps solutions including CI/CD pipelines, infrastructure automation, and monitoring.',
    icon: Settings,
    heroImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop',
    features: [
      'CI/CD Pipeline Setup',
      'Infrastructure Automation',
      'Containerization with Docker',
      'Kubernetes Orchestration',
      'Configuration Management',
      'Monitoring & Alerting',
      'Log Management',
      'Security Integration',
      'Performance Optimization',
      'Automated Testing',
      'Release Management',
      'Infrastructure as Code'
    ],
    technologies: [
      'Jenkins', 'GitLab CI', 'GitHub Actions', 'Docker', 'Kubernetes', 'Terraform', 
      'Ansible', 'Prometheus', 'Grafana', 'ELK Stack', 'SonarQube', 'Vault'
    ],
    process: [
      {
        step: 'Analysis',
        description: 'Assess current development and deployment processes'
      },
      {
        step: 'Design',
        description: 'Design DevOps strategy and tool selection'
      },
      {
        step: 'Implementation',
        description: 'Set up CI/CD pipelines and automation tools'
      },
      {
        step: 'Optimization',
        description: 'Monitor, optimize, and continuously improve processes'
      }
    ],
    pricing: [
      {
        plan: 'DevOps Starter',
        price: '$2,199',
        features: [
          'Basic CI/CD Setup',
          'Docker Containerization',
          'Automated Testing',
          'Basic Monitoring',
          '3 Months Support',
          'Documentation'
        ]
      },
      {
        plan: 'DevOps Pro',
        price: '$3,999',
        features: [
          'Advanced CI/CD Pipelines',
          'Kubernetes Deployment',
          'Infrastructure as Code',
          'Comprehensive Monitoring',
          'Security Integration',
          '6 Months Support',
          'Team Training'
        ]
      },
      {
        plan: 'Enterprise DevOps',
        price: 'Custom',
        features: [
          'Complete DevOps Transformation',
          'Multi-environment Setup',
          'Advanced Security',
          'Custom Automation',
          'Dedicated DevOps Team',
          '12 Months Support',
          'Ongoing Optimization'
        ]
      }
    ],
    testimonials: [
      {
        name: 'Alex Turner',
        company: 'DevCorp Solutions',
        image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        quote: 'Scs Softwares reduced our deployment time from hours to minutes. The CI/CD pipeline they built is incredibly efficient and reliable.'
      },
      {
        name: 'Sophia Kim',
        company: 'TechInnovate',
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQj98ecxAiufq2G0YxpRf5Zjey4NseoVl-tJw&s',
        quote: 'Our development team productivity increased by 70% after implementing Scs Softwares\'s DevOps solutions. Deployments are now seamless.'
      },
      {
        name: 'Carlos Rodriguez',
        company: 'AgileWorks',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
        quote: 'The monitoring and alerting system Scs Softwares set up helps us catch issues before they affect our users. Outstanding service!'
      }
    ],
    portfolio: [
      {
        title: 'CI/CD Pipeline Implementation',
        description: 'Automated deployment pipeline reducing release time by 90% for fintech company.',
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop'
      },
      {
        title: 'Kubernetes Migration',
        description: 'Migrated microservices to Kubernetes with improved scalability and resource utilization.',
        image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=400&fit=crop'
      },
      {
        title: 'Infrastructure Automation',
        description: 'Implemented Infrastructure as Code reducing manual deployment errors by 95%.',
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop'
      }
    ]
  };

  return <GigPage {...gigData} />;
};

export default DevOpsServices;
