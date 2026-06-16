import { NextRequest, after } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { ingestWebhook } from '@/lib/autopilot/webhook-log'
import { recordOrderPerformance } from '@/lib/autopilot/order-performance'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Webhook `orders/paid` — Pilote automatique v10 (Étape 5).
 * Journalise SANS PII (id, total, product_ids) puis alimente product_performance
 * (orders_count + revenue_total par produit) en arrière-plan.
 */
export async function POST(request: NextRequest) {
  const { response, store, eventId, payload } = await ingestWebhook(request, 'orders/paid', (p) => {
    const lines = Array.isArray(p.line_items) ? (p.line_items as { product_id?: number }[]) : []
    return {
      shopifyId: p.id != null ? String(p.id) : null,
      safePayload: { id: p.id, total_price: p.total_price, currency: p.currency, product_ids: lines.map((l) => l.product_id).filter(Boolean) },
    }
  })

  if (store && eventId) {
    const storeRef = store
    after(async () => {
      const supabase = await createServiceRoleClient()
      try {
        const r = await recordOrderPerformance(storeRef, payload, supabase)
        await supabase.from('webhook_events').update({
          processed_at: new Date().toISOString(),
          result: { status: 'performance_updated', products: r.updated },
        }).eq('id', eventId)
      } catch (e) {
        await supabase.from('webhook_events').update({
          processed_at: new Date().toISOString(), result: { status: 'error', error: String(e).slice(0, 300) },
        }).eq('id', eventId)
      }
    })
  }

  return response
}
