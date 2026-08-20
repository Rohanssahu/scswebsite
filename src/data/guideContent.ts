// Static content wiring + route-aware quick actions for Buddy — Your SCS Guide.
// All display text lives in src/i18n/locales/*.json; this module only carries
// canonical action labels (translated at render time) and i18n key wiring.
// Everything is dummy frontend data; no live AI or backend is connected.

import { GuideAction } from '@/types/virtualGuide';

export const WHATSAPP_NUMBER = '917828690192';

/** i18n key of Buddy's welcome message. */
export const GUIDE_WELCOME_KEY = 'guide.welcome';

export const INVITE_ACTIONS: GuideAction[] = [
  { label: 'Guide me', kind: 'start-tour' },
  { label: 'I have a new project', kind: 'flow-new' },
  { label: 'I have an existing project', kind: 'flow-existing' },
];

export const WELCOME_ACTIONS: GuideAction[] = [
  { label: 'Talk to Buddy', kind: 'open-voice' },
  { label: 'Start website tour', kind: 'start-tour' },
  { label: 'I have a new project', kind: 'flow-new' },
  { label: 'Fix an existing project', kind: 'flow-existing' },
  { label: 'Explore services', kind: 'navigate', to: '/#services' },
];

/**
 * Info wiring for contextual "explain this page" style questions.
 * `nameKey` resolves in `services.names`, content keys in `guide.pages`.
 */
export interface PageInfo {
  /** Key under services.names for the display name. */
  nameKey: string;
  /** Key under guide.pages for blurb/forWho/benefits/limitations. */
  pageKey: string;
}

export const PAGE_INFO: Record<string, PageInfo> = {
  '/gig/web-development': { nameKey: 'web-development', pageKey: 'web-development' },
  '/gig/mobile-development': { nameKey: 'mobile-app-development', pageKey: 'mobile-development' },
  '/gig/ui-ux-design': { nameKey: 'ui-ux-design', pageKey: 'ui-ux-design' },
  '/gig/cloud-solutions': { nameKey: 'cloud-solutions', pageKey: 'cloud-solutions' },
  '/gig/devops-services': { nameKey: 'devops-services', pageKey: 'devops-services' },
  '/gig/digital-marketing': { nameKey: 'digital-marketing', pageKey: 'digital-marketing' },
  '/products': { nameKey: 'scs-products', pageKey: 'products' },
  '/ProductDetailsPage': { nameKey: 'this-product', pageKey: 'product-details' },
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
