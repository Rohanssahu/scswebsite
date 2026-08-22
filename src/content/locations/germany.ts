/**
 * `/locations/germany` — written for this page only.
 *
 * German enquiries almost always begin with the specification. Not with price,
 * not with a technology, and not with a portfolio: with what exactly is being
 * bought, how it will be judged finished, and what documentation comes with it.
 * So this page is organised around written requirements, acceptance criteria
 * agreed before implementation, milestones that hold, technical documentation as
 * a real deliverable, and the test and release evidence that shows a version
 * did what it was accepted to do.
 *
 * Deliberately different from the United Kingdom page, which is about supplier
 * due diligence and staged sign-off by an organisation's procurement process.
 * The German page is about the artefact — the specification and the evidence —
 * rather than about the buying process around it.
 *
 * The DACH question is answered explicitly and negatively: Germany is the market
 * this page covers, and anything beyond it is scoped separately.
 */

import type { LocationBody } from './types';

export const germany: LocationBody = {
  path: '/locations/germany',
  h1: 'Software and AI Development for Businesses in Germany',
  valueProp:
    'An India-based software and AI development partner for businesses in Germany — requirements written down before anything is built, acceptance criteria agreed in advance, and milestones that mean what they say.',
  heroHighlights: [
    'Engineered in Indore, India, for companies that run their operations from Germany',
    'A specification and acceptance criteria you sign off before implementation starts',
    'Technical documentation and release evidence treated as deliverables, not afterthoughts',
    'Hosting and data-location requirements settled before the architecture is drawn',
  ],
  intro: [
    'The briefs that reach us from Germany tend to arrive further along than most. There is usually a process already described, a set of constraints that came from somewhere specific, and a clear idea of what a finished version has to do. What is missing is engineering capacity and a partner who will write the requirement down properly rather than improvise around it. That is the work this page describes.',
    'We build web and mobile applications, SaaS platforms, integrations between systems that already run the business, and AI workflows where a person stays in the approval path. A large share of it is modernization rather than greenfield: an application that has grown for a decade, still holds the process together, and now resists every change anyone asks for.',
    'The method is unremarkable and deliberately so. A requirement is written until both sides read it the same way. Acceptance criteria are agreed before implementation, not negotiated after a demonstration. Each milestone has a date, a scope and a definition of done, and if one of those three has to move we say which one and why, in the cycle it happens rather than at the end. Test results and release notes are handed over with the release, so an accepted version can be shown to have been tested.',
    'On the practical side: Germany runs on Central European Time in winter and Central European Summer Time from spring into autumn, so Indian Standard Time is four and a half hours ahead of you for part of the year and three and a half hours ahead for the rest. Our afternoon covers your morning either way. Project delivery, documentation and correspondence are in English; German-language interface and content work is separately scoped professional localization, described further down.',
  ],
  disclosure: {
    title: 'An engineering team in India, working for the German market',
    body:
      'SCS Softwares operates from Indore, Madhya Pradesh, India. Work for German businesses is engineered and delivered remotely from that office. This page describes where a service is available — it is not a statement of presence in Germany, and no local office is represented here.',
    points: [
      'There is no German office, no German branch and no German telephone number behind this page, and we do not present one.',
      'Delivery is remote from beginning to end: specification workshops, design review, demonstrations, testing and handover all happen online.',
      'We are not locally registered, hold no German commercial registration, and belong to no German industry association, chamber or supplier panel.',
      'Everyone working on your project is employed in India. We claim no staff, contractors, associates or on-site attendance in Germany.',
      'We hold no TÜV, ISO or comparable certification, no audit report and no data-protection seal, and we do not offer one.',
      'We do not describe our software as compliant with the GDPR, the BDSG or any other framework, and we give no legal, tax or regulatory advice for Germany.',
      'This page and the engagement it describes are in English. German-language content is available only as separately scoped professional localization.',
    ],
  },
  concerns: {
    eyebrow: 'Before anything is signed',
    heading: 'The questions a German buyer asks first',
    intro:
      'These come up in almost every first conversation, usually in this order. Answering them badly wastes both sides a month, so here they are answered plainly.',
    items: [
      {
        title: 'Will the requirement actually be written down?',
        body:
          'Yes, and in enough detail to be argued with. A specification that both sides can read the same way is the deliverable that makes everything after it cheaper — screens, data, rules, edge cases, what is explicitly out of scope, and what happens when an input is wrong.',
      },
      {
        title: 'Who decides when a milestone is finished?',
        body:
          'You do, against criteria written before the work started. Acceptance criteria are part of the scope document rather than something assembled after a demonstration, which is what stops "finished" from becoming a matter of opinion.',
      },
      {
        title: 'What happens when a date is going to slip?',
        body:
          'You hear about it in the cycle it becomes visible, with the reason and the options. A milestone has a date, a scope and a definition of done; if one has to give, we say which and let you choose, rather than quietly absorbing it and reporting late.',
      },
      {
        title: 'What documentation comes with the software?',
        body:
          'Architecture notes, data model, interface descriptions, environment and deployment instructions, and administrator documentation — written as the build proceeds, in English, and handed over with the source. Not reconstructed at the end as a formality.',
      },
      {
        title: 'Where will the system and its data actually run?',
        body:
          'Somewhere you choose during discovery, and recorded before anything is provisioned. Hosting region, backup region, retention, logging and every external processor the system touches are decided while the architecture is still a document.',
      },
      {
        title: 'Does this cover Austria and Switzerland too?',
        body:
          'Only if we scope it. This page is about Germany. Serving another market means its own rules, its own tax and invoicing treatment, its own testing and its own line in the estimate — so we name each one in the scope rather than implying regional coverage.',
      },
      {
        title: 'Can an AI step be trusted inside a real process?',
        body:
          'Only where a person remains in the approval path, which is how we build them. An AI step prepares work — extracts, drafts, classifies, summarises — and a named person accepts it before it has any effect on a record, a document or a customer.',
      },
    ],
  },
  services: {
    eyebrow: 'What we are asked to build',
    heading: 'The services German engagements usually start from',
    intro:
      'Each page below describes the service in general. The note beside it is what changes when the specification is agreed in Germany and the engineering happens in India.',
    items: [
      {
        path: '/services/custom-software-development',
        label: 'Custom Software Development',
        blurb:
          'Where the process is specific enough that no product matches it: the rules, the exceptions and the month-end reconciliations written into a specification before a line is implemented.',
      },
      {
        path: '/services/web-application-development',
        label: 'Web Application Development',
        blurb:
          'The internal application most of these engagements revolve around — roles, permissions, workflow states and reporting that has to reconcile with the systems around it.',
      },
      {
        path: '/services/mobile-app-development',
        label: 'Mobile App Development',
        blurb:
          'Applications for field staff, technicians and customers, built where a phone is genuinely the right device for the task rather than because a mobile version was expected.',
      },
      {
        path: '/services/saas-development',
        label: 'SaaS Development',
        blurb:
          'Products sold to other businesses: tenancy and isolation, plan and seat handling, usage records, and the operational documentation a paying customer expects to receive.',
      },
      {
        path: '/services/software-modernization',
        label: 'Software Modernization',
        blurb:
          'For the application that has held the process together for a decade and now blocks every change: assessed and documented first, then rebuilt in releases the business can absorb.',
      },
      {
        path: '/services/ai-automation-integration',
        label: 'AI Automation & Integration',
        blurb:
          'Interfaces to the systems that already run the company, and automation of the document and approval steps between them — each with a written record of what was done and by whom.',
      },
      {
        path: '/services/ai-development',
        label: 'AI Development',
        blurb:
          'Assistants and classification steps grounded in your own documents and rules, with the source shown, the confidence visible and a defined point where a person takes over.',
      },
      {
        path: '/services/ai-voice-agent-development',
        label: 'AI Voice Agent Development',
        blurb:
          'Spoken assistance inside your own product or portal, with a bounded set of permitted actions and a written rule for when the conversation is handed to your team.',
      },
      {
        path: '/services/ai-video-consultation-agents',
        label: 'AI Video Consultation Agents',
        blurb:
          'A structured video intake for enquiries or onboarding that produces a consistent written summary, reviewed by a person before anything is entered into a system.',
      },
    ],
  },
  projectTypes: {
    eyebrow: 'Where this works well',
    heading: 'German projects that suit a specification-led remote team',
    intro:
      'A remote team is strong wherever the requirement can be written down and demonstrated, and weak wherever it depends on being in the room. These are the briefs on the right side of that line.',
    items: [
      {
        title: 'An internal application that replaces a spreadsheet estate',
        body:
          'A process currently held together by files, macros and one person who understands them. The specification work is most of the value; the application is what makes the specification enforceable.',
      },
      {
        title: 'A decade-old system that now resists every change',
        body:
          'It still runs the business, nobody dares touch it, and each small request takes weeks. We document what it actually does before proposing what replaces it, and rebuild in stages with a way back at each one.',
      },
      {
        title: 'Integration between systems that were never meant to meet',
        body:
          'An ERP, a CRM, a warehouse tool and a portal that each hold part of the truth. The work is the interface layer, the reconciliation rules and the error handling — not the screens on top.',
      },
      {
        title: 'A SaaS product that outgrew its first customer',
        body:
          'Software written for one company that others now want to buy. That means tenancy, isolation, plans, billing, upgrade paths and documentation before it can responsibly be sold.',
      },
      {
        title: 'Document-driven approval processes still running on email',
        body:
          'Orders, invoices, service reports or applications moving as attachments. Automation extracts the fields, routes the document to the right approver and records every step in a form that can be inspected later.',
      },
      {
        title: 'A customer-facing portal on top of an internal system',
        body:
          'Giving customers self-service access to data the company already holds, which is usually an authentication, permission and interface problem rather than a design problem.',
      },
    ],
  },
  collaboration: {
    eyebrow: 'How a project runs',
    heading: 'From first specification workshop to a documented release',
    intro:
      'Five stages. What separates them here is that each one ends in a written artefact you can hold us to, rather than in a status update.',
    steps: [
      {
        title: 'Initial call and feasibility view',
        body:
          'One conversation about the process, the constraints and what a finished version has to do. We say early if we think the brief is really two projects, or if part of it belongs in a package rather than in custom software.',
        points: [
          'Held in the shared part of the day — our afternoon, your morning',
          'A first honest view on effort, sequence and the risky parts',
          'Anything we would not take on said now rather than at proposal stage',
        ],
      },
      {
        title: 'Specification workshops and a written scope',
        body:
          'Sessions with the people who actually operate the process, turned into a specification: functional behaviour, data, interfaces, edge cases, exclusions and the acceptance criteria each milestone will be judged against.',
        points: [
          'Acceptance criteria written and agreed before implementation, not after',
          'Assumptions and explicit exclusions listed in the same document as the scope',
          'Hosting, data-location and processor requirements captured at this stage',
        ],
      },
      {
        title: 'Architecture, agreement and environments',
        body:
          'The technical approach is documented and reviewed with you before implementation begins, together with the contract, the invoicing arrangement and the environments the project will use.',
        points: [
          'Architecture and data model reviewed and approved in writing',
          'Hosting region, backup region and external processors fixed before provisioning',
          'Contract, invoicing arrangement, currency and named contacts settled first',
        ],
      },
      {
        title: 'Implementation in milestones, with evidence',
        body:
          'Each milestone ends in a demonstration against its own acceptance criteria, and a release that carries its test results, known issues and release notes with it.',
        points: [
          'A test environment you can open and use yourself between demonstrations',
          'Test results, known issues and release notes delivered with each milestone',
          'Change requests re-specified, re-estimated and approved in writing before scheduling',
        ],
      },
      {
        title: 'Handover, documentation and continued work',
        body:
          'Documentation, source, credentials and deployment instructions transfer at handover. What happens afterwards is a separate arrangement rather than an assumption.',
        points: [
          'Architecture, interface, deployment and administrator documentation handed over',
          'A defined migration and rollback plan for each production release',
          'Any continued maintenance agreed on its own terms, with no lock-in either way',
        ],
      },
    ],
  },
  communication: {
    eyebrow: 'Working hours',
    heading: 'A German morning and an Indian afternoon, scheduled deliberately',
    intro:
      'The clock difference here is small enough to be useful and large enough to matter. It is worth stating exactly what it is, and exactly what we are not promising.',
    points: [
      'Germany observes Central European Time in winter and Central European Summer Time from spring into autumn, so Indian Standard Time sits four and a half hours ahead of you for part of the year and three and a half hours ahead for the rest.',
      'In both periods our afternoon covers your morning, which is where we agree a recurring meeting window for demonstrations, specification sessions and reviews.',
      'Only the German clock moves: India keeps the same offset all year, so the gap shifts by an hour twice a year and the recurring slot is re-confirmed at each change rather than assumed to hold.',
      'A useful overlap is not continuous cover: we do not staff a desk through the German afternoon and evening, and we do not offer availability outside working hours as part of a build.',
      'Written notes go out after every session and at the end of every cycle, so a decision does not depend on who happened to attend.',
      'An escalation contact and an agreed response path are named at kick-off, for the things that cannot wait for the next scheduled call.',
    ],
    note:
      'If a live system needs attention outside our working hours, that is a support arrangement with its own scope, response expectations and price. We would rather write that down than let a convenient overlap be read as permanent availability.',
  },
  security: {
    eyebrow: 'Data location and security',
    heading: 'Where the data sits, decided before the architecture is drawn',
    intro:
      'On German projects this conversation happens before the technical design rather than after it, because the answer changes the design. These are the points we settle with you.',
    points: [
      'The hosting region and the backup region are chosen with you and written into the agreement before anything is provisioned.',
      'Every external service the system will call is listed during discovery, with what data it receives and where it processes it.',
      'Where personal data must not leave a particular region, the database, the backups, the logs and the monitoring are all built to that constraint, not only the application.',
      'Access is granted per person and per environment, reviewed during the engagement, and removed when someone leaves the project.',
      'Nothing from production is copied onto a developer machine. Test data is generated, or masked inside the hosting environment before anyone works with it.',
      'Confidentiality terms, ownership of everything we produce, and whatever data-processing agreement your advisers require are executed before the first milestone opens.',
    ],
    note:
      'We hold no certification, seal or audit report, and we do not claim that our software makes your processing lawful — that assessment belongs to your own data-protection function and legal advisers. What we do is implement the controls they specify and document them precisely enough that an assessment can actually be made against the implementation.',
  },
  oversight: {
    title: 'Where a person has to sign',
    body:
      'A specification that permits an AI step to act unsupervised inside a business process is a specification with a hole in it. So the boundary is written into the requirement: AI prepares, a person decides, and the decision is recorded.',
    points: [
      'An extracted, classified or generated value is a proposal until a named person accepts it, and the acceptance is logged.',
      'Assistants answer from your own documents with the source shown, so an answer can be verified rather than believed.',
      'Where the available material does not support an answer, the system says so instead of producing a confident one.',
      'Every automated step writes an audit record: input, output, model configuration, timestamp and the person who approved it.',
      'The actions an AI component may never take without human approval are listed in the specification and re-reviewed before each production release.',
    ],
  },
  localization: {
    title: 'Language: English delivery, German localization as scoped work',
    body:
      'This page, the specification, the documentation and the day-to-day correspondence are in English. That is a statement of fact rather than a limitation we are hiding: we do not present ourselves as a German-speaking team, because nobody here is qualified to be described that way. What we can do is engineer an interface that carries German properly, and integrate content that a qualified professional has written or reviewed.',
    points: [
      'Interface engineering for German is ordinary work: text expansion in labels and buttons, formal and informal address handled consistently, date, decimal and currency formatting, sorting with umlauts, and compound words that break layouts designed for English.',
      'The German wording itself is a separate line in the scope, done by a professional translator or by your own team, and reviewed by someone accountable for the register the text is written in.',
      'Machine translation is used, if at all, as a working draft inside the team. No automatically translated string reaches a customer-facing screen, a contract, a notification or a document without a qualified human review.',
      'Where the interface must exist in both languages, that is designed in from the start — the strings are externalised and the layout is tested in both — because retrofitting a second language is materially more expensive than planning for one.',
      'Legal, contractual and regulatory text is never translated by us. It comes from you or from your advisers, and we place it as given.',
    ],
    note:
      'If your project needs German-language support conversations, German-language sales material or a German-language contract, say so in the first call. Those are real requirements with real costs, and they belong in the scope rather than in an assumption.',
  },
  engagement: {
    eyebrow: 'Commercial arrangements',
    heading: 'How German engagements are usually set up',
    intro:
      'Three arrangements cover almost all of this work. Which one fits depends on how well the requirement can be pinned down before the work starts.',
    options: [
      {
        name: 'Specified project, fixed milestones',
        body:
          'A written specification delivered in milestones, each with its own acceptance criteria, its own demonstration and its own payment. Changes are re-specified and re-priced rather than absorbed.',
        bestFor: 'Suits a requirement that can be described in full before implementation.',
      },
      {
        name: 'Dedicated team by the month',
        body:
          'An agreed team working a prioritised backlog, with the same milestone reviews and written records but a scope that is allowed to develop between cycles.',
        bestFor: 'Suits a product that will keep changing after the first release.',
      },
      {
        name: 'Assessment and documentation study',
        body:
          'A short bounded piece of work on its own: document what an existing system does, where it breaks, and what replacing or extending it would actually involve — delivered as a report you own outright.',
        bestFor: 'Suits an older system nobody can currently describe with confidence.',
      },
    ],
  },
  faqs: [
    {
      question: 'Do you have an office, a subsidiary or a registered company in Germany?',
      answer:
        'No. SCS Softwares operates from Indore, India, and work for German clients is delivered remotely from there. We hold no German commercial registration, no branch, no address and no German telephone number, and nothing on this page should be read as a presence in Germany.',
    },
    {
      question: 'Is anyone on the team a German speaker?',
      answer:
        'We do not claim one, because we would not be able to evidence it. The engagement, the documentation and the specification are in English. German-language interface text and content are handled as separately scoped professional localization, written or reviewed by someone qualified to be accountable for it.',
    },
    {
      question: 'How does the time difference work day to day?',
      answer:
        'Germany is on Central European Time in winter and Central European Summer Time in the warmer months, which puts Indian Standard Time four and a half hours ahead of you for part of the year and three and a half hours ahead for the rest. Our afternoon covers your morning in both periods, and we fix a recurring meeting window inside it. We do not offer cover outside working hours unless it is scoped as support.',
    },
    {
      question: 'Can you confirm that the system will be GDPR compliant?',
      answer:
        'No, and any supplier who does is overstating what a supplier can know. Lawfulness depends on your purposes, your legal basis and your own assessment, none of which sit with us. What we can do is host in a region you choose, list every external processor before we build, implement the controls your data-protection function specifies, and document the implementation well enough for your own assessment to be made against it.',
    },
    {
      question: 'Do you hold a TÜV, ISO or comparable certification we can review?',
      answer:
        'We hold none, and we do not offer a substitute audit report or seal. If your procurement process requires a certified or audited supplier, that is worth establishing in the first conversation rather than after a proposal — it may simply rule us out, and finding that out early costs both sides less.',
    },
    {
      question: 'Do you work with clients in Austria and Switzerland as well?',
      answer:
        'Only where it is scoped as such. This page covers Germany. Extending a system to another market brings its own tax treatment, invoicing rules, language requirements and testing, so each additional market is named in the scope with its own effort rather than being implied by a regional label.',
    },
    {
      question: 'What exactly do we receive at handover?',
      answer:
        'The source code and its history, architecture and data-model documentation, interface descriptions, environment and deployment instructions, administrator documentation, the test results and release notes for the delivered version, and every credential and account. Ownership of what we build for you transfers to you; it is written into the agreement before the first milestone.',
    },
    {
      question: 'Can you provide references from other German clients?',
      answer:
        'We make no claim to German clients and will not invent one to win work. What we can offer instead is a specification workshop on your own requirement, or a short paid assessment whose output you keep whether or not the larger project goes ahead. That tells you more about how we work than a reference would.',
    },
  ],
  otherMarkets: [
    {
      path: '/locations/united-states',
      label: 'United States',
      blurb:
        'Remote engineering across a far wider clock gap, where ownership, change control and the written trail carry the weight a meeting cannot.',
    },
    {
      path: '/locations/united-kingdom',
      label: 'United Kingdom',
      blurb:
        'Supplier due diligence, staged approvals and a maintenance arrangement settled before launch, for organisations with a formal buying process.',
    },
    {
      path: '/locations/united-arab-emirates',
      label: 'United Arab Emirates',
      blurb:
        'Consumer-facing mobile products and booking platforms for a single market, with Arabic interface engineering scoped on its own.',
    },
    {
      path: '/locations/canada',
      label: 'Canada',
      blurb:
        'Internal business platforms across six clock offsets, where the reachable hours are written into the engagement rather than assumed.',
    },
    {
      path: '/locations/australia',
      label: 'Australia',
      blurb:
        'Product delivery built around handover notes and open test environments, because the two working days barely meet.',
    },
    {
      path: '/locations/singapore',
      label: 'Singapore',
      blurb:
        'Regional operations platforms spanning several entities and currencies, with decisions recorded for stakeholders in other countries.',
    },
    {
      path: '/locations/netherlands',
      label: 'Netherlands',
      blurb:
        'The same working hours as here, but organised around integration work and short written decisions rather than a full specification up front.',
    },
    {
      path: '/locations/turkey',
      label: 'Turkey',
      blurb:
        'Marketplaces, booking products and AI voice agents, with payment and messaging integrations scoped individually per provider.',
    },
  ],
  cta: {
    title: 'Send us the requirement, not just the idea',
    body:
      'Answer a few questions for an indicative estimate, talk the specification through with our AI consultation agent, or send the brief directly to the team in Indore and we will tell you what we think it really involves.',
  },
};
