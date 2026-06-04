import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { computeStoreScore, snapshotStoreScore } from '@/lib/store-score'
import type { Store } from '@/types'

export const maxDuration = 60

async function getStore(supabase: Awaited<ReturnType<typeof createServiceRoleClient>>, userId: string) {
  const { data } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).single()
  return (data as Store) ?? null
}

// GET: current computed score + snapshot history for the evolution chart
export async function GET() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()
  const store = await getStore(supabase, userId)
  if (!store) return NextResponse.json({ current: null, history: [] })

  const current = await computeStoreScore(store, supabase)

  const { data: snaps } = await supabase
    .from('store_score_snapshots')
    .select('score, recovered_euros, potential_euros, created_at')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .limit(26)

  const history = [...(snaps ?? [])].reverse().map((s) => ({
    date: new Date(s.created_at).toISOString().slice(0, 10),
    score: s.score,
    recovered: Number(s.recovered_euros),
    potential: Number(s.potential_euros),
  }))

  return NextResponse.json({ current, history })
}

// POST: take a fresh snapshot now
export async function POST() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()
  const store = await getStore(supabase, userId)
  if (!store) return NextResponse.json({ error: 'No store connected' }, { status: 404 })

  const breakdown = await snapshotStoreScore(store, supabase)
  return NextResponse.json({ success: true, ...breakdown })
}
