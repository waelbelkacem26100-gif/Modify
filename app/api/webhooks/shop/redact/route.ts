import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { readVerifiedWebhook } from '@/lib/shopify-webhook'

export const runtime = 'nodejs'

// shop/redact — sent 48h after app uninstall. Delete ALL data for the shop.
export async function POST(request: NextRequest) {
  const { ok, payload } = await readVerifiedWebhook(request)
  if (!ok) return new NextResponse('Invalid HMAC', { status: 401 })

  const shop = payload.shop_domain ?? null
  const supabase = await createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores').select('id').eq('shop_domain', shop ?? '').maybeSingle()

  // Log with store_id = null so the audit record survives the cascade delete.
  await supabase.from('audit_logs').insert({
    store_id: null,
    action: 'gdpr_shop_redact',
    details: { shop_domain: shop, store_found: Boolean(store) },
    status: 'success',
  })

  // Deleting the store cascades to audits, fixes, audit_logs, image_optimizations,
  // pagespeed_scores, blog_articles, store_score_snapshots, product_promos, guides.
  if (store) {
    await supabase.from('stores').delete().eq('id', store.id)
  }

  console.log('[gdpr] shop/redact processed for', shop, '— store deleted:', Boolean(store))
  return NextResponse.json({ ok: true })
}
