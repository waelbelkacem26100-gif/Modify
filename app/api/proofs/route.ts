import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { buildProofRecords } from '@/lib/proofs/build-proof'
import type { Store } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * GET /api/proofs?limit=N — les preuves de corrections appliquées (Impact
 * Visible). Consommé par la page Preuves, le feed d'activité de 🔍 Analyse et
 * les miniatures de ⚡ Corrections. Pas de cache : le feed doit refléter une
 * correction appliquée il y a 5 secondes.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const limit = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 50))

  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const store = data as Store | null
  if (!store) return NextResponse.json({ proofs: [], totalApplied: 0, totalEur: 0, storefrontGated: false })

  try {
    await getValidAccessToken(store, supabase)
    const result = await buildProofRecords(store, supabase, { limit })
    return NextResponse.json({ ...result, shopDomain: store.shop_domain })
  } catch (e) {
    console.error('[proofs] build failed:', String(e))
    return NextResponse.json({ error: 'Impossible de charger les preuves.' }, { status: 502 })
  }
}
