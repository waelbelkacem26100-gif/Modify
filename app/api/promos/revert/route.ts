import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { revertPromos } from '@/lib/promo-engine'
import type { Store } from '@/types'

export const maxDuration = 120

// POST: revert a product's promo, or all active promos
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json().catch(() => ({})) as { product_id?: number; all?: boolean }
  const supabase = await createServiceRoleClient()
  const { data: storeRow } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).single()
  if (!storeRow) return NextResponse.json({ error: 'No store connected' }, { status: 404 })

  const target = body.all ? 'all' : body.product_id
  if (target == null) return NextResponse.json({ error: 'product_id or all required' }, { status: 400 })

  const result = await revertPromos(storeRow as Store, supabase, target)
  return NextResponse.json({ success: true, ...result })
}
