import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { generateProductDescription, buildProductHtml } from '@/lib/anthropic'
import type { Store } from '@/types'
import type { ShopifyProduct } from '@/lib/shopify'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json() as { product: ShopifyProduct }
  const { product } = body

  if (!product?.id || !product?.title) {
    return NextResponse.json({ error: 'Missing product data' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()
  const { data: store } = await supabase
    .from('stores')
    .select('user_id')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (!store) return NextResponse.json({ error: 'No store connected' }, { status: 404 })

  let result
  try {
    result = await generateProductDescription({
    title: product.title,
    product_type: product.product_type,
    tags: product.tags,
    variants: product.variants.map((v) => ({
      title: v.title,
      price: v.price,
      option1: v.option1,
      option2: v.option2,
    })),
    image_count: product.images?.length ?? 0,
    })
  } catch (e) {
    console.error('[products/generate] AI generation failed:', String(e))
    return NextResponse.json({ error: 'La génération de la description a échoué. Réessayez dans un instant.' }, { status: 502 })
  }

  return NextResponse.json({
    ...result,
    full_html: buildProductHtml(result),
  })
}
