'use client'

// Floating breakdown-chat launcher — the popup-bubble form of /help.
// The chat stays mounted after first open so minimizing never loses the
// conversation; only visibility toggles.
import { useEffect, useState } from 'react'
import BreakdownChat from './BreakdownChat'

const TEASER_DELAY_MS = 6000
const TEASER_KEY = 'rig-chat-teaser-dismissed'

export default function ChatLauncher() {
  const [open, setOpen] = useState(false)
  const [everOpened, setEverOpened] = useState(false)
  const [teaser, setTeaser] = useState(false)

  // Teaser CTA: slides in above the pill a beat after the page settles.
  // Never auto-opens the chat; dismissing it sticks for the session.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(TEASER_KEY)) return
    } catch {}
    const t = setTimeout(() => setTeaser(true), TEASER_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  function dismissTeaser() {
    setTeaser(false)
    try {
      sessionStorage.setItem(TEASER_KEY, '1')
    } catch {}
  }

  function launch() {
    setOpen(true)
    setEverOpened(true)
    setTeaser(false)
    // Anyone who has opened the chat doesn't need the nudge again this session.
    try {
      sessionStorage.setItem(TEASER_KEY, '1')
    } catch {}
  }

  return (
    <>
      {/* Panel: full-screen on mobile, docked bottom-right on desktop */}
      {everOpened && (
        <div
          className={`fixed inset-0 z-50 sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[680px] sm:max-h-[calc(100dvh-40px)] sm:w-[400px] sm:overflow-hidden sm:rounded-2xl sm:shadow-2xl sm:shadow-black/50 ${open ? '' : 'hidden'}`}
        >
          <BreakdownChat onClose={() => setOpen(false)} />
        </div>
      )}

      {/* Teaser CTA above the pill */}
      {teaser && !open && (
        <div className="teaser-in fixed bottom-[86px] right-5 z-50 w-[264px] rounded-2xl border border-rig-green/50 bg-[#1a2127] p-3.5 pr-8 shadow-2xl shadow-black/50">
          <button
            onClick={dismissTeaser}
            aria-label="Dismiss"
            className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-sm text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
          <button onClick={launch} className="block text-left">
            <p className="text-[14.5px] font-bold leading-snug text-white">
              Chat with us — we&apos;ll send someone out.
            </p>
            <p className="mt-1 text-[12.5px] text-white/55">Live dispatch · usually minutes to first offers</p>
          </button>
          {/* Speech-bubble tail pointing at the pill */}
          <div className="absolute -bottom-[7px] right-9 h-3.5 w-3.5 rotate-45 border-b border-r border-rig-green/50 bg-[#1a2127]" />
        </div>
      )}

      {/* Launcher pill */}
      {!open && (
        <button
          onClick={launch}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full bg-rig-green py-3 pl-4 pr-5 font-bold text-rig-navy-deep shadow-xl shadow-black/30 transition hover:bg-rig-green-dark"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-rig-navy-deep text-sm font-extrabold text-rig-green">
            R
          </span>
          Broke down? Get help now
        </button>
      )}
    </>
  )
}
