// Geo-resolution bake-off for the breakdown chat.
// Runs messy, realistic driver location descriptions through several
// resolution strategies and scores each against ground truth (established at
// runtime by geocoding an unambiguous reference query for the same spot).
//
//   GOOGLE_MAPS_API_KEY=... node scripts/geo-eval.mjs
//
// Strategies:
//   geocode      – Geocoding API on the raw text (baseline)
//   places       – legacy Places Text Search on the raw text
//   places+bias  – same, with an ~80km location bias (device-position hint)
//   composed     – Places on an LLM-style cleaned query (simulating our extractor)
//   comp+bias    – composed query + bias (== today's full production path)
//   placesNew    – Places API (New) searchText on the composed query
//   merged       – composed & raw in parallel, deduped, ranked by bias distance
import fs from 'fs'
import os from 'os'
import path from 'path'

const KEY =
  process.env.GOOGLE_MAPS_API_KEY ||
  (fs.existsSync('.env.local') &&
    (fs.readFileSync('.env.local', 'utf8').match(/GOOGLE_MAPS_API_KEY=(.+)/) || [])[1]) ||
  ''
if (!KEY) {
  console.error('No GOOGLE_MAPS_API_KEY (env or .env.local)')
  process.exit(1)
}

// Each case: the messy input a driver actually types, a simulated LLM-composed
// query (what our extractor produces), an optional bias point (device hint),
// an unambiguous reference query for ground truth, and a tolerance in km.
const CASES = [
  {
    name: 'truck stop + exit',
    raw: 'im at the pilot just past exit 268 on i-10',
    composed: 'Pilot Travel Center I-10 exit 268 Tucson AZ',
    bias: { lat: 32.2226, lng: -110.9747 }, // Tucson
    ref: 'Pilot Travel Center, 5570 E Travel Plaza Way, Tucson, AZ 85756',
    tolKm: 8,
  },
  {
    name: 'chain only, no city',
    raw: 'parked at a loves truck stop',
    composed: "Love's Travel Stop Amarillo TX",
    bias: { lat: 35.19, lng: -101.85 }, // Amarillo
    ref: "Love's Travel Stop Amarillo TX",
    tolKm: 30,
  },
  {
    name: 'exit + highway, no business',
    raw: 'i-40 westbound just before exit 96',
    composed: 'I-40 exit 96 Oklahoma',
    bias: { lat: 35.5, lng: -98.9 }, // west OK
    tolKm: 15,
    ref: 'I-40 exit 96, Oklahoma',
  },
  {
    name: 'mile marker (expected hard)',
    raw: 'i-40 westbound mile marker 286',
    composed: 'I-40 mile marker 286 Texas',
    bias: { lat: 35.19, lng: -101.85 },
    ref: 'Interstate 40 & FM 2161, Amarillo, TX', // approx mm 286 area
    tolKm: 20,
  },
  {
    name: 'behind a business',
    raw: 'behind the walmart in shamrock texas',
    composed: 'Walmart Shamrock TX',
    bias: null,
    ref: 'Walmart Supercenter Shamrock TX',
    tolKm: 8,
  },
  {
    name: 'crossroads',
    raw: 'corner of 66th and slide road lubbock',
    composed: '66th Street and Slide Road Lubbock TX',
    bias: null,
    ref: '66th St & Slide Rd, Lubbock, TX',
    tolKm: 5,
  },
  {
    name: 'partial rural address',
    raw: '4560 fort grant road willcox',
    composed: '4560 Fort Grant Road Willcox AZ',
    bias: { lat: 32.25, lng: -109.83 },
    ref: '4560 N Fort Grant Rd, Willcox, AZ',
    tolKm: 6,
  },
  {
    name: 'rest area',
    raw: 'rest area on i-10 eastbound past deming',
    composed: 'rest area I-10 eastbound Deming NM',
    bias: { lat: 32.27, lng: -107.75 },
    ref: 'Interstate 10 Rest Area Deming NM',
    tolKm: 40,
  },
  {
    name: 'town + road only',
    raw: 'on highway 87 north of san angelo',
    composed: 'Highway 87 north of San Angelo TX',
    bias: null,
    ref: 'US-87, San Angelo, TX',
    tolKm: 35,
  },
  {
    name: 'ta by name',
    raw: 'the TA in eloy',
    composed: 'TA Travel Center Eloy AZ',
    bias: { lat: 32.75, lng: -111.55 },
    ref: 'TA Travel Center Eloy AZ',
    tolKm: 10,
  },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const kmBetween = (a, b) => {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

async function geocode(q, bias) {
  const b = bias ? `&bounds=${bias.lat - 0.7},${bias.lng - 0.7}|${bias.lat + 0.7},${bias.lng + 0.7}` : ''
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}${b}&region=us&key=${KEY}`
  )
  const d = await res.json()
  if (d.status !== 'OK' || !d.results?.length) return null
  const r = d.results[0]
  return { name: r.formatted_address.split(',')[0], lat: r.geometry.location.lat, lng: r.geometry.location.lng }
}

async function placesLegacy(q, bias) {
  const b = bias ? `&location=${bias.lat},${bias.lng}&radius=80000` : ''
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}${b}&region=us&key=${KEY}`
  )
  const d = await res.json()
  if (d.status !== 'OK' || !d.results?.length) return null
  const r = d.results[0]
  return { name: r.name, lat: r.geometry.location.lat, lng: r.geometry.location.lng }
}

