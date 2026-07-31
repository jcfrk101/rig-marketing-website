'use client'

// /help renders the chat full-page — and when it's loaded inside the embed
// iframe (chat-embed.js on the directory pages), the minimize button
// postMessages the parent shell instead of being absent.
import { useEffect, useState } from 'react'
import BreakdownChat from './BreakdownChat'

export default function HelpView() {
  const [embedded, setEmbedded] = useState(false)
  useEffect(() => {
    setEmbedded(window.self !== window.top)
  }, [])

  return (
    <div className="h-dvh">
      <BreakdownChat onClose={embedded ? () => window.parent.postMessage('rig-chat:minimize', '*') : undefined} />
    </div>
  )
}
