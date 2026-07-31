// The slot contract for breakdown-chat intake.
// Each slot has: a value, a quality tier, an attempt counter, and flags.
// "Enough" is tiered per slot (and per service type); after MAX_ATTEMPTS the
// engine accepts partial data with a flag — the dispatcher (AI_REVIEW) and the
// verified callback number are the safety net. Never dead-end.

export type Tier = 'gold' | 'good' | 'weak' | 'missing'

export type VehicleClass = 'semi' | 'box_truck' | 'pickup' | 'van' | 'rv' | 'car' | 'other'
export type Fuel = 'diesel' | 'gas'
export type ServiceType = 'tire' | 'tow' | 'service'

export interface ChatState {
  // Eligibility: diesel-only except RVs (gas OK, but tagged special). Cars never.
  vehicleClass: VehicleClass | null
  fuel: Fuel | null
  declined: boolean

  service: ServiceType | null

  vehicle: { make: string | null; model: string | null; year: string | null; tier: Tier; attempts: number }
  tireSize: { value: string | null; attempts: number } // required only when there's NO spare
  tirePosition: string | null // steer / drive / trailer (+ side, inside/outside)
  tireSpare: boolean | null
  tow: { dropoff: string | null; trailerInfo: string | null; attempts: number }
  wantsWinch: boolean
  problem: { description: string | null; followupsAsked: number; drivable: boolean | null }
  safety: 'shoulder' | 'blocking' | null
  location: {
    lat: number | null
    lng: number | null
    text: string | null
    resolved: string | null // human-readable confirmed location
    state: string | null // 2-letter code when inferable — drives the directory link
    // Geocoded candidates awaiting driver confirm-back (name/address/lat/lng/state).
    candidates: { name: string; address: string; lat: number; lng: number; state: string | null }[] | null
    tier: Tier
    attempts: number
  }
  // Asked exactly once (voice-agent rule); volunteered names captured anytime.
  name: string | null
  nameAsked: boolean
  photos: number
  // What the vision model saw in uploaded photos (images themselves are
  // analyzed and discarded — never stored).
  photoSummary: string | null
  photoNotes: string | null
  awaitingPhotoNote: boolean
  phone: { number: string | null; verified: boolean; otpSent: boolean }
  flags: string[]
  submitted: boolean
}

export const MAX_ATTEMPTS = 3

export function initialState(): ChatState {
  return {
    vehicleClass: null,
    fuel: null,
    declined: false,
    service: null,
    vehicle: { make: null, model: null, year: null, tier: 'missing', attempts: 0 },
    tireSize: { value: null, attempts: 0 },
    tirePosition: null,
    tireSpare: null,
    tow: { dropoff: null, trailerInfo: null, attempts: 0 },
    wantsWinch: false,
    problem: { description: null, followupsAsked: 0, drivable: null },
    safety: null,
    location: { lat: null, lng: null, text: null, resolved: null, state: null, candidates: null, tier: 'missing', attempts: 0 },
    name: null,
    nameAsked: false,
    photos: 0,
    photoSummary: null,
    photoNotes: null,
    awaitingPhotoNote: false,
    phone: { number: null, verified: false, otpSent: false },
    flags: [],
    submitted: false,
  }
}

// Eligibility ruling. null = not decidable yet (need fuel answer).
// Business rules (docs/voice-agent-prompt-v3.05.txt): gas RVs always OK;
// gas pickups/vans qualify ONLY for winch-outs or tire replacement;
// gas cars only for winching.
export function eligibility(s: ChatState): 'eligible' | 'ineligible' | 'unknown' {
  const gasException = s.wantsWinch || s.service === 'tire'
  switch (s.vehicleClass) {
    case null:
      return 'unknown'
    case 'semi':
    case 'box_truck':
      return 'eligible' // inherently diesel — never ask fuel
    case 'rv':
      return 'eligible' // gas or diesel OK; tagged special via class
    case 'car':
      return s.wantsWinch ? 'eligible' : 'ineligible'
    case 'pickup':
    case 'van':
    case 'other':
      if (gasException) return 'eligible' // fuel doesn't matter for winch/tire
      if (s.fuel === null) return 'unknown'
      return s.fuel === 'diesel' ? 'eligible' : 'ineligible'
  }
}

