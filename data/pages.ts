// Content for the Owner Operators and Shops pages.
// Copy sourced from the current public site (bigrig.app — driver & mechanic apps).

const CALL_CENTER = '1 (855) 744-2223'
const CALL_CENTER_TEL = 'tel:+18557442223'

export const ownerOperators = {
  hero: {
    eyebrow: 'For owner-operators & drivers',
    title: 'We get you back on the road.',
    subtitle:
      'Rig connects short and long haul truck drivers with a nationwide network of reputable mechanics who are open to service your needs wherever and whenever you need.',
    primaryCta: {
      label: 'Get the Driver app',
      href: 'https://apps.apple.com/app/id1605615839',
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
    ios: 'https://apps.apple.com/app/id1605615839',
    android: 'https://play.google.com/store/apps/details?id=com.rig.driver.app',
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
      href: 'https://play.google.com/store/apps/details?id=com.rig.mechanic.app',
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
    ios: 'https://apps.apple.com/us/app/rig-mechanic',
    android: 'https://play.google.com/store/apps/details?id=com.rig.mechanic.app',
  },
  finalCta: {
    eyebrow: 'Get started',
    title: 'Get the Rig Mechanic app.',
    subtitle: 'Access clients across the nation without spending a dollar on marketing.',
  },
}
