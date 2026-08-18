import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchFeed, STATE_NAMES } from '@/lib/feed'
import { CompletedCard, RequestedRow } from '@/components/feed/FeedCards'

// Public work feed — a live look at jobs across the RIG network. Server
// rendered from /feed/public (revalidates every 5 min); dispatcher-approved
// write-ups and photos only, requests are text-only by construction.
export const metadata: Metadata = {
  title: 'Recent Work — Mobile Truck, Trailer & RV Repair Across the U.S. | RIG',
  description:
    'A live feed of roadside and mobile repair jobs dispatched and completed through the RIG mechanic network — real trucks, real fixes, city by city.',
}

export const revalidate = 300

const norm = (s?: string) => (s || '').toUpperCase().slice(0, 2)

export default async function FeedPage({ searchParams }: { searchParams: { state?: string } }) {
  const state = norm(searchParams.state)
  const [items, all] = await Promise.all([fetchFeed({ state: state || undefined, limit: 80 }), fetchFeed({ limit: 200 })])
  const completed = items.filter((i) => i.type === 'JOB_COMPLETED')
  const requested = items.filter((i) => i.type === 'JOB_REQUESTED').slice(0, 15)

  // States with any activity, for the filter chips.
  const stateCounts = new Map<string, number>()
  for (const i of all) if (i.state) stateCounts.set(i.state, (stateCounts.get(i.state) || 0) + 1)
  const chips = [...stateCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)

  const heading = state ? `Recent work in ${STATE_NAMES[state] ?? state}` : 'Recent work across the network'

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
            <Link
              href="/feed"
              className={`rounded-full px-3 py-1 text-xs font-semibold ${!state ? 'bg-rig-green text-rig-navy-deep' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
            >
              All states
            </Link>
            {chips.map(([st, n]) => (
              <Link
                key={st}
                href={`/feed?state=${st.toLowerCase()}`}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${state === st ? 'bg-rig-green text-rig-navy-deep' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
              >
                {STATE_NAMES[st] ?? st} <span className="opacity-60">{n}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="container-rig grid gap-10 lg:grid-cols-[1fr_340px]">
          <div>
            <h2 className="text-lg font-semibold text-rig-navy">Completed jobs</h2>
            {completed.length === 0 ? (
              <p className="mt-3 text-sm text-rig-navy/60">
                Completed-job posts appear here after a RIG dispatcher reviews the write-up and photos. Check
                back soon — the network is busy (see the live requests →).
              </p>
            ) : (
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                {completed.map((i) => (
                  <CompletedCard key={i.item_id} item={i} />
                ))}
              </div>
            )}
          </div>
          <aside>
            <h2 className="text-lg font-semibold text-rig-navy">Live requests</h2>
            <p className="mt-1 text-xs text-rig-navy/55">Drivers who just asked for help — mechanics are bidding now.</p>
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
        </div>
      </section>
    </>
  )
}
