import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { getUserSubscription, planFor } from '@/lib/subscription'
import { isAdmin } from '@/lib/config'
import { generateWinningProducts } from '@/lib/winning-products'
import type { PlanId } from '@/lib/pricing'
import type { Store, WinningProduct } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 300

const COUNT_BY_PLAN: Record<PlanId, number> = { free: 3, starter: 5, pro: 5 }

async function userStore(supabase: Awaited<ReturnType<typeof createServiceRoleClient>>, userId: string) {
  const { data } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return (data as Store) ?? null
}

// GET: the store's winning-products feed + the user's plan.
export async function GET() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()
  const store = await userStore(supabase, userId)
  if (!store) return NextResponse.json({ products: [], plan: 'free' })

  const subscription = await getUserSubscription(userId)
  const plan: PlanId = isAdmin(userId) ? 'pro' : planFor(subscription)

  const { data } = await supabase
    .from('winning_products').select('*').eq('store_id', store.id)
    .order('created_at', { ascending: false }).limit(40)

  return NextResponse.json({ products: (data ?? []) as WinningProduct[], plan })
}

// POST: generate a fresh batch. Merchant (Clerk, plan-gated count) or the cron
// (internal secret + store_id + count).
export async function POST(request: NextRequest) {
  const internal = request.headers.get('x-modify-internal')
  const isInternal = Boolean(process.env.CRON_SECRET) && internal === process.env.CRON_SECRET
  const body = await request.json().catch(() => ({})) as { store_id?: string; count?: number }

  const supabase = await createServiceRoleClient()

  let store: Store | null = null
  let count = 5
  if (isInternal) {
    const { data } = await supabase.from('stores').select('*').eq('id', body.store_id ?? '').maybeSingle()
    store = (data as Store) ?? null
    count = Math.min(8, Math.max(1, body.count ?? 5))
  } else {
    const { userId } = await auth()
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })
    store = await userStore(supabase, userId)
    const subscription = await getUserSubscription(userId)
    const plan: PlanId = isAdmin(userId) ? 'pro' : planFor(subscription)
    count = COUNT_BY_PLAN[plan]
  }

  if (!store) return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })

  try {
    await getValidAccessToken(store, supabase)
    const products = await generateWinningProducts(store, supabase, count)
    return NextResponse.json({ products, generated: products.length })
  } catch (e) {
    console.error('[winning-products] generate failed for', store.shop_domain, String(e))
    return NextResponse.json({ error: 'La recherche de produits a échoué. Réessayez.' }, { status: 502 })
  }
}
