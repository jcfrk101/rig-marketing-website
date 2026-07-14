// Old repair.bigrig.app state landing pages (rig-ads-website pages/[state].tsx,
// 31 states) mapped to the new directory state pages. The proxy folds the
// retired repair.bigrig.app host into this origin path-preserving, so these
// 301s cover both bigrig.app/texas and legacy repair.bigrig.app/texas traffic.
const legacyStatePages = {
  alabama: 'al',
  arizona: 'az',
  arkansas: 'ar',
  california: 'ca',
  colorado: 'co',
  florida: 'fl',
  georgia: 'ga',
  illinois: 'il',
  indiana: 'in',
  kentucky: 'ky',
  louisiana: 'la',
  maryland: 'md',
  massachusetts: 'ma',
  michigan: 'mi',
  minnesota: 'mn',
  mississippi: 'ms',
  missouri: 'mo',
  'new-mexico': 'nm',
  'new-york': 'ny',
  'north-carolina': 'nc',
  ohio: 'oh',
  oklahoma: 'ok',
  oregon: 'or',
  pennsylvania: 'pa',
  'south-carolina': 'sc',
  'south-dakota': 'sd',
  tennessee: 'tn',
  texas: 'tx',
  virginia: 'va',
  washington: 'wa',
  wisconsin: 'wi',
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle for the Cloud Run container.
  output: 'standalone',
  async redirects() {
    return [
      // Canonical host is the apex — www folds back to bigrig.app.
      // (The proxy should also do this; this is the in-app backstop.)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.bigrig.app' }],
        destination: 'https://bigrig.app/:path*',
        permanent: true,
      },
      // Mechanic join flow — /join is the stable inbound URL (the SEO
      // directory site links to it). Points at /shops until the dedicated
      // signup flow ships; flip only this entry when it does.
      { source: '/join', destination: '/shops', permanent: false },
      // The directory site links to /fleets for the fleet product.
      { source: '/fleets', destination: '/', permanent: false },
      // Legacy repair-site pages with a clear equivalent.
      { source: '/roadside', destination: '/semi-truck-repair/', permanent: true },
      ...Object.entries(legacyStatePages).map(([slug, code]) => ({
        source: `/${slug}`,
        destination: `/semi-truck-repair/${code}/`,
        permanent: true,
      })),
    ]
  },
}

export default nextConfig
