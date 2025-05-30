
import React from 'react';
import { Smartphone } from 'lucide-react';
import GigPage from '../../components/GigPage';

const MobileDevelopment = () => {
  const gigData = {
    title: 'Mobile App Development',
    description: 'Build native and cross-platform mobile applications that deliver exceptional user experiences on iOS and Android platforms.',
    icon: Smartphone,
    heroImage: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&h=400&fit=crop',
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
    testimonials: [
      {
        name: 'Sarah Williams',
        company: 'HealthTrack Inc',
        image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
        quote: 'Our fitness app built by Scs Softwares has over 100k downloads. The user experience is fantastic and the app performance is excellent.'
      },
      {
        name: 'James Rodriguez',
        company: 'FoodieApp',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
        quote: 'Scs Softwares delivered our food delivery app on time and within budget. The cross-platform solution works flawlessly on both iOS and Android.'
      },
      {
        name: 'Emily Foster',
        company: 'EduMobile',
        image: 'https://media.licdn.com/dms/image/v2/D4D03AQErla-5-66-kA/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1732304493886?e=2147483647&v=beta&t=c5nYJahCY3JJUSMCVr2_4dwePATn4tiBUIQgzHTPW3U',
        quote: 'The educational app Scs Softwares created helps thousands of students learn effectively. Their mobile development expertise is top-notch.'
      }
    ],
    portfolio: [
      {
        title: 'Fitness Tracking App',
        description: 'Comprehensive fitness app with workout tracking, nutrition monitoring, and social features.',
        image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop'
      },
      {
        title: 'Food Delivery Platform',
        description: 'Multi-vendor food delivery app with real-time tracking and payment integration.',
        image: 'https://static.wixstatic.com/media/b42049_ca10b25a2d0043bead431dccdeea9202~mv2.png/v1/fill/w_710,h_398,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/b42049_ca10b25a2d0043bead431dccdeea9202~mv2.png'
      },
      {
        title: 'Healthcare Management',
        description: 'Patient management app with appointment scheduling and telemedicine features.',
        image: 'https://blog.elxoinc.com/hubfs/Website%20Images/Blogs/Modern%20Healthcare%20App%20Development%E2%80%99s%20Role%20in%20Staff%20%26%20IT%20Partnerships.jpg'
      }
    ]
  };

  return <GigPage {...gigData} />;
};

export default MobileDevelopment;
