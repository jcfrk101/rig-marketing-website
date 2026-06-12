import type { FeatureState } from '@/data/features'

export default function StatusBadge({ status }: { status: FeatureState }) {
  if (status === 'live') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-rig-green/15 px-2.5 py-1 text-xs font-semibold text-rig-green-dark">
        <span className="h-1.5 w-1.5 rounded-full bg-rig-green" />
        Live
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-rig-navy/20 px-2.5 py-1 text-xs font-semibold text-rig-navy/60">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rig-navy/40" />
      Rolling out
    </span>
  )
}
