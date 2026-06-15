import StatusBadge from './StatusBadge'
import { featureStatus } from '@/data/content'
import { features, type Feature } from '@/data/features'

function Column({ title, items, accent }: { title: string; items: Feature[]; accent: boolean }) {
  return (
    <div className={`rounded-2xl border p-6 ${accent ? 'border-rig-green/40 bg-rig-green/[0.04]' : 'border-rig-navy/10 bg-white'}`}>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-bold text-rig-navy">{title}</h3>
        <span className="text-sm font-medium text-rig-navy/40">{items.length}</span>
      </div>
      <ul className="space-y-3">
        {items.map((f) => (
          <li key={f.name} className="rounded-xl border border-rig-navy/10 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-rig-navy">{f.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-rig-navy/60">{f.description}</p>
              </div>
              <StatusBadge status={f.status} />
            </div>
            <span className="mt-3 inline-block rounded bg-rig-navy/[0.05] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-rig-navy/50">
              {f.stage}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function FeatureStatus() {
  const live = features.filter((f) => f.status === 'live')
  const rolling = features.filter((f) => f.status === 'rolling-out')

  return (
    <section id="status" className="bg-rig-navy/[0.03] py-16 sm:py-24">
      <div className="container-rig">
        <div className="max-w-2xl">
          <p className="eyebrow">{featureStatus.eyebrow}</p>
          <h2 className="section-title">{featureStatus.title}</h2>
          <p className="mt-4 text-lg text-rig-navy/60">{featureStatus.subtitle}</p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Column title="Live today" items={live} accent />
          <Column title="Rolling out" items={rolling} accent={false} />
        </div>
      </div>
    </section>
  )
}
