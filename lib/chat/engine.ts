// Turn engine: merges widget actions and LLM extractions into ChatState,
// enforces the scope policy, and emits the next question + widget.
// Replies are TEMPLATED — the engine picks them from the slot ladders, so the
// agent structurally cannot drift off the intake. The LLM only extracts.
import {
  ChatState,
  MAX_ATTEMPTS,
  SlotId,
  computeFlags,
  eligibility,
  initialState,
  locationTier,
  nextSlot,
} from './slots'
import { Extraction, analyzePhotos, extract } from './llm'
import { resolveLocation } from './geo'

export type Widget =
  | { type: 'chips'; options: { id: string; label: string; sub?: string }[] }
  | { type: 'text'; placeholder: string }
  | { type: 'location' }
  | { type: 'photos' }
  | { type: 'phone' }
  | { type: 'otp' }
  | { type: 'summary'; data: Record<string, string> }
  | { type: 'done' }
  | { type: 'declined' }

export interface TurnRequest {
  state: ChatState | null
  photosOffered?: boolean
  // exactly one of:
  action?: { id: string; value?: string; lat?: number; lng?: number; count?: number } // widget interactions (no LLM)
  message?: string // freeform text (LLM extraction)
  photos?: string[] // downscaled data-URLs — analyzed by the vision model, then discarded
  // Approximate device position, read silently when geolocation permission was
  // already granted (never prompted for). Used only to bias geocoding.
  bias?: { lat: number; lng: number } | null
}

export interface TurnResponse {
  replies: string[]
  widget: Widget
  state: ChatState
  photosOffered: boolean
  userEcho?: string
}

const REDIRECT = "This chat is just for getting you unstuck — for everything else, head to bigrig.app."
const META: Record<string, string> = {
  meta_cost:
    "Fair question — mechanics send you competing offers with exact prices before you commit, and there's a $10 dispatch deposit (applied to the job).",
  meta_time: 'Offers usually land within minutes of dispatch, by text.',
  meta_deposit: "The $10 deposit confirms the callout and is applied to the job — you're never charged for the service until it's done.",
  meta_how:
    "Quick version: you tell me what broke and where. A **human dispatcher** reviews it, then vetted diesel mechanics near you send **competing offers by text** — price and ETA up front. You pick one, they head your way, and you pay through Rig only when the work's done. We've been doing this for 6,000+ mechanics nationwide, 24/7.",
  meta_who:
    "Honest answer: I'm an AI chat bot 🤖 — but I'm just the intake. Once I've got the important details, a **human dispatcher** takes over and routes your request to several mechanics close to you. The robot part is only so you get help faster at 2am.",
}

// Deterministic placeholder for the nearby-mechanic teaser (4–9), seeded from
// the location so it's stable within a conversation.
// TODO: replace with a real network-density lookup from rig-web-services.
function mechanicsNearby(seedText: string): number {
  let h = 0
  for (const c of seedText) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return 4 + (h % 6)
}

const SERVICE_TEASER: Record<string, string> = {
  tire: 'Tire techs run on our network around the clock — let’s get you matched.',
  tow: 'Tow operators are on the network 24/7 — let’s get you matched.',
  service: 'Mobile diesel mechanics are on the network 24/7 — let’s get you matched.',
}

