
import React from 'react';
import { Settings } from 'lucide-react';
import GigPage from '../../components/GigPage';

const DevOpsServices = () => {
  const gigData = {
    title: 'DevOps Services',
    description: 'Streamline your development lifecycle with comprehensive DevOps solutions including CI/CD pipelines, infrastructure automation, and monitoring.',
    icon: Settings,
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
    portfolio: [
      {
        title: 'CI/CD Pipeline',
        description: 'Build, test and deploy pipeline with environment promotion, rollbacks and required status checks.'
      },
      {
        title: 'Kubernetes Migration',
        description: 'Containerised services on Kubernetes with autoscaling, health checks and resource limits.'
      },
      {
        title: 'Infrastructure Automation',
        description: 'Terraform/Ansible definitions so environments are reproducible instead of hand-configured.'
      }
    ]
  };

  return <GigPage {...gigData} />;
};

export default DevOpsServices;
