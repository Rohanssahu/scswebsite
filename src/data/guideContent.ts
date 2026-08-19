// Static copy + route-aware quick actions for the SCS Virtual Guide — Demo.
// All content is dummy frontend data; no live AI or backend is connected.

import { GuideAction } from '@/types/virtualGuide';

export const GUIDE_NAME = 'SCS Virtual Guide';
export const GUIDE_TAGLINE = 'Demo — scripted guide, no live person or AI';

export const WHATSAPP_NUMBER = '917828690192';

export const GUIDE_WELCOME =
  "Hi, I'm your SCS Virtual Guide (demo). I can give you a website tour, explain our services and products, collect your project requirements and prepare a preliminary demo estimate. How can I help?";

export const INVITE_TEXT = 'Hi, I’m your SCS Virtual Guide. Would you like a free tour?';

export const INVITE_ACTIONS: GuideAction[] = [
  { label: 'Guide me', kind: 'start-tour' },
  { label: 'I have a new project', kind: 'flow-new' },
  { label: 'I have an existing project', kind: 'flow-existing' },
];

export const WELCOME_ACTIONS: GuideAction[] = [
  { label: 'Start website tour', kind: 'start-tour' },
  { label: 'I have a new project', kind: 'flow-new' },
  { label: 'Fix an existing project', kind: 'flow-existing' },
  { label: 'Explore services', kind: 'navigate', to: '/#services' },
];

export const CLARIFY_RESPONSE =
  "I'm a demo guide with a fixed set of topics, so I didn't quite catch that. Are you exploring SCS, starting a new project, or fixing an existing one? These might help:";

/** Info blurbs used for contextual "explain this page" style questions. */
export interface PageInfo {
  name: string;
  blurb: string;
  forWho: string;
  benefits: string[];
  limitations: string[];
}

export const PAGE_INFO: Record<string, PageInfo> = {
  '/gig/web-development': {
    name: 'Web Development',
    blurb:
      'Custom websites and web applications built with modern stacks like React and Node.js — from landing pages to full products with logins, payments and admin panels.',
    forWho: 'Businesses and founders who need a fast, reliable web presence or a full web application.',
    benefits: ['Responsive on every device', 'Scalable architecture from day one', 'You own the full source code'],
    limitations: ['Complex platforms need a discovery phase first', 'Third-party costs (hosting, gateways) are separate'],
  },
  '/gig/mobile-development': {
    name: 'Mobile App Development',
    blurb:
      'iOS and Android apps built with cross-platform technology (React Native / Flutter) so one codebase covers both stores.',
    forWho: 'Products whose users live on their phones — booking, delivery, community and utility apps.',
    benefits: ['One codebase, two app stores', 'Native-feeling performance', 'Push notifications and offline support'],
    limitations: ['App-store review adds 1–2 weeks to launch', 'Very graphics-heavy apps may need native work'],
  },
  '/gig/ui-ux-design': {
    name: 'UI/UX Design',
    blurb: 'Wireframes, prototypes and pixel-perfect interfaces designed around your users before a line of code is written.',
    forWho: 'Teams that want their product to look professional and convert visitors into customers.',
    benefits: ['Fewer costly changes during development', 'Consistent design system', 'Clickable prototypes to test early'],
    limitations: ['Design quality depends on clear requirements', 'Brand assets must be supplied or scoped separately'],
  },
  '/gig/cloud-solutions': {
    name: 'Cloud Solutions',
    blurb: 'Cloud architecture, migration and hosting setup on AWS, Azure or GCP with cost optimisation in mind.',
    forWho: 'Products that need reliable hosting, scaling or a move away from legacy servers.',
    benefits: ['Pay-for-what-you-use infrastructure', 'Automatic scaling and backups', 'Better uptime and security posture'],
    limitations: ['Cloud provider fees are billed separately', 'Legacy systems may need refactoring before migration'],
  },
  '/gig/devops-services': {
    name: 'DevOps Services',
    blurb: 'CI/CD pipelines, automated testing, monitoring and deployment automation so releases become boring and safe.',
    forWho: 'Teams shipping regularly who want fewer manual deploys and faster recovery from issues.',
    benefits: ['Faster, safer releases', 'Automated rollbacks', 'Monitoring and alerting included'],
    limitations: ['Needs access to your existing infrastructure', 'Biggest value shows on actively developed projects'],
  },
  '/gig/digital-marketing': {
    name: 'Digital Marketing',
    blurb: 'SEO groundwork, content, social campaigns and analytics to bring the right visitors to what we build.',
    forWho: 'Businesses that have (or are building) a product and need qualified traffic and leads.',
    benefits: ['Measurable campaigns with analytics', 'Organic and paid channels covered', 'Landing pages optimised to convert'],
    limitations: ['Results build over weeks, not days', 'Ad budgets are separate from service fees'],
  },
  '/products': {
    name: 'SCS Products',
    blurb:
      'Ready-made, customizable products across web, mobile, cloud, marketing and DevOps — proven bases you can launch quickly instead of building from zero.',
    forWho: 'Businesses that want a faster, lower-risk start with a solution that already works.',
    benefits: ['Much faster launch than custom builds', 'Lower cost than starting from scratch', 'Customisable to your brand and workflow'],
    limitations: ['Deep custom workflows may still need custom development', 'Licensing and hosting scoped per product'],
  },
  '/ProductDetailsPage': {
    name: 'this product',
    blurb:
      'This is one of our ready-made products — a proven base we customise to your brand, workflow and integrations instead of building from zero.',
    forWho: 'Teams that want this capability live quickly, with SCS handling setup and customisation.',
    benefits: ['Faster launch than a custom build', 'Battle-tested core features', 'Customisation and support from the SCS team'],
    limitations: ['Very unusual workflows may need custom work on top', 'Final pricing depends on customisation scope'],
  },
};

