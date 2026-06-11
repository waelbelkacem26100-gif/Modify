'use client'

import { useState } from 'react'

/** Before/after image comparison slider: drag the handle to reveal the change. */
export default function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50)
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border select-none" style={{ aspectRatio: '1280 / 900' }}>
      {/* Base = AFTER (full) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt="Après" className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none" />
      {/* Overlay = BEFORE, clipped to the left `pos`% */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt="Avant" className="absolute inset-0 w-full h-full object-cover object-top" />
      </div>

      {/* Labels */}
      <span className="absolute top-2 left-2 z-10 text-[10px] font-semibold px-2 py-0.5 bg-black/65 text-white rounded">AVANT</span>
      <span className="absolute top-2 right-2 z-10 text-[10px] font-semibold px-2 py-0.5 bg-primary text-white rounded">APRÈS</span>

      {/* Divider + handle */}
      <div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.2)] pointer-events-none" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white shadow flex items-center justify-center text-text-muted text-xs">⟷</div>
      </div>

      {/* Range input drives the slider */}
      <input
        type="range" min={0} max={100} value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Comparer avant / après"
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
      />
    </div>
  )
}
