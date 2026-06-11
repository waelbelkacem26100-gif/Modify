import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getUserSubscription, planFor } from '@/lib/subscription'
import { isTokenExpired, getValidAccessToken } from '@/lib/shopify-token'
import { generateWinningProducts } from '@/lib/winning-products'
import { logAction } from '@/lib/audit-log'
import type { PlanId } from '@/lib/pricing'
import type { Store } from '@/types'

export const maxDuration = 300

// Daily. Pro stores get a fresh batch every day; Starter and Free stores get
// one batch per week (Mondays). Free is a small preview.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const isMonday = new Date().getDay() === 1
  const supabase = await createServiceRoleClient()
  const { data: stores } = await supabase.from('stores').select('*')
  if (!stores?.length) return NextResponse.json({ stores: 0 })

  let generated = 0, skipped = 0
  for (const store of stores as Store[]) {
    if (isTokenExpired(store)) { skipped++; continue }

    const plan: PlanId = planFor(await getUserSubscription(store.user_id))
    // Pro: daily. Starter/Free: Mondays only.
    if (plan !== 'pro' && !isMonday) { skipped++; continue }
    const count = plan === 'free' ? 3 : 5

    try {
      await getValidAccessToken(store, supabase)
      const products = await generateWinningProducts(store, supabase, count)
      generated += products.length
      await logAction(supabase, store.id, 'winning_products_generated',
        { plan, count: products.length }, products.length ? 'success' : 'warning')
    } catch (e) {
      skipped++
      console.error('[cron/winning-products] failed for', store.shop_domain, String(e))
    }
  }

  return NextResponse.json({ stores: stores.length, generated, skipped })
}
