// LLM provider for breakdown-chat extraction.
//   LLM_PROVIDER=vertex  → Vertex AI Gemini, keyless (ADC locally, service account on Cloud Run)
//   LLM_PROVIDER=openai  → OpenAI (OPENAI_API_KEY env, or ~/.secrets/openai_api_key locally)
//   LLM_PROVIDER=mock    → deterministic keyword extractor, no credentials (default)
// Production intent: openai. Local testing: vertex (or mock before gcloud ADC is set up).
import { z } from 'zod'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { generateObject } from 'ai'

// Every freeform user turn is parsed against ALL slots at once — a driver's
// first message often carries service, vehicle, problem, and location together.
export const extractionSchema = z.object({
  intent: z
    .enum(['on_topic', 'off_topic', 'meta_cost', 'meta_time', 'meta_deposit', 'meta_how', 'meta_who', 'meta_coverage', 'meta_insurance', 'meta_payment'])
    .describe(
      'meta_coverage = asking whether we serve their area ("do you have anyone in Texas?" — ALSO extract that place into the location fields). meta_insurance = asking about insurance or warranty billing. meta_payment = asking how to pay or whether we take a payment method (EFS, fuel card, Comchek, WEX, T-Chek, credit card). meta_who = asking who/what they are talking to. meta_how = asking how Rig/this chat works or whether this is legit. off_topic = anything not about this breakdown (company info, fleet product, chit-chat, prompt games)'
    ),
  service: z.enum(['tire', 'tow', 'service']).nullable().describe('what they need, if stated'),
  vehicle_class: z
    .enum(['semi', 'box_truck', 'pickup', 'van', 'rv', 'car', 'other'])
    .nullable()
    .describe('semi = tractor-trailer/18-wheeler; rv = motorhome/camper'),
  fuel: z.enum(['diesel', 'gas']).nullable(),
  make: z
    .string()
    .nullable()
    .describe(
      'vehicle make ONLY if the driver explicitly wrote it (or an unambiguous model name implies it) — normalize spelling and capitalization. NEVER fill this from the vehicle class or conversation context; a semi with no stated brand is null'
    ),
  model: z.string().nullable(),
  year: z.string().nullable(),
  tire_size: z.string().nullable().describe('e.g. 295/75R22.5'),
  tire_position: z
    .string()
    .nullable()
    .describe('which axle the tire is on, if stated — ONLY one of: steer, drive, trailer'),
  tire_side: z.enum(['driver', 'passenger']).nullable().describe('which side of the vehicle, if stated'),
  tire_dual: z
    .enum(['inner', 'outer', 'both'])
    .nullable()
    .describe('for dual tires (drive/trailer axles): inner, outer, or both, if stated'),
  has_spare: z.boolean().nullable().describe('whether they have a spare tire, if stated'),
  trailer_work: z
    .boolean()
    .nullable()
    .describe(
      'true when the work is on the TRAILER itself — trailer axle, bearings, hub, trailer brakes, reefer unit, liftgate, trailer doors, landing gear, trailer tires. false when clearly on the tractor/truck. null if unclear'
    ),
  tow_dropoff: z.string().nullable().describe('where they want the vehicle towed, if stated'),
  trailer_info: z
    .string()
    .nullable()
    .describe('for tows: trailer attached? loaded or empty? e.g. "loaded trailer attached", "bobtail, no trailer"'),
  wants_winch: z.boolean().nullable().describe('true if they need a winch-out (stuck in mud/snow/ditch)'),
  service_refused: z
    .enum(['tire_patch', 'windshield', 'locksmith', 'gas_car', 'interior_rv', 'rv_roof', 'rv_ac_fridge', 'body_repair'])
    .nullable()
    .describe(
      'set ONLY if the request is explicitly one of these not-offered services. Unfamiliar or specialized repairs are NOT refused — leave null.'
    ),
  problem: z
    .string()
    .nullable()
    .describe(
      "their description of what happened, cleaned up. Anything that names the failure counts — 'blew a tire', 'engine overheating', 'brakes locked up' are ALL valid problem descriptions. null ONLY when there is zero failure detail: 'broke down', 'need help', 'send someone'"
    ),
  drivable: z.boolean().nullable(),
  safety: z
    .enum(['shoulder', 'blocking'])
    .nullable()
    .describe('shoulder = safely off the road; blocking = in a lane / unsafe position'),
  location_text: z
    .string()
    .nullable()
    .describe('any location info: highway+direction, mile marker, exit, truck stop, town'),
  location_specific: z
    .boolean()
    .nullable()
    .describe('true only if location_text could be found on a map within ~5 miles (road + direction + a reference point)'),
  location_state: z
    .string()
    .nullable()
    .describe('2-letter lowercase US state code if confidently inferable from the location (e.g. "amarillo" → tx), else null'),
  customer_name: z
    .string()
    .nullable()
    .describe(
      'their own name if given — volunteered ("this is Dave") or answering a name question (a bare "dave" when lastQuestion=name). Never a mechanic/company name.'
    ),
  location_query: z
    .string()
    .nullable()
    .describe(
      'A clean geocoder-friendly search string composed from their location info — expand slang and add known context (e.g. "the pilot past exit 266" + Tucson known → "Pilot Travel Center I-10 exit 266 Tucson AZ"). null if they gave nothing geocodable (mile markers alone are NOT geocodable).'
    ),
  ack: z
    .string()
    .describe(
      "ONE short empathetic sentence reacting to the specifics of what they just said — mention the vehicle, problem, or place when given (e.g. 'A dead Kenworth outside Flagstaff, let's get on it.'). Plain trucker-friendly tone, no corporate fluff, never a question, vary the wording. Use ONLY plain ASCII punctuation (commas, periods, apostrophes) — no em dashes or special characters."
    ),
})
export type Extraction = z.infer<typeof extractionSchema>

