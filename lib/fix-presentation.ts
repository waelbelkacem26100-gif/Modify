import type { RiskGroup, IssueCategory, PriorityLevel } from '@/types'

/**
 * Merchant-facing presentation helpers. Everything here is jargon-free, simple
 * French — no "Groupe A/B/C", no "Liquid", no "LCP/CLS", no technical category
 * names. Used by the dashboard, audit and fixes pages.
 */

// Friendly category labels + emoji (replaces "trust signals", "speed", etc.).
export const CATEGORY_PRESENTATION: Record<IssueCategory, { emoji: string; label: string }> = {
  theme: { emoji: '🎨', label: 'Apparence de la boutique' },
  product: { emoji: '📦', label: 'Fiches produits' },
  trust: { emoji: '🛡️', label: 'Confiance & réassurance' },
  speed: { emoji: '⚡', label: 'Rapidité des pages' },
  checkout: { emoji: '🛒', label: 'Tunnel d’achat' },
}

export function categoryPresentation(category: string) {
  return CATEGORY_PRESENTATION[category as IssueCategory] ?? { emoji: '✨', label: 'Amélioration' }
}

// Visual priority: 🔴 Urgent / 🟠 Important / 🟡 À améliorer.
export const PRIORITY_PRESENTATION: Record<PriorityLevel, { emoji: string; label: string; cls: string }> = {
  high: { emoji: '🔴', label: 'Urgent', cls: 'text-danger' },
  medium: { emoji: '🟠', label: 'Important', cls: 'text-warning' },
  low: { emoji: '🟡', label: 'À améliorer', cls: 'text-success' },
}

export function priorityPresentation(priority: string) {
  return PRIORITY_PRESENTATION[priority as PriorityLevel] ?? PRIORITY_PRESENTATION.low
}

// Whether a fix is applied automatically (no merchant action) or needs approval
// before it touches the live store. Replaces the "Groupe A/B/C" labels.
export function fixMode(group: RiskGroup | null | undefined): 'auto' | 'approval' {
  return (group ?? 'b') === 'c' ? 'approval' : 'auto'
}

export const MODE_PRESENTATION = {
  auto: { emoji: '🔄', label: 'Automatique', cls: 'text-success bg-success/10 border-success/20' },
  approval: { emoji: '✋', label: 'Approbation requise', cls: 'text-warning bg-warning/10 border-warning/20' },
} as const

// One-line, non-technical "what changed" for a fix, derived from its type/title.
export function whatChanged(fix: { type?: string | null; title?: string | null }): string {
  const h = `${fix.type ?? ''} ${fix.title ?? ''}`.toLowerCase()
  if (/trust|garantie|guarantee|secur|badge/.test(h))
    return 'Badges de confiance ajoutés (paiement sécurisé, garantie, retours) sur vos pages produit.'
  if (/review|avis|rating|social|proof|customer/.test(h))
    return 'Avis clients et note moyenne ajoutés sur vos pages produit.'
  if (/urgen|stock|scarcit|countdown|rebours/.test(h))
    return 'Indicateur d’urgence ajouté (stock limité) pour inciter à l’achat.'
  if (/image|alt|photo|visuel/.test(h))
    return 'Images produit optimisées : plus légères et mieux référencées.'
  if (/description|content|copy|seo|meta|titre/.test(h))
    return 'Descriptions réécrites pour mieux vendre et être trouvé sur Google.'
  if (/price|promo|discount|prix|solde/.test(h))
    return 'Prix et promotions mis en avant pour déclencher plus d’achats.'
  if (/speed|vitesse|performance|lazy|rapid/.test(h))
    return 'Pages rendues plus rapides pour éviter les abandons.'
  if (/cross|upsell|bundle|collection|panier/.test(h))
    return 'Produits complémentaires suggérés pour augmenter le panier moyen.'
  return 'Amélioration appliquée à votre boutique pour augmenter vos ventes.'
}

/**
 * Translates an internal audit-log action into a merchant-facing timeline entry.
 * Returns null for internal/noise actions that shouldn't be shown to merchants.
 */
export function timelineEntry(action: string): { icon: string; text: string } | null {
  if (action === 'app_block_enabled') return { icon: '✨', text: 'Nouveau bloc ajouté à vos pages produit' }
  if (action === 'verification_passed' || action === 'fix_applied_to_theme')
    return { icon: '✅', text: 'Correctif appliqué et vérifié sur votre boutique' }
  if (action === 'preview_fix_applied' || action === 'preview_theme_created')
    return { icon: '👀', text: 'Aperçu d’une amélioration préparé pour votre validation' }
  if (action === 'auto_rollback_executed' || action === 'rollback')
    return { icon: '↩️', text: 'Une modification a été annulée automatiquement par sécurité' }
  if (action === 'product_description_updated' || action === 'product_seo_updated' || action.startsWith('product'))
    return { icon: '📦', text: 'Une fiche produit a été améliorée' }
  if (action === 'image_optimized' || action.startsWith('image'))
    return { icon: '🖼️', text: 'Des images ont été allégées pour accélérer la boutique' }
  if (action === 'blog_article_created' || action.startsWith('blog'))
    return { icon: '✍️', text: 'Un article de blog a été publié pour attirer des visiteurs' }
  return null
}

// Friendly French label for the next scheduled automatic maintenance (weekly).
export function nextMaintenanceLabel(from: Date = new Date()): string {
  const d = new Date(from)
  const day = d.getDay() // 0 = Sunday
  const daysUntilMonday = ((8 - day) % 7) || 7
  d.setDate(d.getDate() + daysUntilMonday)
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
