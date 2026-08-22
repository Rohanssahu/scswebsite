import type { ServiceBody } from './types';

export const cloudSolutions: ServiceBody = {
  path: '/services/cloud-solutions',
  icon: 'cloud',
  h1: 'Cloud Architecture, Hosting and Migration',
  valueProp:
    'A place for your application to run that is documented, reproducible and priced honestly — assessed before anything moves, then migrated in stages you can stop.',
  heroHighlights: [
    'Readiness assessment before any migration is proposed',
    'Environments defined in code rather than configured by hand',
    'Cost estimated per environment before you commit',
  ],
  intro: [
    'Cloud work is where a project quietly acquires its long-term running costs. A server chosen in a hurry, a database sized by guesswork, an environment that exists only in one person memory — each of them looks harmless at launch and becomes the reason nobody wants to touch the platform two years later.',
    'We treat the platform as part of the product: what the application actually needs, how its environments are created, where its data lives, how it is backed up, what it costs each month, and what happens when traffic doubles. Work starts with an assessment of what you have now, and migration happens in steps small enough to pause. The team works remotely from Indore, India.',
  ],
  problems: {
    eyebrow: 'Why teams come to us',
    heading: 'What usually goes wrong with cloud setups',
    intro:
      'Almost never one dramatic outage. Usually a set of small omissions that only show up under pressure.',
    items: [
      {
        title: 'Nobody can recreate the environment',
        body: 'The server was configured by hand, by someone who has moved on. Rebuilding it after a failure would be archaeology, and nobody wants to test that theory.',
      },
      {
        title: 'The monthly bill keeps climbing with no explanation',
        body: 'Oversized instances, forgotten test environments, storage nothing reads and traffic charges nobody attributed. Without tags and a breakdown, cost is a mystery rather than a decision.',
      },
      {
        title: 'Staging and production are not the same shape',
        body: 'Different versions, different configuration, different data. Testing passes in one and fails in the other, and the release becomes an act of faith.',
      },
      {
        title: 'Backups exist but have never been restored',
        body: 'An untested backup is a belief, not a recovery plan. The first restore attempt should not happen during an incident.',
      },
      {
        title: 'Nobody knows the system is unwell until a customer says so',
        body: 'No dashboards, no alerts, no log aggregation. Diagnosis starts with logging into a server and scrolling, which is the slowest possible start.',
      },
      {
        title: 'Secrets and credentials live in the wrong place',
        body: 'Connection strings in the repository, keys pasted into chat, one shared administrator login. Rotation is impossible because nobody knows what would break.',
      },
    ],
  },
  capabilities: {
    eyebrow: 'What the service covers',
    heading: 'Cloud work this service includes',
    intro:
      'Which of these apply comes out of the assessment. A small application does not need everything here, and we will say so.',
    groups: [
      {
        title: 'Cloud-readiness assessment',
        body: 'The usual first engagement, delivered as a written report you can act on with or without us.',
        items: [
          'Inventory of the current application, servers, data stores and integrations',
          'Dependencies that constrain a move: licensing, on-premises systems, data location rules',
          'How the application handles state, sessions, uploads and scheduled work',
          'Risk register with severity, effort and the order changes should happen in',
          'Options with trade-offs, including staying where you are',
        ],
      },
      {
        title: 'Deployment architecture',
        body: 'A design for how the application actually runs, sized for your traffic rather than a diagram from a conference talk.',
        items: [
          'Container or managed-runtime choice, with the reasoning written down',
          'Network layout, load balancing and certificate handling',
          'Separation of the web tier, background workers and scheduled jobs',
          'Static assets and content delivery',
          'A simple architecture diagram your own team can follow',
        ],
      },
      {
        title: 'Environments and configuration',
        body: 'Development, staging and production created the same way, so a release behaves the same way.',
        items: [
          'Infrastructure defined as code, versioned alongside the application',
          'Environment parity, with the differences documented where they are unavoidable',
          'Configuration and secrets held in a managed secret store, not in the repository',
          'Separate credentials and access per environment',
          'Repeatable provisioning, so a new environment is a command rather than a project',
        ],
      },
      {
        title: 'Managed services, storage and databases',
        body: 'Using the provider managed options where they remove work, and saying when they do not.',
        items: [
          'Managed relational and cache services sized to measured load',
          'Object storage for uploads, exports and generated files, with lifecycle rules',
          'Queues and scheduled execution for work that should not block a request',
          'Migration of existing databases, with reconciliation rather than assumption',
          'Retention rules agreed for logs, backups and generated artefacts',
        ],
      },
      {
        title: 'Backup, recovery and observability',
        body: 'The parts that only matter on a bad day, which is exactly why they are set up on a good one.',
        items: [
          'Automated backups with a defined retention period, and a documented restore procedure',
          'A restore actually performed into a scratch environment to prove it works',
          'Recovery objectives written down and agreed, so expectations are explicit',
          'Metrics, log aggregation and dashboards for the signals that matter',
          'Alerts routed to a person, with thresholds tuned to reduce noise',
        ],
      },
      {
        title: 'Cost review, scaling and modernization support',
        body: 'Keeping the platform affordable as it grows, and moving older systems towards it in stages.',
        items: [
          'Cost estimate per environment before anything is provisioned',
          'Resource tagging and a monthly breakdown you can read',
          'Right-sizing, cleanup of idle resources and review of storage tiers',
          'Scaling rules based on measured load, with limits set deliberately',
          'Load testing to find the actual ceiling before customers do',
          'Containerisation and staged migration of existing applications',
        ],
      },
    ],
  },
  approach: {
    eyebrow: 'How we work',
    heading: 'How we approach platform work',
    intro:
      'The application has to keep serving people while the ground under it changes. Every point here exists to protect that.',
    points: [
      'Assessment before migration. We do not propose a move before we understand what depends on the current setup.',
      'One provider by default. Spreading a small workload across several adds cost and complexity long before it adds resilience.',
      'Managed services where they remove operational work, self-managed only where there is a clear reason.',
      'Nothing configured by hand that a script could create, so the environment can be rebuilt rather than remembered.',
      'Sized from measurement, not from optimism: current traffic and data volumes first, headroom after that.',
      'Migration in stages, each one releasable and reversible, with the old path available until the new one has proven itself.',
      'Cost presented before provisioning, and reviewed again once real usage exists.',
      'Documentation and access handed over as the work proceeds, so you are never locked in to us.',
    ],
  },
  process: {
    eyebrow: 'Assessment through handover',
    heading: 'How a cloud engagement runs',
    intro:
      'The assessment is deliberately separable — you can commission it alone and take the report elsewhere.',
    steps: [
      {
        title: 'Assessment and requirements',
        body: 'We find out what runs today, what depends on it, and what the platform actually has to do.',
        points: [
          'Inventory of servers, services, data stores and integrations',
          'Current traffic, data volume and growth expectations',
          'Constraints: licensing, data location rules, on-premises dependencies, compliance obligations',
          'Baseline of current cost and current performance',
          'Written report with options, risks and indicative effort',
        ],
      },
      {
        title: 'Architecture and cost planning',
        body: 'A target design, sized from the measurements, with a monthly cost estimate attached before anything is built.',
        points: [
          'Deployment architecture and provider services chosen, with reasons recorded',
          'Environment plan for development, staging and production',
          'Data design: database sizing, storage classes and retention',
          'Backup, recovery objectives and monitoring plan',
          'Cost estimate per environment, agreed before provisioning',
        ],
      },
      {
        title: 'Build and configuration',
        body: 'The platform is created from code so that what exists matches what was designed, and can be recreated.',
        points: [
          'Infrastructure as code for networking, compute, data stores and permissions',
          'Secrets moved into a managed store and rotated',
          'Deployment path built, with database migrations included',
          'Monitoring, dashboards, log aggregation and alerting configured',
          'Access control by role, with least privilege as the starting point',
        ],
      },
      {
        title: 'Migration and verification',
        body: 'Workloads move in stages, and each stage is proven before the next one starts.',
        points: [
          'Data migration with row and checksum reconciliation, not visual inspection',
          'A rehearsal migration into a scratch environment first',
          'Parallel running or read-only cutover where the risk justifies it',
          'A restore from backup performed and documented',
          'Load testing against the new platform, compared with the baseline',
        ],
      },
      {
        title: 'Operation, review and handover',
        body: 'Once traffic is real, the platform is tuned against evidence and the keys are handed to you.',
        points: [
          'Cost reviewed against the estimate once actual usage exists',
          'Right-sizing and cleanup based on the first weeks of metrics',
          'Alert thresholds tuned to cut false alarms',
          'Runbooks for deployment, restore, scaling and common failures',
          'Accounts, credentials, code and documentation transferred to you',
        ],
      },
    ],
  },
  engagement: {
    eyebrow: 'Working together',
    heading: 'Engagement options for cloud work',
    intro:
      'Most clients start with the assessment, because the honest scope of the rest depends on it.',
    options: [
      {
        name: 'Assessment and architecture',
        body: 'A fixed-scope review of the current setup and a target architecture with a cost estimate, delivered as a written report and diagram.',
        bestFor: 'Best as a first step, and it stands alone.',
      },
      {
        name: 'Migration project',
        body: 'A defined project to build the platform and move workloads onto it in stages, ending in handover of accounts, code and runbooks.',
        bestFor: 'Best when there is a system to move.',
      },
      {
        name: 'Ongoing platform support',
        body: 'Monthly capacity for patching, monitoring adjustments, cost review, scaling changes and help when something breaks.',
        bestFor: 'Best when you have no platform engineer in house.',
      },
    ],
  },
  limitations: {
    eyebrow: 'Scope boundaries',
    heading: 'What we do not claim about the cloud',
    intro:
      'Cloud marketing is full of absolutes. These are the ones we will not repeat.',
    points: [
      'We do not guarantee zero downtime. We plan to minimise it, we agree maintenance windows in advance, and we tell you which cutovers genuinely need one.',
      'We do not promise limitless capacity. Applications hit ceilings in their database, their integrations and their own code long before a provider runs out of machines. We find your ceiling by testing for it.',
      'We hold no cloud provider partner status and claim no provider certification. What we bring is delivery experience, not a badge.',
      'Provider outages are outside anyone control. We can design for a failure of one component or one zone; we cannot make an application immune to a regional provider failure without a cost you should decide on knowingly.',
      'Moving to the cloud does not automatically reduce cost. Sometimes it does, sometimes it moves capital cost into monthly cost. We estimate both instead of assuming a saving.',
      'Not everything should move. Licensing terms, data location obligations, latency to on-premises equipment and applications built around a single machine can all make staying put the better answer.',
      'We do not resell hosting. Cloud accounts are opened in your name and billed to you, so you keep ownership and see the real bill.',
    ],
    oversight: {
      title: 'What keeps the platform reviewable',
      points: [
        'Infrastructure defined in code and versioned, so every change is visible in history',
        'Cost estimated before provisioning and reviewed against the real bill afterwards',
        'Recovery objectives written down and tested rather than assumed',
        'Alerts that reach a named person, not a dashboard nobody opens',
        'Runbooks for the operations you will need to perform without us',
        'Accounts and credentials owned by you throughout the engagement',
      ],
    },
    note:
      'Our aim is a platform your own team could take over. That means writing down the decisions, testing the recovery path and handing over the access, even where it would be commercially convenient for us to remain the only people who understand it.',
  },
  security: {
    eyebrow: 'Security',
    heading: 'Security of the platform we build',
    intro:
      'Cloud security is mostly configuration discipline. These are the defaults we apply and the things we check.',
    points: [
      'Least-privilege access by role, with separate credentials per environment',
      'Secrets in a managed secret store, never in the repository, and rotated on handover',
      'Private networking for databases and internal services, with public exposure limited to what must be reachable',
      'Encryption in transit, and encryption at rest where the provider service supports it',
      'Patching and version currency for images, runtimes and managed service versions',
      'Audit logging enabled for administrative actions, with retention agreed',
      'Backups encrypted, retained for an agreed period and tested by restoring',
      'Administrative access reviewed at the end of the engagement and removed where it is no longer needed',
    ],
    note:
      'This is engineering practice and configuration review, not a penetration test, an audit or a compliance certification. We do not describe any platform as unbreachable, and we do not certify a system against a compliance framework. Where a specific standard applies to your industry, we can build towards its technical requirements and tell you plainly which parts need an external auditor rather than us.',
  },
  faqs: [
    {
      question: 'Which cloud provider do you work with?',
      answer:
        'We work with the major providers — Amazon Web Services, Microsoft Azure and Google Cloud — and the choice is usually decided by what you already use, what your team can support and what the application needs. We hold no partner status with any of them, which means we have no commercial reason to push one. If your existing hosting is adequate, we will say that too.',
    },
    {
      question: 'Can you move our application without taking it offline?',
      answer:
        'Often the visible interruption can be reduced to minutes, by migrating in stages, running old and new paths in parallel and switching traffic once the new one is proven. Some cutovers, particularly a database with heavy write traffic, still need a planned window. We tell you which category yours falls into during the assessment rather than after.',
    },
    {
      question: 'Will our hosting bill go down?',
      answer:
        'Sometimes. Where servers are oversized, environments are idle or storage has been accumulating for years, there is usually real saving available. Where an application is already lean, the honest answer is that cost may be similar and the gain is reproducibility, backups and visibility instead. We estimate the monthly cost before provisioning so this is a decision rather than a surprise.',
    },
    {
      question: 'Who owns the cloud account?',
      answer:
        'You do. Accounts are opened in your name, billed to you, and we work inside them with access you grant and can revoke. We do not resell hosting or place ourselves between you and the provider, and at the end of an engagement the credentials, the infrastructure code and the runbooks are yours.',
    },
    {
      question: 'What happens if the application suddenly gets much more traffic?',
      answer:
        'Scaling rules can add capacity automatically within limits you set, and caching plus queueing absorb a good deal of load. But scaling is only as good as the slowest component, which is usually the database or a third-party integration. That is why we load test to find the real ceiling and tell you where it is, instead of describing the platform as endlessly scalable.',
    },
    {
      question: 'Do you offer round-the-clock monitoring and response?',
      answer:
        'We set up monitoring, dashboards and alerting, and we provide support during agreed hours arranged to overlap your working day. A continuous on-call rotation is not something we currently offer, and we would rather tell you that than accept a response commitment we cannot keep. Alerts and runbooks are configured so your own team can act outside those hours.',
    },
    {
      question: 'Can you take over a platform someone else built?',
      answer:
        'Yes, and it is common. We start by documenting what exists, moving credentials into a secret store, checking whether backups restore, and adding monitoring where there is none. That first pass often finds more value than any migration would, and it gives you a written picture of a platform that previously lived in one person head.',
    },
  ],
  markets: {
    title: 'Where we host and run these systems',
    intro:
      'Hosting region is a commercial decision for most overseas buyers before it is a technical one, so the market pages below deal with where infrastructure is provisioned and who holds the account, rather than claiming certification we do not have.',
  },
  related: [
    {
      path: '/services/devops-engineering',
      label: 'DevOps Engineering',
      blurb: 'The pipelines, automation and release process that run on top of the platform.',
    },
    {
      path: '/services/software-modernization',
      label: 'Software Modernization',
      blurb: 'Preparing an older application to run somewhere modern, in stages.',
    },
    {
      path: '/services/saas-development',
      label: 'SaaS Development',
      blurb: 'Multi-tenant products where hosting cost per customer is part of the model.',
    },
    {
      path: '/services/web-application-development',
      label: 'Web Application Development',
      blurb: 'The applications that most often need this platform underneath them.',
    },
    {
      path: '/services/custom-software-development',
      label: 'Custom Software Development',
      blurb: 'The pillar service, where hosting is one stage of a full build.',
    },
    {
      path: '/services/ai-automation-integration',
      label: 'AI Automation & Integration',
      blurb: 'Automated workflows that need queues, storage and scheduled execution to run on.',
    },
  ],
  cta: {
    title: 'Start with an assessment of what you run now',
    body: 'Tell us what the application is and where it lives today. Get an indicative estimate, talk it through with our AI consultation agent, or send the details to the team.',
  },
};
