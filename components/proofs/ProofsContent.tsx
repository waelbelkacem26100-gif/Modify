'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, Camera } from 'lucide-react'
import ProofCard from '@/components/proofs/ProofCard'
import type { ProofRecord } from '@/lib/proofs/types'

const PAGE_SIZE = 20

interface ApiResponse {
  proofs: ProofRecord[]
  totalApplied: number
  totalEur: number
  storefrontGated: boolean
  shopDomain?: string
}

/**
 * 📸 Galerie Impact — tout ce que Modify a réellement changé, avec preuve par type.
 * `embedded` : rendu comme section de la page 📊 Impact & Résultats (pas de
 * back-link, grille dense, ancre #galerie-impact) plutôt qu'une page autonome.
 */
export default function ProofsContent({ embedded = false }: { embedded?: boolean }) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [shown, setShown] = useState(PAGE_SIZE)

  useEffect(() => {
    fetch('/api/proofs?limit=50')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setData(d))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const proofs = data?.proofs ?? []
  const total = data?.totalApplied ?? 0
  const eur = Math.round(data?.totalEur ?? 0)

  return (
    <div id={embedded ? 'galerie-impact' : undefined} className={embedded ? 'max-w-4xl scroll-mt-6' : 'p-4 sm:p-8 max-w-4xl'}>
      {!embedded && (
        <a href="/dashboard/resultats" className="inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-sm mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Vos résultats
        </a>
      )}

      <div className="mb-6 sm:mb-8">
        {embedded
          ? <h2 className="font-display font-bold text-lg sm:text-xl text-text-primary mb-1">📸 Galerie Impact</h2>
          : <h1 className="font-display font-bold text-xl sm:text-2xl text-text-primary mb-1">📸 Preuves</h1>}
        {total > 0 ? (
          <p className="text-text-secondary text-sm max-w-2xl">
            Modify a appliqué <span className="text-text-primary font-semibold">{total} correction{total > 1 ? 's' : ''} vérifiée{total > 1 ? 's' : ''}</span> sur
            votre boutique, pour un impact estimé de <span className="text-success font-semibold">{eur.toLocaleString('fr-FR')}€/mois</span>.
            Chaque entrée ci-dessous montre ce qui a réellement changé.
          </p>
        ) : (
          <p className="text-text-secondary text-sm">Ce que Modify a changé sur votre boutique, preuve à l’appui.</p>
        )}
      </div>

      {proofs.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center">
          <Camera className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h3 className="font-syne font-semibold text-text-primary mb-2">Aucune correction appliquée pour le moment</h3>
          <p className="text-text-secondary text-sm mb-4">Allez dans ⚡ Corrections pour commencer — chaque correction apparaîtra ici avec sa preuve.</p>
          <a href="/dashboard/corrections"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-colors">
            Voir les corrections <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      ) : (
        <>
          <div className={embedded ? 'grid gap-4 lg:grid-cols-2' : 'space-y-4'}>
            {proofs.slice(0, shown).map((p) => (
              <ProofCard key={p.id} proof={p} shopDomain={data?.shopDomain ?? ''} />
            ))}
          </div>
          {proofs.length > shown && (
            <button onClick={() => setShown((s) => s + PAGE_SIZE)}
              className="mt-5 w-full py-3 rounded-xl border border-border text-text-secondary hover:text-text-primary hover:border-primary/40 text-sm font-medium transition-colors">
              Afficher plus ({proofs.length - shown} restantes)
            </button>
          )}
        </>
      )}
    </div>
  )
}
