// Location resolution for the breakdown chat.
// The LLM composes a geocoder-friendly query (location_query); this module
// resolves it to concrete candidates the driver confirms in-chat.
//
// Strategy: Google Places Text Search first (landmarks, truck stops, exits —
// far better than plain Geocoding for named places), Geocoding API as
// fallback (addresses, towns). Mile markers are deliberately not attempted —
// the question ladder steers drivers to the nearest exit instead.
// Uses the same Google API key the phone flow's resolver runs on
// (GOOGLE_MAPS_API_KEY env). TODO: add Mile1 for corridor-aware results.

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

export async function resolveLocation(
  query: string,
  biasState?: string | null,
  biasPoint?: { lat: number; lng: number } | null
): Promise<GeoCandidate[]> {
  if (!KEY()) return []
  const q = biasState && !query.toLowerCase().includes(biasState) ? `${query} ${biasState.toUpperCase()}` : query
  // ~80km radius bias: strong enough to rank the right Pilot first, weak
  // enough that an explicit "in Tucson" in the query still wins.
  const placesBias = biasPoint ? `&location=${biasPoint.lat},${biasPoint.lng}&radius=80000` : ''
  const geocodeBias = biasPoint
    ? `&bounds=${biasPoint.lat - 0.7},${biasPoint.lng - 0.7}|${biasPoint.lat + 0.7},${biasPoint.lng + 0.7}`
    : ''

  // Places Text Search — best for named places (truck stops, exits, businesses).
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
    // fall through to geocoding
  }

  // Geocoding API — addresses, towns, intersections.
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}${geocodeBias}&region=us&key=${KEY()}`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    if (data.status === 'OK' && data.results?.length) {
      return data.results.slice(0, 3).map((r: any) => ({
        name: r.formatted_address.split(',')[0],
        address: r.formatted_address,
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
        state: stateFrom(r.formatted_address || ''),
      }))
    }
  } catch {
    // no results
  }
  return []
}
