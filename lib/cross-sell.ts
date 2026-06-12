import Anthropic from '@anthropic-ai/sdk'
import { getProductsDetailed } from '@/lib/shopify'
import type { Store } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

/**
 * Choisit les VRAIS produits complémentaires de la boutique pour le bloc
 * "Souvent achetés ensemble" (cross-sell App Block). L'IA choisit 3 produits
 * qui complètent naturellement le catalogue (accessoires, consommables) ;
 * en cas d'échec IA, heuristique : les 3 accessoires les moins chers.
 *
 * Retourne les settings du bloc (handles produit) — le bloc Liquid complète
 * automatiquement avec les produits de la même collection si besoin.
 */
export async function pickCrossSellSettings(store: Store): Promise<Record<string, string>> {
  const products = await getProductsDetailed(store.shop_domain, store.access_token, 50)
  if (products.length < 2) return {}

  const list = products.map((p) =>
    `- ${p.handle} | ${p.title} | type: ${p.product_type || '—'} | ${p.variants?.[0]?.price ?? '?'}€`
  ).join('\n')

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Tu es l'expert cross-sell de Modify. Voici le catalogue réel d'une boutique Shopify :

${list}

Choisis les 3 produits qui font les MEILLEURS compléments d'achat universels pour cette boutique (accessoires, consommables, petits prix qui s'ajoutent facilement au panier d'un produit principal). Réponds UNIQUEMENT avec un tableau JSON de 3 handles exacts de la liste, ex: ["handle-1","handle-2","handle-3"]`,
      }],
    })
    const content = message.content[0]
    if (content.type !== 'text') throw new Error('unexpected type')
    const raw = content.text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
    const handles = (JSON.parse(raw) as string[]).filter((h) => products.some((p) => p.handle === h)).slice(0, 3)
    if (handles.length > 0) {
      return Object.fromEntries(handles.map((h, i) => [`product_${i + 1}`, h]))
    }
  } catch (e) {
    console.warn('[cross-sell] AI pick failed, falling back to heuristic:', String(e))
  }

  // Heuristique : accessoires (type le plus fréquent ≠ produit principal) les
  // moins chers — à défaut, les 3 produits les moins chers du catalogue.
  const sorted = [...products].sort((a, b) =>
    Number(a.variants?.[0]?.price ?? Infinity) - Number(b.variants?.[0]?.price ?? Infinity))
  const cheap = sorted.slice(0, 3).map((p) => p.handle)
  return Object.fromEntries(cheap.map((h, i) => [`product_${i + 1}`, h]))
}
