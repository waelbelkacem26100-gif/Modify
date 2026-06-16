import { getProductsDetailed } from '@/lib/shopify'
import { logAction } from '@/lib/audit-log'
import { webSearchAnalyze, extractJson } from './web-search'
import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

interface Alert {
  competitor_url: string
  alert_type: 'price_change' | 'new_product' | 'shipping_change'
  severity: 'urgent' | 'important' | 'info'
  summary: string
  impact_assessment: string
}

/**
 * Veille concurrentielle (étape 8) — web_search réel pour identifier les
 * concurrents et détecter des changements actionnables. Stocke des alertes
 * catégorisées 🔴🟠🟡 dans competitor_alerts. Jamais d'invention : ancré sur
 * des résultats de recherche réels.
 */
export async function monitorCompetitors(store: Store, supabase: SupabaseClient): Promise<{ alerts: number }> {
  const products = await getProductsDetailed(store.shop_domain, store.access_token, 12).catch(() => [])
  const titles = products.map((p) => p.title).slice(0, 10)
  if (!titles.length) return { alerts: 0 }

  const prompt = `Tu es analyste e-commerce. Boutique Shopify française vendant : ${titles.join(', ')}.

Avec web_search, identifie 2-3 concurrents directs en France et repère tout changement RÉCENT et actionnable (baisse de prix, livraison gratuite, nouveau produit concurrent). Cite des sources réelles ; n'invente rien.

Réponds UNIQUEMENT par un tableau JSON (aucun texte autour) :
[{
  "competitor_url": "url réelle",
  "alert_type": "price_change | new_product | shipping_change",
  "severity": "urgent | important | info",
  "summary": "1 phrase concrète, en français",
  "impact_assessment": "que doit faire le marchand, 1 phrase"
}]
Maximum 3 alertes, les plus impactantes. Si rien de notable : []`

  const text = await webSearchAnalyze(prompt, { maxUses: 5, maxTokens: 2000 })
  const alerts = extractJson<Alert[]>(text) ?? []
  if (!Array.isArray(alerts) || !alerts.length) return { alerts: 0 }

  let inserted = 0
  for (const a of alerts.slice(0, 3)) {
    if (!a.competitor_url || !a.summary) continue
    await supabase.from('competitor_alerts').insert({
      store_id: store.id,
      competitor_url: String(a.competitor_url).slice(0, 500),
      alert_type: ['price_change', 'new_product', 'shipping_change'].includes(a.alert_type) ? a.alert_type : 'new_product',
      severity: ['urgent', 'important', 'info'].includes(a.severity) ? a.severity : 'info',
      new_value: String(a.summary).slice(0, 500),
      impact_assessment: String(a.impact_assessment ?? '').slice(0, 500),
    })
    inserted++
  }

  if (inserted) {
    const top = alerts[0]
    await logAction(supabase, store.id, 'autopilot_competitor_alert',
      { count: inserted, summary: top.summary }, 'success')
  }
  return { alerts: inserted }
}
