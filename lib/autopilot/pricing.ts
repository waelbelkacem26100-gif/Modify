import { getProductsDetailed } from '@/lib/shopify'
import { logAction } from '@/lib/audit-log'
import { webSearchAnalyze, extractJson } from './web-search'
import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

interface PriceSuggestion {
  product: string
  current_price: number | null
  suggested_price: number | null
  reason: string
  monthly_impact_eur: number | null
}

/**
 * Suggestions de prix (étape 10) — analyse prix internes vs marché (web_search).
 * RÈGLE ABSOLUE : jamais d'application automatique. On journalise des suggestions
 * (audit_logs, action autopilot_price_suggestion) que le marchand approuve ensuite.
 */
export async function suggestPrices(store: Store, supabase: SupabaseClient): Promise<{ suggestions: number }> {
  const products = await getProductsDetailed(store.shop_domain, store.access_token, 15).catch(() => [])
  const lines = products
    .map((p) => ({ title: p.title, price: p.variants?.[0]?.price ?? null }))
    .filter((p) => p.price != null)
    .slice(0, 10)
  if (!lines.length) return { suggestions: 0 }

  const prompt = `Tu es analyste pricing e-commerce. Produits de la boutique avec leur prix actuel :
${lines.map((p) => `- ${p.title} : ${p.price}€`).join('\n')}

Avec web_search, compare aux prix du marché pour des produits similaires en France. Identifie les produits sous-pricés (marge améliorable) ou sur-pricés (frein à la conversion). Sois CONSERVATEUR dans les estimations.

Réponds UNIQUEMENT par un tableau JSON (aucun texte autour) :
[{
  "product": "titre exact du produit",
  "current_price": prix actuel en nombre,
  "suggested_price": prix suggéré en nombre,
  "reason": "justification courte ancrée sur le marché, en français",
  "monthly_impact_eur": estimation prudente en nombre
}]
Maximum 3 suggestions, les plus justifiées. Aucune si les prix sont déjà bien positionnés : []`

  const text = await webSearchAnalyze(prompt, { maxUses: 5, maxTokens: 2000 })
  const suggestions = (extractJson<PriceSuggestion[]>(text) ?? [])
    .filter((s) => s.product && s.suggested_price != null)
    .slice(0, 3)
  if (!suggestions.length) return { suggestions: 0 }

  // Jamais appliqué : seulement journalisé pour approbation marchande.
  await logAction(supabase, store.id, 'autopilot_price_suggestion',
    { count: suggestions.length, suggestions }, 'success')
  return { suggestions: suggestions.length }
}
