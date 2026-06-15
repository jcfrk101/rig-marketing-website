import { differentiators } from '@/data/content'

export default function Differentiators() {
  return (
    <section id="why-rig" className="bg-rig-navy py-16 text-white sm:py-24">
      <div className="container-rig">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-rig-green">{differentiators.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{differentiators.title}</h2>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2">
          {differentiators.items.map((item) => (
            <div key={item.title} className="bg-rig-navy p-8">
              <div className="mb-4 h-1 w-10 rounded-full bg-rig-green" />
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{item.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
