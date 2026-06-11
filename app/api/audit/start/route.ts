import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { runStoreAudit } from '@/lib/run-audit'
import type { Store, Audit } from '@/types'

export const maxDuration = 300

const STALE_AUDIT_MS = 120_000 // 2 minutes

// GET — fetch latest audit, auto-fail stale ones
export async function GET() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!store) return NextResponse.json({ audit: null })

  const { data: audit } = await supabase
    .from('audits')
    .select('*')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!audit) return NextResponse.json({ audit: null })

  // Auto-fail audits stuck in 'running' for more than 2 minutes
  if (audit.status === 'running') {
    const ageMs = Date.now() - new Date(audit.created_at).getTime()
    if (ageMs > STALE_AUDIT_MS) {
      await supabase
        .from('audits')
        .update({ status: 'failed' })
        .eq('id', audit.id)
      return NextResponse.json({ audit: { ...audit, status: 'failed' }, timedOut: true })
    }
  }

  return NextResponse.json({ audit })
}

// POST — launch new audit
export async function POST() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'No store connected' }, { status: 404 })
  }

  const typedStore = store as Store
  // Refresh the expiring offline token before the background audit uses it.
  await getValidAccessToken(typedStore, supabase)

  const { data: audit, error: createError } = await supabase
    .from('audits')
    .insert({ store_id: typedStore.id, status: 'running' })
    .select()
    .single()

  if (createError || !audit) {
    return NextResponse.json({ error: 'Failed to create audit' }, { status: 500 })
  }

  const typedAudit = audit as Audit

  runStoreAudit(typedStore, typedAudit.id, supabase).catch(console.error)

  return NextResponse.json({ audit: typedAudit })
}
