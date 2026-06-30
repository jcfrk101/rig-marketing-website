'use client'

import { useEffect, useRef } from 'react'
import { networkPoints } from '@/data/networkPoints'

// Raw scatter plot of every service-provider location. No basemap, no state lines —
// the density of real points alone traces the outline of the continental US.
export default function NetworkPlot({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    // Geographic bounds of the dataset.
    let lngMin = Infinity,
      lngMax = -Infinity,
      latMin = Infinity,
      latMax = -Infinity
    for (const [lng, lat] of networkPoints) {
      if (lng < lngMin) lngMin = lng
      if (lng > lngMax) lngMax = lng
      if (lat < latMin) latMin = lat
      if (lat > latMax) latMax = lat
    }
    // Correct for longitude compression at this latitude so the shape isn't stretched.
    const meanLat = ((latMin + latMax) / 2) * (Math.PI / 180)
    const lngScale = Math.cos(meanLat)
    const geoW = (lngMax - lngMin) * lngScale
    const geoH = latMax - latMin
    const aspect = geoW / geoH

    const draw = () => {
      const cssW = wrap.clientWidth
      const cssH = cssW / aspect
      wrap.style.height = `${cssH}px`

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(cssW * dpr)
      canvas.height = Math.round(cssH * dpr)

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cssW, cssH)

      const pad = 8
      const drawW = cssW - pad * 2
      const drawH = cssH - pad * 2
      const r = Math.max(0.7, cssW / 900)

      ctx.fillStyle = '#22c55e' // rig-green
      ctx.globalAlpha = 0.85
      for (const [lng, lat] of networkPoints) {
        const x = pad + ((lng - lngMin) * lngScale * drawW) / geoW
        const y = pad + ((latMax - lat) * drawH) / geoH
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={wrapRef} className={`relative w-full ${className}`}>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
