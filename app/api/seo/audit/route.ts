import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { runSeoAudit } from '@/lib/seo-audit'
import type { Store } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 120

// GET: live SEO score + problems, plus totals of corrections applied so far.
export async function GET() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()
  const { data: storeRow } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const store = storeRow as Store | null
  if (!store) return NextResponse.json({ audit: null })

  await getValidAccessToken(store, supabase)
  const audit = await runSeoAudit(store)

  // Sum the corrections applied so far (from audit_logs) + article count.
  const { data: logs } = await supabase
    .from('audit_logs').select('details')
    .eq('store_id', store.id).eq('action', 'seo_fix_all_applied')
  const applied = { metasUpdated: 0, altsUpdated: 0, faqsGenerated: 0 }
  for (const l of (logs ?? []) as { details: Record<string, number> | null }[]) {
    applied.metasUpdated += l.details?.metasUpdated ?? 0
    applied.altsUpdated += l.details?.altsUpdated ?? 0
    applied.faqsGenerated += l.details?.faqsGenerated ?? 0
  }
  const { count: articles } = await supabase
    .from('blog_articles').select('id', { count: 'exact', head: true }).eq('store_id', store.id)

  return NextResponse.json({ audit, applied, articles: articles ?? 0 })
}
