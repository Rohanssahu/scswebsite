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
      { label: 'See our services', to: '/#services' },
    ],
  },
  {
    id: 'cost',
    keywords: [['cost'], ['price'], ['pricing'], ['how much'], ['budget'], ['rate'], ['charge'], ['quote']],
    response:
      'We work on transparent hourly rates — for example UI/UX design from $10/hr, frontend from $15/hr and backend from $20/hr (demo figures). The fastest way to a number is our free demo estimator: it breaks down roles, hours and total cost for your specific project.',
    actions: [
      { label: 'Get a demo estimate', to: '/project-analysis' },
      { label: 'Schedule a call', to: '/schedule-call' },
    ],
  },
  {
    id: 'which-developer',
    keywords: [['which', 'developer'], ['what', 'developer'], ['team', 'need'], ['hire'], ['developer', 'need'], ['skills', 'need']],
    response:
      'That depends on your project scope. Our demo analysis recommends an exact team — for a typical web app that is a requirement analyst, UI/UX designer, frontend and backend developers plus a QA tester, with hours per role.',
    actions: [
      { label: 'Get my team recommendation', to: '/project-analysis' },
      { label: 'View services', to: '/#services' },
    ],
  },
  {
    id: 'services',
    keywords: [['service'], ['what', 'do', 'you', 'do'], ['offer'], ['portfolio'], ['work', 'done']],
    response:
      'SCS Softwares offers web development, mobile app development, UI/UX design, cloud solutions, DevOps and digital marketing. You can browse each service or jump straight to a project estimate.',
    actions: [
      { label: 'Web development', to: '/gig/web-development' },
      { label: 'Mobile development', to: '/gig/mobile-development' },
      { label: 'All services', to: '/#services' },
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
      'The demo estimate multiplies each recommended role\'s hours by its hourly rate and sums them, then divides total hours by a 40-hour weekly capacity to project the delivery duration. It is a preliminary figure — a review call confirms the final scope and quote.',
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
  { label: 'See services', to: '/#services' },
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
