/**
 * Copy for the `/services` hub.
 *
 * Phase 3B moved the hub's own metadata into `./manifest.ts` — the small module
 * the SEO registry and the navigation read — and left the body copy here. The
 * two are spread back together at the bottom of this file, so `servicesHub`
 * still exposes the same fields it always did, and only the `/services` route
 * chunk pays for the prose.
 */

import { servicesHubMeta } from './manifest';

export interface HubEntry {
  path: string;
  /** Short line written for the hub listing, not reused from the page. */
  blurb: string;
}

export interface HubGroup {
  id: 'software' | 'ai' | 'delivery' | 'growth';
  title: string;
  intro: string;
  entries: HubEntry[];
}

export const servicesHub = {
  ...servicesHubMeta,
  h1: 'Software and AI Development Services',
  valueProp:
    'One India-based team covering the whole build: the product, the platform it runs on, and the AI inside it.',
  intro: [
    'SCS Softwares is a software development company in Indore, India, working remotely with clients in other countries and time zones. We have delivered custom applications since 2022, and a growing share of that work has involved AI — assistants, voice agents, document processing and the engineering that keeps model output under control.',
    'The services below are grouped the way projects actually arrive. Most start in one group and touch another: a SaaS product that needs an in-app assistant, an old system that needs an API before anything can automate around it, a mobile app whose real value is the AI feature inside it. Pick whichever page describes your starting point — each one links to the others it commonly pairs with.',
  ],
  groups: [
    {
      id: 'software',
      title: 'Software development',
      intro:
        'Building, extending and rescuing the applications a business runs on.',
      entries: [
        {
          path: '/services/custom-software-development',
          blurb: 'The pillar service: new products, business-process automation, internal tools and integrations, from discovery through to support.',
        },
        {
          path: '/services/mobile-app-development',
          blurb: 'iOS and Android apps in React Native, Flutter or native code, including payments, maps, notifications, offline behaviour and store release.',
        },
        {
          path: '/services/web-application-development',
          blurb: 'Customer portals, dashboards, marketplaces and booking systems, with the APIs, permissions and admin tooling behind them.',
        },
        {
          path: '/services/saas-development',
          blurb: 'Subscription products from MVP to multi-tenant platform: plans, billing, roles, usage tracking and the architecture underneath.',
        },
        {
          path: '/services/software-modernization',
          blurb: 'Assessment first, then incremental improvement of a system you already depend on — interface, performance, APIs, security and cloud readiness.',
        },
      ],
    },
    {
      id: 'ai',
      title: 'AI development',
      intro:
        'AI built as software: grounded in your own content, wrapped in strict tooling, and kept under human review where the answer matters.',
      entries: [
        {
          path: '/services/ai-development',
          blurb: 'The AI pillar: assistants, generative integrations, retrieval over your content, structured AI workflows, and the monitoring and cost controls around them.',
        },
        {
          path: '/services/machine-learning-development',
          blurb: 'Prediction, classification, recommendation and anomaly detection learned from your own history — with feasibility judged on your data first.',
        },
        {
          path: '/services/ai-voice-agent-development',
          blurb: 'Real-time spoken conversation inside a website or app, with interruption handling, defined tools and escalation to your team.',
        },
        {
          path: '/services/ai-video-consultation-agents',
          blurb: 'An avatar-led consultation room with two-way voice, live transcript, chat and a structured summary a person reviews afterwards.',
        },
        {
          path: '/services/conversational-ai-development',
          blurb: 'Website and in-app assistants that answer from your material, take defined actions, and hand over to a person with the context intact.',
        },
        {
          path: '/services/ai-automation-integration',
          blurb: 'Document processing, structured extraction and workflow automation connected to your systems, with approvals and an audit trail.',
        },
      ],
    },
    {
      id: 'delivery',
      title: 'Design, cloud and delivery',
      intro:
        'The services that sit either side of the code: how the product looks and behaves, and how it is hosted and released.',
      entries: [
        {
          path: '/services/ui-ux-design',
          blurb: 'Product discovery, user flows, wireframes, interface and responsive design, design systems, prototypes and build-ready developer handover.',
        },
        {
          path: '/services/cloud-solutions',
          blurb: 'Readiness assessment, deployment architecture, environments as code, managed databases, backups that are actually restored, monitoring and cost review.',
        },
        {
          path: '/services/devops-engineering',
          blurb: 'CI/CD pipelines, reproducible builds, automated test gates, deployment and rollback workflows, infrastructure automation and secret handling.',
        },
      ],
    },
    {
      id: 'growth',
      title: 'Growth and marketing support',
      intro:
        'A supporting service, not part of the engineering offer: the marketing work that lives inside the website itself.',
      entries: [
        {
          path: '/services/digital-marketing',
          blurb: 'Website SEO foundations, technical fixes, content planning, analytics and conversion tracking, landing pages and reporting you can verify. No ranking promises.',
        },
      ],
    },
  ] satisfies HubGroup[],
  /** Short, factual notes about how any engagement here runs. */
  howWeWork: {
    title: 'How every engagement here works',
    points: [
      {
        title: 'A written scope before development',
        body: 'Features, assumptions and exclusions in the same document, so the boundary of the work is something you can read rather than infer.',
      },
      {
        title: 'A named team, not a pool',
        body: 'A point of contact plus the people actually assigned, working hours arranged to overlap your day.',
      },
      {
        title: 'A build you can click each cycle',
        body: 'Progress demonstrated in something you can open yourself, rather than described in a status report.',
      },
      {
        title: 'You own the result',
        body: 'Source code, designs, cloud accounts and credentials are yours, and are handed over at the end of the engagement.',
      },
    ],
  },
  cta: {
    title: 'Not sure which of these you need?',
    body: 'That is a normal place to start. Answer a few questions for an indicative estimate, talk it through with our AI consultation agent, or describe the problem to the team and we will point you at the right one.',
  },
};

export type ServicesHub = typeof servicesHub;
