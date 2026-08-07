import { NextRequest, NextResponse } from 'next/server'
import { runTurn, TurnRequest, TurnResponse } from '@/lib/chat/engine'
import { updateLead } from '@/lib/chat/backend'

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
    // Device (mobile/desktop) comes from the user agent — it travels with the
    // journey into the lead payload and the end-of-chat Slack message.
    if (!res.state.journey && body.journey) {
      res.state.journey = body.journey
      const ua = req.headers.get('user-agent') || ''
      res.state.journey.device = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop'
    }
    logTranscript(body, res)
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
