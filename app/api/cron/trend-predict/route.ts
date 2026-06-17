import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken, isTokenExpired } from '@/lib/shopify-token'
import { predictTrends } from '@/lib/autopilot/trends'
import type { Store } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 300

// Prédictions de tendances — cron le 15 du mois.
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
    return predictTrends(store, supabase)
  }))
  const trends = results.reduce((s, r) => s + (r.status === 'fulfilled' ? r.value.trends : 0), 0)
  return NextResponse.json({ stores: active.length, trends })
}
