/**
 * Impact Visible — modèle unifié d'une PREUVE de correction.
 *
 * Un ProofRecord représente ce que Modify peut MONTRER honnêtement au marchand
 * pour un correctif appliqué. Sources : la ligne `fixes` existante (statut,
 * screenshots, backup JSON __modify_backup v1) + audit_logs (date réelle
 * d'application) + lecture LIVE de Shopify pour l'état "après" (jamais inventé).
 */
export type ProofType = 'visual' | 'google_preview' | 'structured_data' | 'none'

export interface ProofSide {
  /** proofType=visual — URL de capture réelle (jamais de placeholder-image). */
  screenshotUrl?: string
  /** proofType=google_preview — titre Google (meta title). */
  text?: string
  /** proofType=google_preview — description Google (meta description). */
  description?: string
  /** proofType=structured_data — données produit lisibles par Google ? */
  hasStructuredData?: boolean
}

export interface ProofRecord {
  /** = fix.id existant */
  id: string
  /** ISO — depuis audit_logs (action d'application réussie), sinon fixes.created_at */
  appliedAt: string
  title: string
  category: string
  monthlyImpactEur: number
  proofType: ProofType
  before: ProofSide
  after: ProofSide
  /** Champs ajoutés (structured_data), en français simple : ['prix', 'disponibilité'…] */
  fieldsAdded?: string[]
  /** Lien "Voir sur la boutique" — seulement si la vitrine est publique. */
  productUrl?: string
  /** Éléments exacts concernés (titres des produits du backup). */
  affectedItems: string[]
  /** true si la vitrine est derrière mot de passe (preuve visuelle indisponible). */
  storefrontGated?: boolean
}
