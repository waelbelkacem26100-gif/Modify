'use client'

import { ExternalLink } from 'lucide-react'
import BeforeAfterSlider from '@/components/dashboard/BeforeAfterSlider'
import GooglePreviewBeforeAfter from '@/components/proofs/GooglePreviewBeforeAfter'
import StructuredDataExplainer from '@/components/proofs/StructuredDataExplainer'
import { categoryPresentation } from '@/lib/fix-presentation'
import type { ProofRecord } from '@/lib/proofs/types'

export function relativeDate(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 60) return min <= 1 ? 'à l’instant' : `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} heure${h > 1 ? 's' : ''}`
  const d = Math.floor(h / 24)
  if (d < 30) return d === 1 ? 'hier' : `il y a ${d} jours`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function euros(n: number) { return `€${Math.round(n).toLocaleString('fr-FR')}` }

/** Carte complète d'une preuve — utilisée par la page 📸 Preuves. */
export default function ProofCard({ proof, shopDomain }: { proof: ProofRecord; shopDomain: string }) {
  const cat = categoryPresentation(proof.category)
  const pageUrl = proof.productUrl ?? `https://${shopDomain}`

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="text-text-muted text-xs">{relativeDate(proof.appliedAt)}</span>
        <span className="inline-flex items-center gap-1 text-[11px] text-text-secondary bg-surface-2 border border-border px-2 py-0.5 rounded-full">
          {cat.emoji} {cat.label}
        </span>
        <span className="text-success text-sm font-semibold ml-auto">+{euros(proof.monthlyImpactEur)}/mois</span>
      </div>

      <h3 className="font-medium text-text-primary text-sm mb-3">{proof.title}</h3>

      {proof.proofType === 'visual' && (
        <BeforeAfterSlider
          beforeUrl={proof.before.screenshotUrl}
          afterUrl={proof.after.screenshotUrl}
          unavailableReason={proof.storefrontGated ? 'Boutique protégée par mot de passe' : undefined}
        />
      )}

      {proof.proofType === 'google_preview' && (
        proof.after.text || proof.after.description ? (
          <GooglePreviewBeforeAfter
            before={{ title: proof.before.text ?? '', description: proof.before.description ?? '', url: pageUrl }}
            after={{ title: proof.after.text ?? '', description: proof.after.description ?? '', url: pageUrl }}
          />
        ) : (
          <p className="text-text-secondary text-sm">Titres et descriptions Google réécrits — exemple indisponible (produit modifié depuis).</p>
        )
      )}

      {proof.proofType === 'structured_data' && (
        <StructuredDataExplainer
          before={Boolean(proof.before.hasStructuredData)}
          after={Boolean(proof.after.hasStructuredData)}
          fieldsAdded={proof.fieldsAdded ?? []}
        />
      )}

      {proof.proofType === 'none' && (
        <p className="text-text-secondary text-sm">Correctif appliqué et vérifié sur Shopify — pas de preuve visuelle disponible pour ce type de changement.</p>
      )}

      <div className="flex items-center gap-3 flex-wrap mt-3">
        {proof.affectedItems.length > 0 && (
          <p className="text-text-muted text-xs">
            Concerne : {proof.affectedItems.slice(0, 3).join(' · ')}{proof.affectedItems.length > 3 ? ` +${proof.affectedItems.length - 3}` : ''}
          </p>
        )}
        {proof.productUrl && !proof.storefrontGated && (
          <a href={proof.productUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary text-xs font-medium hover:text-primary-dark ml-auto">
            <ExternalLink className="w-3.5 h-3.5" /> Voir sur la boutique →
          </a>
        )}
      </div>
    </div>
  )
}
