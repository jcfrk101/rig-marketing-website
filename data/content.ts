// Central copy for the marketing site. Edit text here — components read from this file.

export const brand = {
  name: 'Rig',
  product: 'Rig Fleet',
  demoUrl: 'https://fleet.bigrig.app',
  contactEmail: 'hello@bigrig.app',
}

export const nav = {
  links: [
    { label: 'Fleets', href: '/' },
    { label: 'Owner Operators', href: '/owner-operators' },
    { label: 'Shops', href: '/shops' },
  ],
  cta: { label: 'Book a demo', href: 'https://calendly.com/d/cw76-3bd-26v/demos' },
}

export const hero = {
  eyebrow: 'Built for fleets',
  title: 'The execution layer for fleet maintenance.',
  subtitle:
    'Rig covers the entire execution path — from dispatching and payment to fulfillment, proof of service, and verification. End-to-end execution for every breakdown and all maintenance, handled and documented in one place.',
  primaryCta: { label: 'Book a demo', href: 'https://calendly.com/d/cw76-3bd-26v/demos' },
  secondaryCta: { label: 'See how it works', href: '#how-it-works' },
  // `dispatch` and `trucks` are overridden by live backend data (see HeroStats);
  // `static` values (e.g. network size) are not. Values here are the fallback.
  stats: [
    { key: 'dispatch', value: '13.3 min', label: 'avg. time to dispatch' },
    { key: 'trucks', value: '2,951+', label: 'services executed end-to-end' },
    { key: 'static', value: '6,000+', label: 'mechanics nationwide' },
  ],
}

// Nationwide network coverage — sits above the "By the numbers" section.
export const networkCoverage = {
  eyebrow: 'Nationwide network',
  title: 'A network deep enough that coverage is never the reason a unit sits.',
  subtitle:
    'Rig connects fleets to a coast-to-coast network of vetted mechanics and shops. Every dot is a service provider ready to take a job — across 48 states, from major freight corridors to the last mile.',
  stats: [
    { value: '6,000+', label: 'mechanics & shops nationwide' },
    { value: '48', label: 'states covered' },
    { value: 'Coast to coast', label: 'major corridors to the last mile' },
  ],
  mapCaption: 'Each dot is a mechanic or shop in the Rig network.',
  bidding: {
    eyebrow: 'Mechanics bid through the app',
    title: 'Providers compete for the job — in real time, in the Rig app.',
    copy: 'When a unit goes down, network mechanics set their price and ETA and send an offer straight from the Rig mechanic app. Fleets see competing bids side by side instead of cold-calling shops one at a time.',
    points: [
      {
        title: 'Cuts response time',
        copy: 'Offers come back in minutes — callout fee, mileage, and a live ETA — so dispatchers approve and get rolling instead of working the phones.',
      },
      {
        title: 'More market depth',
        copy: 'A dense network means multiple providers can bid on the same breakdown, even in remote areas where a fleet might otherwise have one option — or none.',
      },
      {
        title: 'More options for fleets',
        copy: 'Compare price, ETA, and rates across providers and pick what fits the unit and the urgency — full service or a quick callout.',
      },
    ],
    shots: [
      { src: '/mechanic-pricing.png', alt: 'Mechanic setting callout fee, mileage, and prep time in the Rig app', caption: 'Set price & ETA' },
      { src: '/mechanic-confirmation.png', alt: 'Mechanic confirming the offer with total and ETA before sending', caption: 'Send the offer' },
    ],
  },
}

// Real performance benchmarks shown on fleet.bigrig.app (fleet-metrics).
// Source: rig-web-app/pages/fleet-metrics-pdf.tsx
export const serviceStats = {
  eyebrow: 'By the numbers',
  title: 'Faster, cheaper, more competitive than the industry.',
  subtitle: 'The same metrics fleet managers see on their Rig dashboard.',
  // Static fallback shown until live data loads (and if the backend is unreachable).
  metrics: [
    { label: 'Avg. time to dispatch', rig: '13.3 min', industry: '37 min', delta: '2.8× faster' },
    { label: 'Avg. cost of road service', rig: '$460', industry: '$650', delta: '29% cheaper' },
    { label: 'Avg. time to arrive', rig: '39 min', industry: '60 min', delta: '35% faster' },
  ],
  trucksServiced: '2,951',
  servicingSince: 'August 24, 2022',
}

