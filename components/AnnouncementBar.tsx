'use client'

// Slim announcement ribbon under the nav — currently announcing EFS Payments.
// Dismiss sticks for the session; retire the whole component when the news
// gets old.
import { useEffect, useState } from 'react'

const KEY = 'rig-announce-efs-dismissed'

export default function AnnouncementBar() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(KEY)) setShow(true)
    } catch {
      setShow(true)
    }
  }, [])

  if (!show) return null

  return (
    <div className="relative bg-rig-green px-10 py-2 text-center text-[13.5px] font-semibold text-rig-navy-deep">
      <span className="font-extrabold">New:</span> EFS Payments accepted — pay for any Rig service with EFS.
      <button
        aria-label="Dismiss announcement"
        onClick={() => {
          setShow(false)
          try {
            sessionStorage.setItem(KEY, '1')
          } catch {}
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-1.5 text-rig-navy-deep/60 transition hover:text-rig-navy-deep"
      >
        ✕
      </button>
    </div>
  )
}
