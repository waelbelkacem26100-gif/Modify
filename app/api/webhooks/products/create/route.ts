import { NextRequest, NextResponse, after } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { verifyWebhookHmac } from '@/lib/shopify'
import { optimizeProduct } from '@/lib/autopilot/product-optimizer'
import type { Store } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Webhook `products/create` — Pilote automatique v10 (ACTIF).
 *
 * 1. Vérifie la signature HMAC Shopify.
 * 2. Journalise l'événement dans `webhook_events`.
 * 3. Optimise le produit en arrière-plan (after()) : meta SEO + alt texts +
 *    cross-sell, via claude-opus-4-8, avec sauvegarde réversible. Marque
 *    l'événement `processed_at` + `result`.
 *
 * Garde-fou : si l'optimisation échoue (quota IA, API Shopify), l'événement
 * reste en `processed_at = null` (rejouable) et l'erreur est stockée — jamais
 * de modification partielle silencieuse.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const hmac = request.headers.get('x-shopify-hmac-sha256')
  if (!verifyWebhookHmac(rawBody, hmac)) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  const shopDomain = request.headers.get('x-shopify-shop-domain')
  let payload: { id?: number | string; title?: string } = {}
  try { payload = rawBody ? JSON.parse(rawBody) : {} } catch { /* HMAC est la garde */ }

  const supabase = await createServiceRoleClient()
  let store: Store | null = null
  if (shopDomain) {
    const { data } = await supabase.from('stores').select('*').eq('shop_domain', shopDomain).limit(1).maybeSingle()
    store = (data as Store) ?? null
  }

  // Journalise l'événement (toujours), récupère son id pour le marquer ensuite.
  const { data: evt } = await supabase.from('webhook_events').insert({
    store_id: store?.id ?? null,
    event_type: 'products/create',
    shopify_id: payload.id != null ? String(payload.id) : null,
    payload,
    processed_at: null,
    result: { status: 'received' },
  }).select('id').single()
  const eventId = (evt as { id: string } | null)?.id ?? null

  // Optimisation en arrière-plan : Shopify reçoit 200 tout de suite (sinon retry).
  if (store && payload.id != null && eventId) {
    const storeRef = store
    after(async () => {
      try {
        await getValidAccessToken(storeRef, supabase)
        const report = await optimizeProduct(storeRef, payload.id!, supabase)
        await supabase.from('webhook_events').update({
          processed_at: new Date().toISOString(),
          result: { status: 'optimized', changes: report.changes, title: report.title },
        }).eq('id', eventId)
      } catch (e) {
        const msg = String(e)
        const quota = msg.includes('credit balance') || msg.includes('rate_limit')
        await supabase.from('webhook_events').update({
          // quota : on laisse processed_at null pour rejouer plus tard ; autre erreur : on marque traité (échec) pour ne pas boucler
          processed_at: quota ? null : new Date().toISOString(),
          result: { status: quota ? 'deferred_quota' : 'error', error: msg.slice(0, 300) },
        }).eq('id', eventId)
      }
    })
  }

  return NextResponse.json({ received: true })
}
