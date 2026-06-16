import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { verifyWebhookHmac } from '@/lib/shopify'
import type { Store } from '@/types'

export const runtime = 'nodejs'

/**
 * Webhook `products/create` — Pilote automatique v10 (SCAFFOLD NON DESTRUCTIF).
 *
 * État actuel : reçoit l'événement, vérifie la signature HMAC Shopify, et le
 * JOURNALISE dans `webhook_events` (processed_at = null). Il N'OPTIMISE PAS
 * encore le produit automatiquement.
 *
 * ⚠️ L'optimisation IA (meta title, alt texts, JSON-LD, cross-sell) modifie le
 * VRAI store Shopify et consomme l'API Anthropic. Elle est délibérément différée
 * tant que (a) le quota IA n'est pas rechargé et (b) le marchand n'a pas activé
 * explicitement le pilote automatique (garde-fou : ne jamais auto-muter un store
 * sans accord). Le traitement réel lira `webhook_events` (processed_at IS NULL).
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
  let storeId: string | null = null
  if (shopDomain) {
    const { data } = await supabase
      .from('stores').select('id').eq('shop_domain', shopDomain).limit(1).maybeSingle()
    storeId = (data as Pick<Store, 'id'> | null)?.id ?? null
  }

  // Journalisation pure (non destructive). Le traitement réel viendra plus tard.
  await supabase.from('webhook_events').insert({
    store_id: storeId,
    event_type: 'products/create',
    shopify_id: payload.id != null ? String(payload.id) : null,
    payload,
    processed_at: null,
    result: { status: 'queued', note: 'optimisation IA différée (quota + accord requis)' },
  })

  // 200 immédiat : Shopify réessaie si on ne répond pas vite.
  return NextResponse.json({ received: true })
}
