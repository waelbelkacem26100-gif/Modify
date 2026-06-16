import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken, isTokenExpired } from '@/lib/shopify-token'
import { monitorCompetitors } from '@/lib/autopilot/competitive'
import { PREVIEW_TOKEN, PREVIEW_ADMIN_USER_ID } from '@/lib/preview'
import type { Store } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 300

// Veille concurrentielle — cron le 1er du mois (1 alerte par boutique).
// Test : ?token=modify-preview-2026 (restreint au store admin AquaDrive).
export async function GET(request: NextRequest) {
  const isCron = request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
  const isPreview = request.nextUrl.searchParams.get('token') === PREVIEW_TOKEN
  if (process.env.NODE_ENV === 'production' && !isCron && !isPreview) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = await createServiceRoleClient()
  let query = supabase.from('stores').select('*')
  if (isPreview && !isCron) query = query.eq('user_id', PREVIEW_ADMIN_USER_ID) // test : un seul store
  const { data: stores } = await query
  const active = ((stores ?? []) as Store[]).filter((s) => !isTokenExpired(s))

  const results = await Promise.allSettled(active.map(async (store) => {
    await getValidAccessToken(store, supabase)
    return monitorCompetitors(store, supabase)
  }))
  const alerts = results.reduce((s, r) => s + (r.status === 'fulfilled' ? r.value.alerts : 0), 0)
  return NextResponse.json({ stores: active.length, alerts })
}
