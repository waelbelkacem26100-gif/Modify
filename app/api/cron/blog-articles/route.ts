import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { generateAndPublishArticle } from '@/lib/blog-generator'
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

  const results = await Promise.allSettled(
    (stores as Store[]).map(async (store) => {
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
