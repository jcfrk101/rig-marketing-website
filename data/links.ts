// Canonical link map for the combined bigrig.app site.
// Every nav item, CTA, and footer link resolves through here — change a
// destination once and every page follows. data/directory.ts holds the
// SEO-directory state/corridor links; its roots are re-exported below.
//
// Internal routes (this repo, served at bigrig.app — apex is canonical, www 301s to it):
//   /                 fleet product page (doubles as the homepage for now)
//   /products         product overview
//   /owner-operators  driver app pitch
//   /shops            mechanic app pitch
//   /join             mechanic join flow — redirects to /shops until the
//                     dedicated signup flow ships (see next.config.mjs);
//                     inbound links (incl. the directory site) stay stable
//   /fleets           alias for / — the directory site links here (redirect)
//
// External surfaces:
//   /semi-truck-repair  24/7 repair dispatch + SEO directory (rig-ads-website
//                       repo; replaces the retired repair.bigrig.app)
//   fleet.bigrig.app    fleet dashboard (existing-customer login)
//   calendly            demo booking
//   app stores          driver & mechanic apps

import { DIRECTORY_ROOT } from './directory'

export { DIRECTORY_ROOT, DIRECTORY_CORRIDORS_ROOT } from './directory'

export const links = {
  // Internal pages
  home: '/',
  products: '/products',
  ownerOperators: '/owner-operators',
  shops: '/shops',
  join: '/join',

  // Product surfaces
  // Repair dispatch lives at the directory root (repair.bigrig.app is retired).
  repairDispatch: DIRECTORY_ROOT,
  fleetDashboard: 'https://fleet.bigrig.app',
  demo: 'https://calendly.com/d/cw76-3bd-26v/demos',

  // Call center
  phoneDisplay: '1 (855) 744-2223',
  phoneTel: 'tel:+18557442223',

  // Apps
  driverAppIos: 'https://apps.apple.com/app/id1605615839',
  driverAppAndroid: 'https://play.google.com/store/apps/details?id=com.rig.driver.app',
  mechanicAppIos: 'https://apps.apple.com/us/app/rig-mechanic/id1605635549',
  mechanicAppAndroid: 'https://play.google.com/store/apps/details?id=com.rig.mechanic.app',

  // Company
  contactEmail: 'mailto:hello@bigrig.app',

  // Legal — terms are served by the fleet app; privacy policy is Termly-hosted
  // (the same document the terms page itself links to).
  terms: 'https://fleet.bigrig.app/terms',
  privacy: 'https://app.termly.io/document/privacy-policy/ac7366a2-9849-41f8-b938-760ab198e47b',
} as const
