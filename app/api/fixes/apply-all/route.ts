import { NextRequest, NextResponse, after } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { fixCapability } from '@/lib/fix-capability'
import { classifyRiskGroup } from '@/lib/theme-backup'
import type { Store, Audit, Fix } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * "Tout appliquer" — applique TOUS les correctifs automatiques en attente,
 * UN par étape, en chaîne auto-propagée côté serveur (pattern after() +
 * secret interne). L'onglet peut être fermé : la chaîne continue. L'UI
 * rafraîchit la liste : les statuts passent à "Corrigé" un par un.
 */
export async function POST(request: NextRequest) {
  const internal = request.headers.get('x-modify-internal')
  const isInternal = Boolean(process.env.CRON_SECRET) && internal === process.env.CRON_SECRET
  const { userId } = isInternal ? { userId: null } : await auth()
  if (!isInternal && !userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json().catch(() => ({})) as { audit_id?: string }
  if (!body.audit_id) return NextResponse.json({ error: 'audit_id manquant' }, { status: 400 })

  const supabase = await createServiceRoleClient()
  const { data: audit } = await supabase
    .from('audits').select('*, stores(*)').eq('id', body.audit_id).single()
  if (!audit) return NextResponse.json({ error: 'Audit introuvable' }, { status: 404 })
  const store = (audit as Audit & { stores: Store }).stores
  if (!isInternal && store.user_id !== userId) return new NextResponse('Forbidden', { status: 403 })

  // Prochain correctif automatique applicable sans confirmation : capability
  // auto + groupe A/B (les groupes C restent en validation explicite).
  const { data: fixes } = await supabase
    .from('fixes').select('*').eq('audit_id', body.audit_id).eq('status', 'pending')
    .order('impact_euros', { ascending: false })
  const eligible = ((fixes ?? []) as Fix[]).filter((f) =>
    fixCapability(f) === 'auto' && classifyRiskGroup(f.type, f.title, f.risk_group) !== 'c')

  if (eligible.length === 0) {
    return NextResponse.json({ done: true, remaining: 0 })
  }

  const next = eligible[0]
  const origin = request.nextUrl.origin

  // Applique UN correctif (réutilise le pipeline PATCH testé : backup → apply →
  // verify → proof) puis chaîne le suivant. Tout se passe après la réponse.
  after(async () => {
    try {
      const res = await fetch(`${origin}/api/fixes/apply`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-modify-internal': process.env.CRON_SECRET ?? '' },
        body: JSON.stringify({ fix_id: next.id }),
      })
      if (!res.ok) {
        // Garde-fou anti-boucle : un correctif qui échoue SANS être marqué
        // (ex: 400 'incomplet') resterait pending et bloquerait la chaîne.
        const { data: f } = await supabase.from('fixes').select('status').eq('id', next.id).single()
        if (f?.status === 'pending') {
          await supabase.from('fixes').update({ status: 'failed', verification_status: 'failed' }).eq('id', next.id)
        }
      }
    } catch (e) {
      console.error('[apply-all] apply failed for', next.id, String(e))
      await supabase.from('fixes').update({ status: 'failed', verification_status: 'failed' }).eq('id', next.id)
    }
    // Chaîne le suivant (la requête suivante répond immédiatement).
    if (eligible.length > 1) {
      await fetch(`${origin}/api/fixes/apply-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-modify-internal': process.env.CRON_SECRET ?? '' },
        body: JSON.stringify({ audit_id: body.audit_id }),
      }).catch((e) => console.error('[apply-all] chain trigger failed', String(e)))
    }
  })

  return NextResponse.json({ done: false, applying: next.title, remaining: eligible.length })
}
