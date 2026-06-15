// Compact per-stage mockups for the execution flow. One switch keeps them co-located.

type Stage = 'dispatching' | 'payment' | 'fulfillment' | 'documentation'

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-rig-navy/10 bg-white p-4 shadow-lg shadow-rig-navy/5">
      {children}
    </div>
  )
}

function Dispatching() {
  const offers = [
    { name: 'Estarino', price: '$620.52', dist: '51.5 mi to service point', eta: '60 min', rate: '$140/hr · After hrs $280/hr' },
    { name: 'Avtar Barring', price: '$796.99', dist: '68.5 mi to service point', eta: '1h 35m', rate: '$175/hr · After hrs $175/hr' },
  ]
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-rig-navy/50">Offers · Dispatcher</span>
        <span className="rounded-full bg-rig-green/15 px-1.5 py-0.5 text-[9px] font-bold text-rig-green-dark">2 bids in</span>
      </div>
      <div className="space-y-2">
        {offers.map((o) => (
          <div key={o.name} className="rounded-lg bg-rig-navy/[0.03] px-3 py-2">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-rig-navy">{o.name}</span>
              <span className="text-xs font-bold text-rig-navy">{o.price}</span>
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[10px] text-rig-navy/50">
              <span>{o.dist}</span>
              <span>{o.eta}</span>
            </div>
            <div className="mt-0.5 text-[10px] text-rig-navy/45">{o.rate}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-rig-navy-deep px-3 py-2">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rig-green opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rig-green" />
        </span>
        <span className="text-[10px] font-semibold text-white">AI agents calling — 5 more providers</span>
      </div>
    </Card>
  )
}

function Payment() {
  return (
    <Card>
      <p className="mb-3 text-[10px] leading-relaxed text-rig-navy/55">
        A pre-authorization hold confirms funds. Payment is only processed once service is complete.
      </p>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-rig-navy/50">Offer components</div>
      <div className="space-y-1.5 text-xs">
        {[
          ['Mobile Service (labor)', '$1,475.00'],
          ['Parts', '$890.32'],
          ['Diagnostic fee', '$150.00'],
          ['Previous Payments', '-$2,216.00'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between rounded-lg bg-rig-navy/[0.03] px-3 py-1.5">
            <span className="text-rig-navy/70">{label}</span>
            <span className="font-medium text-rig-navy">{value}</span>
          </div>
        ))}
        <div className="flex justify-between px-3 pt-1 font-bold text-rig-navy">
          <span>Total</span>
          <span>$299.32</span>
        </div>
      </div>

      <div className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wide text-rig-navy/50">Pay with</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border-2 border-rig-green bg-rig-green/5 px-2 py-2 text-center">
          <div className="text-xs font-bold text-rig-green-dark">Card</div>
          <div className="text-[9px] text-rig-navy/50">via Stripe</div>
        </div>
        <div className="rounded-lg border border-rig-navy/15 px-2 py-2 text-center">
          <div className="text-xs font-bold text-rig-navy">WEX</div>
          <div className="text-[9px] text-rig-navy/50">Express Code or T-Chek</div>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-rig-green px-3 py-2 text-center text-[11px] font-bold text-rig-navy-deep">
        Continue
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
    case 'dispatching':
      return <Dispatching />
    case 'payment':
      return <Payment />
    case 'fulfillment':
      return <Fulfillment />
    case 'documentation':
      return <Documentation />
  }
}