/** Longest-prefix lookup so /gig/web-development matches its entry. */
export function getPageInfo(pathname: string): PageInfo | null {
  const keys = Object.keys(PAGE_INFO).sort((a, b) => b.length - a.length);
  const hit = keys.find((k) => pathname.toLowerCase().startsWith(k.toLowerCase()));
  return hit ? PAGE_INFO[hit] : null;
}

/** Route-aware quick actions shown above the chat composer. */
export function getRouteQuickActions(pathname: string): GuideAction[] {
  const p = pathname.toLowerCase();
  if (p.startsWith('/gig/')) {
    return [
      { label: 'Explain this service', kind: 'send', message: 'Explain this service' },
      { label: 'Is it right for me?', kind: 'send', message: 'Is this service right for me?' },
      { label: 'Benefits', kind: 'send', message: 'What are the benefits of this service?' },
      { label: 'Pros and cons', kind: 'send', message: 'What are the pros and cons?' },
      { label: 'Expected team', kind: 'send', message: 'Which developers will I need?' },
      { label: 'Start requirement flow', kind: 'flow-new' },
    ];
  }
  if (p.startsWith('/productdetailspage')) {
    return [
      { label: 'Explain this product', kind: 'send', message: 'Explain this product' },
      { label: 'Who is it for?', kind: 'send', message: 'Who is this product for?' },
      { label: 'Benefits', kind: 'send', message: 'What are the benefits of this product?' },
      { label: 'Limitations', kind: 'send', message: 'What are the limitations?' },
      { label: 'Discuss my requirement', kind: 'flow-new' },
    ];
  }
  if (p.startsWith('/products')) {
    return [
      { label: 'Explain products', kind: 'send', message: 'Explain your products' },
      { label: 'Help me choose', kind: 'send', message: 'Which service is suitable for me?' },
      { label: 'Show benefits', kind: 'send', message: 'What are the benefits of your products?' },
      { label: 'I need a similar solution', kind: 'flow-new' },
    ];
  }
  if (p.startsWith('/about')) {
    return [
      { label: 'What does SCS do?', kind: 'send', message: 'What does SCS Softwares do?' },
      { label: 'Why choose SCS?', kind: 'send', message: 'Why should I choose SCS?' },
      { label: 'Show services', kind: 'navigate', to: '/#services' },
      { label: 'Talk to the team', kind: 'navigate', to: '/contact' },
    ];
  }
  if (p.startsWith('/contact')) {
    return [
      { label: 'Help me prepare my inquiry', kind: 'flow-new' },
      { label: 'Open WhatsApp', kind: 'whatsapp' },
      { label: 'Schedule a call', kind: 'schedule-handoff' },
      { label: 'Talk to a human', kind: 'send', message: 'I want to talk to a human' },
    ];
  }
  if (p.startsWith('/careers') || p.startsWith('/applicationform')) {
    return [
      { label: 'Show positions', kind: 'navigate', to: '/careers#openings' },
      { label: 'Application process', kind: 'send', message: 'Explain the application process' },
      { label: 'Open application form', kind: 'navigate', to: '/ApplicationForm' },
    ];
  }
  // Homepage + everything else.
  return [
    { label: 'Start website tour', kind: 'start-tour' },
    { label: 'Explore services', kind: 'navigate', to: '/#services' },
    { label: 'View products', kind: 'navigate', to: '/products' },
    { label: 'Start a project', kind: 'flow-new' },
    { label: 'Fix an existing project', kind: 'flow-existing' },
  ];
}
