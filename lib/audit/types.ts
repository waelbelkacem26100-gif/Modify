import type { PageSpeedResult } from '@/lib/pagespeed'

/**
 * Audit v2 — 6 catégories, 6 agents IA spécialisés.
 *
 * `Problem` est un SUPERSET du AuditResult historique : il conserve les champs
 * legacy (category/title/description/impact_euros/priority/fix_available/
 * recommendation/risk_group) pour que tout le code existant (génération de
 * correctifs, score, emails, agent) continue de fonctionner sans migration,
 * et ajoute la précision v2 (affected_items, capability).
 */
export type ProblemCategory = 'products' | 'uiux' | 'perf_seo' | 'trust' | 'funnel' | 'mobile' | 'competitive'

export interface Problem {
  id: string
  category: ProblemCategory
  /** Titre court, français clair, zéro jargon. */
  title: string
  /** Explication business, 2 lignes max, langage marchand. */
  description: string
  /** Manque à gagner mensuel estimé (méthodologie calibrée sur le CA). */
  impact_euros: number
  /** high = 🔴 Urgent, medium = 🟠 Important, low = 🟡 À améliorer. */
  priority: 'high' | 'medium' | 'low'
  /** true ⇔ capability === 'auto' (compat legacy). */
  fix_available: boolean
  recommendation: string
  /** Éléments exacts concernés (ex: les 7 produits cités par leur nom). */
  affected_items: string[]
  /** auto = ✅ Modify s'en occupe · guide = 👋 guide pas à pas. */
  capability: 'auto' | 'guide'
  risk_group?: 'a' | 'b' | 'c'
}

export const AUDIT_CATEGORIES: Record<ProblemCategory, {
  emoji: string
  label: string
  progressLabel: string
}> = {
  products: { emoji: '🛍️', label: 'Fiches produits', progressLabel: 'Analyse des fiches produits' },
  uiux: { emoji: '🎨', label: 'Apparence & navigation', progressLabel: 'Analyse de l’apparence et de la navigation' },
  perf_seo: { emoji: '⚡', label: 'Vitesse & visibilité Google', progressLabel: 'Analyse de la vitesse et de la visibilité' },
  trust: { emoji: '🛡️', label: 'Confiance & sécurité', progressLabel: 'Analyse de la confiance et de la sécurité' },
  funnel: { emoji: '🛒', label: 'Tunnel d’achat', progressLabel: 'Analyse du tunnel d’achat' },
  mobile: { emoji: '📱', label: 'Expérience mobile', progressLabel: 'Analyse de l’expérience mobile' },
  competitive: { emoji: '🏆', label: 'Concurrence & positionnement', progressLabel: 'Analyse de la concurrence' },
}

/** Ordre d'exécution des agents (1 agent = 1 étape auto-chaînée ≤60s). */
export const CATEGORY_ORDER: ProblemCategory[] = ['products', 'uiux', 'perf_seo', 'trust', 'funnel', 'mobile', 'competitive']

// ─── Données réelles collectées avant l'analyse IA ───────────────────────────

export interface ProductForAudit {
  id: number
  title: string
  handle: string
  product_type: string
  price: string | null
  compare_at_price: string | null
  description_words: number
  has_description: boolean
  /** ~50 premiers mots de la description (texte brut) — pour juger ton, mots risqués, structure. */
  description_excerpt: string
  image_count: number
  images_missing_alt: number
  variant_count: number
  variant_titles: string[]
  tags: string
}

export interface PageForAudit {
  title: string
  handle: string
  body_words: number
}

export interface AuditAgentInput {
  shopDomain: string
  shopName: string
  themeName: string
  /** CA mensuel estimé (30 derniers jours) — null si inconnu. */
  revenueMonthly: number | null
  products: ProductForAudit[]
  pages: PageForAudit[]
  /** HTML nettoyé (scripts/styles retirés, tronqué) de la vitrine publique. */
  homeHtml: string | null
  productHtml: string | null
  productUrl: string | null
  cartHtml: string | null
  /** HTML de la page collection (/collections/all) — filtres, tri. */
  collectionHtml: string | null
  homeHtmlMobile: string | null
  productHtmlMobile: string | null
  pagespeed: PageSpeedResult | null
  /** Indexation : robots.txt et sitemap.xml réellement testés (null = non testé). */
  robotsTxt: { exists: boolean; blocksAll: boolean } | null
  sitemapExists: boolean | null
  /** Recherche interne : requêtes réellement exécutées contre /search/suggest.json. */
  searchTests: { query: string; results: number; topTitles: string[] }[] | null
  /** Paires de descriptions quasi identiques détectées par Modify (déterministe). */
  duplicateDescriptionPairs: string[] | null
  /** Titres des problèmes DÉJÀ détectés par les agents précédents de ce même
   * audit — fourni au seul agent concurrentiel (dernier de la chaîne) pour
   * qu'un même manque ne soit jamais facturé deux fois. */
  previousFindings?: string[]
}