// Question templates per slot, indexed by attempt (the fallback ladder).
function question(slot: SlotId, s: ChatState): { replies: string[]; widget: Widget } {
  switch (slot) {
    case 'service':
      return {
        replies: ["Hey — sorry you're stuck. Let's get you moving. **Tap one, or just tell me what happened.**"],
        widget: {
          type: 'chips',
          options: [
            { id: 'svc_tire', label: '🛞 Tire', sub: 'Blowout, flat, replacement' },
            { id: 'svc_tow', label: '🪝 Tow', sub: 'Need a lift to a shop' },
            { id: 'svc_service', label: '🔧 Mobile service', sub: 'Engine, brakes, electrical, anything else' },
          ],
        },
      }
    case 'vehicle_class':
      return {
        replies: ['**What are you driving?**'],
        widget: {
          type: 'chips',
          options: [
            { id: 'vc_semi', label: 'Semi / tractor-trailer' },
            { id: 'vc_box_truck', label: 'Box truck' },
            { id: 'vc_rv', label: 'RV / motorhome' },
            { id: 'vc_pickup', label: 'Pickup / van' },
            { id: 'vc_other', label: 'Something else' },
          ],
        },
      }
    case 'fuel':
      return {
        replies: ['**Diesel or gas?** (We service diesel vehicles and RVs.)'],
        widget: {
          type: 'chips',
          options: [
            { id: 'fuel_diesel', label: 'Diesel' },
            { id: 'fuel_gas', label: 'Gas' },
          ],
        },
      }
    case 'problem':
      return {
        replies: ["**What happened?** A sentence or two is plenty — I'll ask if I need more."],
        widget: { type: 'text', placeholder: "e.g. Blew the outside drive tire, I'm on the shoulder" },
      }
    case 'safety':
      return {
        replies: ['Are you in a safe spot on the shoulder, or blocking a lane?'],
        widget: {
          type: 'chips',
          options: [
            { id: 'safe_shoulder', label: 'Safe on shoulder' },
            { id: 'safe_blocking', label: 'Blocking / unsafe' },
          ],
        },
      }
    case 'location': {
      // Confirm-back: geocoded candidates get tapped, not re-described.
      if (s.location.candidates?.length) {
        return {
          replies: ['**Which of these matches where you are?**'],
          widget: {
            type: 'chips',
            options: [
              ...s.location.candidates.map((c, i) => ({
                id: `loc_pick_${i}`,
                label: `📍 ${c.name}`,
                sub: c.address,
              })),
              { id: 'loc_none', label: 'None of these' },
            ],
          },
        }
      }
      const ladder = [
        '**Where are you?** Sharing your location is fastest — exact GPS beats describing where you are.',
        'What highway and direction — and the **nearest exit number or truck stop**? (Exits map better than mile markers.)',
        'What did the last road sign or exit you passed say? Even a nearby town and road works.',
      ]
      return {
        replies: [ladder[Math.min(s.location.attempts, ladder.length - 1)]],
        widget: s.location.attempts === 0 ? { type: 'location' } : { type: 'text', placeholder: 'e.g. I-40 west, exit 195, or the Pilot in Tucson' },
      }
    }
    case 'tire_size': {
      const ladder = [
        "**What size tire?** It's on the sidewall — e.g. 295/75R22.5. A photo of the sidewall works too.",
        'No worries — a photo of the tire sidewall covers it, or we can let the mechanic confirm on arrival.',
      ]
      return {
        replies: [ladder[Math.min(s.tireSize.attempts, ladder.length - 1)]],
        widget: { type: 'text', placeholder: 'e.g. 295/75R22.5 — or tap photos below' },
      }
    }
    case 'vehicle_detail': {
      const example = s.vehicleClass === 'rv' ? '2020 Winnebago Adventurer' : s.vehicleClass === 'pickup' || s.vehicleClass === 'van' ? '2021 Ford F-350' : '2019 Freightliner Cascadia'
      const ladder = [
        `**Make and model?** e.g. ${example} — helps the mechanic bring the right parts.`,
        "Not sure? What's on the grille — or snap a photo of the registration or door plate.",
      ]
      return {
        replies: [ladder[Math.min(s.vehicle.attempts, ladder.length - 1)]],
        widget: { type: 'text', placeholder: 'e.g. 2019 Freightliner Cascadia' },
      }
    }
    case 'photos':
      return {
        replies: ['Photos help mechanics bid accurately — the damage, plus one wide shot. **Optional, but worth 20 seconds.**'],
        widget: { type: 'photos' },
      }
    case 'phone':
      return {
        replies: [
          "Quick one before we go on — **your mobile number.** If we get cut off, dispatch calls you back, and mechanics' offers arrive by text.",
        ],
        widget: { type: 'phone' },
      }
    case 'summary':
      return { replies: ["Here's what I'm sending to dispatch:"], widget: { type: 'summary', data: summaryData(s) } }
    case 'declined':
      return {
        replies: ["We're diesel truck and RV specialists only, so we can't help with this one — sorry we can't get you moving."],
        widget: { type: 'declined' },
      }
    case 'done':
      return { replies: [], widget: { type: 'done' } }
  }
}

