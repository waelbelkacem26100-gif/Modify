import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { runPageSpeed } from '@/lib/pagespeed'
import type { Store } from '@/types'

export const maxDuration = 120

async function getStore(supabase: Awaited<ReturnType<typeof createServiceRoleClient>>, userId: string) {
  const { data } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).single()
  return (data as Store) ?? null
}

// GET: latest score + history for the evolution chart
export async function GET() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()
  const store = await getStore(supabase, userId)
  if (!store) return NextResponse.json({ latest: null, history: [] })

  const { data: rows } = await supabase
    .from('pagespeed_scores')
    .select('score, lcp_ms, cls, tbt_ms, fcp_ms, speed_index_ms, tti_ms, opportunities, strategy, created_at')
    .eq('store_id', store.id)
    .eq('strategy', 'mobile')
    .order('created_at', { ascending: false })
    .limit(26) // ~6 months weekly

  const list = rows ?? []
  return NextResponse.json({
    latest: list[0] ?? null,
    history: [...list].reverse().map((r) => ({
      date: new Date(r.created_at).toISOString().slice(0, 10),
      score: r.score,
    })),
  })
}

// POST: run a fresh PageSpeed measurement now
export async function POST() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()
  const store = await getStore(supabase, userId)
  if (!store) return NextResponse.json({ error: 'No store connected' }, { status: 404 })

  const result = await runPageSpeed(`https://${store.shop_domain}`, 'mobile')
  if (!result) return NextResponse.json({ error: 'PageSpeed indisponible' }, { status: 502 })

  await supabase.from('pagespeed_scores').insert({
    store_id: store.id,
    strategy: result.strategy,
    tested_url: result.url,
    score: result.score,
    lcp_ms: result.lcpMs,
    cls: result.cls,
    tbt_ms: result.tbtMs,
    fcp_ms: result.fcpMs,
    speed_index_ms: result.speedIndexMs,
    tti_ms: result.ttiMs,
    opportunities: result.opportunities,
  })

  return NextResponse.json({ success: true, ...result })
}
