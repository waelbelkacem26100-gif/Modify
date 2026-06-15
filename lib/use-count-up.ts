'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * v9 — anime un nombre de 0 (ou de sa valeur précédente) vers `target`.
 * easeOut, ~1.2s par défaut. Respecte prefers-reduced-motion (valeur instantanée).
 * Ne se rejoue qu'au changement de cible.
 */
export function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') { setValue(target); return }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || target <= 0) { setValue(target); return }

    const from = fromRef.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      const v = Math.round(from + (target - from) * eased)
      setValue(v)
      if (t < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}
