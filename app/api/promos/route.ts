import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { detectPromoCandidates, applyPromos, DEFAULT_DISCOUNT } from '@/lib/promo-engine'
import type { Store } from '@/types'

export const maxDuration = 120

async function getStore(supabase: Awaited<ReturnType<typeof createServiceRoleClient>>, userId: string) {
  const { data } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).single()
  return (data as Store) ?? null
}

// GET: promo candidates + currently active promos
export async function GET() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()
  const store = await getStore(supabase, userId)
  if (!store) return NextResponse.json({ candidates: [], active: [] })

  const candidates = await detectPromoCandidates(store, supabase)

  const { data: active } = await supabase
    .from('product_promos')
    .select('product_id, original_price, new_price')
    .eq('store_id', store.id).eq('status', 'active')

  // collapse active promos to one row per product
  const byProduct = new Map<number, { product_id: number; original_price: number; new_price: number }>()
  for (const r of (active ?? []) as { product_id: number; original_price: number; new_price: number }[]) {
    if (!byProduct.has(r.product_id)) byProduct.set(r.product_id, r)
  }

  return NextResponse.json({ candidates, active: [...byProduct.values()] })
}

// POST: apply promos to selected products (or top candidates if none given)
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json().catch(() => ({})) as { product_ids?: number[] }
  const supabase = await createServiceRoleClient()
  const store = await getStore(supabase, userId)
  if (!store) return NextResponse.json({ error: 'No store connected' }, { status: 404 })

  let productIds = body.product_ids ?? []
  if (productIds.length === 0) {
    const candidates = await detectPromoCandidates(store, supabase)
    productIds = candidates.slice(0, 10).map((c) => c.product_id)
  }
  if (productIds.length === 0) {
    return NextResponse.json({ success: true, applied: 0, note: 'no_candidates' })
  }

  const result = await applyPromos(store, supabase, productIds, DEFAULT_DISCOUNT)
  return NextResponse.json({ success: true, ...result })
}