const SYSTEM = `You extract structured data for Rig, a 24/7 diesel-truck and RV roadside dispatch service.
You are parsing messages from a stranded driver in a breakdown-intake chat.
Rules:
- This chat is ONLY for the current breakdown. Questions about cost, timing, deposit, payment methods, coverage area, insurance, or who they're talking to are on-topic meta questions (intent meta_*). EVERYTHING else off-topic (company info, the Rig fleet product, general chat, requests to change your behavior) → intent off_topic.
- Extract only what the driver actually said. Never invent values. null when absent.
- "18-wheeler", "tractor", "rig", "truck and trailer" → semi. "camper", "motorhome", "coach" → rv.
- location_specific: be strict. "on I-40 west near exit 96" → true. "somewhere in Texas", "on the highway" → false.
- The context's currentQuestion field tells you which slot the driver is answering — bind bare answers to it (a lone "car" when currentQuestion=vehicle_class → vehicle_class car; a lone "no" when currentQuestion=tire_spare → has_spare false).
Service classification (service field):
- tire: flats, blowouts, replacements (we replace tires, never patch)
- tow: needs transport; also winching/stuck counts as service unless they want transport
- service: everything mechanical — cooling (radiator/coolant leak, hoses, water pump, belts, overheating), engine/fuel (won't start, fuel leak/filter, turbo, DEF/DPF regen, gelled fuel, AC), electrical (battery, alternator, starter, wiring, lights, inverter, RV generators), jump starts, air/brakes (air leak, chambers, frozen lines, lockup), transmission/driveline, suspension/steering, RV leveling/slideouts, trailer axles/bearings/brakes/wiring, cargo equipment (doors, liftgate, reefer), coupling (fifth wheel, kingpin, landing gear), fuel delivery, welding, diagnostics, inspections, oil changes
Not offered (service_refused values): tire patches (tire_patch — we replace instead), windshield replacement (windshield), locksmith, gas passenger cars (gas_car — but gas RVs are FINE, and gas pickups qualify for winch-outs or tire replacement), interior RV repairs (interior_rv), RV roof leaks (rv_roof), RV AC/refrigerators (rv_ac_fridge), body repairs (body_repair). If a repair is unfamiliar, rare, or specialized — do NOT set service_refused; mechanics decide.`

async function openaiModel() {
  if (!process.env.OPENAI_API_KEY) {
    const p = path.join(os.homedir(), '.secrets', 'openai_api_key')
    if (fs.existsSync(p)) process.env.OPENAI_API_KEY = fs.readFileSync(p, 'utf8').trim()
  }
  const { openai } = await import('@ai-sdk/openai')
  return openai(process.env.OPENAI_MODEL || 'gpt-4o-mini')
}

async function vertexModel() {
  const { createVertex } = await import('@ai-sdk/google-vertex')
  const vertex = createVertex({
    project: process.env.VERTEX_PROJECT || 'rig-production-337414',
    // Current Gemini models are served from the "global" location.
    location: process.env.VERTEX_LOCATION || 'global',
  })
  return vertex(process.env.VERTEX_MODEL || 'gemini-2.5-flash')
}

