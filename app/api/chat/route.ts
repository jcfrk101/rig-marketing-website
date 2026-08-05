import { NextRequest, NextResponse } from 'next/server'
import { runTurn, TurnRequest, TurnResponse } from '@/lib/chat/engine'
import { updateLead } from '@/lib/chat/backend'
import { postChatSlack } from '@/lib/chat/slack'

export const dynamic = 'force-dynamic'

// Transcript logging, two sinks:
// 1. stdout as structured JSON — lands in Cloud Logging on Cloud Run,
//    queryable/exportable for evaluation immediately, zero dependencies.
// 2. rig-web-services POST /chat/transcript (when RIG_API_URL/RIG_API_KEY are
//    set) — durable per-conversation log that also surfaces in the dispatcher
//    AI Review view once the lead finalizes. Fire-and-forget; never blocks or
//    fails the turn.
function logTranscript(req: TurnRequest, res: TurnResponse) {
  const now = Math.floor(Date.now() / 1000)
  const entries: { role: string; text: string; at_epoch: number }[] = []
  const driverText =
    req.message ?? req.action?.value ?? (req.photos?.length ? `[sent ${req.photos.length} photo(s)]` : null)
  if (driverText) entries.push({ role: 'driver', text: driverText, at_epoch: now })
  for (const r of res.replies) entries.push({ role: 'bot', text: r, at_epoch: now })
  if (entries.length === 0) return

  const conversationId = res.state.conversationId
  console.log(
    JSON.stringify({
      evt: 'chat_transcript',
      conversationId,
      slot: res.widget?.type,
      submitted: res.state.submitted,
      declined: res.state.declined,
      entries,
    })
  )

  const base = process.env.RIG_API_URL
  const key = process.env.RIG_API_KEY
  if (base && key) {
    fetch(`${base}/chat/transcript`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Rig-Api-Key': key },
      body: JSON.stringify({ conversation_id: conversationId, entries }),
    }).catch((err) => console.error('transcript forward failed', err))
  }
}

// Live chat activity → the dedicated #chat Slack channel. Every driver
// interaction posts (not just post-OTP): a "chat started" message with the
// journey (referrer, landing page, pages browsed) on first input, then a
// compact per-turn line with everything known so far.
function slackLog(req: TurnRequest, res: TurnResponse) {
  const interacted = !!(req.message || req.action || (req.photos && req.photos.length))
  if (!interacted) return // the greeting render is a view, not an interaction
  const s = res.state
  const id = s.conversationId.slice(0, 8)
  const driverText =
    req.message ?? req.action?.value ?? req.action?.id ?? `[sent ${req.photos!.length} photo(s)]`

  const known: string[] = []
  if (s.service) known.push(s.service)
  if (s.vehicleClass) known.push(s.vehicleClass)
  if (s.problem.description) known.push(`“${s.problem.description}”`)
  if (s.location.resolved || s.location.text) known.push(`📍 ${s.location.resolved || s.location.text}`)
  if (s.name) known.push(s.name)
  if (s.phone.number) known.push(`📱 …${s.phone.number.slice(-4)}${s.phone.verified ? ' ✓' : ''}`)

  if (!s.slackStarted) {
    s.slackStarted = true
    const j = s.journey
    const ref = j?.referrer || ''
    const src = !ref
      ? 'direct / unknown'
      : /google\./i.test(ref)
        ? `Google search (${ref})`
        : /bing\./i.test(ref)
          ? `Bing search (${ref})`
          : ref
    postChatSlack(
      `🆕 Chat started [${id}]\n` +
        `From: ${src}\n` +
        `Landing: ${j?.landing ?? 'unknown'} · ${j?.views ?? 1} page view${(j?.views ?? 1) > 1 ? 's' : ''}\n` +
        (j?.pages?.length ? `Pages: ${j.pages.slice(-6).join(' → ')}\n` : '') +
        `First input: ${driverText}` +
        (known.length ? `\nKnown: ${known.join(' · ')}` : '')
    )
  } else {
    postChatSlack(`💬 [${id}] ${driverText}${known.length ? `\n${known.join(' · ')}` : ''}`)
  }
}

// Health/config probe: which LLM provider is this deployment actually running?
// No secrets exposed — just the switch position and model names.
export async function GET() {
  const provider = process.env.LLM_PROVIDER || 'mock'
  const model =
    provider === 'openai'
      ? process.env.OPENAI_MODEL || 'gpt-4o-mini'
      : provider === 'vertex'
        ? process.env.VERTEX_MODEL || 'gemini-2.5-flash'
        : 'deterministic-mock'
  return NextResponse.json({ ok: true, provider, model })
}

export async function POST(req: NextRequest) {
  let body: TurnRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
  try {
    const res = await runTurn(body)
    // Journey binds once, at conversation start, then rides the state.
    if (!res.state.journey && body.journey) res.state.journey = body.journey
    logTranscript(body, res)
    slackLog(body, res)
    // Partial-lead snapshot: every post-verification turn upserts the latest
    // structured payload so the stale promoter always has current data.
    if (res.state.phone.verified && !res.state.submitted) {
      void updateLead(res.state)
    }
    return NextResponse.json(res)
  } catch (err) {
    console.error('chat turn failed', err)
    return NextResponse.json(
      {
        replies: [
          "Something hiccuped on our side. If this keeps up, call us — **1 (855) 744-2223** answers 24/7.",
        ],
        widget: { type: 'text', placeholder: 'Try again…' },
        state: body.state,
        photosOffered: body.photosOffered ?? false,
      },
      { status: 200 }
    )
  }
}
