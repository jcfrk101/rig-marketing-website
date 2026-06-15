'use client'

import { useEffect, useState } from 'react'
import { deriveStats, fetchServiceMetrics } from '@/lib/metrics'

interface HeroStat {
  key: string
  value: string
  label: string
}

// `dispatch` and `trucks` are pulled live from the same backend endpoint the
// fleet dashboard uses; other stats render their static fallback value.
export default function HeroStats({ stats }: { stats: HeroStat[] }) {
  const [live, setLive] = useState<{ dispatch?: string; trucks?: string }>({})

  useEffect(() => {
    let active = true
    fetchServiceMetrics().then((m) => {
      if (!active || !m) return
      const d = deriveStats(m)
      setLive({ dispatch: d.timeToDispatch, trucks: d.trucksServiced })
    })
    return () => {
      active = false
    }
  }, [])

  const valueFor = (stat: HeroStat) => {
    if (stat.key === 'dispatch') return live.dispatch ?? stat.value
    if (stat.key === 'trucks') return live.trucks ?? stat.value
    return stat.value
  }

  return (
    <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-8 sm:gap-6">
      {stats.map((stat) => (
        <div key={stat.label}>
          <dt className="text-lg font-bold text-rig-green sm:text-xl">{valueFor(stat)}</dt>
          <dd className="mt-1 text-xs text-white/50">{stat.label}</dd>
        </div>
      ))}
    </dl>
  )
}
