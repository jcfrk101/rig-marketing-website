import DashboardMockup from './mockups/DashboardMockup'
import HeroStats from './HeroStats'
import { hero } from '@/data/content'

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-rig-navy-deep text-white">
      {/* ambient green glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full bg-rig-green/20 blur-3xl"
      />
      <div className="container-rig relative grid gap-12 py-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rig-green">
            <span className="h-1.5 w-1.5 rounded-full bg-rig-green" />
            {hero.eyebrow}
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            {hero.title}
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">{hero.subtitle}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href={hero.primaryCta.href} className="btn-primary">
              {hero.primaryCta.label}
            </a>
            <a href={hero.secondaryCta.href} className="btn-on-dark">
              {hero.secondaryCta.label}
            </a>
          </div>

          <HeroStats stats={hero.stats} />
        </div>

        <div className="lg:pl-6">
          <DashboardMockup />
        </div>
      </div>
    </section>
  )
}
