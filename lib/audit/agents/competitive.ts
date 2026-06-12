import Anthropic from '@anthropic-ai/sdk'
import type { AuditAgent } from './shared'
import { calibration, mapRawProblems, parseProblemsJson } from './shared'
import { checklistFor } from '../checks'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

/**
 * 🏆 Analyse Concurrentielle & Positionnement — le seul agent avec accès à la
 * recherche web (outil serveur Anthropic). Il identifie de VRAIS concurrents,
 * compare prix/avantages/avis, et produit des constats SOURCÉS. Catégorie
 * 👋 Guide par nature : décisions stratégiques du marchand → alimente le Copilot.
 *
 * Honnêteté absolue : si la recherche ne trouve rien de fiable, l'agent retourne
 * un tableau vide plutôt que d'inventer des concurrents ou des chiffres.
 */
export const competitiveAgent: AuditAgent = {
  key: 'competitive',
  async run(input) {
    const types = [...new Set(input.products.map((p) => p.product_type).filter(Boolean))].slice(0, 6)
    const prices = input.products.map((p) => Number(p.price)).filter((n) => Number.isFinite(n) && n > 0)
    const priceRange = prices.length ? `${Math.min(...prices)}€ à ${Math.max(...prices)}€` : 'inconnue'

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4000,
      // max_uses 3 : assez pour trouver et vérifier 2-3 concurrents, et reste
      // bien sous le seuil du watchdog (160s) même en cas de recherches lentes.
      // Le SDK 0.37 ne type pas les outils serveur mais les transmet tels quels.
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }] as unknown as Anthropic.Tool[],
      messages: [{
        role: 'user',
        content: `Tu es l'agent « Concurrence & positionnement » 🏆 de Modify, l'auditeur de conversion Shopify le plus rigoureux au monde.

Boutique analysée : ${input.shopName} (${input.shopDomain}) — ${input.products.length} produits actifs.
Niche : ${types.join(', ') || 'e-commerce'}. Fourchette de prix de la boutique : ${priceRange}.
Produits exemples : ${input.products.slice(0, 8).map((p) => `${p.title} (${p.price ?? '?'}€)`).join(', ')}.
${calibration(input.revenueMonthly)}

═══ TA MISSION ═══
1. Recherche sur le web 2-3 boutiques en ligne CONCURRENTES DIRECTES (même niche, vendant des produits comparables, marché francophone en priorité sinon international). Boutiques marchandes uniquement — pas de marketplaces géantes (Amazon) ni d'articles de presse.
2. Compare ce que tu trouves RÉELLEMENT sur leurs sites : fourchette de prix, livraison gratuite (à partir de quel montant), politique de retour, présence d'avis clients, contenu (blog, guides d'achat).
3. Produis 2-3 constats ACTIONNABLES pour ce marchand, chacun appuyé sur ce que tu as vraiment vu.

═══ POINTS DE CONTRÔLE ═══
${checklistFor('competitive')}

═══ DÉJÀ FACTURÉ PAR LES AUTRES ANALYSES (NE PAS RE-COMPTER) ═══
${input.previousFindings?.length ? input.previousFindings.map((t) => `- ${t}`).join('\n') : '(aucun)'}
Si un manque ci-dessus existe AUSSI chez toi en version concurrentielle (ex: "aucun avis affiché" déjà compté → ne crée PAS "les concurrents ont des avis"), tu peux le MENTIONNER dans la description d'un autre constat mais tu ne crées PAS de problème séparé avec des € pour lui. Tes constats doivent apporter une information NOUVELLE (prix du marché, avantages affichés ailleurs, contenu des concurrents).

═══ RÈGLES ABSOLUES ═══
1. HONNÊTETÉ TOTALE : chaque constat doit citer le concurrent EXACT (nom + domaine) et le fait observé. Si tes recherches ne trouvent PAS de concurrent fiable ou de donnée vérifiable, retourne un tableau JSON vide [] — n'invente JAMAIS un concurrent, un prix ou une politique.
2. "affected_items" contient les concurrents cités, format "Nom (domaine.com) — fait observé".
3. capability : TOUJOURS "guide" (ce sont des décisions stratégiques du marchand, Modify ne décide pas à sa place).
4. ZÉRO JARGON : langage business simple en français.
5. priority : "high" seulement si le désavantage concurrentiel est flagrant et chiffrable.
6. Pas de risk_group (omets le champ).

═══ FORMAT DE SORTIE ═══
Termine ta réponse par UNIQUEMENT un tableau JSON valide (après tes recherches) :
[{
  "title": "Titre court en français simple",
  "description": "2 phrases max : le fait observé chez les concurrents et ce que ça implique ici.",
  "impact_euros": 45,
  "priority": "high|medium|low",
  "capability": "guide",
  "affected_items": ["Concurrent (domaine.com) — fait observé"],
  "recommendation": "Action concrète en français simple"
}]`,
      }],
    })

    // La réponse alterne blocs de recherche et blocs texte — on concatène le
    // texte et on en extrait le dernier tableau JSON.
    const text = message.content
      .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
      .map((b) => b.text).join('\n')
    if (!text.trim()) return []
    try {
      return mapRawProblems('competitive', parseProblemsJson(text))
        .map((p) => ({ ...p, capability: 'guide' as const, fix_available: false, risk_group: undefined }))
    } catch {
      // Pas de JSON exploitable = pas de données fiables → zéro constat, jamais d'invention.
      return []
    }
  },
}