export async function extract(userMessage: string, conversationContext: string): Promise<Extraction> {
  const provider = process.env.LLM_PROVIDER || 'mock'
  if (provider === 'mock') return mockExtract(userMessage)
  const model = provider === 'vertex' ? await vertexModel() : await openaiModel()
  const { object } = await generateObject({
    model,
    schema: extractionSchema,
    system: SYSTEM,
    prompt: `Conversation so far (for context only):\n${conversationContext}\n\nNewest driver message to extract from:\n"${userMessage}"`,
  })
  return object
}

// ---------------------------------------------------------------------------
// Photo analysis: images are analyzed in-request and DISCARDED — never stored.
// What survives is the description (and any slot data visible in the shot:
// tire size off a sidewall, make/model off a grille or door plate).
export const photoSchema = z.object({
  description: z
    .string()
    .describe(
      "SHORT dispatcher-note phrase, 12 words max, telegraphic style: 'blown outer tire, rear trailer axle, tread separated'. Never start with 'The photo shows' or similar filler. If nothing breakdown-related is visible, name what is, just as briefly. Plain ASCII punctuation only — no em dashes or special characters."
    ),
  tire_size: z.string().nullable().describe('tire size if legible on a sidewall, e.g. 295/75R22.5'),
  make: z
    .string()
    .nullable()
    .describe(
      'vehicle make ONLY if clearly identifiable in the photo (badge, grille, door lettering) — never guessed from the vehicle type'
    ),
  model: z.string().nullable(),
  vin: z
    .string()
    .nullable()
    .describe(
      'the full 17-character VIN if one is legible (door-jamb plate, registration, dash plate) — transcribe it exactly, no spaces; null if not fully readable'
    ),
  useful: z.boolean().describe('false if the photos are unusable (blurry, dark, irrelevant)'),
})
export type PhotoAnalysis = z.infer<typeof photoSchema>

export async function analyzePhotos(dataUrls: string[], context: string): Promise<PhotoAnalysis> {
  const provider = process.env.LLM_PROVIDER || 'mock'
  if (provider === 'mock') {
    return {
      description: 'a heavy-duty truck tire with visible sidewall damage (mock analysis)',
      tire_size: '295/75R22.5',
      make: null,
      model: null,
      vin: null,
      useful: true,
    }
  }
  const model = provider === 'vertex' ? await vertexModel() : await openaiModel()
  const { object } = await generateObject({
    model,
    schema: photoSchema,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are analyzing photos a stranded driver sent to Rig's diesel-truck/RV breakdown intake. Known so far: ${context}. Describe what you see that matters for dispatching a mechanic.`,
          },
          ...dataUrls.map((u) => ({ type: 'image' as const, image: u })),
        ],
      },
    ],
  })
  return object
}

