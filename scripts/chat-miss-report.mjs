// Chat-miss pattern report: what drivers typed that the bot bounced (REDIRECT).
// Sources, newest first:
//   evt=chat_miss     — structured miss events (from the REDIRECT branch)
//   evt=chat_transcript — pre-event history, detected by the REDIRECT reply text
// Requires gcloud auth. Run: node scripts/chat-miss-report.mjs [days]
import { execFileSync } from 'child_process'

const days = Number(process.argv[2] || 27)
const REDIRECT = "Sorry — I didn't quite catch that"
const read = (filter) =>
  JSON.parse(
    execFileSync('gcloud', ['logging', 'read',
      `resource.type="cloud_run_revision" AND resource.labels.service_name="rig-marketing-website" AND (${filter})`,
      '--project', 'rig-production-337414', `--freshness=${days}d`, '--limit=8000', '--format=json'],
      { maxBuffer: 256 * 1024 * 1024 }).toString() || '[]'
  )

const misses = []
for (const r of read('jsonPayload.evt="chat_miss"')) {
  const p = r.jsonPayload || {}
  if (p.text) misses.push({ t: (r.timestamp || '').slice(0, 16), text: p.text, slot: p.slot })
}
for (const r of read('jsonPayload.evt="chat_transcript"')) {
  const p = r.jsonPayload || {}
  const entries = p.entries || []
  const driver = entries.find((e) => e.role === 'driver')
  if (driver && entries.some((e) => e.role === 'bot' && (e.text || '').includes(REDIRECT)))
    misses.push({ t: (r.timestamp || '').slice(0, 16), text: driver.text, slot: p.slot })
}
// dedupe (both sinks can capture the same turn once chat_miss ships)
const seen = new Set()
const unique = misses.filter((m) => { const k = m.t + '|' + m.text; if (seen.has(k)) return false; seen.add(k); return true })
unique.sort((a, b) => (a.t < b.t ? 1 : -1))
console.log(`misses in last ${days}d: ${unique.length}\n`)
for (const m of unique.slice(0, 60)) console.log(`${m.t} [${m.slot ?? '-'}] ${m.text.slice(0, 130)}`)
