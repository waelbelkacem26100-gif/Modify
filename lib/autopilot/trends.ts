import { getProductsDetailed } from '@/lib/shopify'
import { logAction } from '@/lib/audit-log'
import { webSearchAnalyze, extractJson } from './web-search'
import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

interface Trend {
  keyword: string
  current_volume: number | null
  predicted_volume: number | null
  confidence: number
  recommended_action: string
}

/**
 * Prédictions de tendances (étape 9) — web_search réel sur Google Trends / forums /
 * réseaux pour la niche, croisé avec le catalogue. Stocke dans trend_predictions.
 */
export async function predictTrends(store: Store, supabase: SupabaseClient): Promise<{ trends: number }> {
  const products = await getProductsDetailed(store.shop_domain, store.access_token, 12).catch(() => [])
  const titles = products.map((p) => p.title).slice(0, 10)
  if (!titles.length) return { trends: 0 }

  const prompt = `Tu es analyste de tendances e-commerce. Boutique française vendant : ${titles.join(', ')}.

Avec web_search, identifie les tendances de recherche montantes pour cette niche sur les 4-6 prochaines semaines (Google Trends, réseaux, forums). Ancre-toi sur des données réelles ; n'invente pas de volumes.

Réponds UNIQUEMENT par un tableau JSON (aucun texte autour) :
[{
  "keyword": "mot-clé/tendance réel",
  "current_volume": null,
  "predicted_volume": null,
  "confidence": 0.0,
  "recommended_action": "action concrète pour le marchand, 1 phrase en français"
}]
Maximum 3 tendances, les plus pertinentes. Mets les volumes à null si tu ne les connais pas précisément.`

  const text = await webSearchAnalyze(prompt, { maxUses: 5, maxTokens: 2000 })
  const trends = extractJson<Trend[]>(text) ?? []
  if (!Array.isArray(trends) || !trends.length) return { trends: 0 }

  let inserted = 0
  for (const t of trends.slice(0, 3)) {
    if (!t.keyword || !t.recommended_action) continue
    await supabase.from('trend_predictions').insert({
      store_id: store.id,
      keyword: String(t.keyword).slice(0, 200),
      current_volume: Number.isFinite(t.current_volume) ? Math.round(Number(t.current_volume)) : null,
      predicted_volume: Number.isFinite(t.predicted_volume) ? Math.round(Number(t.predicted_volume)) : null,
      confidence_score: Number.isFinite(t.confidence) ? Math.min(1, Math.max(0, Number(t.confidence))) : null,
      recommended_action: String(t.recommended_action).slice(0, 500),
      prediction_date: new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0],
    })
    inserted++
  }

  if (inserted) {
    await logAction(supabase, store.id, 'autopilot_trend_prediction',
      { count: inserted, summary: `${trends[0].keyword} — ${trends[0].recommended_action}` }, 'success')
  }
  return { trends: inserted }
}
