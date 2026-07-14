// Canonical link map for the combined bigrig.app site.
// Every nav item, CTA, and footer link resolves through here — change a
// destination once and every page follows. data/directory.ts holds the
// SEO-directory state/corridor links; its roots are re-exported below.
//
// Internal routes (this repo, served at www.bigrig.app):
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
//   repair.bigrig.app   24/7 repair dispatch web flow
//   fleet.bigrig.app    fleet dashboard (existing-customer login)
//   calendly            demo booking
//   app stores          driver & mechanic apps
//   /semi-truck-repair  SEO directory (rig-ads-website repo)

export { DIRECTORY_ROOT, DIRECTORY_CORRIDORS_ROOT } from './directory'

export const links = {
  // Internal pages
  home: '/',
  products: '/products',
  ownerOperators: '/owner-operators',
  shops: '/shops',
  join: '/join',

  // Product surfaces
  repairDispatch: 'https://repair.bigrig.app',
  fleetDashboard: 'https://fleet.bigrig.app',
  demo: 'https://calendly.com/d/cw76-3bd-26v/demos',

  // Call center
  phoneDisplay: '1 (855) 744-2223',
  phoneTel: 'tel:+18557442223',

  // Apps
  driverAppIos: 'https://apps.apple.com/app/id1605615839',
  driverAppAndroid: 'https://play.google.com/store/apps/details?id=com.rig.driver.app',
  mechanicAppIos: 'https://apps.apple.com/us/app/rig-mechanic',
  mechanicAppAndroid: 'https://play.google.com/store/apps/details?id=com.rig.mechanic.app',

  // Company
  contactEmail: 'mailto:hello@bigrig.app',
} as const