export function summaryData(s: ChatState): Record<string, string> {
  const svc = { tire: 'Tire service', tow: 'Tow', service: 'Mobile service' }[s.service || 'service']
  const veh = [s.vehicle.year, s.vehicle.make, s.vehicle.model].filter(Boolean).join(' ') ||
    { semi: 'Semi / tractor-trailer', box_truck: 'Box truck', rv: 'RV / motorhome', pickup: 'Pickup', van: 'Van', car: 'Car', other: 'Vehicle' }[s.vehicleClass || 'other']
  return {
    Service: svc + (s.vehicleClass === 'rv' ? ' (RV)' : ''),
    Vehicle: veh,
    Problem: s.problem.description || '—',
    Location: s.location.resolved || s.location.text || '— (dispatcher will confirm by phone)',
    Photos: s.photos ? `${s.photos}${s.photoSummary ? ` — ${s.photoSummary}` : ''}` : 'none',
    ...(s.photoNotes ? { Notes: s.photoNotes } : {}),
    Phone: (s.phone.number || '—') + (s.phone.verified ? ' ✓ verified' : ''),
    ...(computeFlags(s).length ? { Flags: computeFlags(s).join(', ') } : {}),
  }
}

function mergeExtraction(s: ChatState, e: Extraction): string[] {
  const acks: string[] = []
  if (e.service && !s.service) s.service = e.service
  if (e.vehicle_class && !s.vehicleClass) s.vehicleClass = e.vehicle_class
  if (e.fuel && !s.fuel) s.fuel = e.fuel
  if (e.make && !s.vehicle.make) s.vehicle.make = e.make
  if (e.model && !s.vehicle.model) s.vehicle.model = e.model
  if (e.year && !s.vehicle.year) s.vehicle.year = e.year
  if (e.tire_size && !s.tireSize.value) s.tireSize.value = e.tire_size
  if (e.problem && !s.problem.description) s.problem.description = e.problem
  if (e.drivable !== null && s.problem.drivable === null) s.problem.drivable = e.drivable
  if (e.safety && s.safety === null) {
    s.safety = e.safety
    if (e.safety === 'blocking')
      acks.push("Understood — **if you're in danger, call 911 first.** I'm flagging this as urgent for dispatch.")
  }
  if (e.location_state && !s.location.state) s.location.state = e.location_state.toLowerCase()
  if (e.location_text) s.location.text = e.location_text
  return acks
}

