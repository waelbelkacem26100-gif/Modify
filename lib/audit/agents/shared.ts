import Anthropic from '@anthropic-ai/sdk'
import type { AuditAgentInput, Problem, ProblemCategory } from '../types'
import { AUDIT_CATEGORIES } from '../types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export interface AuditAgent {
  key: ProblemCategory
  run(input: AuditAgentInput): Promise<Problem[]>
}

/** Raw item shape each agent's AI must return (orchestrator adds id/category). */
export interface RawProblem {
  title: string
  description: string
  impact_euros: number
  priority: 'high' | 'medium' | 'low'
  capability: 'auto' | 'guide'
  affected_items?: string[]
  recommendation: string
  risk_group?: 'a' | 'b' | 'c'
}

/** Calibration € : cohérente, honnête, proportionnée au CA réel. */
export function calibration(revenueMonthly: number | null): string {
  if (revenueMonthly && revenueMonthly >= 200) {
    return `CA mensuel réel (30 derniers jours) : ${revenueMonthly}€. Calibre les impacts : la SOMME des impact_euros de TES problèmes ne doit pas dépasser ${Math.round(revenueMonthly * 0.25)}€ (25% du CA). Un problème isolé dépasse rarement ${Math.round(revenueMonthly * 0.1)}€.`
  }
  return `CA mensuel : inconnu ou très faible (boutique en lancement). Calibre les impacts avec modestie : 10 à 80€/mois par problème, jamais plus de 120€. L'honnêteté des chiffres est un principe absolu de Modify.`
}

/**
 * Socle commun des 6 agents : honnêteté (ne jamais inventer), précision
 * (citer les éléments exacts), zéro jargon, format JSON strict.
 */
export async function runAgentPrompt(
  category: ProblemCategory,
  mission: string,
  checklist: string,
  data: string,
  input: AuditAgentInput,
): Promise<Problem[]> {
  const meta = AUDIT_CATEGORIES[category]
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `Tu es l'agent « ${meta.label} » ${meta.emoji} de Modify, l'auditeur de conversion Shopify le plus rigoureux au monde. Tu analyses UNIQUEMENT ta spécialité, à partir de DONNÉES RÉELLES de la boutique.

Boutique : ${input.shopName} (${input.shopDomain}) — Thème : ${input.themeName} — ${input.products.length} produits actifs.
${calibration(input.revenueMonthly)}

═══ TA MISSION ═══
${mission}

═══ POINTS DE CONTRÔLE MINIMUM ═══
${checklist}

═══ DONNÉES RÉELLES DE LA BOUTIQUE ═══
${data}

═══ RÈGLES ABSOLUES ═══
1. HONNÊTETÉ : si tu n'as pas la donnée pour affirmer un problème, NE L'INVENTE PAS. Mieux vaut 2 constats vérifiables que 8 suppositions.
2. PRÉCISION : chaque problème DOIT citer les éléments exacts concernés dans "affected_items" (ex: les noms exacts des produits touchés, "7 produits sur 15"). Jamais de générique.
3. ZÉRO JARGON à l'écran : interdits absolus dans title/description/recommendation : LCP, CLS, TTFB, JSON-LD, Schema.org, meta tags, REST, API, H1/H2, alt text. Remplace par du langage business : "vitesse de chargement", "visibilité sur Google", "données lisibles par les IA (ChatGPT)", "description Google", "texte descriptif des images".
4. capability : "auto" UNIQUEMENT si Modify peut le corriger automatiquement (titres et descriptions Google, textes descriptifs d'images, descriptions produit réécrites, badges de confiance, avis [si réels], urgence [vrai stock], produits complémentaires, données structurées/lisibilité IA, articles de blog). Tout le reste (photos, vidéos, vrais avis à collecter, navigation, design, checkout, mobile, pages légales) = "guide".
5. risk_group : "a" = via l'API produits/SEO (textes, descriptions, données) ; "b" = bloc ajouté sur la page produit (badges, avis, urgence, produits complémentaires) ; "c" = structure de page / navigation / checkout (risque élevé).
6. Si un point est correct sur cette boutique, ne le liste pas. Liste TOUS les points réellement faibles de ta spécialité (typiquement 2 à 8).
7. PAS DE DOUBLE-COMPTAGE : reste STRICTEMENT dans ta spécialité. Le périmètre des autres agents (NE PAS y empiéter) : Fiches produits = titres/descriptions/photos/prix/variantes/ton des produits · Apparence = home/menu/footer/À propos/recherche interne · Vitesse & Google = vitesse mesurée, titres/descriptions GOOGLE, données structurées, duplication, indexation, lisibilité IA · Confiance = avis/garanties/pages légales/livraison/FAQ/contact · Tunnel = chemin d'achat/collection/panier/paiement/complémentaires · Mobile = rendu mobile uniquement · Concurrence = comparaison avec d'autres boutiques uniquement. Un même manque ne doit JAMAIS être facturé en € dans deux catégories.

═══ FORMAT DE SORTIE ═══
UNIQUEMENT un tableau JSON valide (aucun markdown, aucun texte autour) :
[{
  "title": "Titre court en français simple",
  "description": "2 phrases max : le problème concret et pourquoi il fait perdre des ventes.",
  "impact_euros": 45,
  "priority": "high|medium|low",
  "capability": "auto|guide",
  "affected_items": ["élément exact 1", "élément exact 2"],
  "recommendation": "Action concrète en français simple",
  "risk_group": "a|b|c"
}]`,
    }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return mapRawProblems(category, parseProblemsJson(content.text))
}

