/**
 * The lightweight service manifest: metadata only, no body copy.
 *
 * Phase 3B split every service page into two modules:
 *
 *   - this file — path, menu group, labels, schema.org names, `<title>`, meta
 *     description and sitemap priority for all fifteen pages. Small, imported
 *     synchronously, and the only service module the main JavaScript bundle
 *     needs;
 *   - `./<service>.ts` — the page's `ServiceBody`: hero, intro, problems,
 *     capabilities, process, FAQs and the rest. Several hundred lines of prose
 *     each, now loaded as a route-level chunk when that page is opened.
 *
 * `src/seo/registry.ts`, `src/data/serviceNav.ts`, the header, the footer and
 * the `/services` hub read this file. None of them pulls a single line of body
 * copy into the main bundle any more.
 *
 * `ServiceContent` is still `ServiceMeta & ServiceBody`, so a composed page
 * object looks exactly as it did before the split — see `./compose.ts`.
 */

import type { ServiceMeta } from './types';

/** Metadata for the `/services` hub itself. Body copy lives in `./hub.ts`. */
export const servicesHubMeta = {
  path: '/services',
  navLabel: 'Services',
  metaTitle: 'Software & AI Development Services | SCS Softwares',
  metaDescription:
    'Every service SCS Softwares delivers: custom software, mobile, web and SaaS development, modernization, AI and machine learning, plus UI/UX design, cloud, DevOps and SEO support.',
  shareTitle: 'Services — SCS Softwares',
} as const;

/** The hub every service page's breadcrumb passes through. */
export const SERVICES_HUB_PATH = servicesHubMeta.path;

/**
 * Every service page's metadata, in the order navigation and the hub list
 * them: the software-development group, the AI group, then the supporting
 * design, cloud, delivery and growth pages.
 */
