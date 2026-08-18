// Client for the rig-web-services chat intake endpoints (PR #231).
// Server-to-server only: called from the chat engine/route with Rig-Api-Key.
// When RIG_API_URL / RIG_API_KEY are unset (local dev without the backend,
// tests), every call returns a mock-success so the flow stays testable —
// mirroring the LLM_PROVIDER=mock philosophy.
import type { ChatState } from './slots'
import { computeFlags } from './slots'

const base = () => process.env.RIG_API_URL || ''
const key = () => process.env.RIG_API_KEY || ''
export const backendEnabled = () => Boolean(base() && key())

async function post<T>(path: string, body: unknown): Promise<T | null> {
  const res = await fetch(`${base()}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'Rig-Api-Key': key() },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`${path} -> ${res.status}`)
  const json = await res.json()
  // rig-web-services wraps responses in a global envelope { data: ... } —
  // unwrap when present, pass through otherwise.
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T
}

export async function sendOtp(conversationId: string, phone: string): Promise<{ sent: boolean; reason: string | null }> {
  if (!backendEnabled()) return { sent: true, reason: null } // mock
  try {
    const out = await post<{ sent: boolean; reason: string | null }>('/chat/otp/send', {
      conversation_id: conversationId,
      phone,
    })
    return out ?? { sent: false, reason: 'error' }
  } catch (err) {
    console.error('otp send failed', err)
    return { sent: false, reason: 'error' }
  }
}

export async function checkOtp(
  conversationId: string,
  phone: string,
  code: string,
  firstName: string | null
): Promise<{ verified: boolean; reason: string | null; request_id: string | null }> {
  if (!backendEnabled()) return { verified: true, reason: null, request_id: null } // mock: any code passes
  try {
    const out = await post<{ verified: boolean; reason: string | null; request_id: string | null }>(
      '/chat/otp/check',
      { conversation_id: conversationId, phone, code, first_name: firstName }
    )
    return out ?? { verified: false, reason: 'error', request_id: null }
  } catch (err) {
    console.error('otp check failed', err)
    return { verified: false, reason: 'error', request_id: null }
  }
}

// Escape hatch from the OTP wall: provisions the lead against the number the
// driver confirmed, flagged unverified for dispatch to confirm by voice.
export async function skipOtp(
  conversationId: string,
  phone: string,
  firstName: string | null
): Promise<{ accepted: boolean; reason: string | null }> {
  if (!backendEnabled()) return { accepted: true, reason: null } // mock
  try {
    const out = await post<{ accepted: boolean; reason: string | null; request_id: string | null }>(
      '/chat/otp/skip',
      { conversation_id: conversationId, phone, first_name: firstName }
    )
    return out ?? { accepted: false, reason: 'error' }
  } catch (err) {
    console.error('otp skip failed', err)
    return { accepted: false, reason: 'error' }
  }
}

export async function addPhoto(conversationId: string, dataUrl: string): Promise<string | null> {
  if (!backendEnabled()) return null
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  try {
    const out = await post<{ image_url: string | null; reason: string | null }>('/chat/photo', {
      conversation_id: conversationId,
      base64_image_data: base64,
    })
    return out?.image_url ?? null
  } catch (err) {
    console.error('photo upload failed', err) // never fails the turn — vision readout already captured
    return null
  }
}

export async function removePhoto(conversationId: string, imageUrl: string): Promise<void> {
  if (!backendEnabled()) return
  try {
    await post('/chat/photo/remove', { conversation_id: conversationId, image_url: imageUrl })
  } catch (err) {
    // Best-effort: the photo is already gone from the chat state and summary;
    // an old backend build without this route just leaves an orphan image.
    console.error('photo remove failed', err)
  }
}

export async function updateLead(state: ChatState): Promise<void> {
  if (!backendEnabled()) return
  try {
    await post('/chat/lead/update', { conversation_id: state.conversationId, payload: leadPayload(state) })
  } catch (err) {
    console.error('lead update failed', err)
  }
}

export async function submitLead(state: ChatState): Promise<{ submitted: boolean; request_id: string | null }> {
  if (!backendEnabled()) return { submitted: true, request_id: null } // mock
  try {
    const out = await post<{ submitted: boolean; reason: string | null; request_id: string | null }>(
      '/chat/lead/submit',
      { conversation_id: state.conversationId, payload: leadPayload(state) }
    )
    return { submitted: out?.submitted ?? false, request_id: out?.request_id ?? null }
  } catch (err) {
    console.error('lead submit failed', err)
    return { submitted: false, request_id: null }
  }
}

// Structured city for the dispatcher's address block, parsed from the
// confirmed address text ("344 Hilltop Dr, Chula Vista, CA 91910, USA").
// The full text still rides location_text and the notes.
function cityFrom(text: string | null): string | null {
  if (!text) return null
  const parts = text.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 3) return null
  const last = parts[parts.length - 1]
  const idx = /^(usa|united states)$/i.test(last) ? parts.length - 3 : parts.length - 2
  const city = parts[idx]
  return city && !/\d/.test(city) ? city : null
}

// Maps chat state to the backend's ChatLeadPayload (snake_case contract).
export function leadPayload(s: ChatState) {
  return {
    service_type: s.service,
    vehicle_class: s.vehicleClass,
    vehicle_make: s.vehicle.make,
    vehicle_model: s.vehicle.model,
    vehicle_year: s.vehicle.year,
    vehicle_vin: s.vehicle.vin,
    fuel: s.fuel,
    drivable: s.problem.drivable,
    phone_verified: s.phone.smsConfirmed,
    alt_phone: s.phone.altPhone,
    problem: s.problem.description,
    customer_name: s.name,
    latitude: s.location.lat,
    longitude: s.location.lng,
    location_text: s.location.resolved || s.location.text,
    city: cityFrom(s.location.resolved || s.location.text),
    state: s.location.state ? s.location.state.toUpperCase() : null,
    tire_size: s.tireSize.value,
    // Structured tire location — drives the mechanic-facing TirePositions
    // grid server-side; the composed tire_position below feeds the notes.
    tire_axle: s.tirePosition === 'unknown' ? null : s.tirePosition,
    tire_side: s.tireSide === 'unknown' ? null : s.tireSide,
    tire_dual: s.tireDual === 'unknown' ? null : s.tireDual,
    tire_position:
      [s.tirePosition !== 'unknown' ? s.tirePosition : null, s.tireSide && s.tireSide !== 'unknown' && `${s.tireSide} side`, s.tireDual && s.tireDual !== 'unknown' && (s.tireDual === 'both' ? 'both duals' : `${s.tireDual} dual`)]
        .filter(Boolean)
        .join(', ') || null,
    has_spare: s.tireSpare,
    tow_dropoff: s.tow.dropoff,
    trailer_info: s.tow.trailerInfo,
    photo_summary: s.photoSummary,
    photo_notes: s.photoNotes,
    flags: computeFlags(s),
    // Compact provenance line for the dispatcher notes ("Came from: ...").
    journey: s.journey
      ? `${s.journey.device || '?'} · ${s.journey.referrer || 'direct'} -> ${s.journey.landing || '?'} (${s.journey.views} page view${s.journey.views > 1 ? 's' : ''})`
      : null,
    // Google Ads click ID (when the visitor came from an ad) — lets the
    // backend report this lead to Google as an offline click conversion.
    ad_click_id: s.journey?.click?.id ?? null,
    ad_click_kind: s.journey?.click?.kind ?? null,
  }
}
