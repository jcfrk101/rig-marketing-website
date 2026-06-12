// Stylized fleet dashboard mockup — pure SVG/CSS, no external assets.
export default function DashboardMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-rig-navy/10 bg-white shadow-2xl shadow-rig-navy/10">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-rig-navy/10 bg-rig-navy-deep px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-white/20" />
        <span className="h-3 w-3 rounded-full bg-white/20" />
        <span className="h-3 w-3 rounded-full bg-rig-green" />
        <span className="ml-3 text-xs font-medium text-white/50">fleet.bigrig.app · ERS Dashboard</span>
      </div>

      <div className="grid grid-cols-[140px_1fr] bg-white">
        {/* sidebar */}
        <div className="space-y-3 border-r border-rig-navy/10 bg-rig-navy-deep/95 p-4">
          {['ERS Dashboard', 'Units', 'Insights', 'Settings'].map((item, i) => (
            <div
              key={item}
              className={`rounded-md px-2 py-1.5 text-xs font-medium ${
                i === 0 ? 'bg-rig-green text-rig-navy-deep' : 'text-white/60'
              }`}
            >
              {item}
            </div>
          ))}
        </div>

        {/* main */}
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'In progress', value: '12' },
              { label: 'Mechanics available', value: '4' },
              { label: 'Avg. down time', value: '1.8h' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-rig-navy/10 p-3">
                <div className="text-xl font-bold text-rig-navy">{stat.value}</div>
                <div className="text-[10px] uppercase tracking-wide text-rig-navy/50">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* job rows */}
          <div className="space-y-2">
            {[
              { unit: 'Unit 4471', status: 'In progress', tone: 'green' },
              { unit: 'Unit 2230', status: 'Awaiting payment', tone: 'amber' },
              { unit: 'Unit 8812', status: 'New', tone: 'navy' },
            ].map((row) => (
              <div key={row.unit} className="flex items-center justify-between rounded-lg bg-rig-navy/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-md bg-rig-green/15" />
                  <span className="text-xs font-semibold text-rig-navy">{row.unit}</span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    row.tone === 'green'
                      ? 'bg-rig-green/15 text-rig-green-dark'
                      : row.tone === 'amber'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rig-navy/10 text-rig-navy/70'
                  }`}
                >
                  {row.status}
                </span>
              </div>
            ))}
          </div>

          {/* mini chart */}
          <div className="flex items-end gap-1.5 rounded-lg border border-rig-navy/10 p-3">
            {[40, 65, 50, 80, 60, 95, 70].map((h, i) => (
              <span
                key={i}
                className="flex-1 rounded-t bg-rig-green/70"
                style={{ height: `${h * 0.5}px` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
