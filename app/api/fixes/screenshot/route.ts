import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { captureFixScreenshot, type ScreenshotWhen } from '@/lib/screenshot'
import type { Store, Audit, Fix } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

// Captures a before/after screenshot of the store's product page for a fix.
// Called by the client around "Appliquer" (before applying, then after) — fully
// automatic from the merchant's point of view.
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json().catch(() => ({})) as { fix_id?: string; when?: string }
  const when: ScreenshotWhen = body.when === 'after' ? 'after' : 'before'
  if (!body.fix_id) return NextResponse.json({ error: 'fix_id manquant' }, { status: 400 })

  const supabase = await createServiceRoleClient()
  const { data: fix } = await supabase
    .from('fixes').select('*, audits(*, stores(*))').eq('id', body.fix_id).single()
  if (!fix) return NextResponse.json({ error: 'Correctif introuvable' }, { status: 404 })

  const store = (fix as Fix & { audits: Audit & { stores: Store } }).audits.stores
  if (store.user_id !== userId) return new NextResponse('Forbidden', { status: 403 })

  try {
    await getValidAccessToken(store, supabase)
    const url = await captureFixScreenshot(store, body.fix_id, when, supabase)
    return NextResponse.json({ url })
  } catch (e) {
    console.error('[fixes/screenshot] failed', String(e))
    return NextResponse.json({ url: null }, { status: 200 })
  }
}
