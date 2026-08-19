// Guided website tour configuration for the SCS Virtual Guide — Demo.
// Steps target stable data-guide-id attributes; missing targets are skipped gracefully.

import { TourStep } from '@/types/virtualGuide';

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'home-hero',
    route: '/',
    targetId: 'home-hero',
    title: 'Welcome to SCS Softwares',
    text: 'This is where every project starts — describe a new idea or an existing app and see an estimated team, cost and timeline before you hire anyone.',
  },
  {
    id: 'home-services',
    route: '/',
    targetId: 'home-services',
    title: 'Our services',
    text: 'SCS covers web development, mobile apps, UI/UX design, cloud, DevOps and digital marketing — everything under one roof, so you never juggle vendors.',
  },
  {
    id: 'home-process',
    route: '/',
    targetId: 'home-process',
    title: 'How it works',
    text: 'Four simple steps: describe your project, a demo analysis runs, you see the recommended team and cost, then a consultant confirms everything on a free call.',
  },
  {
    id: 'home-benefits',
    route: '/',
    targetId: 'home-benefits',
    title: 'Why choose SCS',
    text: 'You see the numbers before committing, you own all source code from day one, and you get a dedicated team with clickable weekly demos — not status reports.',
  },
  {
    id: 'home-portfolio',
    route: '/',
    targetId: 'home-portfolio',
    title: 'Recent case studies',
    text: 'A few examples of what we have shipped — e-commerce platforms, healthcare mobile apps and real-time fintech dashboards.',
  },
  {
    id: 'products',
    route: '/products',
    targetId: 'products-grid',
    title: 'Ready-made products',
    text: 'Beyond custom builds, SCS offers proven, customizable products. If one is close to what you need, launching from it is faster and cheaper than starting from zero.',
  },
  {
    id: 'about',
    route: '/about',
    targetId: 'about-hero',
    title: 'About SCS Softwares',
    text: 'A team of developers, designers and strategists focused on transparent pricing, code ownership and long-term partnerships.',
  },
  {
    id: 'contact',
    route: '/contact',
    targetId: 'contact-form',
    title: 'Get in touch',
    text: 'When you are ready, this form reaches the team directly — or use WhatsApp for a quicker chat. I can pre-fill your requirement summary here after the estimate flow.',
  },
  {
    id: 'schedule',
    route: '/schedule-call',
    targetId: 'schedule-form',
    title: 'Schedule a free call',
    text: 'Pick a date and time slot and an SCS consultant will review your project and confirm a real quote. That completes the tour — want me to collect your requirements now?',
  },
];

/** How long (ms) to wait for a step target to render before skipping it. */
export const TOUR_TARGET_TIMEOUT_MS = 3000;
