'use client'

import { AlertTriangle, ArrowRight } from 'lucide-react'

interface Props {
  /** Nombre de problèmes urgents NON corrigés (priority 'high' encore en attente). */
  count: number
  /** Manque à gagner mensuel cumulé de ces urgences (€/mois). */
  montant: number
  /** Scrolle vers la section des corrections urgentes (même page). */
  onSee: () => void
}

function euros(n: number) {
  return `${Math.round(n).toLocaleString('fr-FR')}€`
}

/**
 * ⚠️ Bannière d'alerte urgences (v10.1) — /dashboard uniquement.
 *
 * Affichée uniquement quand `count > 0` (le parent ne la monte pas sinon, d'où
 * la disparition propre quand tout est corrigé). Données réelles : le parent
 * calcule count + montant depuis les résultats d'audit (zéro fake data).
 * Styles : rouge doux en clair, rouge profond translucide en sombre.
 */
export default function UrgentBanner({ count, montant, onSee }: Props) {
  if (count <= 0) return null

  return (
    <div
      role="alert"
      className="flex items-center gap-3 flex-wrap mb-6 rounded-2xl border px-4 py-3 transition-opacity duration-200
                 bg-[#FEE2E2] border-[#FECACA] text-[#991B1B]
                 dark:bg-[#7F1D1D]/40 dark:border-[#EF4444]/30 dark:text-[#FCA5A5]"
    >
      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
      <p className="text-sm font-medium flex-1 min-w-0">
        {count} problème{count > 1 ? 's' : ''} urgent{count > 1 ? 's' : ''} détecté{count > 1 ? 's' : ''}
        {montant > 0 && <> — <span className="font-syne font-bold">{euros(montant)}/mois</span> en jeu</>}
      </p>
      <button
        onClick={onSee}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0
                   bg-danger text-white hover:bg-[#DC2626] transition-colors"
      >
        Voir les urgences <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
