import { fetchFeed, placeOf, serviceLabel } from '@/lib/feed'

// Image sitemap for the work feed's job photos. Google's current image-sitemap
// format uses only <image:loc>; titles/captions were deprecated in 2022 —
// the descriptive context lives in the page's alt text instead. Referenced
// from robots.txt; regenerated at most hourly.
export const revalidate = 3600

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function GET() {
  const items = await fetchFeed({ type: 'JOB_COMPLETED', limit: 100 })
  const images = items.flatMap((i) => (i.photo_urls ?? []).map((u) => ({ url: u, item: i })))
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://bigrig.app/feed/</loc>
${images
  .slice(0, 1000)
  .map(({ url }) => `    <image:image><image:loc>${esc(url)}</image:loc></image:image>`)
  .join('\n')}
  </url>
</urlset>
`
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
