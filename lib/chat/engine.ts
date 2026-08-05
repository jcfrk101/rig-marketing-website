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
import { resolveLocation, reverseGeocode } from './geo'
import { addPhoto, checkOtp, removePhoto, sendOtp, submitLead } from './backend'
import { decodeVin } from './vin'

export type Widget =
  | { type: 'chips'; options: { id: string; label: string; sub?: string }[] }
  | { type: 'text'; placeholder: string }
  | { type: 'location' }
  | { type: 'map'; lat: number; lng: number; label: string }
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
  action?: { id: string; value?: string; lat?: number; lng?: number; count?: number; code?: string; index?: number; ctx?: string } // widget interactions (no LLM)
  message?: string // freeform text (LLM extraction)
  photos?: string[] // downscaled data-URLs — analyzed by the vision model, then discarded
  // Approximate device position, read silently when geolocation permission was
  // already granted (never prompted for). Used only to bias geocoding.
  bias?: { lat: number; lng: number } | null
  // Client-captured page journey (referrer, landing, pages) — bound to the
  // conversation on its first turn by the API route.
  journey?: { landing: string | null; referrer: string | null; views: number; pages: string[] } | null
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
  // Pricing rule (voice-agent prompt): never quote repair prices — mechanics
  // price after details are confirmed. The $10 deposit is the only number.
  meta_cost:
    'Pricing comes from the mechanics themselves — once your details go out, they respond with exact price and ETA offers by text, and you pick. The only fixed number is the **$10 expedited-service deposit**, which is applied toward your final balance.',
  meta_time: 'On average you hear back within **five to ten minutes** of dispatch, by text.',
  meta_deposit:
    "The $10 deposit is for expedited service and is **applied toward your final balance**. It's refundable if we can't dispatch a mechanic for your request — not if you decline offers over price or ETA after dispatch starts.",
  meta_how:
    "Quick version: you tell me what broke and where. A **human dispatcher** reviews it, then vetted diesel mechanics near you send **competing offers by text** — price and ETA up front. You pick one, they head your way, and you pay through Rig only when the work's done. We've been doing this for 6,000+ mechanics nationwide, 24/7.",
  meta_who:
    "Honest answer: I'm an AI chat bot 🤖 — but I'm just the intake. Once I've got the important details, a **human dispatcher** takes over and routes your request to several mechanics close to you. The robot part is only so you get help faster at 2am.",
  meta_coverage: 'Yes — **we have mechanics wherever you need them**, nationwide.',
  meta_insurance:
    "We don't bill insurance or warranties directly, but we can send you an itemized invoice to submit for reimbursement.",
}

