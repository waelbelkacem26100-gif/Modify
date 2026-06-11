import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { getUserSubscription, hasActiveAccess } from '@/lib/subscription'
import { isAdmin } from '@/lib/config'
import { fixAllSeo } from '@/lib/seo-fix'
import type { Store } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 300

// POST: apply SEO + GEO corrections across the catalogue. Merchant (Clerk,
// paid plans) or the cron (internal secret + store_id).
export async function POST(request: NextRequest) {
  const internal = request.headers.get('x-modify-internal')
  const isInternal = Boolean(process.env.CRON_SECRET) && internal === process.env.CRON_SECRET
  const body = await request.json().catch(() => ({})) as { store_id?: string; limit?: number }

  const supabase = await createServiceRoleClient()

  let store: Store | null = null
  let limit = 12
  if (isInternal) {
    const { data } = await supabase.from('stores').select('*').eq('id', body.store_id ?? '').maybeSingle()
    store = (data as Store) ?? null
    limit = Math.min(30, Math.max(1, body.limit ?? 12))
  } else {
    const { userId } = await auth()
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })
    // SEO auto-corrections are a paid feature.
    if (!isAdmin(userId) && !hasActiveAccess(await getUserSubscription(userId))) {
      return NextResponse.json({ error: 'Cette fonction nécessite un abonnement.' }, { status: 402 })
    }
    const { data } = await supabase
      .from('stores').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    store = (data as Store) ?? null
  }

  if (!store) return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })

  try {
    await getValidAccessToken(store, supabase)
    const result = await fixAllSeo(store, supabase, limit)
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    console.error('[seo/fix-all] failed for', store.shop_domain, String(e))
    return NextResponse.json({ error: 'Les corrections SEO ont échoué. Réessayez.' }, { status: 502 })
  }
}
