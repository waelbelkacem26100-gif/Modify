import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { generateProductImagesBatch } from '@/lib/image-gen'
import { logAction } from '@/lib/audit-log'
import type { Store, Audit, Fix } from '@/types'

export const maxDuration = 300

// Runs every minute. Advances any image-generation job (fix.status =
// 'generating') by ONE product (3 gpt-image-1 photos), then returns. Processing
// one product per run (~45s) with the 60s cron spacing keeps us under
// gpt-image-1's 5 images/min limit without an explicit sleep. Shopify is the
// source of truth, so this is idempotent and resumable. When a fix has no more
// products needing photos, generateProductImagesBatch marks it 'applied'.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = await createServiceRoleClient()

  // Active jobs (limit a few per run to stay well under maxDuration).
  const { data: fixes } = await supabase
    .from('fixes')
    .select('*, audits(*, stores(*))')
    .eq('status', 'generating')
    .limit(3)

  const jobs = (fixes ?? []) as (Fix & { audits: Audit & { stores: Store } })[]
  if (jobs.length === 0) return NextResponse.json({ jobs: 0 })

  const summary: Record<string, unknown>[] = []

  for (const fix of jobs) {
    const store = fix.audits?.stores
    if (!store) continue
    try {
      await getValidAccessToken(store, supabase)
      // One product per run.
      const p = await generateProductImagesBatch(store, supabase, fix.id, 1)

      if (!p.ok) {
        // No progress possible (e.g. transient OpenAI error / no product). Release
        // the job back to 'pending' so it isn't stuck and the merchant can retry.
        await supabase.from('fixes').update({ status: 'pending' }).eq('id', fix.id)
        await logAction(supabase, store.id, 'image_job_stopped',
          { reason: p.reason, detail: p.detail }, 'failed', fix.id)
        summary.push({ fix: fix.id, state: 'stopped', reason: p.reason, detail: p.detail })
      } else if (p.done) {
        // generateProductImagesBatch already set status='applied' + the gallery.
        await logAction(supabase, store.id, 'image_job_completed',
          { total: p.total }, 'success', fix.id)
        summary.push({ fix: fix.id, state: 'done', total: p.total })
      } else {
        // More products remain — next minute's cron continues.
        summary.push({ fix: fix.id, state: 'progress', processed: p.processed, total: p.total, current: p.current })
      }
    } catch (e) {
      console.error('[cron/generate-images] job failed', fix.id, String(e))
      summary.push({ fix: fix.id, state: 'error', error: String(e) })
    }
  }

  return NextResponse.json({ jobs: jobs.length, summary })
}
