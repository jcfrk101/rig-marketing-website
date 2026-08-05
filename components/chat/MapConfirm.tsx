'use client'

// Draggable-pin confirm for the location step. Leaflet + OSM tiles: no API
// key in the browser (the Google key stays server-side for geocoding).
// Leaflet is loaded lazily so it never touches the SSR pass.
import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'

export default function MapConfirm({
  lat,
  lng,
  onConfirm,
  onReject,
}: {
  lat: number
  lng: number
  onConfirm: (lat: number, lng: number, moved: boolean) => void
  onReject: () => void
}) {
  const mapEl = useRef<HTMLDivElement>(null)
  const pin = useRef({ lat, lng, moved: false })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let map: import('leaflet').Map | null = null
    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !mapEl.current) return
      map = L.map(mapEl.current, { zoomControl: true, attributionControl: true }).setView([lat, lng], 16)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map)
      // divIcon avoids Leaflet's bundler-hostile default marker images.
      const icon = L.divIcon({
        className: '',
        html: '<svg width="34" height="34" viewBox="0 0 24 24" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))"><path fill="#0adc6a" stroke="#222b32" stroke-width="1.2" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.6" fill="#222b32"/></svg>',
        iconSize: [34, 34],
        iconAnchor: [17, 32],
      })
      const marker = L.marker([lat, lng], { draggable: true, icon }).addTo(map)
      marker.on('dragend', () => {
        const p = marker.getLatLng()
        pin.current = { lat: p.lat, lng: p.lng, moved: true }
      })
      setReady(true)
    })()
    return () => {
      cancelled = true
      map?.remove()
    }
  }, [lat, lng])

  return (
    <div className="flex flex-col gap-2.5">
      <div
        ref={mapEl}
        className="h-[210px] w-full overflow-hidden rounded-xl border border-white/15"
        aria-label="Map — drag the pin to your exact spot"
      />
      <button
        disabled={!ready}
        onClick={() => onConfirm(pin.current.lat, pin.current.lng, pin.current.moved)}
        className="w-full rounded-full bg-rig-green px-4 py-3 text-[15px] font-extrabold text-rig-navy-deep hover:bg-rig-green-dark disabled:opacity-60"
      >
        📍 This is the spot
      </button>
      <button
        onClick={onReject}
        className="self-center rounded-full border border-white/20 px-4 py-1.5 text-[12.5px] text-white/60 transition hover:border-rig-green hover:text-rig-green"
      >
        Way off — I&apos;ll describe it instead
      </button>
    </div>
  )
}
