import StageMockup from './mockups/StageMockup'

interface FlowStepProps {
  step: string
  stageKey: 'booking' | 'payment' | 'fulfillment' | 'documentation'
  title: string
  copy: string
  bullets: string[]
  reverse?: boolean
}

export default function FlowStep({ step, stageKey, title, copy, bullets, reverse }: FlowStepProps) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div className={reverse ? 'lg:order-2' : ''}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rig-green/15 text-sm font-bold text-rig-green-dark">
            {step}
          </span>
          <h3 className="text-2xl font-bold text-rig-navy">{title}</h3>
        </div>
        <p className="mt-4 text-base leading-relaxed text-rig-navy/70">{copy}</p>
        <ul className="mt-5 space-y-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-rig-navy/80">
              <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-rig-green text-[9px] font-bold text-rig-navy-deep">
                ✓
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>

      <div className={reverse ? 'lg:order-1' : ''}>
        <StageMockup stage={stageKey} />
      </div>
    </div>
  )
}
