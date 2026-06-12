import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { getProductsDetailed, createCustomCollection } from '@/lib/shopify'
import { suggestBundles } from '@/lib/anthropic'
import { logAction } from '@/lib/audit-log'
import type { Store } from '@/types'

export const maxDuration = 120

async function getStore(supabase: Awaited<ReturnType<typeof createServiceRoleClient>>, userId: string) {
  const { data } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).single()
  const store = (data as Store) ?? null
  // Refresh the expiring offline token server-side before any Shopify call.
  if (store) await getValidAccessToken(store, supabase)
  return store
}

// GET: AI cross-sell bundle suggestions (titles + resolved product ids)
export async function GET() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()
  const store = await getStore(supabase, userId)
  if (!store) return NextResponse.json({ bundles: [] })

  const products = await getProductsDetailed(store.shop_domain, store.access_token, 50)
  const byTitle = new Map(products.map((p) => [p.title.trim().toLowerCase(), p.id]))

  let suggestions
  try {
    suggestions = await suggestBundles(
      products.map((p) => ({ title: p.title, product_type: p.product_type }))
    )
  } catch (e) {
    console.error('[bundles] AI suggestion failed:', String(e))
    return NextResponse.json({ error: 'La suggestion de packs a échoué. Réessayez dans un instant.' }, { status: 502 })
  }

  const bundles = suggestions.map((b) => ({
    title: b.title,
    reason: b.reason,
    products: b.product_titles
      .map((t) => ({ title: t, id: byTitle.get(t.trim().toLowerCase()) }))
      .filter((x): x is { title: string; id: number } => x.id != null),
  })).filter((b) => b.products.length >= 2)

  return NextResponse.json({ bundles })
}

// POST: create a Shopify collection from a bundle's products (cross-sell page)
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json().catch(() => ({})) as { title?: string; product_ids?: number[] }
  if (!body.title || !body.product_ids?.length) {
    return NextResponse.json({ error: 'title and product_ids required' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()
  const store = await getStore(supabase, userId)
  if (!store) return NextResponse.json({ error: 'No store connected' }, { status: 404 })

  try {
    const collection = await createCustomCollection(store.shop_domain, store.access_token, body.title, body.product_ids)
    await logAction(supabase, store.id, 'bundle_collection_created',
      { title: body.title, products: body.product_ids.length }, 'success')
    return NextResponse.json({ success: true, collection })
  } catch (e) {
    console.error('[bundles] create error:', e)
    return NextResponse.json({ error: 'Erreur lors de la création de la collection' }, { status: 502 })
  }
}
