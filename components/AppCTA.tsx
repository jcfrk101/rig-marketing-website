function StoreBadge({ href, store }: { href: string; store: 'ios' | 'android' }) {
  const label = store === 'ios' ? 'App Store' : 'Google Play'
  const sub = store === 'ios' ? 'Download on the' : 'Get it on'
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 rounded-xl bg-white px-5 py-2.5 text-rig-navy-deep transition hover:bg-white/90"
    >
      <span className="text-left leading-tight">
        <span className="block text-[10px] uppercase tracking-wide text-rig-navy/50">{sub}</span>
        <span className="block text-sm font-semibold">{label}</span>
      </span>
    </a>
  )
}

interface AppCTAProps {
  eyebrow: string
  title: string
  subtitle: string
  appLinks: { ios: string; android: string }
}

export default function AppCTA({ eyebrow, title, subtitle, appLinks }: AppCTAProps) {
  return (
    <section id="demo" className="bg-white py-16 sm:py-24">
      <div className="container-rig">
        <div className="relative overflow-hidden rounded-3xl bg-rig-navy-deep px-8 py-16 text-center text-white sm:px-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-rig-green/20 blur-3xl"
          />
          <div className="relative mx-auto max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-rig-green">{eyebrow}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
            <p className="mt-4 text-lg text-white/70">{subtitle}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <StoreBadge href={appLinks.ios} store="ios" />
              <StoreBadge href={appLinks.android} store="android" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
