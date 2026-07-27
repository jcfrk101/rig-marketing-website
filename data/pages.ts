// Content for the Owner Operators, Shops, and Products pages.
// Copy sourced from the current public site (bigrig.app — driver & mechanic apps).

import { links, DIRECTORY_ROOT } from './links'

const CALL_CENTER = links.phoneDisplay
const CALL_CENTER_TEL = links.phoneTel

export const ownerOperators = {
  hero: {
    eyebrow: 'For owner-operators & drivers',
    title: 'We get you back on the road.',
    subtitle:
      'Rig connects short and long haul truck drivers with a nationwide network of reputable mechanics who are open to service your needs wherever and whenever you need.',
    primaryCta: {
      label: 'Get the Driver app',
      href: links.driverAppIos,
    },
    secondaryCta: { label: `Call ${CALL_CENTER}`, href: CALL_CENTER_TEL },
  },
  services: {
    eyebrow: 'Three ways to get help',
    title: 'Whatever stopped you, Rig has it covered.',
    items: [
      { title: 'Tire', copy: 'Blowouts, flats, and replacements — get a tire tech to your location.' },
      { title: 'Tow', copy: 'Need a lift? Request a tow and track it from request to drop-off.' },
      { title: 'Service', copy: 'Mobile mechanics for everything else, from diagnostics to repair.' },
    ],
  },
  steps: {
    eyebrow: 'How it works',
    title: 'From breakdown to back on the road in five steps.',
    items: [
      'Download and install the Rig - Driver app from the Apple App Store or Google Play Store',
      'Open the app and sign up with a phone number',
      'Select one of three main options: Tire, Tow, Service',
      'Add your vehicle and follow the simple flow to send your request',
      'Accept the best offer from a mechanic and watch things get done. Enjoy!',
    ],
  },
  callout: {
    title: 'No app handy? Call our national call center.',
    subtitle: 'Find a mechanic wherever you are — 24/7.',
    phone: CALL_CENTER,
    href: CALL_CENTER_TEL,
  },
  appLinks: {
    ios: links.driverAppIos,
    android: links.driverAppAndroid,
  },
  finalCta: {
    eyebrow: 'Get started',
    title: 'Get the Rig Driver app.',
    subtitle: 'Free to download. Help is a few taps away, wherever the road takes you.',
  },
}

export const shops = {
  hero: {
    eyebrow: 'For shops & mechanics',
    title: 'More jobs. Less marketing.',
    subtitle:
      'Rig connects a nationwide network of local mechanics to truck drivers across the nation, helping mechanics access clients without constant marketing.',
    primaryCta: {
      label: 'Get the Mechanic app',
      href: links.mechanicAppAndroid,
    },
    secondaryCta: { label: `Call ${CALL_CENTER}`, href: CALL_CENTER_TEL },
  },
  features: {
    eyebrow: 'Why mechanics use Rig',
    title: 'A steady stream of work, on your terms.',
    items: [
      { title: 'Accept available requests', copy: 'Browse incoming driver requests near you and take the jobs you want.' },
      { title: 'Create requests manually', copy: 'Already have a driver on the line? Create a request with a phone number.' },
      { title: 'Send offers your way', copy: 'Quote the job and send an offer directly to the driver.' },
      { title: 'Complete work and get paid', copy: 'Start the service, complete it, and get paid through the app.' },
    ],
  },
  steps: {
    eyebrow: 'How it works',
    title: 'Start earning in five steps.',
    items: [
      'Download and install the Rig - Mechanic app from the Apple App Store or Google Play Store',
      'Open the app and sign up with a phone number',
      "Select an available request from the list or 'Create Request' manually with a phone number",
      'Follow the simple flow and send an offer to the driver',
      'After the offer is accepted start progress on the service, complete it and get paid',
    ],
  },
  appLinks: {
    ios: links.mechanicAppIos,
    android: links.mechanicAppAndroid,
  },
  finalCta: {
    eyebrow: 'Get started',
    title: 'Get the Rig Mechanic app.',
    subtitle: 'Access clients across the nation without spending a dollar on marketing.',
  },
}

export const products = {
  hero: {
    eyebrow: 'Products',
    title: 'One network. Every side of truck repair.',
    subtitle:
      'Rig connects fleets, drivers, and mechanics on a single nationwide network — from 24/7 breakdown dispatch to end-to-end fleet maintenance. Pick the product built for how you work.',
    primaryCta: { label: 'Book a demo', href: links.demo },
    secondaryCta: { label: `Call ${CALL_CENTER}`, href: CALL_CENTER_TEL },
  },
  items: [
    {
      eyebrow: 'For fleets',
      name: 'Rig Fleet',
      tagline: 'The execution layer for fleet maintenance.',
      copy:
        'Rig Fleet runs the entire response when a unit goes down — dispatching, payment, fulfillment, and documentation — and logs every job to the unit’s history automatically.',
      bullets: [
        'Dispatch to internal mechanics and 6,000+ network providers',
        'In-platform approval, payment, and live status for every party',
        'Every repair documented to the unit — export-ready records',
      ],
      primaryCta: { label: 'Book a demo', href: links.demo },
      secondaryCta: { label: 'Learn more', href: links.home },
    },
    {
      eyebrow: '24/7 breakdown help',
      name: 'Rig Repairs',
      tagline: 'Repair dispatch, whenever and wherever you break down.',
      copy:
        'Request a vetted mechanic in minutes — tire, tow, or mobile service. Competing offers come back with price and ETA, and you track the job live from request to wheels-rolling.',
      bullets: [
        'Nationwide network of vetted mechanics and shops',
        'Competitive offers with transparent pricing and live ETA',
        `National call center — ${CALL_CENTER}, 24/7`,
      ],
      primaryCta: { label: 'Request a repair', href: links.repairDispatch },
      secondaryCta: { label: `Call ${CALL_CENTER}`, href: CALL_CENTER_TEL },
    },
    {
      eyebrow: 'For owner-operators & drivers',
      name: 'Rig Driver app',
      tagline: 'Help is a few taps away, wherever the road takes you.',
      copy:
        'Tire, tow, or service — send a request from the app, compare offers from nearby mechanics, and get back on the road. Free to download.',
      bullets: [
        'Tire, tow, and mobile service requests',
        'Compare offers and track the mechanic to your location',
        'Backed by the 24/7 national call center',
      ],
      primaryCta: { label: 'Get the Driver app', href: links.driverAppIos },
      secondaryCta: { label: 'Learn more', href: links.ownerOperators },
    },
    {
      eyebrow: 'For shops & mechanics',
      name: 'Rig Mechanic app',
      tagline: 'More jobs. Less marketing.',
      copy:
        'Browse incoming driver requests near you, quote the work, and get paid through the app — a steady stream of jobs without spending a dollar on marketing.',
      bullets: [
        'Accept nearby requests or create them manually',
        'Send offers with your price and ETA',
        'Complete the work and get paid in-app',
      ],
      primaryCta: { label: 'Join as a mechanic', href: links.join },
      secondaryCta: { label: 'Learn more', href: links.shops },
    },
  ],
  directory: {
    eyebrow: 'Repair directory',
    title: 'Find semi-truck repair near you.',
    copy:
      'Browse the Rig network by state, city, or interstate corridor — coverage stats, response times, and dispatch in one call.',
    cta: { label: 'Browse the directory', href: DIRECTORY_ROOT },
  },
}
