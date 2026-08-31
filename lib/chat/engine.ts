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
import { addPhoto, checkOtp, removePhoto, sendOtp, skipOtp, submitLead } from './backend'
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
  journey?: { landing: string | null; referrer: string | null; views: number; pages: string[]; device?: string } | null
}

export interface TurnResponse {
  replies: string[]
  widget: Widget
  state: ChatState
  photosOffered: boolean
  userEcho?: string
}

// Fallback for messages the extractor couldn't place. That's sometimes a
// genuinely off-topic message and sometimes OUR misread of a real answer, so
// own the miss — never lecture about staying on topic. Flow-preserving: the
// current question re-renders right below it — never a send-away (drivers
// are already on bigrig.app, and "go elsewhere" reads as a brush-off).
const REDIRECT = "Sorry — I didn't quite catch that. I'm a simple bot with one job: getting help to you fast. 🙂"
// Pure politeness ("ok", "thanks") must never hit the off-topic path — the
// extractor sometimes classifies it that way and the redirect reads rude.
const PLEASANTRY = /^[\s!.,]*((ok(ay)?|k+|thanks?(\s+(you|u))?|ty|thx|great|cool|perfect|sounds good|got it|alright|awesome|nice)[\s!.,]*)+$/i

// A typed refusal ("skip", "no", "don't know", "not sure", "n/a") moves the
// chat forward: optional slots get marked unknown for the dispatcher, the few
// truly required ones explain why they can't be skipped. Never a repeat.
const SKIP_WORDS =
  /^[\s!.,]*(skip( it| this)?|no|nope|nah|pass|none|n\/?a|not sure|no idea|(i )?(don'?t|do not) know|dunno|unknown|idk|no thanks|not now|later|next|move on|can'?t (see|tell|say)|not applicable)[\s!.,]*$/i

// A bare answer to the name question IS the name — the extractor sometimes
// fails to recognize uncommon names ("Gerhard") and misroutes them off-topic,
// and name is asked exactly once, so a miss loses it silently.
const NAME_STOPLIST = new Set([
  'no', 'nope', 'skip', 'yes', 'yeah', 'why', 'na', 'none', 'nothing',
  'wait', 'cancel', 'stop', 'help', 'hello', 'hi', 'hey', 'sure', 'what', 'huh',
  'send', 'done', 'go', 'update',
])
function looksLikeName(msg: string): boolean {
  const m = msg.trim()
  return (
    /^[a-zA-Z][a-zA-Z.'-]*(\s+[a-zA-Z.'-]+){0,2}$/.test(m) &&
    m.length <= 40 &&
    !NAME_STOPLIST.has(m.toLowerCase())
  )
}
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
  // Existing-job support has no separate channel yet — dispatch owns the job
  // record, so the dispatch line IS the support line. Keep this an easy out:
  // answer, don't gatekeep, don't loop them back into intake questions.
  meta_spanish:
    'Sí — llame a nuestra **línea en español: 1-855-560-2268**, disponible 24/7. Un despachador le ayudará con su camión o RV de inmediato. (For English, just keep typing here.)',
  meta_existing_job:
    "For anything about an **existing job** — status, changes, billing, refunds, or a callback — call dispatch at **1-855-744-2223** and they'll pull up your job right away. This chat can only start a *new* service request.",
  meta_payment:
    'We take **EFS Payments**, WEX Express Codes, T-Chek, and credit cards — payment settles through Rig only after the work is done.',
  meta_join:
    "Good to hear from you! 🔧 Mechanics on the Rig network browse nearby jobs and send offers straight from the app — no marketing spend. **Head to bigrig.app/shops to learn more and sign up.** (This chat is just for drivers who need help right now.)",
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
        replies: [
          reask
            ? "I couldn't make out a drop-off from that — **a business plus a town works best** (like 'TA in El Centro'), or just the town."
            : '**Where should it be towed** — and is there a trailer attached (loaded or empty)?',
        ],
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
      return { replies: ["Here's what I'll send to nearby mechanics — **click Send below.**"], widget: { type: 'summary', data: summaryData(s) } }
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
            [s.tirePosition !== 'unknown' ? s.tirePosition : null, s.tireSide && s.tireSide !== 'unknown' && `${s.tireSide} side`, s.tireDual && s.tireDual !== 'unknown' && (s.tireDual === 'both' ? 'both duals' : `${s.tireDual} dual`)]
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
    Photos: s.photos ? `${s.photos} attached` : 'none',
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
        s.phone.smsConfirmed = true
        replies.push("✓ Verified. You're all set.")
      } else if (result.reason === 'wrong_code') {
        s.phone.wrongCodes += 1
        if (s.phone.wrongCodes < 2) {
          replies.push("That code doesn't match — give it another look and try again:")
          return { replies, widget: { type: 'otp' }, state: s, photosOffered, userEcho }
        }
        // Second miss: never wall them off. Offer to carry on unverified —
        // dispatch confirms the number by voice instead.
        replies.push(`Still not matching. Is **${formatPhone(s.phone.number)}** the right number? If so, **no problem — we can skip the code** and a dispatcher will confirm by phone instead.`)
        return { replies, widget: otpEscape(s), state: s, photosOffered, userEcho }
      } else if (result.reason === 'expired' || result.reason === 'no_code_sent') {
        replies.push(`That code expired. Is **${formatPhone(s.phone.number)}** right? I can send a fresh one there, or we can skip it and a dispatcher confirms by phone.`)
        return { replies, widget: otpEscape(s, true), state: s, photosOffered, userEcho }
      } else if (result.reason === 'too_many_attempts') {
        replies.push(`That code's locked out — **let's skip it.** Is **${formatPhone(s.phone.number)}** the right number for a dispatcher to call?`)
        return { replies, widget: otpEscape(s), state: s, photosOffered, userEcho }
      } else {
        replies.push(`Something hiccuped verifying that. Is **${formatPhone(s.phone.number)}** right? Try the code once more, or skip it:`)
        return { replies, widget: otpEscape(s, true, true), state: s, photosOffered, userEcho }
      }
    } else if (a.id === 'otp_retry') {
      replies.push('Enter the code here:')
      return { replies, widget: { type: 'otp' }, state: s, photosOffered, userEcho }
    } else if (a.id === 'otp_skip') {
      // Continue unverified against the number on file. Also asks for a
      // second number when the first may not take texts (landline).
      const accepted = await skipOtp(s.conversationId, s.phone.number || '', s.name)
      if (!accepted.accepted) {
        // Backend refused (or predates this route). Don't strand them: offer a
        // fresh code AND the phone line — never a dead end.
        replies.push(
          `I couldn't skip it on our side just now. Is **${formatPhone(s.phone.number)}** right? **Try a fresh code** there, or **call 1 (855) 744-2223** — that line answers 24/7 and can take it from here.`
        )
        return {
          replies,
          widget: {
            type: 'chips',
            options: [
              { id: 'otp_resend', label: 'Send a new code' },
              { id: 'phone_change', label: 'I typed the wrong number' },
            ],
          },
          state: s,
          photosOffered,
          userEcho,
        }
      }
      s.phone.verified = true // structurally: user + lead exist; smsConfirmed stays false
      s.phone.awaitingAlt = true
      replies.push(
        `Got it — we'll use **${formatPhone(s.phone.number)}**. If that's a landline or might be wrong, **type a second number we can reach you at** — or tap below if it's right.`
      )
      return {
        replies,
        // chips widgets carry a typing box, so a second number can be typed
        // straight in while the confirm stays one tap.
        widget: { type: 'chips', options: [{ id: 'alt_phone_none', label: "✓ That's my number" }] },
        state: s,
        photosOffered,
        userEcho,
      }
    } else if (a.id === 'alt_phone_none') {
      s.phone.awaitingAlt = false
      replies.push('Understood — the dispatcher will confirm when they call.')
    } else if (a.id === 'phone_change') {
      // Driver wants to fix the number and try the code again from the top.
      s.phone.number = null
      s.phone.otpSent = false
      s.phone.wrongCodes = 0
      replies.push("No problem — what's the right number?")
      return { replies, widget: { type: 'phone' }, state: s, photosOffered, userEcho }
    } else if (a.id === 'submit') {
      const result = await submitLead(s)
      if (!result.submitted) {
        replies.push(
          "That didn't go through on our side — tap **Send to Nearby Mechanics** again, or call **1 (855) 744-2223** and we'll take it by phone."
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
        s.phone.smsConfirmed
          ? `You'll get a **text at ${formatPhone(s.phone.number)}** with a live link the moment offers come in — usually within minutes. You can close this window; everything continues by text.`
          : `A dispatcher will **call ${formatPhone(s.phone.number)}**${s.phone.altPhone ? ` (or ${formatPhone(s.phone.altPhone)})` : ''} to confirm and get you offers — usually within minutes. Keep your phone handy.`
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
      // Keep the VIN itself — it rides to dispatch as Vehicle.vinNumber.
      s.vehicle.vin = vin!.replace(/[^a-z0-9]/gi, '').toUpperCase()
    }
    s.photoSummary = s.photoItems.map((p) => p.desc).join('; ') || null
    // The vision readout stays INTERNAL — it rides photoSummary to the
    // dispatcher and mechanics, but we don't recite our guess at the problem
    // back to the driver (close-but-imperfect descriptions distract more than
    // they help). Numbers are the exception: a tire size or VIN read off a
    // photo is worth confirming out loud because a misread there changes what
    // the mechanic brings.
    const confirmations: string[] = []
    if (tireSize) confirmations.push(`tire size reads **${tireSize}**`)
    if (decoded) {
      const v = [decoded.year, decoded.make, decoded.model].filter(Boolean).join(' ')
      if (v) confirmations.push(`the VIN reads back as a **${v}**`)
    }
    replies.push(
      confirmations.length
        ? `Got ${n > 1 ? 'them' : 'it'} — ${confirmations.join(', and ')}. **Did I get that right?** ${
            n > 1 ? 'They go' : 'It goes'
          } straight to the dispatcher and mechanics with your request.`
        : `Got ${n > 1 ? 'them' : 'it'} — ${
            n > 1 ? 'they go' : 'it goes'
          } straight to the dispatcher and mechanics with your request. Anything to add?`
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
  } else if (req.message && s.submitted) {
    // Post-submit messages ("thank you", follow-ups) get warmth, never the
    // scope-lock — their request is already with dispatch.
    userEcho = req.message
    replies.push(
      "Anytime — you're all set. **Offers land by text** in the next few minutes, and this window can close whenever."
    )
    return { replies, widget: { type: 'done' }, state: s, photosOffered, userEcho }
  } else if (req.message && s.nameAsked && !s.name && !PLEASANTRY.test(req.message) && looksLikeName(req.message)) {
    // Name-shaped answer to the name question: bind it directly, no LLM.
    // Gate on nameAsked/!name rather than activeBefore — asking the question
    // already set nameAsked, so nextSlot has moved past 'name' by the time
    // the answer arrives ("Jason" was misrouted off-topic and lost).
    userEcho = req.message
    s.name = req.message
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  } else if (req.message && s.phone.awaitingAlt) {
    // Second number after the unverified skip. Digits win; anything else
    // ("no", "that's it") means keep the number on file.
    userEcho = req.message
    const digits = req.message.replace(/\D/g, '')
    s.phone.awaitingAlt = false
    if (digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))) {
      s.phone.altPhone = digits.length === 10 ? '1' + digits : digits
      replies.push(`Added **${formatPhone(s.phone.altPhone)}** as a second number — the dispatcher will try both.`)
    } else {
      replies.push('Understood — the dispatcher will confirm when they call.')
    }
  } else if (req.message && activeBefore === 'tire_spare' && /^[\s!.,]*(no|nope|nah|none|yes|yeah|yep|yup)[\s!.,]*$/i.test(req.message)) {
    // A bare yes/no at the spare question is the answer, not a skip.
    userEcho = req.message
    s.tireSpare = /^[\s!.,]*(yes|yeah|yep|yup)/i.test(req.message)
  } else if (req.message && SKIP_WORDS.test(req.message) && activeBefore) {
    userEcho = req.message
    // Same nameAsked wrinkle as the binder above: a "skip" answering the name
    // question arrives with activeBefore already at 'summary'.
    const slot = s.nameAsked && !s.name && activeBefore === 'summary' ? 'name' : activeBefore
    const skipped = skipSlot(s, slot)
    if (skipped) replies.push(skipped)
    else replies.push(REQUIRED_SLOT_COPY[slot] ?? "That one I do need — it's what dispatch works from.")
  } else if (req.message && s.awaitingPhotoNote) {
    userEcho = req.message
    s.photoNotes = s.photoNotes ? `${s.photoNotes}; ${req.message}` : req.message
    s.awaitingPhotoNote = false
    replies.push('Noted — that goes to the dispatcher and mechanics along with the photo readout.')
  } else if (req.message && PLEASANTRY.test(req.message)) {
    // "ok" / "thanks" mid-flow: acknowledge and let the current question
    // re-render below — no extraction, no chance of a scope-lock misfire.
    userEcho = req.message
    replies.push('👍')
  } else if (req.message) {
    userEcho = req.message
    const e = await extract(req.message, contextLine(s, activeBefore))
    if (e.intent === 'off_topic') {
      replies.push(REDIRECT)
      // Structured miss log — every REDIRECT is either a truly off-topic
      // message or OUR misread of a real one. Lands in Cloud Logging as
      // evt=chat_miss; scripts/chat-miss-report.mjs aggregates the patterns
      // so misreads get found and fixed (this is how the pre-purchase
      // inspection and existing-job gaps were caught).
      console.log(
        JSON.stringify({
          evt: 'chat_miss',
          conversationId: s.conversationId,
          slot: activeBefore ?? null,
          text: req.message.slice(0, 300),
        })
      )
      // Even a misclassified message can carry facts — capture silently so an
      // extractor misfire never drops data on the floor.
      mergeExtraction(s, e, req.message)
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
      // Same rule for the tow drop-off: the typed answer IS the destination
      // ("TA in El Centro") — the geocoder resolves business+city later.
      if (activeBefore === 'tow_detail' && !s.tow.dropoff) {
        const answer = (e.tow_dropoff || req.message).trim()
        if (answer.length >= 3) s.tow.dropoff = answer
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
        const cands = await resolveLocation(e.location_query, s.location.state, biasPoint, e.location_text, s.conversationId)
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

// Slots a driver can wave off. Each returns the honest handoff line and
// nudges state so nextSlot() advances; the dispatcher sees the gap via flags
// or notes. Required slots (service, vehicle class, problem, phone) return
// null and the caller explains why.
function skipSlot(s: ChatState, slot: SlotId): string | null {
  switch (slot) {
    case 'location':
      // nextSlot re-asks while tier is 'missing'; mark it weak-with-text so
      // the flag fires (LOCATION_UNRESOLVED) but the question moves on.
      s.location.attempts = MAX_ATTEMPTS
      s.location.tier = 'weak'
      if (!s.location.text) s.location.text = '(driver skipped — confirm by phone)'
      return "No problem — the dispatcher will pin down your exact spot when they call. Let's keep going."
    case 'vehicle_detail':
      s.vehicle.attempts = MAX_ATTEMPTS
      return "That's fine — the mechanic can confirm make and model on arrival."
    case 'tire_size':
      s.tireSize.attempts = MAX_ATTEMPTS
      return "We'll let the mechanic confirm the size on arrival."
    case 'tire_position':
      s.tirePosition = 'unknown'
      s.tireSide = 'unknown'
      s.tireDual = 'unknown'
      return "Okay — the mechanic will find it on arrival."
    case 'tire_side':
      s.tireSide = 'unknown'
      return 'Okay.'
    case 'tire_dual':
      s.tireDual = 'unknown'
      return 'Okay.'
    case 'tire_spare':
      s.tireSpare = false // safest assumption: bring a tire
      return "No worries — we'll assume no spare so the tech brings one."
    case 'tow_detail':
      s.tow.attempts = 2
      return 'Okay — the dispatcher will sort out the drop-off with you by phone.'
    case 'photos':
      return null // handled by the widget's own skip button; falls through
    case 'name':
      s.nameAsked = true
      return 'No problem.'
    default:
      return null
  }
}

const REQUIRED_SLOT_COPY: Partial<Record<SlotId, string>> = {
  service: "I do need to know which kind of help — **tire, tow, or a mechanic?** Tap one above.",
  vehicle_class: "I do need the type of vehicle — it decides who we send. **Tap one above.**",
  fuel: "Just diesel or gas — it decides who we can send. **Tap one above.**",
  problem: "I need at least a few words on what happened — it's what the mechanic works from. Even **'won't start'** is enough.",
  phone: "The number's the one thing I can't skip — it's how offers reach you. **Any number a dispatcher can call works.**",
}

// The escape hatch from the OTP wall. Never dead-ends a driver on a code.
function otpEscape(s: ChatState, offerResend = false, offerRetry = false): Widget {
  const options: { id: string; label: string }[] = []
  if (offerRetry) options.push({ id: 'otp_retry', label: 'Try the code again' })
  if (offerResend) options.push({ id: 'otp_resend', label: 'Send a new code' })
  options.push({ id: 'otp_skip', label: '✓ Skip the code — continue' })
  options.push({ id: 'phone_change', label: "That's the wrong number — fix it" })
  return { type: 'chips', options }
}

function formatPhone(n: string | null): string {
  if (!n) return ''
  const d = n.replace(/\D/g, '')
  const t = d.length === 11 && d.startsWith('1') ? d.slice(1) : d
  return t.length === 10 ? `(${t.slice(0, 3)}) ${t.slice(3, 6)}-${t.slice(6)}` : n
}

function contextLine(s: ChatState, currentQuestion?: string): string {
  const awaitingName = s.nameAsked && !s.name ? ', lastQuestion=name' : ''
  const asking = currentQuestion ? `, currentQuestion=${currentQuestion}` : ''
  return `Known so far: service=${s.service}, vehicleClass=${s.vehicleClass}, fuel=${s.fuel}, problem=${s.problem.description ? 'yes' : 'no'}, location=${s.location.resolved || s.location.text || 'no'}${awaitingName}${asking}`
}