// Vehicle-detail requiredness is service-dependent (contract):
// tow → class is enough; tire → tire size matters most; service → make/model wanted.
export function vehicleTier(s: ChatState): Tier {
  const v = s.vehicle
  if (s.service === 'tow') return 'gold' // class alone suffices, and class is always set by now
  if (v.make && v.model) return v.year ? 'gold' : 'good'
  if (v.make) return 'weak'
  return 'missing'
}

export function locationTier(s: ChatState): Tier {
  // Gold requires CONFIRMED coordinates — a raw GPS share awaiting its
  // confirm-back (lat set, resolved null) does not count yet, and unconfirmed
  // coords still bias any typed correction's geocoding.
  if (s.location.lat !== null && s.location.resolved) return 'gold'
  if (s.location.resolved) return 'good'
  if (s.location.text) return 'weak'
  return 'missing'
}

// The next unfilled slot, in priority order. Drives every turn.
export type SlotId =
  | 'service'
  | 'vehicle_class'
  | 'fuel'
  | 'problem'
  | 'safety'
  | 'location'
  | 'vehicle_detail'
  | 'tire_position'
  | 'tire_spare'
  | 'tire_size'
  | 'tow_detail'
  | 'photos'
  | 'name'
  | 'phone'
  | 'summary'
  | 'declined'
  | 'done'

export function nextSlot(s: ChatState, photosOffered: boolean): SlotId {
  if (s.submitted) return 'done'
  if (s.declined) return 'declined'
  if (s.service === null) return 'service'
  if (s.vehicleClass === null) return 'vehicle_class'
  if (eligibility(s) === 'unknown') return 'fuel'
  if (eligibility(s) === 'ineligible') return 'declined'
  if (s.problem.description === null) return 'problem'
  // Phone comes right after the problem: if the driver gives up mid-chat,
  // a verified number means dispatch can still call them back.
  if (!s.phone.verified) return 'phone'
  // Safety is never asked — but volunteered "blocking a lane" still flags URGENT.
  if (locationTier(s) === 'missing' || (locationTier(s) === 'weak' && s.location.attempts < MAX_ATTEMPTS))
    return 'location'
  // Tire sequence per the voice-agent rules: position → spare → size, and
  // size is REQUIRED only with no spare (a sidewall photo also satisfies it).
  if (s.service === 'tire' && s.tirePosition === null) return 'tire_position'
  if (s.service === 'tire' && s.tireSpare === null) return 'tire_spare'
  if (
    s.service === 'tire' &&
    s.tireSpare === false &&
    s.tireSize.value === null &&
    s.tireSize.attempts < MAX_ATTEMPTS &&
    s.photos === 0
  )
    return 'tire_size'
  // Tow: drop-off + trailer status in one linked question.
  if (s.service === 'tow' && s.tow.dropoff === null && s.tow.attempts < 2) return 'tow_detail'
  if (
    s.service === 'service' &&
    (vehicleTier(s) === 'missing' || vehicleTier(s) === 'weak') &&
    s.vehicle.attempts < MAX_ATTEMPTS
  )
    return 'vehicle_detail'
  if (!photosOffered && s.photos === 0) return 'photos' // skip if they've already sent photos mid-flow
  if (s.name === null && !s.nameAsked) return 'name' // asked once, never re-asked
  return 'summary'
}

// Flags for the dispatcher — which fields are weak and why.
export function computeFlags(s: ChatState): string[] {
  const flags: string[] = []
  if (locationTier(s) !== 'gold' && locationTier(s) !== 'good') flags.push('LOCATION_UNRESOLVED')
  if (s.service === 'tire' && s.tireSpare === false && !s.tireSize.value && s.photos === 0)
    flags.push('TIRE_SIZE_UNKNOWN')
  if (s.service === 'tow' && !s.tow.dropoff) flags.push('TOW_DROPOFF_UNKNOWN')
  if (s.wantsWinch) flags.push('WINCH')
  if (s.service === 'service' && vehicleTier(s) !== 'gold' && vehicleTier(s) !== 'good')
    flags.push('VEHICLE_DETAIL_WEAK')
  if (s.safety === 'blocking') flags.push('URGENT_UNSAFE_LOCATION')
  if (s.vehicleClass === 'rv') flags.push('RV')
  return flags
}
