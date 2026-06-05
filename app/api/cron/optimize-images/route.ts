import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { optimizeStoreImages } from '@/lib/image-optimizer'
import { isTokenExpired } from '@/lib/shopify-token'
import type { Store } from '@/types'

export const maxDuration = 300

// Weekly: compress oversized product images across every connected store.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = await createServiceRoleClient()
  const { data: stores, error } = await supabase.from('stores').select('*')
  if (error || !stores?.length) {
    return NextResponse.json({ stores: 0, error: error?.message })
  }

  // Skip stores whose Shopify token has expired — they need a reconnect, which
  // happens when the merchant next opens the dashboard (silent re-auth).
  const active = (stores as Store[]).filter((s) => !isTokenExpired(s))

  const results = await Promise.allSettled(
    active.map(async (store) => {
      // Smaller per-store cap on cron to stay within the time budget across many stores
      const summary = await optimizeStoreImages(store, supabase, 10)
      return { shop: store.shop_domain, ...summary }
    })
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled')
  const totalOptimized = succeeded.reduce(
    (s, r) => s + (r.status === 'fulfilled' ? r.value.optimized : 0), 0
  )
  const totalSavedMb = +succeeded.reduce(
    (s, r) => s + (r.status === 'fulfilled' ? r.value.savedMb : 0), 0
  ).toFixed(2)

  return NextResponse.json({
    stores: stores.length,
    images_optimized: totalOptimized,
    saved_mb: totalSavedMb,
    failed_stores: results.filter((r) => r.status === 'rejected').length,
  })
}