export const SERVICE_META: ServiceMeta[] = [
  {
    path: '/services/custom-software-development',
    group: 'software',
    navLabel: 'Custom Software Development',
    serviceName: 'Custom Software Development',
    serviceType: 'Custom Software Development',
    metaTitle: 'Custom Software Development Company | SCS Softwares',
    metaDescription:
      'SCS Softwares is an India-based remote software development company building custom products, business-process automation, internal tools and AI-assisted solutions for international clients.',
    shareTitle: 'Custom Software Development — SCS Softwares',
    priority: 0.9,
  },
  {
    path: '/services/mobile-app-development',
    group: 'software',
    navLabel: 'Mobile App Development',
    serviceName: 'Mobile App Development',
    serviceType: 'Mobile Application Development',
    metaTitle: 'Mobile App Development Company | iOS & Android | SCS Softwares',
    metaDescription:
      'Custom mobile application development for iOS and Android in React Native, Flutter and native code — API integration, payments, maps, notifications, offline support and app store release.',
    shareTitle: 'Mobile App Development — SCS Softwares',
    priority: 0.85,
  },
  {
    path: '/services/web-application-development',
    group: 'software',
    navLabel: 'Web Application Development',
    serviceName: 'Web Application Development',
    serviceType: 'Web Application Development',
    metaTitle: 'Web Application Development Services | SCS Softwares',
    metaDescription:
      'Custom web application development for customer portals, dashboards, marketplaces and booking systems — responsive interfaces, APIs, admin systems, payments and AI-enabled features.',
    shareTitle: 'Web Application Development — SCS Softwares',
    priority: 0.85,
  },
  {
    path: '/services/saas-development',
    group: 'software',
    navLabel: 'SaaS Development',
    serviceName: 'SaaS Development',
    serviceType: 'SaaS Product Development',
    metaTitle: 'SaaS Development Services | MVP to Multi-Tenant | SCS Softwares',
    metaDescription:
      'SaaS product development from MVP to multi-tenant platform: subscriptions, roles and permissions, dashboards, usage tracking, integrations, scalable architecture and product iteration.',
    shareTitle: 'SaaS Development — SCS Softwares',
    priority: 0.85,
  },
  {
    path: '/services/software-modernization',
    group: 'software',
    navLabel: 'Software Modernization',
    serviceName: 'Software Modernization',
    serviceType: 'Legacy Software Modernization',
    metaTitle: 'Software Modernization & Legacy App Upgrade | SCS Softwares',
    metaDescription:
      'Assessment, incremental migration and modernization of existing applications: legacy interfaces, performance, API upgrades, security review, cloud readiness, bug fixing and maintenance.',
    shareTitle: 'Software Modernization — SCS Softwares',
    priority: 0.85,
  },
  {
    path: '/services/ai-development',
    group: 'ai',
    navLabel: 'AI Development',
    serviceName: 'AI Development',
    serviceType: 'Artificial Intelligence Development',
    metaTitle: 'AI Development Services | SCS Softwares',
    metaDescription:
      'AI development by an India-based remote team: assistants, generative AI integrations, retrieval over your own content, and AI features inside web and mobile apps.',
    shareTitle: 'AI Development — SCS Softwares',
    priority: 0.9,
  },
  {
    path: '/services/machine-learning-development',
    group: 'ai',
    navLabel: 'Machine Learning Development',
    serviceName: 'Machine Learning Development',
    serviceType: 'Machine Learning Development',
    metaTitle: 'Machine Learning Development Services | SCS Softwares',
    metaDescription:
      'Machine learning on your own data: prediction, classification, recommendation, anomaly detection and document sorting, integrated and monitored after launch.',
    shareTitle: 'Machine Learning Development — SCS Softwares',
    priority: 0.85,
  },
  {
    path: '/services/ai-voice-agent-development',
    group: 'ai',
    navLabel: 'AI Voice Agent Development',
    serviceName: 'AI Voice Agent Development',
    serviceType: 'AI Voice Agent Development',
    metaTitle: 'AI Voice Agent Development Services | SCS Softwares',
    metaDescription:
      'Real-time AI voice agents for websites and apps: natural two-way speech, interruption handling, requirement collection and escalation to your own team.',
    shareTitle: 'AI Voice Agent Development — SCS Softwares',
    priority: 0.85,
  },
  {
    path: '/services/ai-video-consultation-agents',
    group: 'ai',
    navLabel: 'AI Video Consultation Agents',
    serviceName: 'AI Video Consultation Agent Development',
    serviceType: 'AI Video Consultation Agent Development',
    metaTitle: 'AI Video Consultation Agent Development | SCS Softwares',
    metaDescription:
      'Avatar-led consultation rooms with two-way voice, live transcript, chat and a structured meeting summary, reviewed by your team before any follow-up.',
    shareTitle: 'AI Video Consultation Agents — SCS Softwares',
    priority: 0.85,
  },
  {
    path: '/services/conversational-ai-development',
    group: 'ai',
    navLabel: 'Conversational AI Development',
    serviceName: 'Conversational AI Development',
    serviceType: 'Conversational AI Development',
    metaTitle: 'Conversational AI Development Services | SCS Softwares',
    metaDescription:
      'Website and in-app assistants grounded in your own content: guided requirement collection, support workflows, backend actions and a clean handoff to people.',
    shareTitle: 'Conversational AI Development — SCS Softwares',
    priority: 0.85,
  },
  {
    path: '/services/ai-automation-integration',
    group: 'ai',
    navLabel: 'AI Automation & Integration',
    serviceName: 'AI Automation and Integration',
    serviceType: 'AI Automation and Systems Integration',
    metaTitle: 'AI Automation & Integration Services | SCS Softwares',
    metaDescription:
      'Connect AI to the systems you already run: document processing, structured extraction, workflow automation, approval checkpoints and audit trails.',
    shareTitle: 'AI Automation & Integration — SCS Softwares',
    priority: 0.85,
  },
  {
    path: '/services/ui-ux-design',
    group: 'design',
    navLabel: 'UI/UX Design',
    serviceName: 'UI/UX Design',
    serviceType: 'UI/UX and Product Design',
    metaTitle: 'UI/UX Design Services for Web & Mobile Apps | SCS Softwares',
    metaDescription:
      'Product discovery, user flows, wireframes, interface and responsive design, design systems, clickable prototypes, accessibility review and build-ready developer handoff.',
    shareTitle: 'UI/UX Design — SCS Softwares',
    priority: 0.8,
  },
  {
    path: '/services/cloud-solutions',
    group: 'platform',
    navLabel: 'Cloud Solutions',
    serviceName: 'Cloud Solutions',
    serviceType: 'Cloud Architecture and Migration',
    metaTitle: 'Cloud Solutions, Hosting & Migration Services | SCS Softwares',
    metaDescription:
      'Cloud-readiness assessment, deployment architecture, environments and configuration, managed databases and storage, backups, observability, cost review and staged migration.',
    shareTitle: 'Cloud Solutions — SCS Softwares',
    priority: 0.8,
  },
  {
    path: '/services/devops-engineering',
    group: 'platform',
    navLabel: 'DevOps Engineering',
    serviceName: 'DevOps Engineering',
    serviceType: 'DevOps and Release Engineering',
    metaTitle: 'DevOps Engineering & CI/CD Pipeline Services | SCS Softwares',
    metaDescription:
      'CI/CD pipelines, reproducible builds, environment management, automated test gates, deployment and rollback workflows, infrastructure automation, monitoring and secret handling.',
    shareTitle: 'DevOps Engineering — SCS Softwares',
    priority: 0.8,
  },
  {
    path: '/services/digital-marketing',
    group: 'growth',
    navLabel: 'Digital Marketing',
    serviceName: 'Digital Marketing Support',
    serviceType: 'SEO and Digital Marketing Support',
    metaTitle: 'SEO & Digital Marketing Support Services | SCS Softwares',
    metaDescription:
      'Website SEO foundations, technical SEO fixes, content planning, analytics and conversion tracking setup, landing pages and campaign pages, plus plain monthly reporting.',
    shareTitle: 'Digital Marketing Support — SCS Softwares',
    priority: 0.7,
  },];

export const SERVICE_META_BY_PATH: Record<string, ServiceMeta> = Object.fromEntries(
  SERVICE_META.map((service) => [service.path, service]),
);

const inGroups = (...groups: ServiceMeta['group'][]): ServiceMeta[] =>
  SERVICE_META.filter((service) => groups.includes(service.group));

/** Software-development service pages (Phase 2A). */
export const SOFTWARE_SERVICE_META: ServiceMeta[] = inGroups('software');

/** AI service pages (Phase 2B). */
export const AI_SERVICE_META: ServiceMeta[] = inGroups('ai');

/** Design, cloud and delivery service pages (Phase 2C). */
export const DELIVERY_SERVICE_META: ServiceMeta[] = inGroups('design', 'platform');

/** Growth services, kept apart so marketing is never sold as engineering. */
export const GROWTH_SERVICE_META: ServiceMeta[] = inGroups('growth');

/** The supporting services, in the order every surface lists them. */
export const SUPPORT_SERVICE_META: ServiceMeta[] = [...DELIVERY_SERVICE_META, ...GROWTH_SERVICE_META];

/** The pillar page for the software-development group. */
export const PILLAR_SERVICE_META = SERVICE_META_BY_PATH['/services/custom-software-development'];
/** The pillar page for the AI group. */
export const AI_PILLAR_SERVICE_META = SERVICE_META_BY_PATH['/services/ai-development'];
