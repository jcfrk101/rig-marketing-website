// VIN decode via the free NHTSA vPIC API (no key). Used when the vision pass
// reads a VIN off a door-jamb plate or registration photo — authoritative
// make/model/year beats whatever the vision model guessed from the shot.
export type VinDecode = { make: string | null; model: string | null; year: string | null }

const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())

export async function decodeVin(vin: string): Promise<VinDecode | null> {
  const clean = vin.replace(/[^a-z0-9]/gi, '').toUpperCase()
  if (clean.length !== 17) return null
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${clean}?format=json`,
      { signal: AbortSignal.timeout(6000), cache: 'no-store' }
    )
    if (!res.ok) return null
    const json = await res.json()
    const r = json?.Results?.[0]
    if (!r) return null
    const make = r.Make ? titleCase(String(r.Make)) : null
    const model = r.Model ? String(r.Model) : null
    const year = r.ModelYear ? String(r.ModelYear) : null
    if (!make && !model && !year) return null
    return { make, model, year }
  } catch (err) {
    console.error('vin decode failed', err)
    return null
  }
}
