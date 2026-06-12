import { finalCta } from '@/data/content'

export default function CTASection() {
  return (
    <section id="demo" className="bg-white py-24">
      <div className="container-rig">
        <div className="relative overflow-hidden rounded-3xl bg-rig-navy-deep px-8 py-16 text-center text-white sm:px-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-rig-green/20 blur-3xl"
          />
          <div className="relative mx-auto max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-rig-green">{finalCta.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{finalCta.title}</h2>
            <p className="mt-4 text-lg text-white/70">{finalCta.subtitle}</p>
            <div className="mt-8">
              <a href={finalCta.cta.href} className="btn-primary">
                {finalCta.cta.label}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
