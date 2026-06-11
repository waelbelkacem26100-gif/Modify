import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import type { Store, Audit, Fix } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30

// Enqueues a server-side image-generation job: flips the fix to `generating`
// and returns immediately. A 1-per-minute Vercel cron (/api/cron/generate-images)
// then generates 3 gpt-image-1 photos per product (one product per run, which
// keeps it under the 5 images/min rate limit) and uploads them to Shopify. The
// job survives the browser tab closing; the UI just polls the fix status.
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json().catch(() => ({})) as { fix_id?: string }
  if (!body.fix_id) return NextResponse.json({ error: 'fix_id manquant' }, { status: 400 })

  const supabase = await createServiceRoleClient()
  const { data: fix } = await supabase
    .from('fixes').select('*, audits(*, stores(*))').eq('id', body.fix_id).single()
  if (!fix) return NextResponse.json({ error: 'Correctif introuvable' }, { status: 404 })

  const store = (fix as Fix & { audits: Audit & { stores: Store } }).audits.stores
  if (store.user_id !== userId) return new NextResponse('Forbidden', { status: 403 })

  // Validate the Shopify token now so we fail fast if it's broken.
  try {
    await getValidAccessToken(store, supabase)
  } catch {
    return NextResponse.json({ error: 'Connexion Shopify expirée — reconnectez votre boutique.' }, { status: 502 })
  }

  // Flip to `generating` — the cron picks it up within ~1 min. Idempotent: if it
  // was already applied (all products done) we leave it; otherwise we enqueue.
  await supabase.from('fixes').update({ status: 'generating' }).eq('id', body.fix_id)
  return NextResponse.json({ success: true, status: 'generating' })
}
