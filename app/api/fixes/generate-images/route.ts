import { NextRequest, NextResponse, after } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { generateProductImagesBatch } from '@/lib/image-gen'
import type { Store, Audit, Fix } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60 // Hobby cap; one product (3 photos) fits in ~45s

// Server-side image-generation job that SURVIVES the browser tab closing.
//
// Each POST processes ONE product (3 gpt-image-1 photos) in `after()` — i.e.
// AFTER responding, so the caller (and the browser) is freed immediately — then
// triggers the NEXT step by calling itself with the internal secret. That self
// call returns instantly (its own work is in its own `after()`), so the chain
// propagates server-to-server, one product at a time, until every product has
// its photos. One product per ~50s step also keeps us under gpt-image-1's
// 5 images/min limit. The fix flips to 'applied' only when all products are done.
//
// Two entry points: the merchant (Clerk) starts it; internal chain/cron calls
// continue it via `x-modify-internal: CRON_SECRET`.
export async function POST(request: NextRequest) {
  const internalHeader = request.headers.get('x-modify-internal')
  const isInternal = Boolean(process.env.CRON_SECRET) && internalHeader === process.env.CRON_SECRET
  const { userId } = isInternal ? { userId: null } : await auth()
  if (!isInternal && !userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json().catch(() => ({})) as { fix_id?: string }
  if (!body.fix_id) return NextResponse.json({ error: 'fix_id manquant' }, { status: 400 })

  const supabase = await createServiceRoleClient()
  const { data: fix } = await supabase
    .from('fixes').select('*, audits(*, stores(*))').eq('id', body.fix_id).single()
  if (!fix) return NextResponse.json({ error: 'Correctif introuvable' }, { status: 404 })

  const store = (fix as Fix & { audits: Audit & { stores: Store } }).audits.stores
  if (!isInternal && store.user_id !== userId) return new NextResponse('Forbidden', { status: 403 })

  try {
    await getValidAccessToken(store, supabase)
  } catch {
    return NextResponse.json({ error: 'Connexion Shopify expirée — reconnectez votre boutique.' }, { status: 502 })
  }

  // Merchant click starts the job; flip to 'generating' so the UI shows it at once.
  if (!isInternal) await supabase.from('fixes').update({ status: 'generating' }).eq('id', body.fix_id)

  const fixId = body.fix_id
  const origin = request.nextUrl.origin

  // Do the heavy work AFTER responding — keeps each step short and tab-independent.
  after(async () => {
    try {
      const p = await generateProductImagesBatch(store, supabase, fixId, 1) // 1 product
      if (p.ok && !p.done) {
        // Chain to the next product. The next step responds immediately (its work
        // is in ITS own after()), so this await resolves fast.
        await fetch(`${origin}/api/fixes/generate-images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-modify-internal': process.env.CRON_SECRET ?? '' },
          body: JSON.stringify({ fix_id: fixId }),
        }).catch((e) => console.error('[generate-images] chain trigger failed', String(e)))
      } else if (!p.ok) {
        // No progress possible — release the job so it isn't stuck "generating".
        await supabase.from('fixes').update({ status: 'pending' }).eq('id', fixId)
        console.error('[generate-images] job stopped', p.reason, p.detail)
      }
      // p.done → generateProductImagesBatch already set status='applied'.
    } catch (e) {
      console.error('[generate-images] step failed', String(e))
      await supabase.from('fixes').update({ status: 'pending' }).eq('id', fixId)
    }
  })

  return NextResponse.json({ success: true, status: 'generating' })
}
