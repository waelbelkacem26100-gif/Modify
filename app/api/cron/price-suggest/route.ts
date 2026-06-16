import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken, isTokenExpired } from '@/lib/shopify-token'
import { suggestPrices } from '@/lib/autopilot/pricing'
import { PREVIEW_TOKEN, PREVIEW_ADMIN_USER_ID } from '@/lib/preview'
import type { Store } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 300

// Suggestions de prix — cron mensuel. Jamais d'application auto. Test : ?token=…
export async function GET(request: NextRequest) {
  const isCron = request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
  const isPreview = request.nextUrl.searchParams.get('token') === PREVIEW_TOKEN
  if (process.env.NODE_ENV === 'production' && !isCron && !isPreview) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  const supabase = await createServiceRoleClient()
  let query = supabase.from('stores').select('*')
  if (isPreview && !isCron) query = query.eq('user_id', PREVIEW_ADMIN_USER_ID)
  const { data: stores } = await query
  const active = ((stores ?? []) as Store[]).filter((s) => !isTokenExpired(s))
  const results = await Promise.allSettled(active.map(async (store) => {
    await getValidAccessToken(store, supabase)
    return suggestPrices(store, supabase)
  }))
  const suggestions = results.reduce((s, r) => s + (r.status === 'fulfilled' ? r.value.suggestions : 0), 0)
  return NextResponse.json({ stores: active.length, suggestions })
}
