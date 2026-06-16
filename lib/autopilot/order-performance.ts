import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

interface LineItem { product_id?: number; quantity?: number; price?: string }

/**
 * orders/paid → alimente product_performance : incrémente orders_count et
 * revenue_total par produit acheté. conversion_rate est recalculé si des vues
 * sont disponibles (sinon laissé tel quel). Aucune donnée client.
 */
export async function recordOrderPerformance(
  store: Store, payload: Record<string, unknown>, supabase: SupabaseClient
): Promise<{ updated: number }> {
  const lines = Array.isArray(payload.line_items) ? (payload.line_items as LineItem[]) : []
  // Agrège par produit (une commande peut contenir plusieurs lignes du même produit)
  const byProduct = new Map<string, { qty: number; revenue: number }>()
  for (const l of lines) {
    if (l.product_id == null) continue
    const id = String(l.product_id)
    const qty = Number(l.quantity) || 1
    const revenue = (Number(l.price) || 0) * qty
    const cur = byProduct.get(id) ?? { qty: 0, revenue: 0 }
    byProduct.set(id, { qty: cur.qty + qty, revenue: cur.revenue + revenue })
  }

  let updated = 0
  for (const [productId, agg] of byProduct) {
    // Lit la ligne existante pour incrémenter (upsert manuel).
    const { data: existing } = await supabase
      .from('product_performance').select('id, orders_count, revenue_total, views_count')
      .eq('store_id', store.id).eq('product_id', productId).maybeSingle()

    const orders = (existing?.orders_count ?? 0) + agg.qty
    const revenue = Number(existing?.revenue_total ?? 0) + agg.revenue
    const views = existing?.views_count ?? 0
    const conv = views > 0 ? Math.min(1, orders / views) : null

    if (existing) {
      await supabase.from('product_performance').update({
        orders_count: orders, revenue_total: revenue, conversion_rate: conv, last_updated: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      await supabase.from('product_performance').insert({
        store_id: store.id, product_id: productId,
        orders_count: orders, revenue_total: revenue, conversion_rate: conv,
      })
    }
    updated++
  }
  return { updated }
}
