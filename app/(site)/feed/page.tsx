import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchFeed, STATE_NAMES } from '@/lib/feed'
import { CompletedCard, CompletedRow, RequestedRow } from '@/components/feed/FeedCards'

// Public work feed — a live look at jobs across the RIG network. Server
// rendered from /feed/public (revalidates every 5 min); dispatcher-approved
// write-ups and photos only, requests are text-only by construction.
//
// Doubles as the format testbed for the page family this will grow into
// (state pages, city/corridor pages, dispatch vs completed views):
//   ?state=tx            state filter (chips)
//   &city=amarillo       city filter within the state + nearby-city chips
//   &view=dispatch       requests only, no photos (the dispatch-feed format)
//   &view=completed      completed only, full width
//   &card=row            compact shop-app-style cards instead of the grid
export const metadata: Metadata = {
  title: 'Recent Work — Mobile Truck, Trailer & RV Repair Across the U.S. | RIG',
  description:
    'A live feed of roadside and mobile repair jobs dispatched and completed through the RIG mechanic network — real trucks, real fixes, city by city.',
}

export const revalidate = 300

const norm = (s?: string) => (s || '').toUpperCase().slice(0, 2)
const normCity = (s?: string | null) => (s || '').trim().toLowerCase()

interface Params {
  state?: string
  city?: string
  view?: string
  card?: string
}

// Preserves the current view/format when switching state or city, so the
// testbed toolbar composes with the geography chips.
function hrefFor(p: Params): string {
  const qs = new URLSearchParams()
  if (p.state) qs.set('state', p.state.toLowerCase())
  if (p.city) qs.set('city', p.city.toLowerCase())
  if (p.view && p.view !== 'all') qs.set('view', p.view)
  if (p.card && p.card !== 'grid') qs.set('card', p.card)
  const s = qs.toString()
  return s ? `/feed?${s}` : '/feed'
}

