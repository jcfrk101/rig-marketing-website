interface CTA {
  label: string
  href: string
}

interface AudienceHeroProps {
  eyebrow: string
  title: string
  subtitle: string
  primaryCta: CTA
  secondaryCta: CTA
}

export default function AudienceHero({ eyebrow, title, subtitle, primaryCta, secondaryCta }: AudienceHeroProps) {
  return (
    <section className="relative overflow-hidden bg-rig-navy-deep text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full bg-rig-green/20 blur-3xl"
      />
      <div className="container-rig relative py-20 lg:py-28">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rig-green">
            <span className="h-1.5 w-1.5 rounded-full bg-rig-green" />
            {eyebrow}
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">{title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">{subtitle}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href={primaryCta.href} className="btn-primary">
              {primaryCta.label}
            </a>
            <a href={secondaryCta.href} className="btn-on-dark">
              {secondaryCta.label}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
