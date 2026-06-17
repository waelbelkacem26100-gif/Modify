import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken, isTokenExpired } from '@/lib/shopify-token'
import { monitorCompetitors } from '@/lib/autopilot/competitive'
import type { Store } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 300

// Veille concurrentielle — cron le 1er du mois (1 alerte par boutique).
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
    return monitorCompetitors(store, supabase)
  }))
  const alerts = results.reduce((s, r) => s + (r.status === 'fulfilled' ? r.value.alerts : 0), 0)
  return NextResponse.json({ stores: active.length, alerts })
}
