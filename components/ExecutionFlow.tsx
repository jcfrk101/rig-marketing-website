import ExecutionSteps from './ExecutionSteps'
import { executionFlow, customIntegrations as ci } from '@/data/content'

const dl = executionFlow.decisionLayer

export default function ExecutionFlow() {
  return (
    <section id="how-it-works" className="bg-white py-16 sm:py-24">
      <div className="container-rig">
        <div className="max-w-2xl">
          <p className="eyebrow">{executionFlow.eyebrow}</p>
          <h2 className="section-title">{executionFlow.title}</h2>
          <p className="mt-4 text-lg text-rig-navy/60">{executionFlow.subtitle}</p>
        </div>

        {/* Execution layer — live today */}
        <div className="mt-14 flex items-center gap-3">
          <span className="text-sm font-bold uppercase tracking-wider text-rig-navy">
            {executionFlow.executionLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rig-green/15 px-2.5 py-1 text-xs font-bold text-rig-green-dark">
            <span className="h-1.5 w-1.5 rounded-full bg-rig-green" />
            {executionFlow.executionStatus}
          </span>
        </div>

        <ExecutionSteps />

        {/* Custom integrations */}
        <div className="mt-14 rounded-3xl border border-rig-navy/10 bg-rig-navy/[0.03] p-6 sm:mt-20 sm:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <p className="eyebrow">{ci.eyebrow}</p>
              <h3 className="mt-3 text-2xl font-bold tracking-tight text-rig-navy sm:text-3xl">{ci.title}</h3>
              <p className="mt-4 text-base leading-relaxed text-rig-navy/70">{ci.copy}</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-1">
              {ci.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-3 rounded-xl border border-rig-navy/10 bg-white p-4 text-sm text-rig-navy/80"
                >
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-rig-green text-[10px] font-bold text-rig-navy-deep">
                    ✓
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Decision layer — coming soon */}
        <div className="relative mt-14 overflow-hidden rounded-3xl border border-rig-green/20 bg-rig-navy-deep p-6 text-white sm:mt-20 sm:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-rig-green/20 blur-3xl"
          />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rig-green/40 bg-rig-green/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rig-green">
                <span className="h-1.5 w-1.5 rounded-full bg-rig-green" />
                {dl.badge}
              </span>
              <span className="text-sm font-bold uppercase tracking-wider text-white/60">{dl.label}</span>
            </div>

            <h3 className="mt-5 max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">{dl.title}</h3>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">{dl.copy}</p>

            <ul className="mt-6 grid gap-3 sm:grid-cols-3">
              {dl.bullets.map((b) => (
                <li key={b} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
