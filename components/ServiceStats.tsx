'use client'

import { useEffect, useState } from 'react'
import { serviceStats } from '@/data/content'
import { deriveStats, fetchServiceMetrics, type DerivedStats, type StatCard } from '@/lib/metrics'

function MetricCard({ metric }: { metric: StatCard }) {
  return (
    <div className="rounded-2xl border border-rig-navy/10 p-6">
      <span className="inline-block rounded-full bg-rig-green/15 px-2.5 py-1 text-xs font-bold text-rig-green-dark">
        {metric.delta}
      </span>
      <div className="mt-4 text-4xl font-bold tracking-tight text-rig-navy">{metric.rig}</div>
      <p className="mt-1 text-sm font-medium text-rig-navy/70">{metric.label}</p>
      <p className="mt-3 border-t border-rig-navy/10 pt-3 text-xs text-rig-navy/45">
        Industry avg. {metric.industry}
      </p>
    </div>
  )
}

// Static fallback so the section always renders (e.g. backend unreachable in dev),
// then live data from the same endpoint fleet.bigrig.app uses overrides it on load.
const FALLBACK: DerivedStats = {
  metrics: serviceStats.metrics,
  trucksServiced: serviceStats.trucksServiced,
  servicingSince: serviceStats.servicingSince,
  timeToDispatch: serviceStats.metrics[0].rig,
}

export default function ServiceStats() {
  const [stats, setStats] = useState<DerivedStats>(FALLBACK)

  useEffect(() => {
    let active = true
    fetchServiceMetrics().then((m) => {
      if (active && m) setStats(deriveStats(m))
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="bg-white py-20">
      <div className="container-rig">
        <div className="max-w-2xl">
          <p className="eyebrow">{serviceStats.eyebrow}</p>
          <h2 className="section-title">{serviceStats.title}</h2>
          <p className="mt-4 text-lg text-rig-navy/60">{serviceStats.subtitle}</p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Comparison card — avg. time to dispatch */}
          <MetricCard metric={stats.metrics[0]} />

          {/* Total card — services executed (replaces the old "quotes per job" slot) */}
          <div className="rounded-2xl border border-rig-navy/10 p-6">
            <span className="inline-block rounded-full bg-rig-green/15 px-2.5 py-1 text-xs font-bold text-rig-green-dark">
              End-to-end
            </span>
            <div className="mt-4 text-4xl font-bold tracking-tight text-rig-navy">{stats.trucksServiced}</div>
            <p className="mt-1 text-sm font-medium text-rig-navy/70">services executed end-to-end</p>
            <p className="mt-3 border-t border-rig-navy/10 pt-3 text-xs text-rig-navy/45">
              since {stats.servicingSince}
            </p>
          </div>

          {/* Remaining comparison cards — cost, time to arrive */}
          {stats.metrics.slice(1).map((m) => (
            <MetricCard key={m.label} metric={m} />
          ))}
        </div>
      </div>
    </section>
  )
}