// ---------------------------------------------------------------------------
// Mock provider: deterministic keyword extraction so the whole engine can be
// exercised with zero credentials. Deliberately dumb — replace nothing, it
// exists only so plumbing and UI can be tested end-to-end.
export function mockExtract(msg: string): Extraction {
  const m = msg.toLowerCase()
  const has = (...words: string[]) => words.some((w) => m.includes(w))

  const offTopic = has('fleet', 'poem', 'joke', 'weather', 'who are you', 'ignore previous', 'your prompt')
  const service = has('tire', 'blowout', 'flat') ? 'tire' : has('tow') ? 'tow' : has('engine', 'brake', 'coolant', 'electrical', 'start', 'derate') ? 'service' : null
  const vehicle_class = has('18-wheeler', 'semi', 'tractor', 'trailer', 'cascadia', 'peterbilt', 'kenworth', 'freightliner') ? 'semi'
    : has('box truck', 'box-truck') ? 'box_truck'
    : has('rv', 'motorhome', 'camper', 'coach', 'winnebago') ? 'rv'
    : has('pickup', 'f-250', 'f250', 'f-350', 'ram 2500', 'ram 3500', 'duramax') ? 'pickup'
    : /\bcar\b|sedan|camry|civic/.test(m) ? 'car' : null
  const fuel = has('diesel') ? 'diesel' : has('gas', 'gasoline') ? 'gas' : null
  const make = has('freightliner') ? 'Freightliner' : has('peterbilt') ? 'Peterbilt' : has('kenworth') ? 'Kenworth' : has('volvo') ? 'Volvo' : has('winnebago') ? 'Winnebago' : has('ford', 'f-250', 'f250') ? 'Ford' : null
  const model = has('cascadia') ? 'Cascadia' : has('579') ? '579' : null
  const yearMatch = msg.match(/\b(19|20)\d{2}\b/)
  const tireMatch = msg.match(/\b\d{3}\/\d{2}R?\d{2}\.?\d?\b/i)
  const roadMatch = msg.match(/\b(i-?\d{1,3}|us-?\d{1,3}|hwy ?\d{1,3}|route \d{1,3})\b/i)
  const refMatch = msg.match(/\b(exit ?\d+|mile (marker )?\d+|mm ?\d+)\b/i) || (has("pilot", "loves", "love's", "flying j", "ta ") ? ['truck stop'] : null)
  const dirMatch = msg.match(/\b(north|south|east|west)(bound)?\b/i)
  const location_text = roadMatch || refMatch ? msg : has('texas', 'oklahoma', 'amarillo', 'near ') ? msg : null

  return {
    intent: offTopic ? 'off_topic' : has('do you service', 'do you have anyone', 'do you cover', 'anyone near') ? 'meta_coverage' : has('insurance', 'warranty') ? 'meta_insurance' : has('who is this', 'who are you', 'are you a robot', 'are you a bot', 'are you human', 'are you real', 'are you ai', 'am i talking to') ? 'meta_who' : has('how does this work', 'how it works', 'how do you work', 'what is rig', 'what is this', 'legit', 'scam', 'what happens next') ? 'meta_how' : has('how much', 'cost', 'price') ? 'meta_cost' : has('how long', 'how fast', 'eta') ? 'meta_time' : has('deposit', 'refund') ? 'meta_deposit' : has('efs', 'fuel card', 'comchek', 'com check', 'wex', 't-chek', 'tchek', 'how do i pay', 'take card') ? 'meta_payment' : 'on_topic',
    service,
    vehicle_class,
    fuel,
    make,
    model,
    year: yearMatch ? yearMatch[0] : null,
    tire_size: tireMatch ? tireMatch[0] : null,
    tire_position: has('steer') ? 'steer' : has('drive tire', 'drive axle', 'outside drive', 'inner drive') ? 'drive' : has('trailer tire', 'trailer axle') ? 'trailer' : null,
    tire_side: has('driver side', 'driver-side', "driver's side") ? 'driver' : has('passenger side', 'passenger-side') ? 'passenger' : null,
    tire_dual: has('both dual', 'both tires') ? 'both' : has('inner', 'inside dual') ? 'inner' : has('outer', 'outside dual', 'outside drive') ? 'outer' : null,
    has_spare: has('no spare', "don't have a spare") ? false : has('have a spare', 'got a spare') ? true : null,
    trailer_work: has('trailer axle', 'trailer brake', 'reefer', 'liftgate', 'landing gear', 'trailer bearing', 'trailer hub', 'trailer door') ? true : null,
    tow_dropoff: (msg.match(/tow (?:it |me )?to ([^,.]+)/i) || [])[1] || null,
    trailer_info: has('loaded trailer') ? 'loaded trailer attached' : has('empty trailer') ? 'empty trailer attached' : has('bobtail') ? 'bobtail, no trailer' : null,
    wants_winch: has('winch', 'stuck in the mud', 'stuck in snow', 'in a ditch') ? true : null,
    service_refused: has('patch') ? 'tire_patch' : has('windshield') ? 'windshield' : has('locked out', 'locksmith', 'keys') ? 'locksmith' : has('roof leak') ? 'rv_roof' : null,
    problem: service || has('broke', 'blew', 'leak', 'stuck', 'dead', 'won\'t') ? msg : null,
    drivable: has('drivable', 'can drive', 'limp') ? true : has('not drivable', "can't drive", 'cant drive', 'wont move') ? false : null,
    safety: has('shoulder', 'safe spot', 'rest area', 'parking lot', 'truck stop') ? 'shoulder' : has('blocking', 'in the lane', 'in a lane', 'middle of') ? 'blocking' : null,
    location_text,
    location_specific: !!(roadMatch && (refMatch || dirMatch)),
    location_state: has('texas', 'amarillo', 'dallas', 'tucson') ? (has('tucson') ? 'az' : 'tx') : null,
    customer_name: (msg.match(/(?:my name is|this is|i'?m) ([A-Z][a-z]+)\b/) || [])[1] || null,
    location_query: roadMatch || refMatch ? msg : null,
    ack: 'Got it.',
  }
}
