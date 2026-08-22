
import React from 'react';
import { Smartphone } from 'lucide-react';
import GigPage from '../../components/GigPage';

const MobileDevelopment = () => {
  const gigData = {
    title: 'Mobile App Development',
    description: 'Build native and cross-platform mobile applications that deliver exceptional user experiences on iOS and Android platforms.',
    icon: Smartphone,
    features: [
      'Native iOS & Android Development',
      'Cross-Platform Solutions',
      'UI/UX Design for Mobile',
      'App Store Optimization',
      'Push Notifications',
      'Offline Functionality',
      'In-App Purchases',
      'Social Media Integration',
      'Analytics Implementation',
      'Performance Optimization',
      'App Security',
      'Post-Launch Support'
    ],
    technologies: [
      'React Native', 'Flutter', 'Swift', 'Kotlin', 'Xamarin', 'Ionic', 
      'Firebase', 'AWS Mobile', 'Redux', 'MobX', 'SQLite', 'Core Data'
    ],
    process: [
      {
        step: 'Strategy',
        description: 'Define app goals, target audience, and platform selection'
      },
      {
        step: 'Design',
        description: 'Create intuitive UI/UX designs optimized for mobile'
      },
      {
        step: 'Development',
        description: 'Build robust, scalable mobile application'
      },
      {
        step: 'Launch',
        description: 'Deploy to app stores and provide ongoing updates'
      }
    ],
    pricing: [
      {
        plan: 'Simple App',
        price: '$999',
        features: [
          'Single Platform (iOS or Android)',
          'Basic Features',
          'Simple UI Design',
          '30 Screens/Pages',
          'App Store Submission',
          '3 Months Support'
        ]
      },
      {
        plan: 'Professional App',
        price: '$2,999',
        features: [
          'Cross-Platform Development',
          'Advanced Features',
          'Custom UI/UX Design',
          'API Integration',
          'Push Notifications',
          '6 Months Support',
          'Analytics Setup'
        ]
      },
      {
        plan: 'Enterprise App',
        price: 'Custom',
        features: [
          'Complex Mobile Solution',
          'Native Performance',
          'Advanced Security',
          'Backend Development',
          'Third-party Integrations',
          '12 Months Support',
          'Dedicated Team'
        ]
      }
    ],
    portfolio: [
      {
        title: 'Fitness Tracking App',
        description: 'Workout and nutrition logging, progress history, reminders and optional social features.'
      },
      {
        title: 'Food Delivery Platform',
        description: 'Multi-vendor ordering app with live order status, driver assignment and payment integration.'
      },
      {
        title: 'Healthcare Management App',
        description: 'Patient records, appointment scheduling and video consultation, built with access controls in mind.'
      }
    ]
  };

  return <GigPage {...gigData} />;
};

export default MobileDevelopment;
