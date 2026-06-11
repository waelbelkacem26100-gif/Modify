import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { generateProductImagesBatch } from '@/lib/image-gen'
import type { Store, Audit, Fix } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 300

// Generates gpt-image-1 product photos and uploads them to Shopify, for a
// "Modify génère" (generate) fix. Processes ONE batch (up to 3 products) per
// call and returns progress; the client polls until `done`. Marks the fix
// applied only when EVERY product has its photos. No images = never "applied".
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

  try {
    await getValidAccessToken(store, supabase)
    const result = await generateProductImagesBatch(store, supabase, body.fix_id, 1)
    if (!result.ok) {
      const msg = result.reason === 'no_openai_key'
        ? 'La génération d’images n’est pas encore activée (clé manquante).'
        : result.reason === 'no_product'
        ? 'Aucun produit à enrichir sur cette boutique.'
        : result.detail
        ? `La génération des photos a échoué : ${result.detail}`
        : 'La génération des photos a échoué. Réessayez.'
      // Include progress so the UI can show how many products did succeed.
      return NextResponse.json({ error: msg, detail: result.detail, processed: result.processed, total: result.total }, { status: 502 })
    }
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    console.error('[fixes/generate-images] failed', String(e))
    return NextResponse.json({ error: 'La génération des photos a échoué. Réessayez.' }, { status: 502 })
  }
}
