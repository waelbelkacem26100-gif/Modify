import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { verifyWebhookHmac } from '@/lib/shopify'
import type { Store } from '@/types'

/**
 * Réception sûre d'un webhook autopilot : vérifie la signature HMAC, résout le
 * store, et journalise l'événement dans `webhook_events` (sans PII). Le
 * traitement métier (régression, performance, réinstallation) est branché par
 * l'appelant via `onStore` — laissé non destructif tant qu'il n'est pas implémenté.
 */
export async function ingestWebhook(
  request: NextRequest,
  eventType: string,
  shape: (payload: Record<string, unknown>) => { shopifyId: string | null; safePayload: Record<string, unknown> },
): Promise<{ response: NextResponse; store: Store | null; eventId: string | null; shopifyId: string | null }> {
  const rawBody = await request.text()
  if (!verifyWebhookHmac(rawBody, request.headers.get('x-shopify-hmac-sha256'))) {
    return { response: new NextResponse('Invalid signature', { status: 401 }), store: null, eventId: null, shopifyId: null }
  }

  let payload: Record<string, unknown> = {}
  try { payload = rawBody ? JSON.parse(rawBody) : {} } catch { /* HMAC est la garde */ }
  const { shopifyId, safePayload } = shape(payload)

  const supabase = await createServiceRoleClient()
  const shopDomain = request.headers.get('x-shopify-shop-domain')
  let store: Store | null = null
  if (shopDomain) {
    const { data } = await supabase.from('stores').select('*').eq('shop_domain', shopDomain).limit(1).maybeSingle()
    store = (data as Store) ?? null
  }

  const { data: evt } = await supabase.from('webhook_events').insert({
    store_id: store?.id ?? null,
    event_type: eventType,
    shopify_id: shopifyId,
    payload: safePayload,
    processed_at: null,
    result: { status: 'received' },
  }).select('id').single()

  return {
    response: NextResponse.json({ received: true }),
    store,
    eventId: (evt as { id: string } | null)?.id ?? null,
    shopifyId,
  }
}
