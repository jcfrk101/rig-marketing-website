import { FeedItem, placeOf, serviceLabel, timeAgo } from '@/lib/feed'

// Public feed cards. Completed jobs get the full card (photo, write-up);
// requested jobs render as compact activity rows so a day with no
// completed posts yet still reads as a live network. Server components —
// no client JS.

export function CompletedCard({ item }: { item: FeedItem }) {
  const photo = item.photo_urls?.[0]
  const place = placeOf(item)
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-rig-navy/10 bg-white shadow-sm">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="h-52 w-full object-cover" loading="lazy" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-rig-green/15 px-2.5 py-0.5 font-semibold text-rig-green-dark">✓ Completed</span>
          <span className="rounded-full bg-rig-navy/5 px-2.5 py-0.5 font-medium text-rig-navy/70">{serviceLabel(item.service_type)}</span>
          <span className="ml-auto text-rig-navy/50">{timeAgo(item.event_at_epoch)}</span>
        </div>
        <h3 className="text-base font-semibold text-rig-navy">{[item.vehicle, place].filter(Boolean).join(' · ') || place || 'Job'}</h3>
        {item.description && <p className="text-sm leading-relaxed text-rig-navy/75">{item.description}</p>}
      </div>
    </article>
  )
}

export function RequestedRow({ item }: { item: FeedItem }) {
  const place = placeOf(item)
  return (
    <li className="flex items-center gap-3 py-2.5 text-sm">
      <span className="h-2 w-2 shrink-0 rounded-full bg-rig-green" aria-hidden />
      <span className="text-rig-navy/85">
        <span className="font-medium text-rig-navy">{serviceLabel(item.service_type)}</span>
        {place ? ` · ${place}` : ''}
      </span>
      <span className="ml-auto shrink-0 text-xs text-rig-navy/50">{timeAgo(item.event_at_epoch)}</span>
    </li>
  )
}
