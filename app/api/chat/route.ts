import { NextRequest, NextResponse } from 'next/server'
import { runTurn, TurnRequest } from '@/lib/chat/engine'

export const dynamic = 'force-dynamic'

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
