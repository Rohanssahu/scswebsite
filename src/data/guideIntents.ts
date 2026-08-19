// Local intent router for the SCS Virtual Guide — Demo.
// Purely keyword-based, deterministic frontend logic. Reuses the existing
// assistant intents and layers guide-specific intents plus route context on top.

import { ASSISTANT_INTENTS, AssistantAction } from '@/data/assistantIntents';
import { getPageInfo, getRouteQuickActions, CLARIFY_RESPONSE } from '@/data/guideContent';
import { GuideAction, GuideIntent } from '@/types/virtualGuide';

export interface GuideReply {
  text: string;
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
    response:
      "Happy to! I'll walk you through the website — services, products, how we work, and how to reach the team. You can skip or ask questions at any step.",
    actions: [
      { label: 'Start the tour', kind: 'start-tour' },
      { label: 'Explore myself', kind: 'navigate', to: '/' },
    ],
  },
  {
    id: 'benefits',
    keywords: [['benefit'], ['advantage'], ['why', 'choose'], ['why', 'scs']],
    response:
      'The main benefits of working with SCS Softwares: you see an estimated team, cost and timeline before committing; pricing is transparent and hourly; you own the full source code from day one; and you get weekly clickable demos with a dedicated project manager.',
    actions: [
      { label: 'See why-SCS section', kind: 'navigate', to: '/#why-scs' },
      { label: 'Get a demo estimate', kind: 'flow-new' },
    ],
  },
  {
    id: 'pros-cons',
    keywords: [['pros'], ['cons'], ['limitation'], ['drawback'], ['downside']],
    response:
      'Fair question. Pros: transparent estimates, full code ownership, one team for design-to-deploy, weekly demos. Cons to be aware of: custom builds take longer than ready-made products, third-party costs (hosting, gateways) are separate, and final quotes need a scoping call. For your specific project I can generate a pros/cons list with the requirement flow.',
    actions: [
      { label: 'Analyze my project', kind: 'flow-new' },
      { label: 'View ready products', kind: 'navigate', to: '/products' },
    ],
  },
  {
    id: 'products',
    keywords: [['product']],
    response:
      'SCS offers ready-made, customizable products across web, mobile, cloud, marketing and DevOps — proven bases you can launch quickly instead of building from zero. Want to browse them or tell me what you need so I can point you to a fit?',
    actions: [
      { label: 'View products', kind: 'navigate', to: '/products' },
      { label: 'I need a similar solution', kind: 'flow-new' },
    ],
  },
  {
    id: 'need-website',
    keywords: [['need', 'website'], ['want', 'website'], ['build', 'website'], ['website', 'for']],
    response:
      "Great — websites are our core service. To recommend the right team and give you a preliminary demo estimate, I'll ask a few quick questions about what you want to build.",
    actions: [
      { label: 'Start requirement flow', kind: 'flow-new' },
      { label: 'See web development service', kind: 'navigate', to: '/gig/web-development' },
    ],
  },
  {
    id: 'choose-service',
    keywords: [['which', 'service'], ['suitable'], ['help', 'choose'], ['right', 'for', 'me'], ['recommend', 'service']],
    response:
      'That depends on where you are: a brand-new idea usually starts with UI/UX design plus web or mobile development, while an existing app that misbehaves starts with a rescue audit. Which describes you better?',
    actions: [
      { label: 'I have a new idea', kind: 'flow-new' },
      { label: 'I have an existing project', kind: 'flow-existing' },
      { label: 'See all services', kind: 'navigate', to: '/#services' },
    ],
  },
  {
    id: 'how-long',
    keywords: [['how', 'long'], ['duration'], ['delivery', 'time'], ['when', 'ready'], ['take', 'weeks']],
    response:
      'Duration depends on scope. As a demo reference: a typical web app estimate lands around 50–70 hours, and with a 40-hour weekly team capacity that is roughly 2 weeks of build plus a launch week. Answer the requirement questions and I will calculate a duration for your exact project.',
    actions: [
      { label: 'Estimate my timeline', kind: 'flow-new' },
      { label: 'Schedule a call', kind: 'schedule-handoff' },
    ],
  },
  {
    id: 'application-process',
    keywords: [['application', 'process'], ['apply', 'job'], ['how', 'apply']],
    response:
      'Applying is simple: check the open positions on the careers page, then submit the application form with your details and portfolio. The team reviews applications and contacts shortlisted candidates for an interview.',
    actions: [
      { label: 'Show positions', kind: 'navigate', to: '/careers#openings' },
      { label: 'Open application form', kind: 'navigate', to: '/ApplicationForm' },
    ],
  },
  {
    id: 'whatsapp',
    keywords: [['whatsapp']],
    response: 'You can chat with the SCS team on WhatsApp — I will open it with a short intro message you can review and send yourself.',
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

  if (has('explain') || has('what', 'is', 'this') || has('tell', 'about')) {
    return {
      text: `${info.name}: ${info.blurb}`,
      actions: [
        { label: 'Who is it for?', kind: 'send', message: `Who is ${info.name} for?` },
        { label: 'Benefits', kind: 'send', message: `What are the benefits of ${info.name}?` },
        { label: 'Discuss my requirement', kind: 'flow-new' },
      ],
    };
  }
  if (has('who') && (has('for') || has('use'))) {
    return {
      text: `${info.name} is a great fit for: ${info.forWho}`,
      actions: [
        { label: 'Benefits', kind: 'send', message: `What are the benefits of ${info.name}?` },
        { label: 'Start requirement flow', kind: 'flow-new' },
      ],
    };
  }
  if (has('right', 'for', 'me') || has('fit')) {
    return {
      text: `${info.name} suits you if this sounds familiar: ${info.forWho} If you tell me about your project, I can confirm the fit and estimate the team.`,
      actions: [
        { label: 'Tell you my requirement', kind: 'flow-new' },
        { label: 'Pros and cons', kind: 'send', message: 'What are the pros and cons?' },
      ],
    };
  }
  if (has('benefit')) {
    return {
      text: `Key benefits of ${info.name}: ${info.benefits.join('; ')}.`,
      actions: [
        { label: 'Limitations', kind: 'send', message: 'What are the limitations?' },
        { label: 'Start requirement flow', kind: 'flow-new' },
      ],
    };
  }
  if (has('limitation') || has('cons') || has('drawback')) {
    return {
      text: `Honest limitations of ${info.name}: ${info.limitations.join('; ')}. Pros: ${info.benefits.join('; ')}.`,
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
        return { text: intent.response, actions: intent.actions };
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
        return { text: intent.response, actions };
      }
    }
  }
  return null;
}

/** Clarification shown for unknown messages — never invents an answer. */
export function clarifyReply(pathname: string): GuideReply {
  return { text: CLARIFY_RESPONSE, actions: getRouteQuickActions(pathname).slice(0, 5) };
}
