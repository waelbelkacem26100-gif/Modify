import type { PageForAudit, ProductForAudit } from './types'

/**
 * Module GEO simulation v5 — déterministe, zéro LLM.
 *
 * Vérifie si la boutique a le contenu qu'un moteur IA (ChatGPT, Perplexity,
 * Gemini) exige pour recommander un produit : guides d'achat, FAQ, descriptions
 * riches, comparatifs. Chaque signal est dérivé des données RÉELLES collectées
 * (pages Admin API + descriptions produits) — jamais inventé.
 *
 * Résultat stocké dans AuditAgentInput.geoSignals et injecté dans le prompt
 * performance-seo pour que l'agent ne devine pas ce qu'on a déjà mesuré.
 */

const GUIDE_RE = /guide|conseil|comment[-\s]?choisir|comparatif|\bvs\b|versus|différence|tuto|astuces?|aide[-\s]?à[-\s]?l|bien[-\s]?choisir/i
const FAQ_RE   = /\bfaq\b|questions?[-\s]?fréquentes?|aide|support/i

export interface GeoSignals {
  /** Pages identifiées comme guides d'achat ou comparatifs. */
  guidePages: { title: string; words: number }[]
  /** Pages identifiées comme FAQ ou support. */
  faqPages: { title: string; words: number }[]
  /** Nombre de produits avec une description ≥ 200 mots (réponse IA suffisante). */
  deepDescriptionCount: number
  /** Des comparatifs ou "meilleur de" détectés dans le HTML ou les titres. */
  hasComparisonContent: boolean
  /** Score GEO global 0-100 (déterministe). */
  geoScore: number
  /** Nombre de checks réellement exécutés — pour le score de précision v5. */
  checksRun: number
}

export function deriveGeoSignals(
  pages: PageForAudit[],
  products: ProductForAudit[],
  homeHtml: string | null,
): GeoSignals {
  const guidePages = pages
    .filter((p) => GUIDE_RE.test(`${p.handle} ${p.title}`) && p.body_words >= 100)
    .map((p) => ({ title: p.title, words: p.body_words }))

  const faqPages = pages
    .filter((p) => FAQ_RE.test(`${p.handle} ${p.title}`) && p.body_words >= 150)
    .map((p) => ({ title: p.title, words: p.body_words }))

  const deepDescriptionCount = products.filter((p) => p.description_words >= 200).length

  const hasComparisonContent =
    guidePages.some((p) => /comparatif|\bvs\b|versus/i.test(p.title)) ||
    Boolean(homeHtml && /comparatif|meilleur\b|choisir entre/i.test(homeHtml))

  let score = 0
  if (guidePages.length >= 1) score += 25
  if (guidePages.length >= 2) score += 10
  if (faqPages.length >= 1) score += 20
  if (products.length > 0 && deepDescriptionCount >= Math.ceil(products.length * 0.5)) score += 25
  if (hasComparisonContent) score += 10
  if (products.length > 0 && deepDescriptionCount === products.length) score += 10

  return {
    guidePages,
    faqPages,
    deepDescriptionCount,
    hasComparisonContent,
    geoScore: Math.min(100, score),
    checksRun: 4,
  }
}

/** Résumé textuel des signaux GEO pour le prompt de l'agent (pas de jargon). */
export function geoBlock(signals: GeoSignals, productCount: number): string {
  const lines: string[] = []

  if (signals.guidePages.length > 0) {
    lines.push(`Pages guides / comparatifs détectées (${signals.guidePages.length}) : ${signals.guidePages.map((p) => `« ${p.title} » (${p.words} mots)`).join(' · ')}`)
  } else {
    lines.push(`Pages guides / comparatifs : AUCUNE — la boutique n'a pas de contenu « comment choisir » pour être citée par ChatGPT`)
  }

  if (signals.faqPages.length > 0) {
    lines.push(`FAQ / aide détectée : ${signals.faqPages.map((p) => `« ${p.title} »`).join(', ')} — signal positif pour les IA`)
  } else {
    lines.push(`FAQ : ABSENTE — les IA privilégient les boutiques qui répondent aux questions clients en texte`)
  }

  const deepPct = productCount > 0 ? Math.round((signals.deepDescriptionCount / productCount) * 100) : 0
  lines.push(`Descriptions produits ≥ 200 mots : ${signals.deepDescriptionCount}/${productCount} produits (${deepPct}%) — ${deepPct >= 60 ? 'suffisant pour les IA' : 'insuffisant : les IA ont besoin de contenu riche pour citer un produit'}`)

  lines.push(`Score GEO Modify (déterministe) : ${signals.geoScore}/100`)

  return lines.join('\n')
}
