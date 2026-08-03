# Breakdown-chat backend spec (rig-web-services work)

What the chat needs from the backend to go from demo to dispatching real
mechanics. The chat side (this repo) is feature-complete against the business
rules in `voice-agent-prompt-v3.05.txt`; everything below is server work.

## 1. Partial leads (decided — the rules)

**Gate:** `phone.verified` — nothing else. Because phone+OTP comes right after
the problem question in the slot order, a verified phone structurally
guarantees service type, vehicle class, eligibility, and a problem
description are already captured.

**Mechanism — checkpoint, not abandonment detection** (chat state lives in
the browser; the server holds nothing between turns, so tab-close is
invisible). Mirrors the phone flow's placeholder-then-enrich pattern:

1. **OTP verifies → create the lead immediately**: status `PARTIAL`, source
   `CHAT-GEN`, keyed by `state.conversationId` (minted server-side at
   conversation birth, survives every turn).
2. **Every subsequent turn upserts** the same lead as location, photos, tow
   details, and name arrive.
3. **"Send to dispatch" finalizes** it into the normal `AI_REVIEW` queue —
   same human-in-the-loop as phone intakes.

**Staleness rule:** a partial with no turn-updates for **~5 minutes** is
surfaced to the dispatcher as *callable*, carrying its slot flags
(`LOCATION_UNRESOLVED`, `TIRE_SIZE_UNKNOWN`, `TOW_DROPOFF_UNKNOWN`, `RV`,
`WINCH`, `URGENT_UNSAFE_LOCATION`) so the callback script is obvious. While
updates keep arriving, it's "in progress" — nobody calls mid-chat.

**Idempotency:** upserts key on `conversationId`; additionally, at most one
open partial per verified phone number — a new conversation from the same
number within ~24h attaches to the open partial (same guard pattern as
`CreateServiceRequestFromTranscript`).

**Consent:** covered — the phone ask says "If we get cut off, dispatch calls
you back." Declined/ineligible conversations never reach the phone slot, so
they can't become partials.

## 2. OTP endpoints (Twilio Verify)

- `POST /chat/otp/send` { conversationId, phone } — rate-limited per number
  and per IP (OTP sends are a toll-fraud target).
- `POST /chat/otp/check` { conversationId, phone, code } — on success, store
  the conversationId→verified-phone mapping and **create the partial lead**
  (see above).
- Auth: shared-secret header from the chat's API route; never callable
  directly from browsers.

## 3. Photo storage

Chat currently downscales client-side (~1280px JPEG), the vision model reads
them (description, tire size, make/model), and the images are discarded.
For production: accept the same downscaled images, store to GCS, attach URLs
to the lead so dispatcher + mechanics see them. The vision readout and driver
notes already ride the state (`photoSummary`, `photoNotes`).

## 4. Intake finalize

`POST /chat/submit` { conversationId, state } → flips the partial to
`AI_REVIEW` (or creates it whole if somehow absent), tagged `CHAT-GEN`.
Structured fields map 1:1 to what `TranscriptExtractorAction` produces for
calls — no transcript extraction step needed for chat.

## 5. Security carried over from the earlier review

- Verify the `ElevenLabs-Signature` HMAC on `POST /callcenter/ai/transcript`
  (currently unauthenticated) before chat adds more traffic near it.
- `metadata.phone_call` is absent on non-phone conversations — the existing
  webhook NPEs on such payloads; null-guard before any chat/webhook sharing.

## Open decisions

- Real mechanic-count for the "N mechanics within range" teaser (currently a
  deterministic placeholder; directory stats or network density query).
- Mile1 integration in `geo.ts` for corridor-native resolution — the geo
  bake-off (scripts/geo-eval.mjs) shows mile markers are the ONE case no
  Google strategy solves (28km best-miss across 7 strategies).
- Places API (New) migration: benchmarked identical to legacy (8/10 vs 8/10)
  — zero accuracy gain, so purely a future legacy-sunset hygiene task.
- Late-night expectation copy (after 10pm CST, per the voice rules).
