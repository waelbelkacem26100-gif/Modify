import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { runHealthChecks } from '@/lib/health-check'
import type { Store } from '@/types'

export const maxDuration = 60

// GET: run a per-store health/diagnostic check
export async function GET() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()
  const { data: store } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).single()

  if (!store) return NextResponse.json({ connected: false, checks: [] })

  const report = await runHealthChecks(store as Store, supabase)
  return NextResponse.json({ connected: true, ...report })
}