export const executionFlow = {
  eyebrow: 'How it works',
  title: 'One system from breakdown to record of work.',
  subtitle:
    'Most tools stop at alerting you that a unit is down. Rig executes the response — and writes it all down. Next, it decides the move for you.',
  executionLabel: 'The execution layer',
  executionStatus: 'Live today',
  steps: [
    {
      step: '01',
      key: 'dispatching',
      title: 'Dispatching',
      summary: 'Notify internal mechanics and the network, and let AI agents pull competitive bids.',
      copy: 'A driver or dispatcher requests service in seconds. Rig instantly notifies your internal mechanics and our nationwide network — and fires off AI calling agents to pull competitive bids from national service providers. No phone-tag, no waiting.',
      bullets: [
        'Notifies your internal fleet mechanics first',
        'Broadcasts to Rig’s nationwide network of mechanics',
        'AI calling agents bring in bids from national service providers',
      ],
    },
    {
      step: '02',
      key: 'payment',
      title: 'Payment',
      summary: 'Approve pricing and pay by card, WEX Express Code, or T-Chek.',
      copy: 'Authorize, approve, and settle in-platform. A pre-authorization hold confirms funds and payment only processes once service is complete — no card read over the phone, no surprise invoices.',
      bullets: [
        'Pay by credit card, WEX Express Code, or T-Chek',
        'Pre-authorization hold — charged only after service',
        'Approval controls and transparent line-item pricing',
      ],
    },
    {
      step: '03',
      key: 'fulfillment',
      title: 'Fulfillment',
      summary: 'Driver, dispatcher, and shop track the repair from one live status.',
      copy: 'Everyone sees the same live status. Driver, dispatcher, and shop stay in sync from ETA to wheels-rolling, so no one is left guessing.',
      bullets: ['Real-time status to all parties', 'ETA, on-site, and completion updates', 'Built-in messaging across the job'],
    },
    {
      step: '04',
      key: 'documentation',
      title: 'Documentation',
      summary: 'Every breakdown and repair is logged to the unit’s history automatically.',
      copy: 'Every breakdown and repair is captured to the unit’s history automatically — what failed, what was done, what it cost. Clean records for compliance and the next decision.',
      bullets: ['Repair orders attached to each unit', 'Full breakdown & maintenance history', 'Export-ready for compliance and audits'],
    },
  ],
  // The decision layer sits on top of execution — not yet live.
  decisionLayer: {
    badge: 'Coming soon',
    label: 'The decision layer',
    title: 'Soon, Rig decides the next move — not just executes it.',
    copy: 'Built on every dispatch, payment, repair, and record, Rig’s decision layer turns execution data into action: when a unit goes down, it decides where it’s routed, calls the shop, opens the claim, and reports what was done.',
    bullets: [
      'Auto-route each breakdown to the right shop or mechanic',
      'Trigger calls, appointments, and approvals automatically',
      'Turn breakdown & maintenance history into repair-or-replace and preventive recommendations',
    ],
  },
}

export const customIntegrations = {
  eyebrow: 'Custom integrations',
  title: 'We fit into your systems — not the other way around.',
  copy: 'Whatever your processes, dispatch tools, or telematics, Rig works hand-in-hand with your team to integrate our execution layer into your stack — from Slack alerts to enterprise maintenance systems like IBM Maximo — so dispatching, payment, fulfillment, and documentation flow through the systems you already use, as seamlessly as possible.',
  bullets: [
    'Built around your existing processes and workflows',
    'Connects to the tools you already run — Slack, telematics, and dispatch',
    'Syncs with enterprise maintenance systems like IBM Maximo',
    'Hands-on onboarding and tailored integration from the Rig team',
  ],
}

export const differentiators = {
  eyebrow: 'Why Rig',
  title: 'Built to execute, not just to alert.',
  items: [
    {
      title: 'Real-time across every party',
      copy: 'Driver, dispatcher, and shop work from one live source of truth — no status calls, no stale spreadsheets.',
    },
    {
      title: 'Connected to your stack',
      copy: 'Pairs with the telematics you already run so breakdowns and maintenance flow into the systems your team uses.',
    },
    {
      title: 'Documentation by default',
      copy: 'Every job writes itself to the unit’s history — what failed, what was done, what it cost — with zero extra paperwork.',
    },
    {
      title: 'Nationwide network',
      copy: 'A coast-to-coast network of 6,000+ vetted mechanics and shops, so coverage is never the reason a unit sits.',
    },
  ],
}

export const featureStatus = {
  eyebrow: 'Feature status',
  title: 'What’s live today, and what’s rolling out.',
  subtitle:
    'We ship in the open. Here’s what you can use right now and what’s landing next.',
}

export const finalCta = {
  eyebrow: 'Get started',
  title: 'See Rig run a breakdown end to end.',
  subtitle:
    'Book a walkthrough and we’ll show you the full execution path — dispatching, payment, fulfillment, and documentation — on your fleet’s terms.',
  cta: { label: 'Book a demo', href: 'https://calendly.com/d/cw76-3bd-26v/demos' },
}

export const footer = {
  tagline: 'The execution layer for fleet maintenance.',
  columns: [
    {
      title: 'Product',
      links: [
        { label: 'How it works', href: '#how-it-works' },
        { label: 'Why Rig', href: '#why-rig' },
        { label: 'Feature status', href: '#status' },
        { label: 'Fleet dashboard', href: 'https://fleet.bigrig.app' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'bigrig.app', href: 'https://www.bigrig.app' },
        { label: 'Contact', href: 'mailto:hello@bigrig.app' },
      ],
    },
  ],
}
