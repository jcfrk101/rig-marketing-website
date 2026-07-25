// Links into the Rig semi-truck repair SEO directory, served at
// www.bigrig.app/semi-truck-repair (built from the rig-ads-website repo,
// `seo-directory` branch). Source of truth: rig-ads-website/data/directory/.
// Regenerate this list when the directory adds states or corridors.

export const DIRECTORY_ORIGIN = 'https://bigrig.app'
export const DIRECTORY_ROOT = `${DIRECTORY_ORIGIN}/semi-truck-repair/`
export const DIRECTORY_CORRIDORS_ROOT = `${DIRECTORY_ORIGIN}/semi-truck-repair/corridors/`

export interface DirectoryLink {
  label: string
  href: string
}

// All states with directory coverage, alphabetical.
// Alaska and Hawaii are omitted: the directory's coverage gate (isStateCovered
// in rig-ads-website) only publishes a state hub once it has real mechanic
// listings, and those two 404 in production today. Re-add when covered.
export const directoryStates: DirectoryLink[] = [
  { label: 'Alabama', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/al/` },
  { label: 'Arizona', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/az/` },
  { label: 'Arkansas', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/ar/` },
  { label: 'California', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/ca/` },
  { label: 'Colorado', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/co/` },
  { label: 'Connecticut', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/ct/` },
  { label: 'Delaware', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/de/` },
  { label: 'District of Columbia', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/dc/` },
  { label: 'Florida', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/fl/` },
  { label: 'Georgia', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/ga/` },
  { label: 'Idaho', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/id/` },
  { label: 'Illinois', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/il/` },
  { label: 'Indiana', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/in/` },
  { label: 'Iowa', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/ia/` },
  { label: 'Kansas', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/ks/` },
  { label: 'Kentucky', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/ky/` },
  { label: 'Louisiana', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/la/` },
  { label: 'Maine', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/me/` },
  { label: 'Maryland', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/md/` },
  { label: 'Massachusetts', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/ma/` },
  { label: 'Michigan', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/mi/` },
  { label: 'Minnesota', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/mn/` },
  { label: 'Mississippi', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/ms/` },
  { label: 'Missouri', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/mo/` },
  { label: 'Montana', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/mt/` },
  { label: 'Nebraska', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/ne/` },
  { label: 'Nevada', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/nv/` },
  { label: 'New Hampshire', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/nh/` },
  { label: 'New Jersey', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/nj/` },
  { label: 'New Mexico', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/nm/` },
  { label: 'New York', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/ny/` },
  { label: 'North Carolina', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/nc/` },
  { label: 'North Dakota', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/nd/` },
  { label: 'Ohio', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/oh/` },
  { label: 'Oklahoma', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/ok/` },
  { label: 'Oregon', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/or/` },
  { label: 'Pennsylvania', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/pa/` },
  { label: 'Rhode Island', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/ri/` },
  { label: 'South Carolina', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/sc/` },
  { label: 'South Dakota', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/sd/` },
  { label: 'Tennessee', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/tn/` },
  { label: 'Texas', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/tx/` },
  { label: 'Utah', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/ut/` },
  { label: 'Vermont', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/vt/` },
  { label: 'Virginia', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/va/` },
  { label: 'Washington', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/wa/` },
  { label: 'West Virginia', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/wv/` },
  { label: 'Wisconsin', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/wi/` },
  { label: 'Wyoming', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/wy/` },
]

// Interstate corridors spanning the most states — the highest-traffic directory hubs.
export const directoryCorridors: DirectoryLink[] = [
  { label: 'I-95 truck repair', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/corridors/i-95/` },
  { label: 'I-90 truck repair', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/corridors/i-90/` },
  { label: 'I-80 truck repair', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/corridors/i-80/` },
  { label: 'I-70 truck repair', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/corridors/i-70/` },
  { label: 'I-10 truck repair', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/corridors/i-10/` },
  { label: 'I-40 truck repair', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/corridors/i-40/` },
  { label: 'I-94 truck repair', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/corridors/i-94/` },
  { label: 'I-15 truck repair', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/corridors/i-15/` },
  { label: 'I-20 truck repair', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/corridors/i-20/` },
  { label: 'I-35 truck repair', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/corridors/i-35/` },
  { label: 'I-55 truck repair', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/corridors/i-55/` },
  { label: 'I-75 truck repair', href: `${DIRECTORY_ORIGIN}/semi-truck-repair/corridors/i-75/` },
]
