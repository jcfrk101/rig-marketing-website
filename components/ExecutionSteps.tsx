'use client'

import { useState } from 'react'
import StageMockup from './mockups/StageMockup'
import { executionFlow } from '@/data/content'

type StageKey = 'dispatching' | 'payment' | 'fulfillment' | 'documentation'

export default function ExecutionSteps() {
  // All steps collapsed by default; each row toggles independently.
  const [open, setOpen] = useState<number[]>([])
  const toggle = (i: number) =>
    setOpen((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))

  return (
    <div className="mt-8 divide-y divide-rig-navy/10 overflow-hidden rounded-2xl border border-rig-navy/10">
      {executionFlow.steps.map((s, i) => {
        const isOpen = open.includes(i)
        const panelId = `step-panel-${s.key}`
        return (
          <div key={s.key}>
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="flex w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-rig-navy/[0.02] sm:px-6"
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-rig-green/15 text-sm font-bold text-rig-green-dark">
                {s.step}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-rig-navy">{s.title}</span>
                <span className="mt-0.5 block truncate text-sm text-rig-navy/55">{s.summary}</span>
              </span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`flex-none text-rig-navy/40 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                aria-hidden
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isOpen && (
              <div id={panelId} className="px-4 pb-8 pt-2 sm:px-6">
                <div className="grid items-center gap-8 lg:grid-cols-2">
                  <div>
                    <p className="text-base leading-relaxed text-rig-navy/70">{s.copy}</p>
                    <ul className="mt-5 space-y-2.5">
                      {s.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2.5 text-sm text-rig-navy/80">
                          <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-rig-green text-[9px] font-bold text-rig-navy-deep">
                            ✓
                          </span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="lg:px-2">
                    <StageMockup stage={s.key as StageKey} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
