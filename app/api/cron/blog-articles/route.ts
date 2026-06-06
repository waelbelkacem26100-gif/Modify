import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { generateAndPublishArticle } from '@/lib/blog-generator'
import { isTokenExpired, getValidAccessToken } from '@/lib/shopify-token'
import type { Store } from '@/types'

export const maxDuration = 300

// Weekly: publish one fresh SEO article per connected store.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = await createServiceRoleClient()
  const { data: stores, error } = await supabase.from('stores').select('*')
  if (error || !stores?.length) {
    return NextResponse.json({ stores: 0, error: error?.message })
  }

  const active = (stores as Store[]).filter((s) => !isTokenExpired(s))

  const results = await Promise.allSettled(
    active.map(async (store) => {
      await getValidAccessToken(store, supabase)
      const r = await generateAndPublishArticle(store, supabase)
      return { shop: store.shop_domain, ...r }
    })
  )

  const published = results.filter(
    (r) => r.status === 'fulfilled' && r.value.created
  ).length

  return NextResponse.json({
    stores: stores.length,
    articles_published: published,
    failed: results.filter((r) => r.status === 'rejected').length,
  })
}
