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
  tireSize: { value: string | null; attempts: number } // tire service only
  problem: { description: string | null; followupsAsked: number; drivable: boolean | null }
  safety: 'shoulder' | 'blocking' | null
  location: {
    lat: number | null
    lng: number | null
    text: string | null
    resolved: string | null // human-readable confirmed location
    state: string | null // 2-letter code when inferable — drives the directory link
    tier: Tier
    attempts: number
  }
  photos: number
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
    problem: { description: null, followupsAsked: 0, drivable: null },
    safety: null,
    location: { lat: null, lng: null, text: null, resolved: null, state: null, tier: 'missing', attempts: 0 },
    photos: 0,
    phone: { number: null, verified: false, otpSent: false },
    flags: [],
    submitted: false,
  }
}

// Eligibility ruling. null = not decidable yet (need fuel answer).
export function eligibility(s: ChatState): 'eligible' | 'ineligible' | 'unknown' {
  switch (s.vehicleClass) {
    case null:
      return 'unknown'
    case 'semi':
    case 'box_truck':
      return 'eligible' // inherently diesel — never ask fuel
    case 'rv':
      return 'eligible' // gas or diesel OK; tagged special via class
    case 'car':
      return 'ineligible'
    case 'pickup':
    case 'van':
    case 'other':
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
  if (s.location.lat !== null) return 'gold'
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
  | 'tire_size'
  | 'photos'
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
  if (s.safety === null) return 'safety'
  if (locationTier(s) === 'missing' || (locationTier(s) === 'weak' && s.location.attempts < MAX_ATTEMPTS))
    return 'location'
  if (s.service === 'tire' && s.tireSize.value === null && s.tireSize.attempts < MAX_ATTEMPTS && s.photos === 0)
    return 'tire_size'
  if (
    s.service === 'service' &&
    (vehicleTier(s) === 'missing' || vehicleTier(s) === 'weak') &&
    s.vehicle.attempts < MAX_ATTEMPTS
  )
    return 'vehicle_detail'
  if (!photosOffered && s.photos === 0) return 'photos' // skip if they've already sent photos mid-flow
  if (!s.phone.verified) return 'phone'
  return 'summary'
}

// Flags for the dispatcher — which fields are weak and why.
export function computeFlags(s: ChatState): string[] {
  const flags: string[] = []
  if (locationTier(s) !== 'gold' && locationTier(s) !== 'good') flags.push('LOCATION_UNRESOLVED')
  if (s.service === 'tire' && !s.tireSize.value && s.photos === 0) flags.push('TIRE_SIZE_UNKNOWN')
  if (s.service === 'service' && vehicleTier(s) !== 'gold' && vehicleTier(s) !== 'good')
    flags.push('VEHICLE_DETAIL_WEAK')
  if (s.safety === 'blocking') flags.push('URGENT_UNSAFE_LOCATION')
  if (s.vehicleClass === 'rv') flags.push('RV')
  return flags
}
