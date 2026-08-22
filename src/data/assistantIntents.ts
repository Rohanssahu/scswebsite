import {
  monthlyCostRangeLabel,
  STANDARD_HOURLY_RATE_USD,
  WEEKLY_CAPACITY_HOURS,
  WEEKLY_COST_USD,
} from '@/policy/estimationPolicy';

// Local intent router for the demo website assistant.
// Purely keyword-based frontend logic — no LLM or network calls.

export interface AssistantAction {
  label: string;
  /** Router path to navigate to, e.g. "/project-analysis". */
  to?: string;
  /** Optional query appended to the path (used to preselect a mode). */
  state?: 'new' | 'existing';
}

export interface AssistantIntent {
  id: string;
  /** Case-insensitive keyword groups; an intent matches if any group's words all appear. */
  keywords: string[][];
  response: string;
  actions: AssistantAction[];
}

export const ASSISTANT_INTENTS: AssistantIntent[] = [
  {
    id: 'fix-existing',
    keywords: [['broken'], ['fix', 'project'], ['bug'], ['not working'], ['incomplete'], ['crash'], ['existing', 'project']],
    response:
      'We help rescue and finish existing projects — React, Node, PHP, WordPress, mobile apps and more. I can run a quick demo analysis of your project to estimate the team, hours and cost needed to fix it.',
    actions: [
      { label: 'Analyze my existing project', to: '/project-analysis', state: 'existing' },
      { label: 'Talk to a human', to: '/contact' },
    ],
  },
  {
    id: 'build-new',
    keywords: [['build'], ['new', 'project'], ['new', 'app'], ['create', 'website'], ['mobile', 'app'], ['idea'], ['mvp'], ['startup']],
    response:
      'Great — SCS Softwares builds web and mobile products end to end. Tell me about your idea through a short guided flow and you will get a demo estimate of team, hours, cost and timeline.',
    actions: [
      { label: 'Start new-project analysis', to: '/project-analysis', state: 'new' },
      { label: 'See our services', to: '/services' },
    ],
  },
  {
    id: 'cost',
    keywords: [['cost'], ['price'], ['pricing'], ['how much'], ['budget'], ['rate'], ['charge'], ['quote']],
    response:
      `We work on transparent hourly pricing at a standard rate of up to $${STANDARD_HOURLY_RATE_USD} per hour, with a maximum of ${WEEKLY_CAPACITY_HOURS} development hours per week — up to $${WEEKLY_COST_USD} for a full delivery week and roughly ${monthlyCostRangeLabel()} for a full-time month. Tell the estimator your budget and it builds the strongest production-ready scope inside it, listing exactly what falls outside it.`,
    actions: [
      { label: 'Get a demo estimate', to: '/project-analysis' },
      { label: 'Schedule a call', to: '/schedule-call' },
    ],
  },
  {
    id: 'which-developer',
    keywords: [['which', 'developer'], ['what', 'developer'], ['team', 'need'], ['hire'], ['developer', 'need'], ['skills', 'need']],
    response:
      'That depends on your project scope. The analysis recommends a team — for a typical web app that is a requirement analyst, UI/UX designer, frontend and backend developers plus a QA tester — and splits the hours your budget covers across them.',
    actions: [
      { label: 'Get my team recommendation', to: '/project-analysis' },
      { label: 'View services', to: '/services' },
    ],
  },
  {
    id: 'services',
    keywords: [['service'], ['what', 'do', 'you', 'do'], ['offer'], ['portfolio'], ['work', 'done']],
    response:
      'SCS Softwares offers custom software, mobile app, web application and SaaS development, software modernization, and AI work — AI development, machine learning, voice agents, AI video consultation agents, conversational AI and AI automation. UI/UX design, cloud and DevOps engineering sit alongside them, and SEO and marketing support is a separate supporting service.',
    actions: [
      { label: 'All services', to: '/services' },
      { label: 'AI development', to: '/services/ai-development' },
      { label: 'Custom software', to: '/services/custom-software-development' },
    ],
  },
  {
    id: 'schedule',
    keywords: [['schedule'], ['call'], ['meeting'], ['book'], ['appointment'], ['consult']],
    response:
      'You can pick a date and time slot that suits you — the scheduling page shows available demo slots (calendar integration comes later).',
    actions: [{ label: 'Schedule a call', to: '/schedule-call' }],
  },
  {
    id: 'human',
    keywords: [['human'], ['talk', 'person'], ['contact'], ['email'], ['phone'], ['whatsapp'], ['real person']],
    response:
      'Of course — you can reach the SCS Softwares team directly through the contact page, or book a call at a time that works for you.',
    actions: [
      { label: 'Contact us', to: '/contact' },
      { label: 'Schedule a call', to: '/schedule-call' },
    ],
  },
  {
    id: 'estimate-explain',
    keywords: [['explain', 'estimate'], ['estimate', 'mean'], ['understand', 'estimate'], ['about', 'estimate'], ['analysis', 'mean']],
    response:
      `Each requirement is classified as essential, important or optional, hours come from a fixed effort table, and the total is those hours at up to $${STANDARD_HOURLY_RATE_USD} per hour. Your budget then decides which requirements fit — the rest are listed as deferred, never hidden. Duration divides total hours by a maximum ${WEEKLY_CAPACITY_HOURS}-hour delivery week. It is preliminary: a human technical review confirms the final scope and quote.`,
    actions: [
      { label: 'View my analysis', to: '/project-analysis/result' },
      { label: 'Request human review', to: '/contact' },
    ],
  },
  {
    id: 'careers',
    keywords: [['job'], ['career'], ['hiring'], ['vacancy'], ['internship']],
    response: 'We are always looking for talented people! Check our current openings on the careers page.',
    actions: [{ label: 'View careers', to: '/careers' }],
  },
];

export const FALLBACK_RESPONSE =
  "I'm a demo assistant, so I may not have understood that. Here are things I can help with:";

export const FALLBACK_ACTIONS: AssistantAction[] = [
  { label: 'Analyze a new project', to: '/project-analysis', state: 'new' },
  { label: 'Fix an existing project', to: '/project-analysis', state: 'existing' },
  { label: 'See services', to: '/services' },
  { label: 'Schedule a call', to: '/schedule-call' },
];

export const GREETING =
  "Hi! I'm the SCS Website Assistant (demo). I can explain our services, start a project estimate, or connect you with the team. What brings you here today?";

export function matchIntent(message: string): AssistantIntent | null {
  const text = message.toLowerCase();
  for (const intent of ASSISTANT_INTENTS) {
    for (const group of intent.keywords) {
      if (group.every((word) => text.includes(word))) {
        return intent;
      }
    }
  }
  return null;
}
