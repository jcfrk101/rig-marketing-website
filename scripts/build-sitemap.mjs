// Builds public/sitemap.xml (a sitemap INDEX), public/sitemap-marketing.xml,
// and public/robots.txt.
//
// Architecture: no URL merging. The root sitemap is an index pointing at
// three child sitemaps, each owned and kept fresh by the service that serves
// its pages:
//   /sitemap-marketing.xml        — this repo's marketing pages (built here)
//   /semi-truck-repair/sitemap.xml — truck directory (rig-ads-website deploys)
//   /rv-repair/sitemap.xml         — RV tree (rig-ads-website deploys)
//
// The old approach copied the directory's URLs into this repo at build time,
// which went stale on every directory deploy and double-reported ~5,400 URLs
// to Search Console. The index never changes unless a whole new tree ships.
//
// Run after marketing pages change, then commit the outputs:
//   npm run build:sitemap
import fs from 'fs'
import path from 'path'
import url from 'url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const PUBLIC_DIR = path.join(ROOT, 'public')
// Canonical host is the apex (www 301s back to it).
const ORIGIN = 'https://bigrig.app'

// --- This site's own pages ---------------------------------------------------
const ownUrls = [
  { loc: `${ORIGIN}/`, priority: '1.0' },
  { loc: `${ORIGIN}/products/`, priority: '0.9' },
  { loc: `${ORIGIN}/owner-operators/`, priority: '0.9' },
  { loc: `${ORIGIN}/shops/`, priority: '0.9' },
  { loc: `${ORIGIN}/feed/`, priority: '0.7' },
]

const marketingXml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  ownUrls.map((u) => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`).join('\n') +
  '\n</urlset>\n'
fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-marketing.xml'), marketingXml)
console.log(`sitemap-marketing.xml: ${ownUrls.length} URLs`)

// --- Root index ---------------------------------------------------------------
const children = [
  `${ORIGIN}/sitemap-marketing.xml`,
  `${ORIGIN}/semi-truck-repair/sitemap.xml`,
  `${ORIGIN}/rv-repair/sitemap.xml`,
]
const indexXml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  children.map((c) => `  <sitemap><loc>${c}</loc></sitemap>`).join('\n') +
  '\n</sitemapindex>\n'
fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), indexXml)
console.log(`sitemap.xml: index of ${children.length} child sitemaps`)

// --- robots.txt ---------------------------------------------------------------
fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`)
console.log('robots.txt written')