/** Extrait le tableau JSON de problèmes d'une réponse IA (tolère le markdown). */
export function parseProblemsJson(text: string): RawProblem[] {
  const raw = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    return JSON.parse(raw) as RawProblem[]
  } catch {
    // La réponse peut contenir du texte autour (ex: agent avec recherche web) :
    // on récupère le dernier tableau JSON complet.
    const m = raw.match(/\[[\s\S]*\]/)
    if (!m) throw new Error('No JSON array in agent response')
    return JSON.parse(m[0]) as RawProblem[]
  }
}

/** Valide et normalise les problèmes bruts d'un agent (id, bornes, types). */
export function mapRawProblems(category: ProblemCategory, items: RawProblem[]): Problem[] {
  return items
    .filter((it) => it && it.title && Number.isFinite(Number(it.impact_euros)))
    .map((it, i): Problem => ({
      id: `${category}-${i + 1}-${it.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
      category,
      title: String(it.title),
      description: String(it.description ?? ''),
      impact_euros: Math.max(0, Math.round(Number(it.impact_euros))),
      priority: (['high', 'medium', 'low'] as const).includes(it.priority) ? it.priority : 'medium',
      fix_available: it.capability === 'auto',
      recommendation: String(it.recommendation ?? ''),
      affected_items: Array.isArray(it.affected_items) ? it.affected_items.map(String).slice(0, 20) : [],
      capability: it.capability === 'auto' ? 'auto' : 'guide',
      risk_group: (['a', 'b', 'c'] as const).includes(it.risk_group as 'a') ? it.risk_group : undefined,
    }))
}

/** Compact, token-efficient product table for prompts. */
export function productTable(input: AuditAgentInput, fields: 'full' | 'seo' = 'full'): string {
  return input.products.map((p) => {
    if (fields === 'seo') {
      return `- ${p.title} | ${p.image_count} photo(s), ${p.images_missing_alt} sans texte descriptif | description: ${p.description_words} mots`
    }
    return `- ${p.title} | type: ${p.product_type || '—'} | prix: ${p.price ?? '?'}€${p.compare_at_price ? ` (barré ${p.compare_at_price}€)` : ''} | ${p.image_count} photo(s) (${p.images_missing_alt} sans texte descriptif) | description: ${p.description_words} mots | ${p.variant_count} variante(s)${p.variant_titles.length ? ` [${p.variant_titles.join(', ')}]` : ''}`
  }).join('\n')
}