export default async function FeedPage({ searchParams }: { searchParams: Params }) {
  const state = norm(searchParams.state)
  const city = normCity(searchParams.city)
  const view = searchParams.view === 'dispatch' || searchParams.view === 'completed' ? searchParams.view : 'all'
  const card = searchParams.card === 'row' ? 'row' : 'grid'
  const here: Params = { state: state || undefined, city: city || undefined, view, card }

  const [stateItems, all] = await Promise.all([
    fetchFeed({ state: state || undefined, limit: 80 }),
    fetchFeed({ limit: 200 }),
  ])
  const items = city ? stateItems.filter((i) => normCity(i.city) === city) : stateItems
  const completed = items.filter((i) => i.type === 'JOB_COMPLETED')
  const requested = items
    .filter((i) => i.type === 'JOB_REQUESTED')
    .slice(0, view === 'dispatch' ? 50 : 15)

  // States with any activity, for the filter chips.
  const stateCounts = new Map<string, number>()
  for (const i of all) if (i.state) stateCounts.set(i.state, (stateCounts.get(i.state) || 0) + 1)
  const chips = [...stateCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)

  // Cities with activity inside the selected state — the selected city's
  // siblings double as the "nearby" strip a city page will carry. (True
  // corridor/nearby ranking needs geo distance; same-state activity is the
  // testbed stand-in.)
  const cityCounts = new Map<string, { label: string; n: number }>()
  if (state) {
    for (const i of stateItems) {
      const key = normCity(i.city)
      if (!key || /^(n\/a|na|none|unknown|null)$/.test(key)) continue
      const prev = cityCounts.get(key)
      cityCounts.set(key, { label: i.city!.trim(), n: (prev?.n || 0) + 1 })
    }
  }
  const cityChips = [...cityCounts.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 12)

  const placeName = city
    ? `${cityCounts.get(city)?.label ?? searchParams.city}, ${state}`
    : state
      ? STATE_NAMES[state] ?? state
      : ''
  const heading =
    view === 'dispatch'
      ? placeName ? `Live dispatch activity in ${placeName}` : 'Live dispatch activity'
      : placeName ? `Recent work in ${placeName}` : 'Recent work across the network'

  const chipClass = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold ${active ? 'bg-rig-green text-rig-navy-deep' : 'bg-white/10 text-white/80 hover:bg-white/20'}`

  return (
    <>
      <section className="bg-rig-navy-deep py-14 text-white sm:py-20">
        <div className="container-rig">
          <p className="eyebrow">Work feed</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{heading}</h1>
          <p className="mt-4 max-w-2xl text-white/75">
            Real jobs from the RIG network — trucks, trailers and RVs fixed where they sat, by independent
            mobile mechanics dispatched through RIG. Updated continuously; details are shared only after a
            dispatcher reviews them.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={hrefFor({ ...here, state: undefined, city: undefined })} className={chipClass(!state)}>
              All states
            </Link>
            {chips.map(([st, n]) => (
              <Link key={st} href={hrefFor({ ...here, state: st, city: undefined })} className={chipClass(state === st)}>
                {STATE_NAMES[st] ?? st} <span className="opacity-60">{n}</span>
              </Link>
            ))}
          </div>

          {state && cityChips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-white/50">{city ? 'Nearby:' : 'Cities:'}</span>
              {city && (
                <Link href={hrefFor({ ...here, city: undefined })} className={chipClass(false)}>
                  All of {STATE_NAMES[state] ?? state}
                </Link>
              )}
              {cityChips.map(([key, c]) => (
                <Link key={key} href={hrefFor({ ...here, city: key })} className={chipClass(city === key)}>
                  {c.label} <span className="opacity-60">{c.n}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Format testbed — the page families this will split into. */}
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
            <span className="text-xs text-white/50">View:</span>
            <Link href={hrefFor({ ...here, view: 'all' })} className={chipClass(view === 'all')}>Combined</Link>
            <Link href={hrefFor({ ...here, view: 'completed' })} className={chipClass(view === 'completed')}>Completed only</Link>
            <Link href={hrefFor({ ...here, view: 'dispatch' })} className={chipClass(view === 'dispatch')}>Dispatch only</Link>
            {view !== 'dispatch' && (
              <>
                <span className="ml-3 text-xs text-white/50">Cards:</span>
                <Link href={hrefFor({ ...here, card: 'grid' })} className={chipClass(card === 'grid')}>Photo grid</Link>
                <Link href={hrefFor({ ...here, card: 'row' })} className={chipClass(card === 'row')}>Compact rows</Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className={`container-rig ${view === 'all' ? 'grid gap-10 lg:grid-cols-[1fr_340px]' : ''}`}>
          {view !== 'dispatch' && (
            <div>
              <h2 className="text-lg font-semibold text-rig-navy">Completed jobs</h2>
              {completed.length === 0 ? (
                <p className="mt-3 text-sm text-rig-navy/60">
                  Completed-job posts appear here after a RIG dispatcher reviews the write-up and photos. Check
                  back soon.
                </p>
              ) : card === 'row' ? (
                <div className="mt-4 grid gap-3 lg:max-w-2xl">
                  {completed.map((i) => (
                    <CompletedRow key={i.item_id} item={i} />
                  ))}
                </div>
              ) : (
                <div className={`mt-4 grid gap-5 sm:grid-cols-2 ${view === 'completed' ? 'lg:grid-cols-3' : ''}`}>
                  {completed.map((i) => (
                    <CompletedCard key={i.item_id} item={i} />
                  ))}
                </div>
              )}
            </div>
          )}

          {view !== 'completed' && (
            <aside className={view === 'dispatch' ? 'mx-auto w-full max-w-2xl' : ''}>
              <h2 className="text-lg font-semibold text-rig-navy">Recent requests</h2>
              <p className="mt-1 text-xs text-rig-navy/55">Where drivers asked for help most recently.</p>
              {requested.length === 0 ? (
                <p className="mt-3 text-sm text-rig-navy/60">Quiet right now.</p>
              ) : (
                <ul className="mt-3 divide-y divide-rig-navy/10 rounded-2xl border border-rig-navy/10 bg-rig-navy/[0.02] px-4">
                  {requested.map((i) => (
                    <RequestedRow key={i.item_id} item={i} />
                  ))}
                </ul>
              )}
              <div className="mt-6 rounded-2xl bg-rig-navy-deep p-5 text-white">
                <p className="text-sm font-semibold">Broke down right now?</p>
                <p className="mt-1 text-sm text-white/70">Describe the problem once — nearby mechanics bid back with a rate and an ETA in minutes.</p>
                <a href="/help" className="btn-primary mt-4 w-full">Chat with dispatch</a>
              </div>
            </aside>
          )}
        </div>
      </section>
    </>
  )
}
