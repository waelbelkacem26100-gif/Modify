import Anthropic from '@anthropic-ai/sdk'
import { getProductsDetailed, getSoldProductIds } from '@/lib/shopify'
import type { Store, WinningProduct } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

interface StoreContext {
  niche: string
  avgPrice: number
  bestSellers: string[]
  catalogSample: string[]
}

/** Infers the store's niche, average price and best-sellers from its catalog + sales. */
export async function getStoreContext(store: Store): Promise<StoreContext> {
  const products = await getProductsDetailed(store.shop_domain, store.access_token, 60)
  const prices = products
    .flatMap((p) => p.variants?.map((v) => parseFloat(v.price)) ?? [])
    .filter((n) => !Number.isNaN(n) && n > 0)
  const avgPrice = prices.length ? Math.round(prices.reduce((s, n) => s + n, 0) / prices.length) : 0

  // Best-sellers = products sold in the last 90 days
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  let soldIds = new Set<number>()
  try { soldIds = await getSoldProductIds(store.shop_domain, store.access_token, since) } catch { /* tolerant */ }
  const bestSellers = products.filter((p) => soldIds.has(p.id)).map((p) => p.title).slice(0, 8)

  // Rough niche signal from product types / tags
  const types = products.map((p) => p.product_type).filter(Boolean)
  const niche = types[0] || products[0]?.title?.split(' ').slice(0, 3).join(' ') || 'e-commerce généraliste'

  return {
    niche,
    avgPrice,
    bestSellers,
    catalogSample: products.slice(0, 12).map((p) => p.title),
  }
}

interface GeneratedProduct {
  name: string
  why: string
  recommended_price_eur: number
  margin_pct: number
  score: 'fire' | 'good' | 'watch'
  category: string
  sources: string[]
}

function extractJsonArray(text: string): unknown[] {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start === -1 || end === -1) return []
  try { return JSON.parse(cleaned.slice(start, end + 1)) } catch { return [] }
}

/**
 * Researches current winning products for the store's niche using Claude with
 * the web_search server tool (Google / Amazon / TikTok trends + the niche's top
 * competitors), and returns `count` ranked product ideas. Each carries a simple
 * "why", a recommended price, an estimated margin and a potential score.
 */
export async function researchWinningProducts(ctx: StoreContext, count: number): Promise<GeneratedProduct[]> {
  const prompt = `Tu es un analyste de tendances e-commerce de niveau mondial. Tu utilises la RECHERCHE WEB pour trouver des PRODUITS GAGNANTS à ajouter à une boutique Shopify.

Boutique :
- Niche : ${ctx.niche}
- Prix moyen pratiqué : ${ctx.avgPrice} €
- Best-sellers actuels : ${ctx.bestSellers.join(', ') || 'inconnus'}
- Catalogue (échantillon) : ${ctx.catalogSample.join(', ') || 'inconnu'}

MISSION :
1. Recherche les TENDANCES ACTUELLES de cette niche sur Google Trends, Amazon (best-sellers/mouvers) et TikTok (#TikTokMadeMeBuyIt, produits viraux).
2. Identifie 3 à 5 des MEILLEURS concurrents de la niche et regarde leurs produits phares.
3. Propose ${count} produits gagnants à ajouter, complémentaires au catalogue et alignés sur la demande réelle.

Réponds UNIQUEMENT avec un tableau JSON (aucun markdown) de ${count} objets :
[
  {
    "name": "Nom du produit (français, court)",
    "why": "1 phrase simple : pourquoi il est gagnant maintenant (tendance, demande, marge). PAS de jargon.",
    "recommended_price_eur": 39,
    "margin_pct": 65,
    "score": "fire | good | watch",
    "category": "sous-catégorie",
    "sources": ["Google", "TikTok", "Amazon"]
  }
]

Règles :
- "score" : "fire" = très forte demande/tendance virale ; "good" = bonne opportunité solide ; "watch" = émergent, à surveiller.
- "recommended_price_eur" : prix de vente conseillé réaliste (entier), cohérent avec le prix moyen de la boutique.
- "margin_pct" : marge estimée réaliste (entier, %).
- Tout en français simple, orienté business. Renvoie UNIQUEMENT le tableau JSON.`

  // Anthropic's server-side web search tool. The pinned SDK predates its TS
  // types, but the API processes the tool from the JSON wire format regardless —
  // so we pass it through with a cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webSearchTool: any = { type: 'web_search_20250305', name: 'web_search', max_uses: 6 }

  // Server-side web search may pause after the tool-loop limit; continue on pause_turn.
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]
  let text = ''
  for (let i = 0; i < 4; i++) {
    const res = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 8000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [webSearchTool] as any,
      messages,
    })
    text = res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n')
    if ((res.stop_reason as string) !== 'pause_turn') break
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages.push({ role: 'assistant', content: res.content as any })
  }

  const rows = extractJsonArray(text) as GeneratedProduct[]
  return rows
    .filter((r) => r && typeof r.name === 'string')
    .slice(0, count)
    .map((r) => ({
      name: String(r.name).slice(0, 160),
      why: String(r.why ?? '').slice(0, 400),
      recommended_price_eur: Math.max(1, Math.round(Number(r.recommended_price_eur) || ctx.avgPrice || 30)),
      margin_pct: Math.min(95, Math.max(0, Math.round(Number(r.margin_pct) || 50))),
      score: r.score === 'fire' || r.score === 'watch' ? r.score : 'good',
      category: String(r.category ?? ctx.niche).slice(0, 80),
      sources: Array.isArray(r.sources) ? r.sources.slice(0, 4).map(String) : ['Google'],
    }))
}

/** Generates and persists a fresh batch of winning products for a store. */
export async function generateWinningProducts(
  store: Store, supabase: SupabaseClient, count: number
): Promise<WinningProduct[]> {
  const ctx = await getStoreContext(store)
  const products = await researchWinningProducts(ctx, count)
  if (products.length === 0) return []

  const rows = products.map((p) => ({ store_id: store.id, ...p }))
  const { data } = await supabase.from('winning_products').insert(rows).select()
  return (data ?? []) as WinningProduct[]
}
