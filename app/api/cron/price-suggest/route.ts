import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken, isTokenExpired } from '@/lib/shopify-token'
import { suggestPrices } from '@/lib/autopilot/pricing'
import type { Store } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 300

// Suggestions de prix — cron mensuel. Jamais d'application auto.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  const supabase = await createServiceRoleClient()
  const { data: stores } = await supabase.from('stores').select('*')
  const active = ((stores ?? []) as Store[]).filter((s) => !isTokenExpired(s))
  const results = await Promise.allSettled(active.map(async (store) => {
    await getValidAccessToken(store, supabase)
    return suggestPrices(store, supabase)
  }))
  const suggestions = results.reduce((s, r) => s + (r.status === 'fulfilled' ? r.value.suggestions : 0), 0)
  return NextResponse.json({ stores: active.length, suggestions })
}
