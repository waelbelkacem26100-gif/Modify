import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { listMissions, startMission } from '@/lib/copilot/missions'
import { PREVIEW_TOKEN, PREVIEW_ADMIN_USER_ID } from '@/lib/preview'
import type { Store } from '@/types'

export const runtime = 'nodejs'
// Génération du contenu réel d'une mission (briefs/emails/scripts) : ~30-60s.
export const maxDuration = 120

async function getStore(supabase: Awaited<ReturnType<typeof createServiceRoleClient>>, userId: string) {
  const { data } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return (data as Store) ?? null
}

// GET — missions du dernier audit (problèmes 👋 + état des guides liés)
export async function GET(request: NextRequest) {
  const { userId: clerkUserId } = await auth()
  // Preview publique TEMPORAIRE (lecture seule) : bypass admin par token (GET only).
  const userId = clerkUserId
    ?? (request.nextUrl.searchParams.get('token') === PREVIEW_TOKEN ? PREVIEW_ADMIN_USER_ID : null)
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()
  const store = await getStore(supabase, userId)
  if (!store) return NextResponse.json({ audit_id: null, missions: [] })

  const result = await listMissions(store, supabase)
  return NextResponse.json(result)
}

// POST — lance une mission : génère le contenu réel et le persiste (idempotent)
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json().catch(() => ({})) as { problem_id?: string }
  if (!body.problem_id) return NextResponse.json({ error: 'problem_id required' }, { status: 400 })

  const supabase = await createServiceRoleClient()
  const store = await getStore(supabase, userId)
  if (!store) return NextResponse.json({ error: 'No store connected' }, { status: 404 })

  try {
    await getValidAccessToken(store, supabase)
    const result = await startMission(store, body.problem_id, supabase)
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    const msg = String(e)
    if (msg.includes('PROBLEM_NOT_FOUND')) {
      return NextResponse.json({ error: 'Ce problème ne figure plus dans votre dernier audit.' }, { status: 404 })
    }
    // Quota IA atteint : message honnête plutôt qu'un échec générique.
    if (msg.includes('credit balance') || msg.includes('insufficient_quota') || msg.includes('rate_limit')) {
      return NextResponse.json({ error: 'Mody est temporairement en pause (quota IA atteint). Réessayez bientôt.', code: 'AI_QUOTA' }, { status: 503 })
    }
    console.error('[copilot/missions] start failed:', msg)
    return NextResponse.json({ error: 'La préparation de la mission a échoué. Réessayez.' }, { status: 502 })
  }
}
