import { networkCoverage } from '@/data/content'
import NetworkPlot from '@/components/NetworkPlot'

// Thin phone frame so the mechanic-app screenshots read as a real device.
function Phone({ src, alt, caption, className = '' }: { src: string; alt: string; caption: string; className?: string }) {
  return (
    <figure className={`relative ${className}`}>
      <div className="overflow-hidden rounded-[2rem] border-[6px] border-rig-navy-deep bg-rig-navy-deep shadow-2xl shadow-black/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="block w-full" />
      </div>
      <figcaption className="mt-3 text-center text-xs font-medium text-white/55">{caption}</figcaption>
    </figure>
  )
}

export default function NetworkCoverage() {
  const { eyebrow, title, subtitle, stats, mapCaption, bidding } = networkCoverage

  return (
    <section className="relative overflow-hidden bg-rig-navy-deep py-16 text-white sm:py-24">
      {/* ambient green glow to tie into the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-1/3 h-[520px] w-[520px] rounded-full bg-rig-green/15 blur-3xl"
      />

      <div className="container-rig relative">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-rig-green">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
          <p className="mt-4 text-lg leading-relaxed text-white/65">{subtitle}</p>
        </div>

        {/* Coverage map — a raw scatter of every provider location. No basemap: the density of real
            points alone traces the continental US. */}
        <div className="relative mt-12">
          <NetworkPlot />
          <span className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm">
            {mapCaption}
          </span>
        </div>

        {/* Coverage stats */}
        <div className="mt-8 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-rig-navy-deep px-6 py-6">
              <div className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{s.value}</div>
              <p className="mt-1 text-sm text-white/55">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Bidding: how the network turns into faster, more competitive service */}
        <div className="mt-16 grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-rig-green">{bidding.eyebrow}</p>
            <h3 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{bidding.title}</h3>
            <p className="mt-4 text-lg leading-relaxed text-white/65">{bidding.copy}</p>

            <ul className="mt-8 space-y-6">
              {bidding.points.map((p) => (
                <li key={p.title} className="border-l-2 border-rig-green pl-4">
                  <h4 className="font-semibold text-white">{p.title}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-white/60">{p.copy}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Mechanic-app screenshots — green UI already matches the brand */}
          <div className="flex justify-center gap-4 sm:gap-6">
            <Phone {...bidding.shots[0]} className="mt-8 w-1/2 max-w-[230px]" />
            <Phone {...bidding.shots[1]} className="w-1/2 max-w-[230px]" />
          </div>
        </div>
      </div>
    </section>
  )
}
