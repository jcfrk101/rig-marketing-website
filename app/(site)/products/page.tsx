import type { Metadata } from 'next'
import AudienceHero from '@/components/AudienceHero'
import { products as c } from '@/data/pages'

export const metadata: Metadata = {
  title: 'Products — 24/7 Repair Dispatch, Fleet Maintenance, Driver & Mechanic Apps',
  description:
    'One network for truck repair: 24/7 repair dispatch, the RIG Fleet maintenance platform, and apps for drivers and mechanics.',
  alternates: { canonical: '/products' },
}

export default function ProductsPage() {
  return (
    <>
      <AudienceHero {...c.hero} />

      <section className="bg-white py-16 sm:py-24">
        <div className="container-rig grid gap-6 md:grid-cols-2">
          {c.items.map((product) => (
            <div
              key={product.name}
              className="flex flex-col rounded-2xl border border-rig-navy/10 p-8 transition hover:border-rig-navy/20 hover:shadow-md"
            >
              <p className="eyebrow">{product.eyebrow}</p>
              <h2 className="mt-2 text-2xl font-bold text-rig-navy">{product.name}</h2>
              <p className="mt-1 text-base font-medium text-rig-navy/80">{product.tagline}</p>
              <p className="mt-4 text-sm leading-relaxed text-rig-navy/60">{product.copy}</p>

              <ul className="mt-5 space-y-2.5">
                {product.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2.5 text-sm text-rig-navy/70">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rig-green" />
                    {bullet}
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex flex-col gap-3 pt-8 sm:flex-row sm:flex-wrap">
                <a href={product.primaryCta.href} className="btn-primary w-full sm:w-auto">
                  {product.primaryCta.label}
                </a>
                <a href={product.secondaryCta.href} className="btn-secondary w-full sm:w-auto">
                  {product.secondaryCta.label}
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-rig-navy-deep py-16 text-white sm:py-20">
        <div className="container-rig flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-rig-green">{c.directory.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{c.directory.title}</h2>
            <p className="mt-4 text-base leading-relaxed text-white/70">{c.directory.copy}</p>
          </div>
          <a href={c.directory.cta.href} className="btn-primary shrink-0">
            {c.directory.cta.label}
          </a>
        </div>
      </section>
    </>
  )
}
