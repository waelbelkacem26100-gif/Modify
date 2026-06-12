import { NextRequest, NextResponse, after } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { runAuditStep } from '@/lib/audit/orchestrator'
import { logAction } from '@/lib/audit-log'
import type { Store } from '@/types'

export const runtime = 'nodejs'
// 300s : l'appel IA d'un agent peut dépasser 60s (gros HTML). Vercel accepte
// maxDuration 300 (Fluid) — seule la fréquence des crons est limitée en Hobby.
export const maxDuration = 300

// Maillon interne de la chaîne d'audit : exécute UNE catégorie (≤60s Vercel
// Hobby) dans after() — donc APRÈS avoir répondu — puis déclenche la catégorie
// suivante en s'auto-appelant. La chaîne se propage de serveur à serveur,
// indépendamment du navigateur. Auth : secret interne uniquement.
export async function POST(request: NextRequest) {
  const internal = request.headers.get('x-modify-internal')
  if (!process.env.CRON_SECRET || internal !== process.env.CRON_SECRET) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { audit_id?: string; step?: number }
  const auditId = body.audit_id
  const step = Number(body.step ?? 0)
  if (!auditId || !Number.isInteger(step) || step < 0) {
    return NextResponse.json({ error: 'audit_id/step invalides' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()
  const { data: audit } = await supabase
    .from('audits').select('*, stores(*)').eq('id', auditId).single()
  if (!audit) return NextResponse.json({ error: 'Audit introuvable' }, { status: 404 })
  if (audit.status !== 'running') return NextResponse.json({ ok: true, note: 'audit non actif' })

  const store = (audit as unknown as { stores: Store }).stores
  const origin = request.nextUrl.origin

  // Trace de réception : permet de diagnostiquer une chaîne qui meurt (le POST
  // suivant est-il arrivé ?).
  await logAction(supabase, store.id, 'audit_step_received', { audit_id: auditId, step }, 'success')

  after(async () => {
    try {
      await getValidAccessToken(store, supabase)
      const r = await runAuditStep(store, auditId, step, supabase)
      if (r.nextIndex !== null) {
        try {
          const res = await fetch(`${origin}/api/audit/step`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-modify-internal': process.env.CRON_SECRET ?? '' },
            body: JSON.stringify({ audit_id: auditId, step: r.nextIndex }),
          })
          await logAction(supabase, store.id, 'audit_chain_sent',
            { audit_id: auditId, from: step, to: r.nextIndex, http: res.status }, res.ok ? 'success' : 'failed')
        } catch (e) {
          await logAction(supabase, store.id, 'audit_chain_sent',
            { audit_id: auditId, from: step, to: r.nextIndex, error: String(e).slice(0, 200) }, 'failed')
        }
      }
    } catch (e) {
      console.error('[audit/step] step failed', step, String(e))
      await logAction(supabase, store.id, 'audit_step_crashed',
        { audit_id: auditId, step, error: String(e).slice(0, 300) }, 'failed')
      await supabase.from('audits').update({ status: 'failed' }).eq('id', auditId)
    }
  })

  return NextResponse.json({ ok: true, step })
}
