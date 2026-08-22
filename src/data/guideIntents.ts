// Local intent router for Buddy — Your SCS Guide.
// Purely keyword-based, deterministic frontend logic. Keyword matching stays
// on canonical English keywords; every RESPONSE resolves through i18n so Buddy
// always answers in the currently selected language.

import i18n from '@/i18n/config';
import { ASSISTANT_INTENTS, AssistantAction } from '@/data/assistantIntents';
import { getPageInfo, getRouteQuickActions } from '@/data/guideContent';
import { GuideAction, GuideIntent } from '@/types/virtualGuide';

export interface GuideReply {
  /** i18n key of the reply text. */
  key: string;
  params?: Record<string, unknown>;
  actions: GuideAction[];
}

function toGuideAction(a: AssistantAction): GuideAction {
  return {
    label: a.label,
    kind: 'navigate',
    to: a.state ? `${a.to}?mode=${a.state}` : a.to,
  };
}

/** Guide-specific intents, checked before the shared assistant intents. */
export const GUIDE_INTENTS: GuideIntent[] = [
  {
    id: 'tour',
    keywords: [['tour'], ['show', 'around'], ['walk', 'through'], ['guide', 'me'], ['show', 'website']],
    responseKey: 'guide.intents.tour',
    actions: [
      { label: 'Start the tour', kind: 'start-tour' },
      { label: 'Explore myself', kind: 'navigate', to: '/' },
    ],
  },
  {
    id: 'benefits',
    keywords: [['benefit'], ['advantage'], ['why', 'choose'], ['why', 'scs']],
    responseKey: 'guide.intents.benefits',
    actions: [
      { label: 'See why-SCS section', kind: 'navigate', to: '/#why-scs' },
      { label: 'Get a demo estimate', kind: 'flow-new' },
    ],
  },
  {
    id: 'pros-cons',
    keywords: [['pros'], ['cons'], ['limitation'], ['drawback'], ['downside']],
    responseKey: 'guide.intents.pros-cons',
    actions: [
      { label: 'Analyze my project', kind: 'flow-new' },
      { label: 'View ready products', kind: 'navigate', to: '/products' },
    ],
  },
  {
    id: 'products',
    keywords: [['product']],
    responseKey: 'guide.intents.products',
    actions: [
      { label: 'View products', kind: 'navigate', to: '/products' },
      { label: 'I need a similar solution', kind: 'flow-new' },
    ],
  },
  {
    id: 'need-website',
    keywords: [['need', 'website'], ['want', 'website'], ['build', 'website'], ['website', 'for']],
    responseKey: 'guide.intents.need-website',
    actions: [
      { label: 'Start requirement flow', kind: 'flow-new' },
      { label: 'See web development service', kind: 'navigate', to: '/services/web-application-development' },
    ],
  },
  {
    id: 'choose-service',
    keywords: [['which', 'service'], ['suitable'], ['help', 'choose'], ['right', 'for', 'me'], ['recommend', 'service']],
    responseKey: 'guide.intents.choose-service',
    actions: [
      { label: 'I have a new idea', kind: 'flow-new' },
      { label: 'I have an existing project', kind: 'flow-existing' },
      { label: 'See all services', kind: 'navigate', to: '/#services' },
    ],
  },
  {
    id: 'how-long',
    keywords: [['how', 'long'], ['duration'], ['delivery', 'time'], ['when', 'ready'], ['take', 'weeks']],
    responseKey: 'guide.intents.how-long',
    actions: [
      { label: 'Estimate my timeline', kind: 'flow-new' },
      { label: 'Schedule a call', kind: 'schedule-handoff' },
    ],
  },
  {
    id: 'application-process',
    keywords: [['application', 'process'], ['apply', 'job'], ['how', 'apply']],
    responseKey: 'guide.intents.application-process',
    actions: [
      { label: 'Show positions', kind: 'navigate', to: '/careers#openings' },
      { label: 'Open application form', kind: 'navigate', to: '/ApplicationForm' },
    ],
  },
  {
    id: 'whatsapp',
    keywords: [['whatsapp']],
    responseKey: 'guide.intents.whatsapp',
    actions: [
      { label: 'Open WhatsApp', kind: 'whatsapp' },
      { label: 'Contact form instead', kind: 'navigate', to: '/contact' },
    ],
  },
];

