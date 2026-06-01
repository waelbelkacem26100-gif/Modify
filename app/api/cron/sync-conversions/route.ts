import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getOrdersForDateRange } from '@/lib/shopify'
import type { Store } from '@/types'

export const maxDuration = 300

// Estimated sessions per day — used to compute conversion_rate
// until a real analytics source (GA4, Shopify Analytics) is connected
const ESTIMATED_DAILY_SESSIONS = 300

export async function GET(request: NextRequest) {
  // Verify cron request with CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = await createServiceRoleClient()

  // Fetch all connected stores
  const { data: stores, error } = await supabase
    .from('stores')
    .select('*')

  if (error || !stores?.length) {
    return NextResponse.json({ synced: 0, error: error?.message })
  }

  // Sync yesterday's data
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const dateStr = yesterday.toISOString().split('T')[0]
  const dateMin = `${dateStr}T00:00:00Z`
  const dateMax = `${dateStr}T23:59:59Z`

  const results = await Promise.allSettled(
    (stores as Store[]).map(async (store) => {
      try {
        const orders = await getOrdersForDateRange(
          store.shop_domain,
          store.access_token,
          dateMin,
          dateMax
        )

        const orderCount = orders.length
        const revenue = orders.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0)

        // conversion_rate = orders / estimated_sessions
        // This is an approximation until real session data is available
        const conversionRate =
          orderCount > 0 ? orderCount / ESTIMATED_DAILY_SESSIONS : 0

        await supabase.from('conversions').upsert(
          {
            store_id: store.id,
            date: dateStr,
            conversion_rate: conversionRate,
            revenue: revenue,
            sessions: ESTIMATED_DAILY_SESSIONS,
          },
          { onConflict: 'store_id,date' }
        )

        return { store: store.shop_domain, orders: orderCount, revenue }
      } catch (e) {
        console.error(`Failed to sync ${store.shop_domain}:`, e)
        throw e
      }
    })
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({
    date: dateStr,
    synced: succeeded,
    failed,
    stores: stores.length,
  })
}