// Services we explicitly don't offer (docs/voice-agent-prompt-v3.05.txt).
// Refusals redirect to what we CAN do — the chat stays open.
const REFUSALS: Record<string, string> = {
  tire_patch: "We don't patch tires — we **replace** them, which gets you rolling safer. Want a replacement instead?",
  windshield: "Windshield replacement isn't something we do — sorry. If anything mechanical, tire, or tow comes up, we've got you.",
  locksmith: "Lockouts aren't something we handle — sorry. If anything mechanical, tire, or tow comes up, we've got you.",
  gas_car: "We're diesel truck and RV specialists — for a gas car we can only help with a winch-out if you're stuck.",
  interior_rv: "Interior RV repairs aren't something we do — our RV work is mechanical: engine, chassis, leveling, slideouts.",
  rv_roof: "RV roof leaks aren't something we handle — our RV work is mechanical: engine, chassis, leveling, slideouts.",
  rv_ac_fridge: "RV air conditioners and refrigerators aren't something we service — our RV work is mechanical.",
  body_repair: "Body work isn't something we do — we keep trucks *running*. If anything mechanical, tire, or tow comes up, we've got you.",
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
// `reask` = a freeform answer didn't fill this slot — clarify, don't repeat.
function question(slot: SlotId, s: ChatState, reask = false): { replies: string[]; widget: Widget } {
  switch (slot) {
    case 'service':
      return {
        replies: [
          reask
            ? '**Which of these fits best?** Tire trouble, a tow, or a mechanic out to you?'
            : "Hey — sorry you're stuck. Let's get you moving. **Tap one, or just tell me what happened.**",
        ],
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
      // Confirm-back: geocoded candidates get tapped, not re-described. A
      // single candidate goes straight to the map — the pin IS the confirm.
      if (s.location.candidates?.length) {
        const single = s.location.candidates.length === 1
        if (single) {
          const c = s.location.candidates[0]
          return {
            replies: [
              `Looks like you're at **${c.name}** — ${c.address}. **Drag the pin if it's off**, then confirm.`,
            ],
            widget: { type: 'map', lat: c.lat, lng: c.lng, label: c.name },
          }
        }
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
    case 'tire_position':
      return {
        replies: ['**Which tire is it?**'],
        widget: {
          type: 'chips',
          options: [
            { id: 'tirepos_steer', label: 'Steer (front)' },
            { id: 'tirepos_drive', label: 'Drive' },
            { id: 'tirepos_trailer', label: 'Trailer' },
          ],
        },
      }
    case 'tire_side':
      return {
        replies: ['**Driver or passenger side?**'],
        widget: {
          type: 'chips',
          options: [
            { id: 'tireside_driver', label: 'Driver side' },
            { id: 'tireside_passenger', label: 'Passenger side' },
          ],
        },
      }
    case 'tire_dual':
      return {
        replies: ["**Inner or outer tire?** They're duals back there — helps the mechanic bring the right one."],
        widget: {
          type: 'chips',
          options: [
            { id: 'tiredual_outer', label: 'Outer' },
            { id: 'tiredual_inner', label: 'Inner' },
            { id: 'tiredual_both', label: 'Both' },
          ],
        },
      }
    case 'tire_spare':
      return {
        replies: ['**Do you have a spare?**'],
        widget: {
          type: 'chips',
          options: [
            { id: 'spare_yes', label: 'Yes, got a spare' },
            { id: 'spare_no', label: 'No spare' },
          ],
        },
      }
    case 'tow_detail':
      return {
        replies: ['**Where should it be towed** — and is there a trailer attached (loaded or empty)?'],
        widget: { type: 'text', placeholder: 'e.g. TA shop in Amarillo — loaded trailer attached' },
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
        `**Make and model?** e.g. ${example} — helps the mechanic bring the right parts. (Or send a picture of your VIN plate and I'll look it up.)`,
        "Not sure? What's on the grille — or snap a photo of the VIN plate, registration, or door sticker and I'll look it up.",
      ]
      return {
        replies: [ladder[Math.min(s.vehicle.attempts, ladder.length - 1)]],
        widget: { type: 'text', placeholder: 'e.g. 2019 Freightliner Cascadia' },
      }
    }
    case 'name':
      return {
        replies: ['Almost done — **can I have your name?** First name is fine.'],
        widget: { type: 'text', placeholder: 'e.g. Dave' },
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
      // Declines carry their legitimate escape hatches (voice-agent rules):
      // cars qualify for winch-outs; gas pickups/vans for tires and winch-outs.
      if (s.vehicleClass === 'car') {
        return {
          replies: [
            "We're diesel truck and RV specialists, so passenger cars aren't something we service — **with one exception: if you're stuck, a winch-out we can do.**",
          ],
          widget: {
            type: 'chips',
            options: [{ id: 'winch_yes', label: "I'm stuck — I need a winch-out" }],
          },
        }
      }
      if ((s.vehicleClass === 'pickup' || s.vehicleClass === 'van' || s.vehicleClass === 'other') && s.fuel === 'gas') {
        return {
          replies: [
            "Full mechanical work is diesel-only — but for gas vehicles we can still do **tire replacements** and **winch-outs**.",
          ],
          widget: {
            type: 'chips',
            options: [
              { id: 'svc_tire', label: "It's a tire problem" },
              { id: 'winch_yes', label: "I'm stuck — I need a winch-out" },
            ],
          },
        }
      }
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
    ...(s.name ? { Name: s.name } : {}),
    Service: svc + (s.vehicleClass === 'rv' ? ' (RV)' : ''),
    Vehicle: veh,
    Problem: s.problem.description || '—',
    ...(s.service === 'tire'
      ? {
          Tire: [
            [s.tirePosition, s.tireSide && `${s.tireSide} side`, s.tireDual && (s.tireDual === 'both' ? 'both duals' : `${s.tireDual} dual`)]
              .filter(Boolean)
              .join(', ') || null,
            s.tireSpare === true ? 'has spare' : s.tireSpare === false ? 'no spare' : null,
            s.tireSize.value,
          ]
            .filter(Boolean)
            .join(' · ') || '—',
        }
      : {}),
    ...(s.service === 'tow'
      ? { Tow: [s.tow.dropoff && `to ${s.tow.dropoff}`, s.tow.trailerInfo].filter(Boolean).join(' · ') || '—' }
      : {}),
    Location: s.location.resolved || s.location.text || '— (dispatcher will confirm by phone)',
    Photos: s.photos ? `${s.photos}${s.photoSummary ? ` — ${s.photoSummary}` : ''}` : 'none',
    ...(s.photoNotes ? { Notes: s.photoNotes } : {}),
    Phone: (s.phone.number || '—') + (s.phone.verified ? ' ✓ verified' : ''),
    ...(computeFlags(s).length ? { Flags: computeFlags(s).join(', ') } : {}),
  }
}

// Was this term (or a close misspelling of it) actually typed by the driver?
// Guards make/model against extractor hallucination — gpt-4o-mini has been
// seen copying schema examples ("Freightliner") for brandless messages.
// Dice-coefficient bigram match per word so "frieghtliner" still binds.
function typedByDriver(msg: string, term: string | null): boolean {
  if (!term) return false
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '')
  const bigrams = (x: string) => {
    const g = new Set<string>()
    for (let i = 0; i < x.length - 1; i++) g.add(x.slice(i, i + 2))
    return g
  }
  const t = norm(term)
  if (t.length < 3) return false
  const tg = bigrams(t)
  return msg
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .some((w) => {
      const nw = norm(w)
      if (nw.length < 3) return false
      if (nw.includes(t) || t.includes(nw)) return true
      let overlap = 0
      tg.forEach((b) => {
        if (bigrams(nw).has(b)) overlap++
      })
      return (2 * overlap) / (tg.size + bigrams(nw).size) >= 0.6
    })
}

function mergeExtraction(s: ChatState, e: Extraction, msg?: string): string[] {
  const acks: string[] = []
  if (e.service && !s.service) s.service = e.service
  if (e.vehicle_class && !s.vehicleClass) s.vehicleClass = e.vehicle_class
  if (e.fuel && !s.fuel) s.fuel = e.fuel
  // Make/model must trace back to the driver's own words (make may ride in on
  // an unambiguous model, e.g. "cascadia" → Freightliner). No message context
  // (widget actions) keeps the old trust-the-extractor behavior.
  const modelTyped = msg === undefined || typedByDriver(msg, e.model)
  const makeTyped = msg === undefined || typedByDriver(msg, e.make) || (modelTyped && e.model !== null)
  if (e.make && !s.vehicle.make && makeTyped) s.vehicle.make = e.make
  if (e.model && !s.vehicle.model && modelTyped) s.vehicle.model = e.model
  if (e.year && !s.vehicle.year) s.vehicle.year = e.year
  if (e.tire_size && !s.tireSize.value) s.tireSize.value = e.tire_size
  if (e.tire_position && !s.tirePosition) s.tirePosition = e.tire_position
  if (e.tire_side && !s.tireSide) s.tireSide = e.tire_side
  if (e.tire_dual && !s.tireDual) s.tireDual = e.tire_dual
  if (e.has_spare !== null && s.tireSpare === null) s.tireSpare = e.has_spare
  if (e.trailer_work !== null && s.trailerWork === null) s.trailerWork = e.trailer_work
  if (e.tow_dropoff && !s.tow.dropoff) s.tow.dropoff = e.tow_dropoff
  if (e.trailer_info && !s.tow.trailerInfo) s.tow.trailerInfo = e.trailer_info
  if (e.wants_winch) s.wantsWinch = true
  if (e.customer_name && !s.name) s.name = e.customer_name
  // Contentless phrases ("broke down") don't satisfy the problem slot —
  // the model is told to null them, this is the code backstop.
  if (e.problem && e.problem.trim().split(/\s+/).length >= 3 && !s.problem.description)
    s.problem.description = e.problem
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
  // Back-compat: in-flight sessions may predate newer slots.
  if (s.tirePosition === undefined) s.tirePosition = null
  if (s.tireSpare === undefined) s.tireSpare = null
  if (!s.tow) s.tow = { dropoff: null, trailerInfo: null, attempts: 0 }
  if (s.wantsWinch === undefined) s.wantsWinch = false
  if (s.name === undefined) {
    s.name = null
    s.nameAsked = false
  }
  if (!s.conversationId) s.conversationId = crypto.randomUUID()
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
    else if (a.id === 'winch_yes') {
      s.wantsWinch = true
      if (!s.service) s.service = 'service'
      replies.push("A winch-out we can do — let's get you pulled out.")
    } else if (a.id.startsWith('tirepos_')) s.tirePosition = a.id.slice(8)
    else if (a.id.startsWith('tireside_')) s.tireSide = a.id.slice(9)
    else if (a.id.startsWith('tiredual_')) s.tireDual = a.id.slice(9)
    else if (a.id === 'spare_yes') s.tireSpare = true
    else if (a.id === 'spare_no') s.tireSpare = false
    else if (a.id === 'safe_shoulder') s.safety = 'shoulder'
    else if (a.id === 'safe_blocking') {
      s.safety = 'blocking'
      replies.push("Understood — **if you're in danger, call 911 first.** I'm flagging this as urgent for dispatch.")
    } else if (a.id === 'loc_share' && a.lat !== undefined && a.lng !== undefined) {
      // GPS is precise but not infallible (wrong side of the interchange,
      // stale fix) — confirm it back in words before locking.
      s.location.lat = a.lat
      s.location.lng = a.lng!
      const rev = await reverseGeocode(a.lat, a.lng!)
      s.location.candidates = [
        { name: rev.address.split(',')[0], address: rev.address, lat: a.lat, lng: a.lng!, state: rev.state },
      ]
    } else if (a.id === 'photo_ok') {
      // Driver confirmed the vision read — nothing to change, move on.
    } else if (a.id === 'photo_delete') {
      const items = s.photoItems ?? []
      const removed = a.index != null ? items.splice(a.index, 1)[0] : undefined
      s.photoItems = items
      s.photos = items.length
      s.photoSummary = items.map((p) => p.desc).join('; ') || null
      if (removed?.url) void removePhoto(s.conversationId, removed.url)
      if (a.ctx === 'picker') {
        // Deleted while the picker step is open — stay in it.
        replies.push(
          items.length
            ? `Removed — ${items.length} photo${items.length > 1 ? 's' : ''} still attached.`
            : 'Removed — no photos attached now.'
        )
        return { replies, widget: { type: 'photos' }, state: s, photosOffered, userEcho }
      }
      // Deleted from the persistent strip mid-flow — acknowledge and fall
      // through so whatever question was active re-renders unchanged.
      replies.push('Removed.')
    } else if (a.id === 'photo_more') {
      return {
        replies: ['Go ahead — add as many as help tell the story.'],
        widget: { type: 'photos' },
        state: s,
        photosOffered,
        userEcho,
      }
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
      // Narrow to the tapped candidate — the map confirm (drag + lock) is the
      // final word, so resolved stays unset until map_confirm.
      const c = s.location.candidates?.[Number(a.id.slice(9))]
      if (c) {
        s.location.lat = c.lat
        s.location.lng = c.lng
        if (c.state) s.location.state = c.state
        s.location.candidates = [c]
      }
    } else if (a.id === 'map_confirm' && a.lat !== undefined && a.lng !== undefined) {
      // Final pin position from the map. If the driver dragged it meaningfully
      // (~100m+), re-reverse-geocode so the words match the new spot.
      const c = s.location.candidates?.[0]
      const moved = !c || Math.abs(a.lat - c.lat) + Math.abs(a.lng! - c.lng) > 0.001
      s.location.lat = a.lat
      s.location.lng = a.lng!
      if (moved) {
        const rev = await reverseGeocode(a.lat, a.lng!)
        s.location.resolved = rev.address
        if (rev.state) s.location.state = rev.state
      } else {
        s.location.resolved = `${c.name}, ${c.address}`
        if (c.state) s.location.state = c.state
      }
      s.location.tier = 'gold'
      s.location.candidates = null
      const label = s.location.resolved.split(',')[0]
      replies.push(
        `Locked in: **${label}**. 📍 **${mechanicsNearby(label)} mechanics** on the Rig network are within range.`
      )
    } else if (a.id === 'loc_none') {
      s.location.candidates = null
      s.location.attempts += 1
    } else if (a.id === 'photos_done') {
      s.photos = a.count ?? s.photos
      photosOffered = true
    } else if (a.id === 'phone_number' || a.id === 'otp_resend') {
      const phone = a.id === 'otp_resend' ? s.phone.number : a.value || null
      s.phone.number = phone
      const sent = phone ? await sendOtp(s.conversationId, phone) : { sent: false, reason: 'invalid_request' }
      if (sent.sent) {
        s.phone.otpSent = true
        replies.push('Texted you a 4-digit code — enter it here:')
        return { replies, widget: { type: 'otp' }, state: s, photosOffered, userEcho }
      }
      if (sent.reason === 'cooldown') {
        replies.push('Just sent one — give it a minute to arrive, then enter it here:')
        return { replies, widget: { type: 'otp' }, state: s, photosOffered, userEcho }
      }
      if (sent.reason === 'too_many_sends') {
        replies.push(
          "We've hit the resend limit for this number. **Call us instead — 1 (855) 744-2223** answers 24/7 and can take it from here."
        )
        return { replies, widget: { type: 'phone' }, state: s, photosOffered, userEcho }
      }
      replies.push("That didn't go through — double-check the number and try again.")
      return { replies, widget: { type: 'phone' }, state: s, photosOffered, userEcho }
    } else if (a.id === 'otp_code') {
      const result = await checkOtp(s.conversationId, s.phone.number || '', a.code || '', s.name)
      if (result.verified) {
        s.phone.verified = true
        replies.push("✓ Verified. You're all set.")
      } else if (result.reason === 'wrong_code') {
        replies.push("That code doesn't match — give it another look and try again:")
        return { replies, widget: { type: 'otp' }, state: s, photosOffered, userEcho }
      } else if (result.reason === 'expired' || result.reason === 'no_code_sent') {
        replies.push('That code expired.')
        return {
          replies,
          widget: { type: 'chips', options: [{ id: 'otp_resend', label: 'Send a new code' }] },
          state: s,
          photosOffered,
          userEcho,
        }
      } else if (result.reason === 'too_many_attempts') {
        replies.push(
          "Too many tries on that code. **Call us — 1 (855) 744-2223** and a dispatcher takes it from here."
        )
        return { replies, widget: { type: 'declined' }, state: s, photosOffered, userEcho }
      } else {
        replies.push("Something hiccuped verifying that — try the code once more:")
        return { replies, widget: { type: 'otp' }, state: s, photosOffered, userEcho }
      }
    } else if (a.id === 'submit') {
      const result = await submitLead(s)
      if (!result.submitted) {
        replies.push(
          "That didn't go through on our side — tap **Send to dispatch** again, or call **1 (855) 744-2223** and we'll take it by phone."
        )
        return {
          replies,
          widget: { type: 'summary', data: summaryData(s) },
          state: s,
          photosOffered,
          userEcho,
        }
      }
      s.submitted = true
      s.flags = computeFlags(s)
      replies.push('🚀 **Sent.** A dispatcher is reviewing it now, and nearby mechanics are being notified.')
      replies.push(
        `You'll get a **text at ${s.phone.number}** with a live link the moment offers come in — usually within minutes. You can close this window; everything continues by text.`
      )
      return { replies, widget: { type: 'done' }, state: s, photosOffered, userEcho }
    }
  } else if (req.photos && req.photos.length > 0) {
    // Vision loop: analyze in-request, keep only the readout — images discarded
    // here (the backend keeps its own copy once verified). Analyzed per-photo
    // so each one is individually deletable with its own readout.
    const n = req.photos.length
    userEcho = `📷 ${n} photo${n > 1 ? 's' : ''} sent`
    const [analyses, urls] = await Promise.all([
      Promise.all(req.photos.map((p) => analyzePhotos([p], contextLine(s)))),
      // Persist to the backend once the conversation is verified (the backend
      // rejects pre-verification uploads); pre-OTP photos still get the vision
      // readout, which rides the payload either way.
      s.phone.verified
        ? Promise.all(req.photos.map((p) => addPhoto(s.conversationId, p)))
        : Promise.resolve(req.photos.map(() => null)),
    ])
    s.photoItems = s.photoItems ?? [] // sessions started before this field existed
    analyses.forEach((a, i) => s.photoItems.push({ desc: a.description, url: urls[i] }))
    s.photos = s.photoItems.length
    photosOffered = true
    const tireSize = analyses.find((a) => a.tire_size)?.tire_size ?? null
    if (tireSize && !s.tireSize.value) s.tireSize.value = tireSize
    const make = analyses.find((a) => a.make)?.make ?? null
    const model = analyses.find((a) => a.model)?.model ?? null
    if (make && !s.vehicle.make) s.vehicle.make = make
    if (model && !s.vehicle.model) s.vehicle.model = model
    // A legible VIN beats everything — decode via NHTSA and overwrite.
    const vin = analyses.find((a) => a.vin)?.vin ?? null
    const decoded = vin ? await decodeVin(vin) : null
    if (decoded) {
      if (decoded.make) s.vehicle.make = decoded.make
      if (decoded.model) s.vehicle.model = decoded.model
      if (decoded.year) s.vehicle.year = decoded.year
    }
    s.photoSummary = s.photoItems.map((p) => p.desc).join('; ') || null
    const anyUseful = analyses.some((a) => a.useful)
    const readout = analyses
      .filter((a) => a.useful)
      .map((a) => a.description)
      .join('; ')
    const vinLine = decoded
      ? ` I read the VIN too — that's a ${[decoded.year, decoded.make, decoded.model].filter(Boolean).join(' ')}.`
      : ''
    replies.push(
      anyUseful
        ? `From your photo${n > 1 ? 's' : ''}, here's what I can see: **${readout}**${tireSize ? ` — tire size reads ${tireSize}` : ''}.${vinLine} Did I get that right?`
        : `Honestly, I couldn't make much of ${n > 1 ? 'those' : 'that'} — ${analyses[0].description}. ${n > 1 ? "They'll" : "It'll"} still go to the dispatcher. Anything to add?`
    )
    return {
      replies,
      widget: {
        type: 'chips',
        options: [
          { id: 'photo_more', label: '📷 Add more photos' },
          { id: 'photo_ok', label: "✓ Looks right — I'm done" },
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
    const e = await extract(req.message, contextLine(s, activeBefore))
    if (e.intent === 'off_topic') {
      replies.push(REDIRECT)
    } else if (e.intent.startsWith('meta_')) {
      replies.push(META[e.intent])
      // Meta questions can still carry facts ("do you have anyone near
      // Amarillo?" IS their location) — capture silently, per the voice rules.
      mergeExtraction(s, e, req.message)
    } else {
      const acks = mergeExtraction(s, e, req.message)
      // When the problem question is the one on screen, the typed answer IS
      // the problem — accept it even when the extractor nulled it or the
      // word-count gate would ("flat tire" is a fine description). Without
      // this, "blew a tire" gets acknowledged and then re-asked.
      if (activeBefore === 'problem' && !s.problem.description) {
        const answer = (e.problem || req.message).trim()
        if (answer.split(/\s+/).length >= 2) s.problem.description = answer
      }
      // Refusal gate: only explicitly not-offered services get refused, with a
      // redirect to what we CAN do. Unfamiliar repairs are never refused.
      if (e.service_refused && REFUSALS[e.service_refused]) {
        replies.push(REFUSALS[e.service_refused])
      } else if (e.ack) {
        // Situational acknowledgment — questions stay templated (drift-proof),
        // but the transitions sound human. Whitespace collapse covers the
        // model occasionally dropping a punctuation character mid-sentence.
        replies.push(e.ack.replace(/\s{2,}/g, ' ').trim())
      }
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
        const cands = await resolveLocation(e.location_query, s.location.state, biasPoint, e.location_text)
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
        if (activeBefore === 'tow_detail') s.tow.attempts += 1
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
  if (slot === 'name') s.nameAsked = true // ask-once rule
  // Freeform answer that didn't move the active slot → clarify, don't repeat.
  const q = question(slot, s, !!req.message && slot === activeBefore)
  // Avoid repeating the identical question when a meta/off-topic answer was given:
  replies.push(...q.replies)
  return { replies, widget: q.widget, state: s, photosOffered, userEcho }
}

function contextLine(s: ChatState, currentQuestion?: string): string {
  const awaitingName = s.nameAsked && !s.name ? ', lastQuestion=name' : ''
  const asking = currentQuestion ? `, currentQuestion=${currentQuestion}` : ''
  return `Known so far: service=${s.service}, vehicleClass=${s.vehicleClass}, fuel=${s.fuel}, problem=${s.problem.description ? 'yes' : 'no'}, location=${s.location.resolved || s.location.text || 'no'}${awaitingName}${asking}`
}