/** Contextual intents that depend on the current route (service/product pages). */
function matchContextIntent(text: string, pathname: string): GuideReply | null {
  const info = getPageInfo(pathname);
  if (!info) return null;
  const t = text.toLowerCase();
  const has = (...words: string[]) => words.every((w) => t.includes(w));

  // Params resolve in the currently selected language at send time.
  const name = i18n.t(`services.names.${info.nameKey}`);
  const page = (field: string) => i18n.t(`guide.pages.${info.pageKey}.${field}`);
  const pageList = (field: string) => {
    const items = i18n.t(`guide.pages.${info.pageKey}.${field}`, { returnObjects: true });
    return Array.isArray(items) ? items.join('; ') : String(items);
  };

  if (has('explain') || has('what', 'is', 'this') || has('tell', 'about')) {
    return {
      key: 'guide.context.explain',
      params: { name, blurb: page('blurb') },
      actions: [
        { label: 'Who is it for?', kind: 'send', message: 'Who is this for?' },
        { label: 'Benefits', kind: 'send', message: 'What are the benefits?' },
        { label: 'Discuss my requirement', kind: 'flow-new' },
      ],
    };
  }
  if (has('who') && (has('for') || has('use'))) {
    return {
      key: 'guide.context.whoFor',
      params: { name, forWho: page('forWho') },
      actions: [
        { label: 'Benefits', kind: 'send', message: 'What are the benefits?' },
        { label: 'Start requirement flow', kind: 'flow-new' },
      ],
    };
  }
  if (has('right', 'for', 'me') || has('fit')) {
    return {
      key: 'guide.context.rightForMe',
      params: { name, forWho: page('forWho') },
      actions: [
        { label: 'Tell you my requirement', kind: 'flow-new' },
        { label: 'Pros and cons', kind: 'send', message: 'What are the pros and cons?' },
      ],
    };
  }
  if (has('benefit')) {
    return {
      key: 'guide.context.benefits',
      params: { name, benefits: pageList('benefits') },
      actions: [
        { label: 'Limitations', kind: 'send', message: 'What are the limitations?' },
        { label: 'Start requirement flow', kind: 'flow-new' },
      ],
    };
  }
  if (has('limitation') || has('cons') || has('drawback')) {
    return {
      key: 'guide.context.limitations',
      params: { name, limitations: pageList('limitations'), benefits: pageList('benefits') },
      actions: [
        { label: 'Discuss my requirement', kind: 'flow-new' },
        { label: 'Talk to a human', kind: 'navigate', to: '/contact' },
      ],
    };
  }
  return null;
}

/**
 * Deterministic intent routing: route context first, then guide intents,
 * then the shared assistant intents. Returns null when nothing matches —
 * the caller shows a clarification with route-aware quick actions.
 */
export function routeMessage(text: string, pathname: string): GuideReply | null {
  const contextual = matchContextIntent(text, pathname);
  if (contextual) return contextual;

  const t = text.toLowerCase();
  for (const intent of GUIDE_INTENTS) {
    for (const group of intent.keywords) {
      if (group.every((w) => t.includes(w))) {
        return { key: intent.responseKey, actions: intent.actions };
      }
    }
  }
  for (const intent of ASSISTANT_INTENTS) {
    for (const group of intent.keywords) {
      if (group.every((w) => t.includes(w))) {
        // The guide runs its own requirement flow instead of the analysis page.
        const actions = intent.actions.map((a) => {
          if (a.to === '/project-analysis' && a.state === 'new') return { label: 'Start requirement flow', kind: 'flow-new' } as GuideAction;
          if (a.to === '/project-analysis' && a.state === 'existing')
            return { label: 'Analyze my existing project', kind: 'flow-existing' } as GuideAction;
          return toGuideAction(a);
        });
        return { key: `assistant.intents.${intent.id}`, actions };
      }
    }
  }
  return null;
}

/** Clarification shown for unknown messages — never invents an answer. */
export function clarifyReply(pathname: string): GuideReply {
  return { key: 'guide.clarify', actions: getRouteQuickActions(pathname).slice(0, 5) };
}
