// Location resolution for the breakdown chat.
// The LLM composes a geocoder-friendly query (location_query); this module
// resolves it to concrete candidates the driver confirms in-chat.
//
// Strategy: Google Places Text Search first (landmarks, truck stops, exits —
// far better than plain Geocoding for named places), Geocoding API as
// fallback (addresses, towns). Highway/milepost-sounding text additionally
// goes to rig-web-services' typed resolver (POST /chat/location/resolve →
// ResolveTranscriptLocationAction), whose Mile1 integration turns
// "I-40 westbound mm 214" into a coordinate — the one shape this module's
// Google stack can't handle. Uses the same Google API key the phone flow's
// resolver runs on (GOOGLE_MAPS_API_KEY env).

export interface GeoCandidate {
  name: string // display label, e.g. "Pilot Travel Center"
  address: string // formatted address / vicinity
  lat: number
  lng: number
  state: string | null // 2-letter, lowercase, when derivable
}

const KEY = () => process.env.GOOGLE_MAPS_API_KEY || ''

function stateFrom(addr: string): string | null {
  const m = addr.match(/,\s*([A-Z]{2})[\s,]+\d{5}/) || addr.match(/,\s*([A-Z]{2})(?:,|$)/)
  return m ? m[1].toLowerCase() : null
}

// Reverse geocode a GPS share so the driver can confirm it in words.
export async function reverseGeocode(lat: number, lng: number): Promise<{ address: string; state: string | null }> {
  const fallback = { address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, state: null }
  if (!KEY()) return fallback
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${KEY()}`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    if (data.status === 'OK' && data.results?.length) {
      const addr = data.results[0].formatted_address
      return { address: addr, state: stateFrom(addr) }
    }
  } catch {
    // fall through
  }
  return fallback
}

async function placesSearch(q: string, biasPoint?: { lat: number; lng: number } | null): Promise<GeoCandidate[]> {
  // ~80km radius bias: strong enough to rank the right Pilot first, weak
  // enough that an explicit "in Tucson" in the query still wins.
  const placesBias = biasPoint ? `&location=${biasPoint.lat},${biasPoint.lng}&radius=80000` : ''
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}${placesBias}&region=us&key=${KEY()}`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    if (data.status === 'OK' && data.results?.length) {
      return data.results.slice(0, 3).map((r: any) => ({
        name: r.name,
        address: r.formatted_address || '',
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
        state: stateFrom(r.formatted_address || ''),
      }))
    }
  } catch {
    // unavailable
  }
  return []
}

async function geocodeSearch(q: string, biasPoint?: { lat: number; lng: number } | null): Promise<GeoCandidate[]> {
  const geocodeBias = biasPoint
    ? `&bounds=${biasPoint.lat - 0.7},${biasPoint.lng - 0.7}|${biasPoint.lat + 0.7},${biasPoint.lng + 0.7}`
    : ''
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}${geocodeBias}&region=us&key=${KEY()}`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    if (data.status === 'OK' && data.results?.length) {
      return data.results.slice(0, 2).map((r: any) => ({
        name: r.formatted_address.split(',')[0],
        address: r.formatted_address,
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
        state: stateFrom(r.formatted_address || ''),
      }))
    }
  } catch {
    // unavailable
  }
  return []
}

// ---- rig-web-services typed resolver (Mile1 mileposts) ----
// Server-to-server, same envs as backend.ts. Fails soft — chat never blocks
// on it: hard 9s abort against the action's internal 12s resolver timeout.
const RIG_BASE = () => process.env.RIG_API_URL || ''
const RIG_KEY = () => process.env.RIG_API_KEY || ''

// Worth a backend round-trip when the text talks like a highway: mile
// markers/posts, exit numbers, or a route designation (I-40, US 287, SR-99).
export const looksMilepostish = (t: string) =>
  /\b(?:mm|mile\s*(?:marker|post)?|milepost)\s*#?\s*\d+/i.test(t) ||
  /\bexit\s*#?\s*\d+/i.test(t) ||
  /\b(?:i|us|sr|rt|hwy|highway|route)[-\s]?\d{1,3}\b/i.test(t)

async function backendResolve(
  transcript: string,
  conversationId: string | null,
  fallbackState?: string | null
): Promise<GeoCandidate[]> {
  if (!RIG_BASE() || !RIG_KEY()) return []
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 9000)
  try {
    const res = await fetch(`${RIG_BASE()}/chat/location/resolve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Rig-Api-Key': RIG_KEY() },
      body: JSON.stringify({
        transcript,
        conversation_id: conversationId ?? 'web-chat',
        fallback_city: null,
        fallback_state: fallbackState ? fallbackState.toUpperCase() : null,
      }),
      cache: 'no-store',
      signal: ctl.signal,
    })
    const data = await res.json()
    if (data?.resolved && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      return [
        {
          name: data.label || transcript,
          address: data.label || '',
          lat: data.latitude,
          lng: data.longitude,
          state: data.state ? String(data.state).toLowerCase() : null,
        },
      ]
    }
  } catch {
    // backend unavailable or slow — Google candidates carry the turn
  } finally {
    clearTimeout(timer)
  }
  return []
}

const kmBetween = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/**
 * Multi-source resolution feeding the confirm-back chips.
 * Bake-off findings (scripts/geo-eval.mjs): the LLM-composed query into Places
 * is by far the strongest single strategy (8/10 vs 4/10 raw), so its results
 * lead. The raw text and Geocoding run in parallel and contribute candidates
 * only when meaningfully DIFFERENT (>2km from anything already listed) —
 * ambiguity is resolved by the driver tapping, never by proximity ranking
 * (which measurably picked wrong-but-nearby results).
 */
export async function resolveLocation(
  query: string,
  biasState?: string | null,
  biasPoint?: { lat: number; lng: number } | null,
  rawText?: string | null,
  conversationId?: string | null
): Promise<GeoCandidate[]> {
  if (!KEY()) return []
  const q = biasState && !query.toLowerCase().includes(biasState) ? `${query} ${biasState.toUpperCase()}` : query

  // Highway-sounding text goes to the backend's typed resolver in parallel —
  // its Mile1 milepost answer leads the candidates when it lands, because
  // Places reliably geocodes "I-40 mm 214" to the wrong town center.
  const transcript = (rawText && rawText.trim()) || query
  const wantBackend = looksMilepostish(transcript)

  const [milepost, composed, raw, geo] = await Promise.all([
    wantBackend ? backendResolve(transcript, conversationId ?? null, biasState) : Promise.resolve([]),
    placesSearch(q, biasPoint),
    rawText && rawText.trim() !== q ? placesSearch(rawText, biasPoint) : Promise.resolve([]),
    geocodeSearch(q, biasPoint),
  ])

  const merged: GeoCandidate[] = []
  for (const candidate of [...milepost, ...composed, ...raw, ...geo]) {
    if (merged.length >= 3) break
    if (merged.some((existing) => kmBetween(existing, candidate) < 2)) continue
    merged.push(candidate)
  }
  return merged
}
