import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { updateProductDescription } from '@/lib/shopify'
import type { Store } from '@/types'

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json() as {
    product_id: number
    full_html: string
    seo_title?: string | null
    meta_description?: string
  }
  const { product_id, full_html, seo_title, meta_description } = body

  if (!product_id || !full_html) {
    return NextResponse.json({ error: 'Missing product_id or content' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()
  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!store) return NextResponse.json({ error: 'No store connected' }, { status: 404 })

  const typedStore = store as Store
  await getValidAccessToken(typedStore, supabase)

  await updateProductDescription(
    typedStore.shop_domain,
    typedStore.access_token,
    product_id,
    full_html,
    seo_title,
    meta_description
  )

  return NextResponse.json({ success: true })
}
