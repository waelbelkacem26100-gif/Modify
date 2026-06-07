import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { getProductsDetailed } from '@/lib/shopify'
import type { Store } from '@/types'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!store) return NextResponse.json({ products: [], shopDomain: null })

  const typedStore = store as Store
  await getValidAccessToken(typedStore, supabase)

  const products = await getProductsDetailed(typedStore.shop_domain, typedStore.access_token)

  const enriched = products.map((p) => ({
    ...p,
    hasDescription: Boolean(p.body_html && p.body_html.replace(/<[^>]*>/g, '').trim().length > 30),
  }))

  return NextResponse.json({ products: enriched, shopDomain: typedStore.shop_domain })
}
