import { NextRequest, NextResponse, after } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { runAuditStep, auditProgress } from '@/lib/audit/orchestrator'
import { logAction } from '@/lib/audit-log'
import type { Store, Audit } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

// 7 agents × ~30s (le 7e fait de la recherche web) : audit complet ~4 minutes.
const STALE_AUDIT_MS = 10 * 60_000

// GET — latest audit + live per-category progress (polled by the Analyse page)
export async function GET() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).single()
  if (!store) return NextResponse.json({ audit: null })

  const { data: audit } = await supabase
    .from('audits').select('*').eq('store_id', store.id)
    .order('created_at', { ascending: false }).limit(1).single()
  if (!audit) return NextResponse.json({ audit: null })

  // Auto-fail audits stuck in 'running' (chain died) after 10 minutes.
  if (audit.status === 'running') {
    const ageMs = Date.now() - new Date(audit.created_at).getTime()
    if (ageMs > STALE_AUDIT_MS) {
      await supabase.from('audits').update({ status: 'failed' }).eq('id', audit.id)
      return NextResponse.json({ audit: { ...audit, status: 'failed' }, timedOut: true })
    }
    const progress = await auditProgress(audit.id, supabase)

    // WATCHDOG auto-réparant : si la chaîne est morte en route (étape tuée par
    // le runtime sans marquer l'échec), le polling de l'UI la relance à
    // l'étape suivante. Inactivité = pas de catégorie terminée depuis 2 min.
    const { data: lastLog } = await supabase
      .from('audit_logs').select('created_at').eq('details->>audit_id', audit.id)
      .in('action', ['audit_category_done', 'audit_started'])
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    const lastActivity = lastLog ? new Date(lastLog.created_at).getTime() : new Date(audit.created_at).getTime()
    // 160s : au-delà du pire cas d'une étape lente (perf_seo + PageSpeed ~90s,
    // concurrence + recherches web ~120s), pour ne JAMAIS relancer une étape
    // encore en cours (écriture concurrente de results). La garde anti-double
    // dans runAuditStep couvre la relance d'une étape déjà aboutie.
    if (Date.now() - lastActivity > 160_000 && progress.done < progress.total) {
      const origin = new URL(
        process.env.NEXT_PUBLIC_APP_URL || 'https://modify-coral.vercel.app'
      ).origin
      fetch(`${origin}/api/audit/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-modify-internal': process.env.CRON_SECRET ?? '' },
        body: JSON.stringify({ audit_id: audit.id, step: progress.done }),
      }).catch(() => {})
    }

    return NextResponse.json({ audit, progress })
  }

  return NextResponse.json({ audit })
}

// POST — launch a new audit (kicks the self-chaining 6-agent pipeline)
export async function POST(request: NextRequest) {
  // Merchant (Clerk) or Modify itself (agent inline action / cron) via secret.
  const internal = request.headers.get('x-modify-internal')
  const isInternal = Boolean(process.env.CRON_SECRET) && internal === process.env.CRON_SECRET
  const { userId } = isInternal ? { userId: null } : await auth()
  if (!isInternal && !userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()

  let storeQuery = supabase.from('stores').select('*').order('created_at', { ascending: false }).limit(1)
  if (!isInternal) storeQuery = storeQuery.eq('user_id', userId)
  else {
    const body = await request.json().catch(() => ({})) as { store_id?: string }
    if (body.store_id) storeQuery = storeQuery.eq('id', body.store_id)
  }
  const { data: store } = await storeQuery.single()
  if (!store) return NextResponse.json({ error: 'No store connected' }, { status: 404 })

  const typedStore = store as Store
  await getValidAccessToken(typedStore, supabase)

  // Refuse a second concurrent audit (the chain is single-track per audit).
  const { data: running } = await supabase
    .from('audits').select('id, created_at').eq('store_id', typedStore.id).eq('status', 'running')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (running && Date.now() - new Date(running.created_at).getTime() < STALE_AUDIT_MS) {
    return NextResponse.json({ audit: { id: running.id, status: 'running' }, note: 'already_running' })
  }

  const { data: audit, error: createError } = await supabase
    .from('audits')
    .insert({ store_id: typedStore.id, status: 'running', results: [] })
    .select()
    .single()
  if (createError || !audit) {
    return NextResponse.json({ error: 'Failed to create audit' }, { status: 500 })
  }

  const typedAudit = audit as Audit
  await logAction(supabase, typedStore.id, 'audit_started', { audit_id: typedAudit.id }, 'success')

  const origin = request.nextUrl.origin
  // Step 0 runs after the response; each step chains the next one server-side.
  after(async () => {
    try {
      const r = await runAuditStep(typedStore, typedAudit.id, 0, supabase)
      if (r.nextIndex !== null) {
        await fetch(`${origin}/api/audit/step`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-modify-internal': process.env.CRON_SECRET ?? '' },
          body: JSON.stringify({ audit_id: typedAudit.id, step: r.nextIndex }),
        }).catch((e) => console.error('[audit/start] chain trigger failed', String(e)))
      }
    } catch (e) {
      console.error('[audit/start] step 0 failed', String(e))
      await supabase.from('audits').update({ status: 'failed' }).eq('id', typedAudit.id)
    }
  })

  return NextResponse.json({ audit: typedAudit })
}
