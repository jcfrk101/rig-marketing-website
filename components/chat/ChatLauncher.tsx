'use client'

// Floating breakdown-chat launcher — the popup-bubble form of /help.
// The chat stays mounted after first open so minimizing never loses the
// conversation; only visibility toggles.
import { useEffect, useState } from 'react'
import BreakdownChat from './BreakdownChat'

const TEASER_DELAY_MS = 3000
const TEASER_KEY = 'rig-chat-teaser-shown' // count of page views that showed it
const TEASER_MAX_SHOWS = 3
const JOURNEY_KEY = 'rig-journey'

export default function ChatLauncher() {
  const [open, setOpen] = useState(false)
  const [everOpened, setEverOpened] = useState(false)
  const [teaser, setTeaser] = useState(false)

  // A chat that was open before this navigation reopens with its restored
  // conversation (BreakdownChat rehydrates from the same sessionStorage).
  useEffect(() => {
    try {
      if (sessionStorage.getItem('rig-chat-open') === '1' && sessionStorage.getItem('rig-chat-session')) {
        setOpen(true)
        setEverOpened(true)
      }
    } catch {}
  }, [])

  // Journey tracking: referrer + landing + pages browsed, shared with the
  // directory embed via sessionStorage — logged with any chat that starts.
  useEffect(() => {
    try {
      const j = JSON.parse(sessionStorage.getItem(JOURNEY_KEY) || 'null') || {
        landing: window.location.pathname,
        referrer: document.referrer || null,
        views: 0,
        pages: [],
      }
      j.views += 1
      if (j.pages[j.pages.length - 1] !== window.location.pathname && j.pages.length < 25)
        j.pages.push(window.location.pathname)
      // Google Ads click ID — kept so a chat lead can be uploaded to Google
      // as an offline click conversion. First click of the session wins.
      if (!j.click) {
        const qs = new URLSearchParams(window.location.search)
        for (const kind of ['gclid', 'gbraid', 'wbraid'] as const) {
          const id = qs.get(kind)
          if (id) {
            j.click = { kind, id }
            break
          }
        }
      }
      sessionStorage.setItem(JOURNEY_KEY, JSON.stringify(j))
    } catch {}
  }, [])

  // Teaser CTA: pops shortly after load, on up to 3 page views per session.
  // Never auto-opens the chat; opening the chat retires it for the session.
  useEffect(() => {
    try {
      if (parseInt(sessionStorage.getItem(TEASER_KEY) || '0', 10) >= TEASER_MAX_SHOWS) return
    } catch {}
    const t = setTimeout(() => {
      setTeaser(true)
      try {
        const c = parseInt(sessionStorage.getItem(TEASER_KEY) || '0', 10)
        sessionStorage.setItem(TEASER_KEY, String(c + 1))
      } catch {}
    }, TEASER_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  function dismissTeaser() {
    // Hides for this page view only — the show already counted toward the cap.
    setTeaser(false)
  }

  function launch() {
    setOpen(true)
    setEverOpened(true)
    setTeaser(false)
    // Anyone who has opened the chat doesn't need the nudge again this session.
    try {
      sessionStorage.setItem(TEASER_KEY, '99')
      sessionStorage.setItem('rig-chat-open', '1')
    } catch {}
  }

  function minimize() {
    setOpen(false)
    try {
      sessionStorage.setItem('rig-chat-open', '0')
    } catch {}
  }

  return (
    <>
      {/* Panel: full-screen on mobile, docked bottom-right on desktop */}
      {everOpened && (
        <div
          className={`fixed inset-0 z-50 sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[680px] sm:max-h-[calc(100dvh-40px)] sm:w-[400px] sm:overflow-hidden sm:rounded-2xl sm:shadow-2xl sm:shadow-black/50 ${open ? '' : 'hidden'}`}
        >
          <BreakdownChat onClose={minimize} visible={open} />
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
          <span className="grid h-7 w-7 place-items-center rounded-full bg-rig-navy-deep text-rig-green">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M21 3H3a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 3 17h3.5v3.6a.5.5 0 0 0 .82.38L12.3 17H21a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 21 3z" />
            </svg>
          </span>
          Need a Mechanic? Chat Now
        </button>
      )}
    </>
  )
}
