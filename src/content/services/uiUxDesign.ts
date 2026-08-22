import type { ServiceContent } from './types';

export const uiUxDesign: ServiceContent = {
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
  icon: 'design',
  h1: 'UI/UX Design for Web and Mobile Products',
  valueProp:
    'Screens designed from the task a person is trying to finish — drawn as flows and wireframes first, then handed to developers as something they can build without guessing.',
  heroHighlights: [
    'Flows and wireframes before any visual design',
    'Clickable prototypes you can use before code exists',
    'Handover files developers can build from directly',
  ],
  intro: [
    'Design work goes wrong in two familiar ways. Either it starts with colours and typography before anyone has agreed what the product does, or it produces a set of beautiful static screens that turn out to be unbuildable, incomplete or silent about what happens when something goes wrong. Both are expensive, and both are avoidable.',
    'We design in the order that removes risk first: what the product is for, who uses it, what each of them is trying to complete, and how many steps that takes. Layout comes next, visual design after that, and the deliverable at the end is a specification a developer can work from — states, spacing, behaviour and edge cases included. The team works remotely from Indore, India.',
  ],
  problems: {
    eyebrow: 'Why teams ask for design help',
    heading: 'The design problems we are usually called about',
    intro:
      'Most requests arrive as "it needs to look better". Underneath, it is normally one of these.',
    items: [
      {
        title: 'People cannot finish the task they came for',
        body: 'The feature exists, but it is three screens deep, named something internal, or interrupted by a form nobody expected. The fix is in the flow, not the styling.',
      },
      {
        title: 'Every screen was designed on its own',
        body: 'Six shades of the same blue, four button sizes and three different date pickers. Without a component set, every new screen adds another variant and another decision.',
      },
      {
        title: 'The design ignores everything except the happy path',
        body: 'No empty state, no loading state, no error message, nothing for the long name or the missing image. Developers then invent those on deadline, and they look invented.',
      },
      {
        title: 'It falls apart on a phone',
        body: 'A layout drawn at desktop width and squeezed down afterwards, with tap targets too small, tables that overflow and navigation that hides the important action.',
      },
      {
        title: 'Handover leaves the developers guessing',
        body: 'A flattened image with no spacing, no states and no behaviour notes. Half of the build then becomes interpretation, and the result never quite matches the file.',
      },
      {
        title: 'Basic accessibility was never considered',
        body: 'Low-contrast text, form fields with no labels, focus order that jumps around and controls that only work with a mouse. All of it is cheaper to fix in design than in code.',
      },
    ],
  },
  capabilities: {
    eyebrow: 'What design covers',
    heading: 'Design work this service includes',
    intro:
      'A project uses some of this, not all of it. Which parts apply is agreed during discovery rather than sold as a package.',
    groups: [
      {
        title: 'Product discovery',
        body: 'Understanding the product before drawing anything, so the design solves the right problem.',
        items: [
          'Sessions with the people who own the product and the people who support it',
          'Definition of user types and what each one needs to complete',
          'Review of an existing product, its analytics and its support requests where they exist',
          'Feature list separated into a first release and what comes later',
          'Written assumptions and open questions, so gaps are visible early',
        ],
      },
      {
        title: 'User flows and information architecture',
        body: 'The route through the product, mapped before any screen is styled.',
        items: [
          'Task flows for each primary journey, including the ways they fail',
          'Navigation structure and screen inventory',
          'Content and data needed on each screen',
          'Permission differences between roles, drawn rather than described',
          'Step-count review to remove screens nobody needs',
        ],
      },
      {
        title: 'Wireframes and layout',
        body: 'Structure and hierarchy settled while changes are still cheap.',
        items: [
          'Low-fidelity wireframes for every screen in scope',
          'Priority and grouping of the elements on each screen',
          'Form structure, validation points and confirmation steps',
          'Table, list and dashboard layouts for data-heavy screens',
          'Review and revision rounds at wireframe stage, before visual design',
        ],
      },
      {
        title: 'Interface and responsive design',
        body: 'The visual layer, defined once and applied consistently across breakpoints.',
        items: [
          'Visual design of every screen in scope, in light and where required dark presentation',
          'Type scale, colour roles, spacing scale and iconography',
          'Mobile, tablet and desktop layouts for each screen',
          'Empty, loading, error, partial and success states',
          'Adaptation to an existing brand, or a simple visual direction where none exists',
        ],
      },
      {
        title: 'Design systems and components',
        body: 'A reusable set, so the tenth screen costs less than the first.',
        items: [
          'Component library with variants and interaction states',
          'Named tokens for colour, type, spacing and radius',
          'Usage notes describing when to use which component',
          'Patterns for forms, tables, dialogs, notifications and navigation',
          'A structure your own team can extend after handover',
        ],
      },
      {
        title: 'Prototypes, accessibility and handover',
        body: 'Something clickable to test with, checked for accessibility, then packaged for the build.',
        items: [
          'Clickable prototype of the main journeys, shareable by link',
          'Contrast, focus order, labelling and keyboard-path review against WCAG 2.1 AA criteria',
          'Text alternatives and semantic intent noted for each component',
          'Developer handover with spacing, states, behaviour notes and exported assets',
          'Walkthrough session with the developers, and answers to questions during the build',
        ],
      },
    ],
  },
  approach: {
    eyebrow: 'How we design',
    heading: 'Principles behind the design work',
    intro:
      'These are the habits that keep a design buildable and keep revisions from becoming a loop.',
    points: [
      'Flow before layout, layout before visual design. Reordering those three is what makes design expensive.',
      'Every screen is designed with its states, not only its ideal case: empty, loading, error, long content and no permission.',
      'Accessibility is treated as a design constraint from the first wireframe, not an audit at the end.',
      'A component is defined once and reused, so the product stays coherent as it grows.',
      'Feedback is collected on a prototype people can actually click, because opinions about a static image are usually about the image.',
      'Revisions run in defined rounds per stage, with the reason for each change written down, so a decision is not silently reversed two weeks later.',
      'We design against real content and realistic data volumes, since a design that only works with short names is not finished.',
    ],
  },
  process: {
    eyebrow: 'Discovery through handover',
    heading: 'How a design engagement runs',
    intro:
      'Five stages. Each one ends in something you can review, and nothing moves forward until the previous stage is agreed.',
    steps: [
      {
        title: 'Discovery and scope',
        body: 'We establish what the product is for, who uses it and which screens are actually in this release.',
        points: [
          'Working sessions with the product owner and, where possible, real users',
          'Review of any existing product, analytics, support tickets and competitor patterns',
          'User types and the tasks each needs to complete',
          'Screen inventory and a scope boundary for the release',
          'Written summary with assumptions, exclusions and open questions',
        ],
      },
      {
        title: 'Flows and wireframes',
        body: 'The structure of the product is settled here, where a change costs an afternoon rather than a sprint.',
        points: [
          'Task flows for each primary journey, including failure paths',
          'Navigation and information architecture',
          'Low-fidelity wireframes for every in-scope screen',
          'Form, table and dashboard structure',
          'A review round with revisions before visual design starts',
        ],
      },
      {
        title: 'Interface design and design system',
        body: 'Visual design is applied to an approved structure, and the reusable component set is built as we go.',
        points: [
          'Visual direction agreed on two or three key screens first',
          'Full screen designs at mobile, tablet and desktop widths',
          'Component library, tokens and interaction states',
          'Empty, loading, error and success presentation for each screen',
          'Accessibility review of contrast, labelling and focus order',
        ],
      },
      {
        title: 'Prototype and feedback',
        body: 'The main journeys become clickable so the design can be judged by using it rather than by looking at it.',
        points: [
          'Clickable prototype of the primary flows, shared by link',
          'Walkthrough sessions with your team and, where you can arrange it, real users',
          'Observations collected as tasks rather than opinions',
          'Prioritised revisions inside the agreed rounds',
          'A record of what changed and why',
        ],
      },
      {
        title: 'Developer handover and build support',
        body: 'The design is packaged so it can be built accurately, and we stay reachable while it is being built.',
        points: [
          'Handover files with spacing, sizes, states and behaviour notes',
          'Exported assets and icons in the formats the build needs',
          'A walkthrough session with the development team',
          'Answers to implementation questions during the build',
          'Design review of the built screens against the specification',
        ],
      },
    ],
  },
  engagement: {
    eyebrow: 'Working together',
    heading: 'Ways to engage a designer',
    intro:
      'Design can be a defined project, a stage inside a build we are already doing, or ongoing capacity.',
    options: [
      {
        name: 'Design-only project',
        body: 'A fixed set of screens, from discovery to handover, delivered as flows, designs, a component set and a prototype. Yours to build with any development team.',
        bestFor: 'Best when you have developers and need the design settled.',
      },
      {
        name: 'Design inside a build',
        body: 'Design runs as the second stage of a development project with us, staying a stage ahead of the developers so each cycle has approved screens to build.',
        bestFor: 'Best when we are delivering the product as well.',
      },
      {
        name: 'Ongoing design capacity',
        body: 'Monthly designer time for new features, iteration on live screens, extending the design system and reviewing what was shipped.',
        bestFor: 'Best for a live product that keeps changing.',
      },
    ],
  },
  limitations: {
    eyebrow: 'Scope boundaries',
    heading: 'What design can and cannot do',
    intro:
      'Being clear about this before we start is what keeps a design engagement from ending in disappointment.',
    points: [
      'We do not promise a conversion, engagement or revenue improvement from a redesign. Those depend on pricing, audience, traffic quality, competition and the offer itself, none of which a design controls.',
      'Design does not replace validation. If nobody wants the product, a better interface will not create demand.',
      'Usability testing with real users needs participants you can introduce us to. Without them, our recommendations rest on established interface patterns and review, not on evidence from your audience.',
      'Accessibility work follows WCAG 2.1 AA criteria as a design target. Final conformance also depends on how the design is implemented, so we review the build but do not certify it.',
      'A design system is only as durable as its use. If later screens are added without it, consistency drifts again.',
      'We are not a brand agency. We can define a simple visual direction and work within an existing brand, but full brand strategy, naming and printed identity are outside this service.',
      'Illustration, motion design, photography and video production are not included unless they are scoped and priced separately.',
    ],
    oversight: {
      title: 'How we keep the work reviewable',
      points: [
        'Each stage ends in a named deliverable you approve before the next begins',
        'Revision rounds are defined per stage, and further rounds are quoted rather than absorbed silently',
        'Every design decision that affects scope is written down with its reason',
        'The prototype is the reference for reviews, so feedback is about behaviour rather than taste alone',
        'Handover includes the source design files, so you are never dependent on us to make a change',
        'We flag when a request would push the release date instead of quietly accepting it',
      ],
    },
    note:
      'Design reduces the risk that people cannot use your product. It does not remove commercial risk, and we would rather say that at the start than imply otherwise in a proposal. Where we think a design change is unlikely to help, we say so and suggest what might.',
  },
  security: {
    eyebrow: 'Confidentiality',
    heading: 'Handling your material during design',
    intro:
      'Design work usually means seeing your product, your data structures and sometimes your customers. That is handled deliberately.',
    points: [
      'A mutual non-disclosure agreement before we receive anything, if you want one',
      'Realistic but invented sample data in mockups and prototypes rather than real customer records',
      'Access to your systems requested at the lowest level that lets the work happen, and returned at the end',
      'Prototype links shared privately with the people who need them, and retired when the project closes',
      'Screens containing personal or financial data reviewed for what is displayed by default and what should be masked',
      'Consent asked for before any usability session is recorded, and recordings kept only as long as agreed',
      'Design files, exports and source assets handed over to you at the end of the engagement',
      'No public case study, screenshot or client name published without your written agreement',
    ],
    note:
      'This is professional confidentiality and sensible handling of material, not a security certification. Where a design decision has a privacy consequence — what a screen exposes by default, what a shared link reveals, how much data one role can see — we raise it during design so it is a decision rather than an accident.',
  },
  faqs: [
    {
      question: 'Can you design a product we will build ourselves?',
      answer:
        'Yes, and it is a common arrangement. The deliverable is written for that case: flows, wireframes, full screen designs at each breakpoint, a component library with states, a clickable prototype and a handover file with spacing and behaviour notes. We also offer a walkthrough with your developers and stay reachable for questions during the build.',
    },
    {
      question: 'Will a redesign increase our conversions?',
      answer:
        'We cannot promise that, and anyone who does is guessing. What design reliably fixes is friction: steps that are unclear, forms that are longer than they need to be, states that leave people stranded. Whether that turns into more sales also depends on your pricing, traffic and offer. We can measure the tasks people complete before and after, which is a fair test of the design itself.',
    },
    {
      question: 'How many revision rounds do we get?',
      answer:
        'Two rounds per stage is the usual arrangement — one after wireframes, one after visual design — with the feedback consolidated rather than arriving in pieces. Further rounds are possible and are quoted; that is deliberate, because unlimited revision is how design projects lose their end date.',
    },
    {
      question: 'Do you work with our existing brand guidelines?',
      answer:
        'Yes. If you have a brand, we design inside it and extend it where the product needs something the guidelines never covered, such as data tables or system messages. If you do not have one, we can define a simple, consistent visual direction for the product without presenting it as full brand strategy.',
    },
    {
      question: 'What does accessibility work actually include?',
      answer:
        'At design stage: colour contrast that meets WCAG 2.1 AA, visible focus states, a sensible focus order, labelled form fields, error messages that do not rely on colour alone, touch targets large enough to hit, and text alternatives specified for meaningful images. We then review the built screens against those decisions. Conformance depends on implementation as well as design, so we verify rather than certify.',
    },
    {
      question: 'Do you run usability testing with real users?',
      answer:
        'We can, when you can introduce us to people who use or would use the product. Sessions are task-based, recorded only with consent, and reported as observations with prioritised changes. Where participants are not available, we review against established interface patterns instead and say plainly that the findings are professional judgement rather than evidence from your audience.',
    },
    {
      question: 'What do we actually receive at the end?',
      answer:
        'The editable source design files, the component library, every screen at the agreed breakpoints with its states, the clickable prototype, exported assets and a handover document. All of it is yours. Nothing is held back to keep you on a retainer.',
    },
  ],
  related: [
    {
      path: '/services/mobile-app-development',
      label: 'Mobile App Development',
      blurb: 'When the designed screens become an iOS and Android application.',
    },
    {
      path: '/services/web-application-development',
      label: 'Web Application Development',
      blurb: 'Portals, dashboards and admin tools where the design is most of the product.',
    },
    {
      path: '/services/saas-development',
      label: 'SaaS Development',
      blurb: 'Subscription products where onboarding, plans and billing screens all need designing.',
    },
    {
      path: '/services/custom-software-development',
      label: 'Custom Software Development',
      blurb: 'The pillar service, for when design is one stage of a larger build.',
    },
    {
      path: '/services/software-modernization',
      label: 'Software Modernization',
      blurb: 'Redesigning the interface of a system that already runs your business.',
    },
    {
      path: '/services/digital-marketing',
      label: 'Digital Marketing',
      blurb: 'Landing pages and campaign pages designed alongside the tracking behind them.',
    },
  ],
  cta: {
    title: 'Show us the screens that are not working',
    body: 'Send a link, a login or a description of the journey people struggle with. Get an indicative estimate, talk it through with our AI consultation agent, or write to the team directly.',
  },
};
