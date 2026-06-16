import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { optimizeProduct } from '@/lib/autopilot/product-optimizer'
import { PREVIEW_TOKEN, PREVIEW_ADMIN_USER_ID } from '@/lib/preview'
import type { Store } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Déclencheur de test du Pilote automatique (TEMPORAIRE).
 *
 * Exerce la VRAIE logique d'optimisation produit en production (là où vit la clé
 * Anthropic valide), sans dépendre de la signature webhook Shopify. Gated par le
 * token preview ET restreint au store du compte admin (AquaDrive). Lecture du
 * product_id en body. À retirer avec le reste du scaffolding preview.
 *
 * POST { product_id }  ?token=modify-preview-2026
 */
export async function POST(request: NextRequest) {
  if (request.nextUrl.searchParams.get('token') !== PREVIEW_TOKEN) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  const body = await request.json().catch(() => ({})) as { product_id?: string | number }
  if (body.product_id == null) return NextResponse.json({ error: 'product_id requis' }, { status: 400 })

  const supabase = await createServiceRoleClient()
  const { data } = await supabase.from('stores').select('*')
    .eq('user_id', PREVIEW_ADMIN_USER_ID).order('created_at', { ascending: false }).limit(1).maybeSingle()
  const store = data as Store | null
  if (!store) return NextResponse.json({ error: 'store introuvable' }, { status: 404 })

  try {
    await getValidAccessToken(store, supabase)
    const report = await optimizeProduct(store, body.product_id, supabase)
    return NextResponse.json({ ok: true, report })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 400) }, { status: 502 })
  }
}
