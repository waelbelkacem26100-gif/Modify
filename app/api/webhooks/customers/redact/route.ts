import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { readVerifiedWebhook } from '@/lib/shopify-webhook'

export const runtime = 'nodejs'

// customers/redact — a specific customer's data must be erased.
// Modify does not store end-customer personal data, so there is nothing to
// delete; we verify, log the request, and acknowledge.
export async function POST(request: NextRequest) {
  const { ok, payload } = await readVerifiedWebhook(request)
  if (!ok) return new NextResponse('Invalid HMAC', { status: 401 })

  const shop = payload.shop_domain ?? null
  const supabase = await createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores').select('id').eq('shop_domain', shop ?? '').maybeSingle()

  await supabase.from('audit_logs').insert({
    store_id: store?.id ?? null,
    action: 'gdpr_customers_redact',
    action_type: 'gdpr_customers_redact', // NOT NULL column — mirror `action`
    details: {
      shop_domain: shop,
      customer_id: payload.customer?.id ?? null,
      note: 'No end-customer PII stored by Modify — nothing to delete.',
    },
    status: 'success',
  })

  console.log('[gdpr] customers/redact acknowledged for', shop, '— no customer PII stored')
  return NextResponse.json({ ok: true })
}
