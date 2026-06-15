import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { auditStrengths, checksRunTotal } from '@/lib/audit/orchestrator'
import { PREVIEW_TOKEN, PREVIEW_ADMIN_USER_ID } from '@/lib/preview'
import type { Store, Audit } from '@/types'

export const runtime = 'nodejs'

// GET — points forts + nombre de checks réellement exécutés pour le dernier audit terminé.
export async function GET(request: NextRequest) {
  const { userId: clerkUserId } = await auth()
  // Preview publique TEMPORAIRE (lecture seule) : bypass admin par token.
  const userId = clerkUserId
    ?? (request.nextUrl.searchParams.get('token') === PREVIEW_TOKEN ? PREVIEW_ADMIN_USER_ID : null)
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!store) return NextResponse.json({ strengths: [], checksRun: null })

  const { data: audit } = await supabase
    .from('audits').select('id, status').eq('store_id', (store as Store).id).eq('status', 'completed')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!audit) return NextResponse.json({ strengths: [], checksRun: null })

  const [strengths, checksRun] = await Promise.all([
    auditStrengths((audit as Audit).id, supabase),
    checksRunTotal((audit as Audit).id, supabase),
  ])

  return NextResponse.json({ strengths, checksRun })
}