export async function runTurn(req: TurnRequest): Promise<TurnResponse> {
  const s: ChatState = req.state ?? initialState()
  let photosOffered = req.photosOffered ?? false
  const replies: string[] = []
  let userEcho: string | undefined

  const activeBefore = nextSlot(s, photosOffered)

  if (req.action) {
    const a = req.action
    userEcho = a.value
    if (a.id.startsWith('svc_')) {
      s.service = a.id.slice(4) as ChatState['service']
      replies.push(SERVICE_TEASER[s.service!])
    } else if (a.id.startsWith('vc_')) s.vehicleClass = a.id.slice(3) as ChatState['vehicleClass']
    else if (a.id.startsWith('fuel_')) s.fuel = a.id.slice(5) as ChatState['fuel']
    else if (a.id === 'safe_shoulder') s.safety = 'shoulder'
    else if (a.id === 'safe_blocking') {
      s.safety = 'blocking'
      replies.push("Understood — **if you're in danger, call 911 first.** I'm flagging this as urgent for dispatch.")
    } else if (a.id === 'loc_share' && a.lat !== undefined && a.lng !== undefined) {
      s.location.lat = a.lat
      s.location.lng = a.lng!
      s.location.resolved = a.value || `${a.lat.toFixed(4)}, ${a.lng!.toFixed(4)}`
      s.location.tier = 'gold'
      replies.push(
        `Location locked in. 📍 **${mechanicsNearby(s.location.resolved)} mechanics** on the Rig network are within range of your spot.`
      )
    } else if (a.id === 'photo_ok') {
      // Driver confirmed the vision read — nothing to change, move on.
    } else if (a.id === 'photo_note') {
      s.awaitingPhotoNote = true
      return {
        replies: ['Go ahead — anything the mechanic should know about what the photos show.'],
        widget: { type: 'text', placeholder: 'e.g. inner tire looks fine, just the outer' },
        state: s,
        photosOffered,
        userEcho,
      }
    } else if (a.id === 'loc_manual') {
      s.location.attempts += 1 // moves the ladder to the typed fallback
    } else if (a.id.startsWith('loc_pick_')) {
      const c = s.location.candidates?.[Number(a.id.slice(9))]
      if (c) {
        s.location.lat = c.lat
        s.location.lng = c.lng
        s.location.resolved = `${c.name}, ${c.address}`
        if (c.state) s.location.state = c.state
        s.location.tier = 'gold'
        s.location.candidates = null
        replies.push(
          `Locked in: **${c.name}**. 📍 **${mechanicsNearby(c.name)} mechanics** on the Rig network are within range.`
        )
      }
    } else if (a.id === 'loc_none') {
      s.location.candidates = null
      s.location.attempts += 1
    } else if (a.id === 'photos_done') {
      s.photos = a.count ?? s.photos
      photosOffered = true
    } else if (a.id === 'phone_number') {
      s.phone.number = a.value || null
      s.phone.otpSent = true
      replies.push('Texted you a 4-digit code — enter it here:')
      return { replies, widget: { type: 'otp' }, state: s, photosOffered, userEcho }
    } else if (a.id === 'otp_code') {
      // Mock verification: real build calls rig-web-services / Twilio Verify.
      s.phone.verified = true
      replies.push("✓ Verified. You're all set.")
    } else if (a.id === 'submit') {
      s.submitted = true
      s.flags = computeFlags(s)
      replies.push('🚀 **Sent.** A dispatcher is reviewing it now, and nearby mechanics are being notified.')
      replies.push(
        `You'll get a **text at ${s.phone.number}** with a live link the moment offers come in — usually within minutes. You can close this window; everything continues by text.`
      )
      return { replies, widget: { type: 'done' }, state: s, photosOffered, userEcho }
    }
  } else if (req.photos && req.photos.length > 0) {
    // Vision loop: analyze in-request, keep only the readout — images discarded.
    const n = req.photos.length
    userEcho = `📷 ${n} photo${n > 1 ? 's' : ''} sent`
    const analysis = await analyzePhotos(req.photos, contextLine(s))
    s.photos += n
    photosOffered = true
    if (analysis.tire_size && !s.tireSize.value) s.tireSize.value = analysis.tire_size
    if (analysis.make && !s.vehicle.make) s.vehicle.make = analysis.make
    if (analysis.model && !s.vehicle.model) s.vehicle.model = analysis.model
    s.photoSummary = s.photoSummary ? `${s.photoSummary}; ${analysis.description}` : analysis.description
    replies.push(
      analysis.useful
        ? `From your photo${n > 1 ? 's' : ''}, here's what I can see: **${analysis.description}**${analysis.tire_size ? ` — tire size reads ${analysis.tire_size}` : ''}. Did I get that right?`
        : `Honestly, I couldn't make much of ${n > 1 ? 'those' : 'that'} — ${analysis.description}. ${n > 1 ? "They'll" : "It'll"} still go to the dispatcher. Anything to add?`
    )
    return {
      replies,
      widget: {
        type: 'chips',
        options: [
          { id: 'photo_ok', label: '✓ Looks right' },
          { id: 'photo_note', label: 'Add a note' },
        ],
      },
      state: s,
      photosOffered,
      userEcho,
    }
  } else if (req.message && s.awaitingPhotoNote) {
    userEcho = req.message
    s.photoNotes = s.photoNotes ? `${s.photoNotes}; ${req.message}` : req.message
    s.awaitingPhotoNote = false
    replies.push('Noted — that goes to the dispatcher and mechanics along with the photo readout.')
  } else if (req.message) {
    userEcho = req.message
    const e = await extract(req.message, contextLine(s))
    if (e.intent === 'off_topic') {
      replies.push(REDIRECT)
    } else if (e.intent.startsWith('meta_')) {
      replies.push(META[e.intent])
    } else {
      const acks = mergeExtraction(s, e)
      // Always lead with the model's situational acknowledgment — the questions
      // stay templated (drift-proof), but the transitions sound human.
      if (e.ack) replies.push(e.ack)
      replies.push(...acks)
      // Location resolution: geocode the model's cleaned-up query and let the
      // driver confirm a concrete candidate. Falls back to trusting specific
      // text when the geocoder has no answer (or no key is configured).
      let gotCandidates = false
      const locTier = locationTier(s)
      if (locTier !== 'gold' && locTier !== 'good' && e.location_query) {
        // Bias order: coordinates already in the conversation beat the silent
        // device-position hint; either beats nothing.
        const biasPoint =
          s.location.lat !== null && s.location.lng !== null
            ? { lat: s.location.lat, lng: s.location.lng }
            : req.bias || null
        const cands = await resolveLocation(e.location_query, s.location.state, biasPoint)
        if (cands.length) {
          s.location.candidates = cands
          gotCandidates = true
        } else if (e.location_specific && e.location_text) {
          s.location.resolved = e.location_text
          s.location.tier = 'good'
          replies.push(
            `Locked in your location as: **${e.location_text}** — the dispatcher will see exactly that. **${mechanicsNearby(e.location_text)} mechanics** on the Rig network are within range.`
          )
        }
      }
      // Attempt accounting: if the active slot didn't move, count the try.
      if (!gotCandidates && activeBefore === nextSlot(s, photosOffered)) {
        if (activeBefore === 'location') s.location.attempts += 1
        if (activeBefore === 'vehicle_detail') s.vehicle.attempts += 1
        if (activeBefore === 'tire_size') s.tireSize.attempts += 1
      }
      // Ladder exhausted → accept partial with honest handoff line.
      if (activeBefore === 'location' && s.location.attempts >= MAX_ATTEMPTS && locationTier(s) !== 'gold' && locationTier(s) !== 'good') {
        replies.push("No problem — the dispatcher will confirm your exact spot when they call. Let's keep going.")
        s.location.tier = 'weak'
        s.location.resolved = null
      }
      if (activeBefore === 'tire_size' && s.tireSize.attempts >= MAX_ATTEMPTS - 1 && !s.tireSize.value) {
        replies.push("We'll let the mechanic confirm the size on arrival.")
      }
    }
  }

  const slot = nextSlot(s, photosOffered)
  const q = question(slot, s)
  // Avoid repeating the identical question when a meta/off-topic answer was given:
  replies.push(...q.replies)
  return { replies, widget: q.widget, state: s, photosOffered, userEcho }
}

function contextLine(s: ChatState): string {
  return `Known so far: service=${s.service}, vehicleClass=${s.vehicleClass}, fuel=${s.fuel}, problem=${s.problem.description ? 'yes' : 'no'}, location=${s.location.resolved || s.location.text || 'no'}`
}
