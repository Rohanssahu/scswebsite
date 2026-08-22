import type { ServiceContent } from './types';

/**
 * The AI pillar page. Everything it claims is backed by something in this
 * repository — the voice agent worker, the consultation meeting, the
 * requirement-analysis and estimation tooling — described at the level of
 * capability rather than implementation. No provider names, no prompts, no
 * internal architecture detail that would help someone attack the system.
 */
export const aiDevelopment: ServiceContent = {
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
  icon: 'ai',
  h1: 'AI Development',
  valueProp:
    'AI features designed around a job someone actually has to do — built into your product, grounded in your own content, and kept under human review where the answer matters.',
  heroHighlights: [
    'AI assistants, generative integrations and retrieval over your content',
    'Human review and fallback designed in, not added after a bad answer',
    'Built and run by our own team in Indore, India',
  ],
  intro: [
    'The useful question about AI is never "can a model do this?" — it usually can, badly, on the first try. The question is what happens on the day it is wrong: who notices, what the user sees, and whether anything irreversible has already been done. That is a software design problem, and it is where most of the work sits.',
    'We build AI features into products the same way we build everything else: a defined scope, a data path we can explain, a way to measure whether the feature is helping, and a human in the loop wherever the output has consequences. This site runs several of them — a voice agent, a consultation agent and a requirement-analysis tool — so the patterns described here are ones we operate ourselves rather than ones we have only read about.',
  ],
  problems: {
    eyebrow: 'Where AI projects start',
    heading: 'The problem behind most AI briefs',
    intro:
      'Almost every enquiry we get is one of these. None of them is really a request for a chatbot.',
    items: [
      {
        title: 'A demo worked and nothing shipped',
        body: 'A prototype impressed everyone in a meeting, then stalled on the unglamorous half: authentication, permissions, error states, cost, and what to do when the model returns nonsense.',
      },
      {
        title: 'The answers are confident and wrong',
        body: 'A general model knows the internet and nothing about your business. Without grounding in your own content and a way to say "I do not know", plausible fabrication is the default failure mode.',
      },
      {
        title: 'Staff spend hours on work a machine could draft',
        body: 'Reading documents, extracting fields, summarising threads, drafting the same reply for the hundredth time. This is where AI usually pays for itself first, because a human still approves the result.',
      },
      {
        title: 'Nobody can predict what it will cost to run',
        body: 'Usage-based pricing turns an uncapped feature into an uncapped bill. Budgets, caps and caching are design decisions, not something to discover from an invoice.',
      },
      {
        title: 'Legal and security have not been asked yet',
        body: 'What data leaves your systems, where it is processed, what is retained and who can see it are questions best answered before launch rather than during a review that stops one.',
      },
    ],
  },
  useCases: {
    eyebrow: 'What it is used for',
    heading: 'Where AI earns its place in a product',
    intro:
      'The cases below are the ones we see succeed. Each has a clear owner for the output and a sensible answer to "what if it is wrong?".',
    items: [
      {
        title: 'An assistant inside the product',
        body: 'Users ask in their own words instead of learning your navigation. The assistant answers from your documentation and data, and can take safe, permitted actions on request.',
      },
      {
        title: 'Requirement and enquiry analysis',
        body: 'Turning an unstructured brief into structured fields — scope, roles, integrations, complexity — that a team or a pricing engine can act on. The analysis tool on this site does exactly this.',
      },
      {
        title: 'Document and content processing',
        body: 'Reading invoices, contracts, forms and reports; extracting the fields that matter into your systems; flagging what a person needs to check.',
      },
      {
        title: 'Drafting and summarising',
        body: 'Meeting summaries, support replies, product descriptions, internal reports — generated as a draft, reviewed by the person who signs their name to it.',
      },
      {
        title: 'Search that understands the question',
        body: 'Retrieval over your own knowledge base so staff and customers get an answer with its source attached, instead of ten links to read.',
      },
      {
        title: 'Classification and routing',
        body: 'Sorting incoming work — tickets, applications, submissions — into the right queue with the right priority, with a confidence threshold that sends the uncertain ones to a human.',
      },
    ],
  },
  capabilities: {
    eyebrow: 'What we build',
    heading: 'AI capabilities we deliver',
    intro:
      'These are the building blocks we work with directly. Which model provider a project uses is a decision we make with you, based on your data, hosting and budget constraints.',
    groups: [
      {
        title: 'AI product discovery',
        body: 'A short, deliberate stage that decides whether AI is the right tool before anyone writes a prompt.',
        items: [
          'The task, the current cost of doing it manually, and what "good" looks like',
          'Data available today, and what would have to be collected',
          'Feasibility assessment with the honest answer where it is "not yet"',
          'A definition of failure and who is responsible for catching it',
          'A first slice small enough to prove or disprove the idea quickly',
        ],
      },
      {
        title: 'AI-enabled web and mobile applications',
        body: 'AI as a feature inside a product, not a separate tool people have to remember to open.',
        items: [
          'Assistants embedded in web applications and dashboards',
          'In-app AI features for iOS and Android products',
          'Streaming responses and responsive interaction states',
          'Role and permission awareness, so the assistant respects who is asking',
          'Graceful behaviour when the provider is slow or unavailable',
        ],
      },
      {
        title: 'Generative AI integrations',
        body: 'Text and content generation wired into a real workflow, with the output treated as a draft.',
        items: [
          'Drafting, rewriting and summarising inside your existing screens',
          'Structured generation constrained to a schema your code can trust',
          'Review-and-approve steps before anything is sent or published',
          'Template and tone controls so output matches your brand',
          'Provider abstraction, so a model can be swapped without a rewrite',
        ],
      },
      {
        title: 'Structured AI workflows',
        body: 'The pattern we rely on most: the model interprets, deterministic code decides.',
        items: [
          'Strict, validated schemas for anything the model writes into your system',
          'Tool definitions narrow enough that a model cannot reach past them',
          'Calculations and business rules executed in code, never by the model',
          'Multi-step flows with explicit state rather than an open-ended conversation',
          'Deterministic routing for the decisions that must be repeatable',
        ],
      },
      {
        title: 'Retrieval and business-knowledge integration',
        body: 'Grounding answers in your material so the system can cite where something came from.',
        items: [
          'Ingestion of documents, policies, catalogues and help content',
          'Chunking, indexing and semantic search over your own corpus',
          'Answers returned with their source, so a reader can verify',
          'Permission-aware retrieval, so results respect existing access rules',
          'Refusal behaviour when the corpus does not contain the answer',
        ],
      },
      {
        title: 'Monitoring, security and cost control',
        body: 'The operational layer that decides whether an AI feature survives its first month.',
        items: [
          'Usage, latency and spend visible per feature and per user',
          'Rate limits, budget caps and session limits enforced server-side',
          'Caching of repeated work to keep cost proportionate to value',
          'Logging of prompts and outcomes for audit, under your retention policy',
          'Detection and audit of attempts to manipulate the system through user input',
        ],
      },
    ],
  },
  approach: {
    eyebrow: 'How we work',
    heading: 'Our approach to building AI features',
    intro:
      'AI work rewards a different discipline from ordinary feature work: the system is probabilistic, so the engineering has to make the consequences deterministic.',
    points: [
      'The model interprets language; deterministic code performs every calculation, decision and write. Arithmetic never comes from a model.',
      'Anything the model puts into your systems passes through a strict schema first, so malformed or unexpected output is rejected rather than stored.',
      'Every AI surface is grounded in a defined body of content, and is expected to say it does not know rather than fill the gap.',
      'The system prompt, tool definitions and permitted actions are version-controlled and reviewed like any other code.',
      'Cost and rate limits are enforced on the server, where a client cannot raise them.',
      'Evaluation is part of the build: a fixed set of real examples the feature is re-tested against before every release.',
    ],
  },
  process: {
    eyebrow: 'Discovery through operation',
    heading: 'How an AI project runs',
    intro:
      'Five stages. The first one exists to stop projects that should not proceed, and we would rather tell you that in week one.',
    steps: [
      {
        title: 'Discovery and requirement analysis',
        body: 'We start with the task, not the technology: what a person does today, how long it takes, and what an acceptable answer looks like.',
        points: [
          'The workflow being targeted and its current manual cost',
          'Data and content available, with a frank view of its quality',
          'Feasibility assessment, including where the answer is "this is not ready"',
          'Success measures and the acceptable error rate agreed in writing',
          'A first slice scoped small enough to prove the idea',
        ],
      },
      {
        title: 'Architecture, data design and UI/UX',
        body: 'How the feature is shaped matters as much as the model behind it — especially how uncertainty is shown to the user.',
        points: [
          'Data flow: what leaves your systems, where it is processed, what is retained',
          'Retrieval design, indexing and permission rules',
          'Tool and schema definitions for anything the model may write',
          'Interface design for streaming, waiting, sources, and "I do not know"',
          'Review and approval steps placed where consequences are irreversible',
        ],
      },
      {
        title: 'Development and integrations',
        body: 'Built as ordinary software with an AI component, connected to the systems that hold your data.',
        points: [
          'Prompt, tool and state implementation behind a provider abstraction',
          'Retrieval pipeline and content ingestion',
          'Integration with your APIs, databases and internal tools',
          'Server-side limits, caching and fallback behaviour',
          'Audit logging of inputs, outputs and actions taken',
        ],
      },
      {
        title: 'Evaluation and quality assurance',
        body: 'A feature that cannot be measured cannot be improved. Evaluation runs against fixed examples, not vibes.',
        points: [
          'A test set of real cases with expected outcomes',
          'Regression runs before each release, so a prompt change cannot silently degrade quality',
          'Adversarial testing, including attempts to make the system ignore its instructions',
          'Latency, cost-per-interaction and failure-rate measurement',
          'Human review of a sample of live output during the first weeks',
        ],
      },
      {
        title: 'Deployment, monitoring and iteration',
        body: 'AI features drift as providers update models and users find new phrasings. They need looking after.',
        points: [
          'Phased rollout, often to internal users first',
          'Dashboards for usage, spend, latency and flagged interactions',
          'Alerting on error rates, cost spikes and provider outages',
          'A documented fallback when the provider is unavailable',
          'Scheduled review of the evaluation set as real usage arrives',
        ],
      },
    ],
  },
  integration: {
    eyebrow: 'Integration',
    heading: 'How AI connects to what you already run',
    intro:
      'An AI feature is only as useful as the systems it can read from and write to. That connection is normal integration work, and we scope it as such.',
    points: [
      'Read access to the systems that hold your content — document stores, databases, help centres, product catalogues.',
      'Write access limited to specific, validated actions rather than general database permissions.',
      'Integration with your existing authentication, so the assistant sees exactly what the signed-in user is allowed to see.',
      'Webhooks and background jobs for work that should not happen inside a user-facing request.',
      'A provider abstraction layer, so changing model vendor is a configuration change rather than a rebuild.',
      'Deployment into your cloud accounts, with credentials held in your secret store.',
    ],
  },
  limitations: {
    eyebrow: 'Honest limits',
    heading: 'What model-generated output can and cannot be trusted to do',
    intro:
      'This section is here because AI is sold badly more often than it is built badly. These constraints apply to every provider, including the ones we use.',
    points: [
      'Language models produce probable text, not verified fact. A fluent answer is not evidence of a correct one.',
      'Grounding in your content reduces fabrication substantially but does not eliminate it.',
      'The same question can produce different answers on different runs; workflows that must be repeatable are implemented in code, not in the model.',
      'Models have a knowledge cutoff and no awareness of your systems unless we explicitly connect them.',
      'Output quality depends on the quality and coverage of the content behind it — thin documentation produces thin answers.',
      'Providers change models, deprecate versions and have outages, which is why we abstract them and keep a fallback.',
      'We do not promise a specific accuracy figure before building and measuring against your own data.',
    ],
    oversight: {
      title: 'Human oversight we design in',
      points: [
        'Review-and-approve before anything is sent externally, published or charged for',
        'Confidence thresholds that route uncertain cases to a person rather than guessing',
        'A visible path to a human, offered by the system rather than hidden behind it',
        'Sources shown alongside answers so a reader can check the claim',
        'Audit trails of what was generated, what was approved, and by whom',
      ],
    },
    note:
      'We will tell you when a use case is not a good fit for current models — for example anything that must be factually exact with no human check, or a legally binding decision. Turning that down early is cheaper for you than discovering it after launch.',
  },
  engagement: {
    eyebrow: 'Working together',
    heading: 'Engagement options for AI work',
    intro:
      'AI projects benefit from starting small, because the first honest answer about feasibility usually arrives once real data is involved.',
    options: [
      {
        name: 'Discovery and feasibility',
        body: 'A short fixed-scope engagement that assesses the use case and your data, and delivers a written recommendation — including a recommendation not to proceed, where that is the right answer.',
        bestFor: 'Best as a first step when the value is still unproven.',
      },
      {
        name: 'Build and integrate',
        body: 'A defined AI feature designed, built, evaluated and integrated into your product, with monitoring and cost controls in place at launch.',
        bestFor: 'Best once the use case and data are understood.',
      },
      {
        name: 'Ongoing AI operations',
        body: 'Monthly capacity for evaluation runs, prompt and retrieval improvements, provider migrations, cost tuning and incident response.',
        bestFor: 'Best for AI features already carrying real usage.',
      },
    ],
  },
  security: {
    eyebrow: 'Security and privacy',
    heading: 'How we handle data in AI systems',
    intro:
      'AI adds one question to ordinary application security: what leaves your systems, and where does it go? These are the practices we apply — descriptions, not warranties.',
    points: [
      'A documented data path: what is sent to a model provider, what is retained, and for how long',
      'Personal data minimised or redacted before it reaches a provider wherever the use case allows',
      'Provider credentials held server-side in a secret store, never shipped to a browser or mobile app',
      'Retrieval that respects your existing permissions, so an assistant cannot surface a document the user could not open',
      'User input treated as untrusted: narrow tool schemas, whitelisted actions, and no direct database or shell reach for the model',
      'Detection and audit logging of likely prompt-injection attempts',
      'Session, rate and budget limits enforced server-side',
      'Retention and deletion of logs and transcripts configured to your policy',
    ],
    note:
      'We hold no security or AI-specific certification, and no system can be warranted secure. Where your project involves regulated data or a specific standard you are working towards, raise it during discovery so the requirements — and any independent assessment — can be planned rather than retrofitted.',
  },
  faqs: [
    {
      question: 'Do we need our own model, or can we use an existing one?',
      answer:
        'Almost always an existing commercial or open model, accessed through a provider. Training a model from scratch is rarely justified for business use cases and needs data volumes most companies do not have. The work that makes the difference is grounding, tooling, evaluation and the surrounding product design.',
    },
    {
      question: 'How do you stop the AI from making things up?',
      answer:
        'Three layers. The system answers from a defined body of your content rather than general knowledge; anything it writes into your systems passes a strict schema; and it is built to say it does not know instead of filling a gap. Sources are shown with answers where that helps a reader verify. This reduces fabrication substantially — it does not eliminate it, which is why human review sits on anything with consequences.',
    },
    {
      question: 'What data leaves our systems?',
      answer:
        'Exactly what we agree in discovery, and it is documented before the build starts. We minimise or redact personal data where the use case allows, keep provider credentials server-side, and can deploy into your own cloud accounts so logs and stored content stay under your control.',
    },
    {
      question: 'How much does it cost to run?',
      answer:
        'Usage-based, and it depends on volume, response length and how much retrieved context each request carries. We design caching, caps and session limits into the build, and expose spend per feature so cost stays visible rather than arriving as a surprise. We will estimate a range during discovery once the interaction pattern is known.',
    },
    {
      question: 'Can you add AI to a product we already have?',
      answer:
        'Yes, and that is most of this work. We integrate with existing APIs, databases and authentication rather than replacing them. If the surrounding application needs work first, that is covered on our software modernization page.',
    },
    {
      question: 'What if AI turns out not to be the right answer?',
      answer:
        'Then we say so. The discovery engagement exists partly to produce that conclusion cheaply. Plenty of problems presented to us as AI problems are solved better by a rule, a report or a fixed workflow, and we would rather build you that.',
    },
  ],
  related: [
    {
      path: '/services/machine-learning-development',
      label: 'Machine Learning Development',
      blurb: 'Prediction, classification, recommendation and anomaly detection trained on your own data.',
    },
    {
      path: '/services/ai-voice-agent-development',
      label: 'AI Voice Agent Development',
      blurb: 'Real-time spoken conversation in your product, with turn-taking, tools and human escalation.',
    },
    {
      path: '/services/ai-video-consultation-agents',
      label: 'AI Video Consultation Agents',
      blurb: 'An avatar-led consultation room with live transcript, chat and a structured meeting summary.',
    },
    {
      path: '/services/conversational-ai-development',
      label: 'Conversational AI Development',
      blurb: 'Assistants across chat and voice channels, grounded in your knowledge with a handoff to people.',
    },
    {
      path: '/services/ai-automation-integration',
      label: 'AI Automation & Integration',
      blurb: 'Connecting AI to the systems you already run, with approvals, audit trails and failure handling.',
    },
    {
      path: '/services/custom-software-development',
      label: 'Custom Software Development',
      blurb: 'The wider practice an AI feature usually lives inside: product builds, integrations and internal tools.',
    },
  ],
  cta: {
    title: 'Have an AI idea worth testing properly?',
    body: 'Start with an indicative estimate, talk it through with our AI consultation agent, or send the details to the team in Indore. We will tell you if it is not ready.',
  },
};
