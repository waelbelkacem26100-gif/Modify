'use client'

import { useState, useEffect } from 'react'
import { categoryPresentation } from '@/lib/fix-presentation'
import { relativeDate } from '@/components/proofs/ProofCard'
import type { ProofRecord } from '@/lib/proofs/types'

function euros(n: number) { return `€${Math.round(n).toLocaleString('fr-FR')}` }

/**
 * 🛠️ Dernières actions de Modify — feed compact des 3 dernières corrections
 * prouvées, affiché sur 🔍 Analyse. INVISIBLE tant qu'aucune correction n'est
 * appliquée (pas de "0 actions" déprimant). Re-fetch au montage : une
 * correction appliquée il y a 5 secondes apparaît au retour sur la page.
 */
export default function RecentActivityFeed() {
  const [proofs, setProofs] = useState<ProofRecord[]>([])

  useEffect(() => {
    fetch('/api/proofs?limit=3', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((d: { proofs?: ProofRecord[] } | null) => setProofs(d?.proofs ?? []))
      .catch(() => {})
  }, [])

  if (proofs.length === 0) return null

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-syne font-semibold text-text-primary text-sm">🛠️ Dernières actions de Modify</h2>
        <a href="/dashboard/resultats/preuves" className="text-primary text-xs font-medium hover:text-primary-dark">Voir tout →</a>
      </div>
      <ul className="divide-y divide-border">
        {proofs.map((p) => {
          const cat = categoryPresentation(p.category)
          const thumb = p.proofType === 'visual' && p.after.screenshotUrl
          return (
            <li key={p.id} className="py-2.5 flex items-center gap-3">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.after.screenshotUrl} alt="" className="w-[80px] h-[60px] object-cover object-top rounded-lg border border-border flex-shrink-0" />
              ) : (
                <span className="w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-base flex-shrink-0">{cat.emoji}</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-sm font-medium truncate">{p.title}</p>
                <p className="text-text-muted text-xs">{relativeDate(p.appliedAt)} · vérifié sur Shopify</p>
              </div>
              <span className="text-success text-sm font-semibold flex-shrink-0">+{euros(p.monthlyImpactEur)}/mois</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
