'use client'

// Breakdown intake chat — full-screen standalone experience at /help.
// All conversation logic lives server-side in the turn engine; this component
// renders messages and the active widget, and reports user actions back.
import { useEffect, useRef, useState } from 'react'
import type { Widget } from '@/lib/chat/engine'
import type { ChatState } from '@/lib/chat/slots'
import { directoryStates, DIRECTORY_ROOT } from '@/data/directory'

// Directory coverage by state code (ak/hi are gated out upstream).
const COVERED = new Map(
  directoryStates.map((s) => {
    const code = s.href.match(/\/semi-truck-repair\/(\w\w)\//)?.[1] || ''
    return [code, { name: s.label, href: s.href }] as const
  })
)

interface Msg {
  role: 'bot' | 'user'
  text: string
}

// Minimal markdown: **bold** only (engine templates use it).
function Bold({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <b key={i}>{p}</b> : <span key={i}>{p}</span>))}
    </>
  )
}

export default function BreakdownChat({ onClose }: { onClose?: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [widget, setWidget] = useState<Widget | null>(null)
  const [state, setState] = useState<ChatState | null>(null)
  const [photosOffered, setPhotosOffered] = useState(false)
  const [busy, setBusy] = useState(false)
  const [input, setInput] = useState('')
  // Photos are downscaled client-side, sent for AI analysis, and discarded
  // server-side — object URLs here are only the preview thumbnails.
  const [photos, setPhotos] = useState<{ name: string; url: string }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const [otp, setOtp] = useState(['', '', '', ''])
  const [phoneError, setPhoneError] = useState(false)
  const [failed, setFailed] = useState(false)
  const streamRef = useRef<HTMLDivElement>(null)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const booted = useRef(false)
  const lastPayload = useRef<Parameters<typeof turn>[0]>({})
  // Approximate position for geocode biasing — read ONLY if the browser says
  // permission is already granted (permissions.query never triggers a prompt).
  const geoBias = useRef<{ lat: number; lng: number } | null>(null)

  const scrollDown = () =>
    requestAnimationFrame(() => streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: 'smooth' }))

  async function turn(payload: { action?: { id: string; value?: string; lat?: number; lng?: number; count?: number; code?: string }; message?: string; photos?: string[] }, isRetry = false) {
    setBusy(true)
    setWidget(null)
    lastPayload.current = payload
    if (!isRetry && payload.message) setMsgs((m) => [...m, { role: 'user', text: payload.message! }])
    if (!isRetry && payload.action?.value) setMsgs((m) => [...m, { role: 'user', text: payload.action!.value! }])
    if (!isRetry && payload.photos) setMsgs((m) => [...m, { role: 'user', text: `📷 ${payload.photos!.length} photo${payload.photos!.length > 1 ? 's' : ''} sent` }])
    scrollDown()
    try {
      const started = Date.now()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ state, photosOffered, bias: geoBias.current, ...payload }),
      })
      const data = await res.json()
      setState(data.state)
      setPhotosOffered(data.photosOffered)
      // Reveal replies at reading cadence — typing dots stay visible between
      // bubbles (busy is still true), and the widget lands after the text.
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
      const alreadyWaited = Date.now() - started
      for (let i = 0; i < data.replies.length; i++) {
        const text: string = data.replies[i]
        const d = i === 0 && alreadyWaited > 900 ? 150 : Math.min(1300, 300 + text.length * 9)
        await sleep(d)
        setMsgs((m) => [...m, { role: 'bot', text }])
        scrollDown()
      }
      if (data.replies.length) await sleep(350)
      setWidget(data.widget)
      setInput('')
      setOtp(['', '', '', ''])
      setFailed(false)
    } catch {
      // Never leave a stranded driver with a dead widget — offer a retry,
      // and the phone line is always in the header.
      setFailed(true)
    } finally {
      setBusy(false)
      scrollDown()
    }
  }

  useEffect(() => {
    if (booted.current) return // StrictMode double-mount guard
    booted.current = true
    turn({}) // opening turn
    // Silent geocode bias: only when permission is ALREADY granted — never prompts.
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((p) => {
          if (p.state === 'granted') {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                geoBias.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
              },
              () => {},
              { enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 }
            )
          }
        })
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function shareLocation() {
    if (!navigator.geolocation) return turn({ action: { id: 'loc_manual', value: 'Type it instead' } })
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        geoBias.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        turn({
          action: {
            id: 'loc_share',
            value: '📍 Location shared',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          },
        })
      },
      () => turn({ action: { id: 'loc_manual', value: "Couldn't share — I'll type it" } })
    )
  }

  function otpInput(i: number, v: string) {
    const next = [...otp]
    next[i] = v.replace(/\D/g, '').slice(-1)
    setOtp(next)
    if (next[i] && i < 3) otpRefs.current[i + 1]?.focus()
    if (next.every((d) => d)) turn({ action: { id: 'otp_code', value: '• • • •', code: next.join('') } })
  }

  const send = () => input.trim() && !busy && turn({ message: input.trim() })

  // Downscale to ~1280px JPEG so multi-photo payloads stay small.
  function downscale(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const scale = Math.min(1, 1280 / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.onerror = reject
      img.src = url
    })
  }

  async function onFilesPicked(files: FileList | null) {
    if (!files || files.length === 0) return
    const list = [...files]
    setPhotos((p) => [...p, ...list.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }))])
    const dataUrls = await Promise.all(list.map(downscale))
    turn({ photos: dataUrls })
  }

  function openPicker() {
    if (fileRef.current) fileRef.current.value = ''
    fileRef.current?.click()
  }

  const submitPhone = () => {
    const digits = input.replace(/\D/g, '')
    if (digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))) {
      turn({ action: { id: 'phone_number', value: input.trim() } })
    } else {
      setPhoneError(true)
    }
  }

  return (
    <div className="flex h-full flex-col bg-rig-navy-deep text-white">
      {/* Header */}
      <header className="flex items-center justify-center border-b border-white/10 bg-[#1a2127] px-4 py-3">
        <div className="flex w-full max-w-xl items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-rig-green text-lg font-extrabold text-rig-navy-deep">R</div>
        <div className="flex-1">
          <div className="text-[15px] font-bold">Rig Roadside</div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-rig-green">
            <span className="h-1.5 w-1.5 rounded-full bg-rig-green" /> Dispatch open · 24/7
          </div>
        </div>
        <a
          href="tel:+18557442223"
          className="rounded-full border border-white/25 px-3 py-1.5 text-center text-[11.5px] leading-tight text-white"
        >
          Prefer to talk?
          <br />
          <b className="text-rig-green">1 (855) 744-2223</b>
        </a>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Minimize chat"
            className="ml-1 grid h-8 w-8 place-items-center rounded-full text-lg text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            ─
          </button>
        )}
        </div>
      </header>

      {/* Stream */}
      <div ref={streamRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-xl flex-col gap-2.5 px-4 py-4">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={
              m.role === 'bot'
                ? 'max-w-[85%] self-start rounded-2xl rounded-bl-sm bg-[#3a4854] px-3.5 py-2.5 text-[14.5px] leading-relaxed'
                : 'max-w-[85%] self-end rounded-2xl rounded-br-sm bg-rig-green px-3.5 py-2.5 text-[14.5px] font-semibold leading-relaxed text-rig-navy-deep'
            }
          >
            <Bold text={m.text} />
          </div>
        ))}
        {busy && (
          <div className="flex gap-1 self-start rounded-2xl rounded-bl-sm bg-[#3a4854] px-4 py-3">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/60" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/60 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/60 [animation-delay:300ms]" />
          </div>
        )}

        {/* Active widget */}
        {!busy && widget?.type === 'chips' && (
          <div className="flex flex-col gap-2">
            {widget.options.map((o, i) => (
              <button
                key={o.id}
                onClick={() => turn({ action: { id: o.id, value: o.label.replace(/^[^\w]+/, '') } })}
                style={{ animationDelay: `${i * 130}ms` }}
                className="chip-in w-full rounded-full border-[1.5px] border-rig-green px-4 py-3 text-center text-[15px] font-bold text-rig-green transition hover:bg-rig-green/10"
              >
                {o.label}
                {o.sub && <span className="block text-xs font-normal text-white/60">{o.sub}</span>}
              </button>
            ))}
            {/* Freeform escape hatch: the engine parses any message against all
                slots, so typing works at every step — chips are just faster. */}
            <div className="mt-1 flex gap-2 chip-in" style={{ animationDelay: `${widget.options.length * 130}ms` }}>
              <input
                placeholder="Or just type what's going on…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                className="flex-1 rounded-xl border border-white/20 bg-[#1a2127] px-3.5 py-2.5 text-base text-white outline-none sm:text-[14px] focus:ring-2 focus:ring-rig-green"
              />
              <button onClick={send} className="w-11 rounded-xl bg-rig-green text-base font-extrabold text-rig-navy-deep">
                ➤
              </button>
            </div>
          </div>
        )}

        {!busy && widget?.type === 'location' && (
          <div className="flex flex-col gap-2">
            <button
              onClick={shareLocation}
              className="chip-in w-full rounded-full bg-rig-green px-4 py-3 text-[15px] font-extrabold text-rig-navy-deep hover:bg-rig-green-dark"
            >
              📍 Share my location
            </button>
            <button
              onClick={() => turn({ action: { id: 'loc_manual', value: 'Type it instead' } })}
              style={{ animationDelay: '130ms' }}
              className="chip-in text-[13px] text-white/60 underline"
            >
              Type it instead
            </button>
          </div>
        )}

        {!busy && widget?.type === 'photos' && (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p.url} alt={p.name} className="h-[72px] w-[72px] rounded-xl border border-white/15 object-cover" />
              ))}
              <button
                onClick={openPicker}
                className="h-[72px] w-[72px] rounded-xl border-[1.5px] border-dashed border-rig-green text-2xl text-rig-green"
                aria-label="Add photo"
              >
                ＋
              </button>
            </div>
            <button
              onClick={() => turn({ action: { id: 'photos_done', value: 'Skip photos', count: photos.length } })}
              className="w-full rounded-full bg-rig-green px-4 py-3 text-[15px] font-extrabold text-rig-navy-deep hover:bg-rig-green-dark"
            >
              Skip photos
            </button>
          </div>
        )}

        {!busy && widget?.type === 'phone' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <input
                inputMode="tel"
                autoFocus
                placeholder="(555) 123-4567"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  setPhoneError(false)
                }}
                onKeyDown={(e) => e.key === 'Enter' && submitPhone()}
                className={`flex-1 rounded-xl border bg-[#1a2127] px-3.5 py-3 text-base text-white outline-none sm:text-[14.5px] focus:ring-2 ${phoneError ? 'border-[#ff7a6b] focus:ring-[#ff7a6b]' : 'border-white/20 focus:ring-rig-green'}`}
              />
              <button onClick={submitPhone} className="w-12 rounded-xl bg-rig-green text-lg font-extrabold text-rig-navy-deep">
                ➤
              </button>
            </div>
            {phoneError && (
              <p className="text-[12.5px] text-[#ff9a8d]">That doesn&apos;t look complete — we need a 10-digit mobile number to text your offers to.</p>
            )}
          </div>
        )}

        {!busy && widget?.type === 'otp' && (
          <div className="flex justify-center gap-2">
            {otp.map((d, i) => (
              <input
                key={i}
                ref={(el) => { otpRefs.current[i] = el }}
                value={d}
                autoFocus={i === 0}
                inputMode="numeric"
                maxLength={1}
                onChange={(e) => otpInput(i, e.target.value)}
                className="h-14 w-12 rounded-lg border border-white/20 bg-[#1a2127] text-center text-2xl font-extrabold text-rig-green outline-none focus:ring-2 focus:ring-rig-green"
              />
            ))}
          </div>
        )}

        {!busy && widget?.type === 'summary' && (
          <div className="flex flex-col gap-2.5">
            <div className="rounded-2xl border border-rig-green/40 bg-[#1a2127] px-4 py-3.5 text-[13.5px]">
              <div className="mb-2 text-[12px] font-bold uppercase tracking-wider text-rig-green">Service request</div>
              <table className="w-full">
                <tbody>
                  {Object.entries(widget.data).map(([k, v]) => (
                    <tr key={k}>
                      <td className="w-[34%] py-0.5 align-top text-[12.5px] text-white/55">{k}</td>
                      <td className="py-0.5 text-white">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => turn({ action: { id: 'submit', value: 'Send to dispatch' } })}
              className="w-full rounded-full bg-rig-green px-4 py-3 text-[15px] font-extrabold text-rig-navy-deep hover:bg-rig-green-dark"
            >
              Send to dispatch
            </button>
          </div>
        )}

        {!busy && widget?.type === 'text' && (
          <div className="flex gap-2">
            <textarea
              rows={2}
              autoFocus
              placeholder={widget.placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              className="flex-1 resize-none rounded-xl border border-white/20 bg-[#1a2127] px-3.5 py-3 text-base text-white outline-none sm:text-[14.5px] focus:ring-2 focus:ring-rig-green"
            />
            <button onClick={send} className="w-12 rounded-xl bg-rig-green text-lg font-extrabold text-rig-navy-deep">
              ➤
            </button>
          </div>
        )}

        {!busy && widget?.type === 'declined' && (
          <a href="/" className="self-center rounded-full border border-white/25 px-5 py-2.5 text-sm text-white/80">
            ← Back to bigrig.app
          </a>
        )}

        {!busy && failed && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-[13px] text-white/60">Connection hiccup — nothing lost.</p>
            <button
              onClick={() => turn(lastPayload.current, true)}
              className="rounded-full bg-rig-green px-5 py-2.5 text-sm font-extrabold text-rig-navy-deep"
            >
              ↻ Retry
            </button>
          </div>
        )}

        {/* Always-available photo escape hatch — photos substitute for typed
            answers (tire size, vehicle plate, surroundings) per the contract. */}
        {!busy && widget && !['photos', 'otp', 'summary', 'done', 'declined'].includes(widget.type) && (
          <button
            onClick={openPicker}
            className="self-center rounded-full border border-white/20 px-4 py-1.5 text-[12.5px] text-white/60 transition hover:border-rig-green hover:text-rig-green"
          >
            📷 Send a photo instead
          </button>
        )}

        {/* No `capture` attribute: phones then offer the native chooser
            (photo library AND camera) instead of forcing the camera. */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => onFilesPicked(e.target.files)}
        />
        </div>
      </div>

      {/* Directory link — state-aware once the conversation knows where they are */}
      <footer className="flex justify-center border-t border-white/10 bg-[#1a2127] px-4 py-2">
        {(() => {
          const covered = state?.location.state ? COVERED.get(state.location.state) : undefined
          return (
            <a
              href={covered?.href || DIRECTORY_ROOT}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12.5px] text-white/50 transition hover:text-rig-green"
            >
              Browse Rig mechanics{covered ? ` in ${covered.name}` : ''} →
            </a>
          )
        })()}
      </footer>
    </div>
  )
}