async function placesNew(q, bias) {
  const body = { textQuery: q, regionCode: 'US' }
  if (bias) body.locationBias = { circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: 50000 } }
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': 'places.displayName,places.location,places.formattedAddress',
    },
    body: JSON.stringify(body),
  })
  const d = await res.json()
  if (d.error) return { error: d.error.status }
  if (!d.places?.length) return null
  const p = d.places[0]
  return { name: p.displayName?.text, lat: p.location.latitude, lng: p.location.longitude }
}

async function merged(rawQ, composedQ, bias) {
  const [a, b, c] = await Promise.all([
    placesLegacy(composedQ, bias),
    placesLegacy(rawQ, bias),
    geocode(composedQ, bias),
  ])
  const candidates = [a, b, c].filter((x) => x && !x.error)
  if (!candidates.length) return null
  if (!bias) return candidates[0]
  candidates.sort((x, y) => kmBetween(x, bias) - kmBetween(y, bias))
  return candidates[0]
}

const strategies = {
  geocode: (c) => geocode(c.raw, null),
  places: (c) => placesLegacy(c.raw, null),
  'places+bias': (c) => placesLegacy(c.raw, c.bias),
  composed: (c) => placesLegacy(c.composed, null),
  'comp+bias': (c) => placesLegacy(c.composed, c.bias),
  placesNew: (c) => placesNew(c.composed, c.bias),
  merged: (c) => merged(c.raw, c.composed, c.bias),
}

const results = {}
const details = []
for (const c of CASES) {
  const truth = await placesLegacy(c.ref, c.bias) || await geocode(c.ref, c.bias)
  if (!truth) {
    console.error(`  !! no ground truth for "${c.name}" — skipping`)
    continue
  }
  const row = { case: c.name, truth: truth.name }
  for (const [name, fn] of Object.entries(strategies)) {
    try {
      const got = await fn(c)
      if (got?.error) row[name] = `API:${got.error}`
      else if (!got) row[name] = 'none'
      else {
        const km = kmBetween(got, truth)
        const pass = km <= c.tolKm
        row[name] = `${pass ? 'PASS' : 'MISS'} ${km.toFixed(1)}km`
        results[name] = results[name] || { pass: 0, total: 0 }
        results[name].total++
        if (pass) results[name].pass++
        continue
      }
      results[name] = results[name] || { pass: 0, total: 0 }
      results[name].total++
    } catch (e) {
      row[name] = 'ERR'
    }
    await sleep(60)
  }
  details.push(row)
  console.log(JSON.stringify(row))
}

console.log('\n=== SCOREBOARD ===')
for (const [name, s] of Object.entries(results)) {
  console.log(`${name.padEnd(12)} ${s.pass}/${s.total}`)
}
