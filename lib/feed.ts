// Public work feed — read side. Server-only (App Router fetch cache).
// Source: rig-web-services GET /feed/public — dispatcher-approved write-ups
// and photos only; requested-job items are text-only by construction.
export interface FeedItem {
  item_id: string
  type: 'JOB_REQUESTED' | 'JOB_COMPLETED'
  service_type?: string | null
  vehicle?: string | null
  city?: string | null
  state?: string | null
  event_at_epoch?: number | null
  description?: string | null
  photo_urls?: string[] | null
}

const API = process.env.RIG_API_URL || 'https://api.bigrig.app'

export async function fetchFeed(
  opts: { state?: string; service?: string; type?: FeedItem['type']; limit?: number } = {},
): Promise<FeedItem[]> {
  const params = new URLSearchParams()
  if (opts.state) params.set('state', opts.state)
  if (opts.service) params.set('service', opts.service)
  if (opts.type) params.set('type', opts.type)
  params.set('limit', String(opts.limit ?? 60))
  try {
    const res = await fetch(`${API}/feed/public?${params}`, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const body = await res.json()
    const data = body && typeof body === 'object' && 'data' in body ? body.data : body
    return Array.isArray(data) ? (data as FeedItem[]) : []
  } catch {
    return []
  }
}

export const SERVICE_LABEL: Record<string, string> = {
  mobile_service: 'Mobile repair',
  tire_change: 'Tire service',
  tow_service: 'Towing',
}

export const serviceLabel = (s?: string | null) => (s ? SERVICE_LABEL[s] ?? s.replace(/_/g, ' ') : 'Mobile repair')

/** "2h ago" / "3d ago" — computed server-side at render (page revalidates every 5 min). */
export function timeAgo(epoch?: number | null): string {
  if (!epoch) return ''
  const s = Math.max(0, Math.floor(Date.now() / 1000 - epoch))
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 14) return `${Math.floor(s / 86400)}d ago`
  return new Date(epoch * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** City, ST — hides junk placeholders the dispatch data sometimes carries. */
export function placeOf(i: FeedItem): string {
  const city = i.city && !/^(n\/a|na|none|unknown|null)$/i.test(i.city.trim()) ? i.city.trim() : ''
  return [city, i.state].filter(Boolean).join(', ')
}

export const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan',
  MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming',
}
