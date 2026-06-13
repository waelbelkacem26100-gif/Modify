'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'

interface Props {
  beforeUrl?: string
  afterUrl?: string
  beforeLabel?: string
  afterLabel?: string
  /** Affiché quand une capture manque — ex "Boutique protégée par mot de passe". */
  unavailableReason?: string
}

/**
 * Before/after image comparison slider: drag the handle to reveal the change.
 * Si une capture manque, affiche un état HONNÊTE (carte cadenas + raison) —
 * jamais d'image grise qui pourrait passer pour un bug ou une fausse preuve.
 */
export default function BeforeAfterSlider({
  beforeUrl, afterUrl, beforeLabel = 'Avant', afterLabel = 'Après', unavailableReason,
}: Props) {
  const [pos, setPos] = useState(50)

  if (!beforeUrl || !afterUrl) {
    return (
      <div className="rounded-xl border border-border bg-surface-2 p-5 flex items-start gap-3">
        <Lock className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-text-primary text-sm font-medium">Preuve visuelle indisponible pour l’instant</p>
          <p className="text-text-secondary text-xs mt-1 leading-relaxed">
            {unavailableReason ?? 'La capture avant/après n’a pas pu être réalisée.'}
            {' '}La comparaison apparaîtra ici dès que la boutique sera accessible.
          </p>
          <a
            href="https://help.shopify.com/fr/manual/online-store/themes/password-page"
            target="_blank" rel="noopener noreferrer"
            className="text-primary text-xs font-medium hover:text-primary-dark inline-block mt-2"
          >
            Comment rendre ma boutique publique ? →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border select-none" style={{ aspectRatio: '1280 / 900' }}>
      {/* Base = AFTER (full) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={afterUrl} alt={afterLabel} className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none" />
      {/* Overlay = BEFORE, clipped to the left `pos`% */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={beforeUrl} alt={beforeLabel} className="absolute inset-0 w-full h-full object-cover object-top" />
      </div>

      {/* Labels */}
      <span className="absolute top-2 left-2 z-10 text-[10px] font-semibold px-2 py-0.5 bg-black/65 text-white rounded uppercase">{beforeLabel}</span>
      <span className="absolute top-2 right-2 z-10 text-[10px] font-semibold px-2 py-0.5 bg-primary text-white rounded uppercase">{afterLabel}</span>

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
