'use client'

// Floating breakdown-chat launcher — the popup-bubble form of /help.
// The chat stays mounted after first open so minimizing never loses the
// conversation; only visibility toggles.
import { useState } from 'react'
import BreakdownChat from './BreakdownChat'

export default function ChatLauncher() {
  const [open, setOpen] = useState(false)
  const [everOpened, setEverOpened] = useState(false)

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

      {/* Launcher pill */}
      {!open && (
        <button
          onClick={() => {
            setOpen(true)
            setEverOpened(true)
          }}
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
