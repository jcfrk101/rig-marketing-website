// Compact per-stage mockups for the execution flow. One switch keeps them co-located.

type Stage = 'booking' | 'payment' | 'fulfillment' | 'documentation'

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-rig-navy/10 bg-white p-4 shadow-lg shadow-rig-navy/5">
      {children}
    </div>
  )
}

function Booking() {
  return (
    <Card>
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-rig-navy/50">New request</div>
      <div className="space-y-2">
        {['Tire', 'Tow', 'Service'].map((t, i) => (
          <div
            key={t}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ${
              i === 0 ? 'bg-rig-green/15 text-rig-green-dark ring-1 ring-rig-green/40' : 'bg-rig-navy/[0.03] text-rig-navy/70'
            }`}
          >
            {t}
            {i === 0 && <span className="text-[10px]">✓ Routed</span>}
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-rig-navy-deep px-3 py-2 text-center text-[11px] font-semibold text-white">
        Provider confirmed · 22 min ETA
      </div>
    </Card>
  )
}

function Payment() {
  return (
    <Card>
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-rig-navy/50">Approval</div>
      <div className="space-y-2 text-xs">
        {[
          ['Diagnostic', '$95.00'],
          ['Parts', '$240.00'],
          ['Labor (1.5h)', '$180.00'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between text-rig-navy/70">
            <span>{k}</span>
            <span className="font-medium text-rig-navy">{v}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-rig-navy/10 pt-2 font-bold text-rig-navy">
          <span>Total</span>
          <span>$515.00</span>
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-rig-green px-3 py-2 text-center text-[11px] font-bold text-rig-navy-deep">
        Approve & authorize
      </div>
    </Card>
  )
}

function Fulfillment() {
  const steps = [
    { label: 'Booked', done: true },
    { label: 'En route', done: true },
    { label: 'On site', done: true },
    { label: 'Repair complete', done: false },
  ]
  return (
    <Card>
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-rig-navy/50">Live status · Unit 4471</div>
      <ol className="space-y-3">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-3 text-xs">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                s.done ? 'bg-rig-green text-rig-navy-deep' : 'border border-rig-navy/20 text-rig-navy/40'
              }`}
            >
              {s.done ? '✓' : ''}
            </span>
            <span className={s.done ? 'font-semibold text-rig-navy' : 'text-rig-navy/50'}>{s.label}</span>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function Documentation() {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-rig-navy/50">Repair order</span>
        <span className="rounded bg-rig-green/15 px-1.5 py-0.5 text-[9px] font-bold text-rig-green-dark">RO-10482</span>
      </div>
      <div className="space-y-2 text-xs text-rig-navy/70">
        <div className="flex justify-between"><span>Unit</span><span className="font-medium text-rig-navy">4471 · Freightliner</span></div>
        <div className="flex justify-between"><span>Issue</span><span className="font-medium text-rig-navy">Front tire blowout</span></div>
        <div className="flex justify-between"><span>Work done</span><span className="font-medium text-rig-navy">Replace + balance</span></div>
        <div className="flex justify-between"><span>Logged to history</span><span className="font-medium text-rig-green-dark">✓ Saved</span></div>
      </div>
      <div className="mt-3 flex gap-1.5">
        <span className="flex-1 rounded bg-rig-navy/[0.06] py-1.5 text-center text-[10px] font-medium text-rig-navy/60">Export PDF</span>
        <span className="flex-1 rounded bg-rig-navy/[0.06] py-1.5 text-center text-[10px] font-medium text-rig-navy/60">Send to fleet</span>
      </div>
    </Card>
  )
}

export default function StageMockup({ stage }: { stage: Stage }) {
  switch (stage) {
    case 'booking':
      return <Booking />
    case 'payment':
      return <Payment />
    case 'fulfillment':
      return <Fulfillment />
    case 'documentation':
      return <Documentation />
  }
}
