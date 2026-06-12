import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const maxDuration = 300

// TEMPORARY diagnostics for the v2 marathon — lets the build agent trigger and
// observe real flows (audit chain) without a Clerk session. Guarded by a
// one-off token. REMOVE BEFORE FINAL REPORT.
const DIAG_TOKEN = 'modify-v2-diag-9c4e'
const AQUADRIVE = 'hvzrra-fb.myshopify.com'

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get('t') !== DIAG_TOKEN) {
    return new NextResponse('Not found', { status: 404 })
  }
  const action = request.nextUrl.searchParams.get('action') ?? 'status'
  const supabase = await createServiceRoleClient()
  const { data: store } = await supabase
    .from('stores').select('id, shop_domain').eq('shop_domain', AQUADRIVE).single()
  if (!store) return NextResponse.json({ error: 'store not found' })

  if (action === 'start') {
    const res = await fetch(`${request.nextUrl.origin}/api/audit/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-modify-internal': process.env.CRON_SECRET ?? '' },
      body: JSON.stringify({ store_id: store.id }),
    })
    return NextResponse.json({ started: res.ok, status: res.status, body: await res.json().catch(() => null) })
  }

  // Relance manuelle d'une étape de chaîne morte (watchdog manuel).
  if (action === 'kick') {
    const auditId = request.nextUrl.searchParams.get('audit_id')
    const step = Number(request.nextUrl.searchParams.get('step') ?? 0)
    const res = await fetch(`${request.nextUrl.origin}/api/audit/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-modify-internal': process.env.CRON_SECRET ?? '' },
      body: JSON.stringify({ audit_id: auditId, step }),
    })
    return NextResponse.json({ kicked: res.ok, status: res.status, body: await res.json().catch(() => null) })
  }

  // Génère les correctifs depuis un audit (pipeline interne testé).
  if (action === 'genfixes') {
    const auditId = request.nextUrl.searchParams.get('audit_id')
    const res = await fetch(`${request.nextUrl.origin}/api/fixes/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-modify-internal': process.env.CRON_SECRET ?? '' },
      body: JSON.stringify({ audit_id: auditId }),
    })
    const body = await res.json().catch(() => null) as { fixes?: { id: string; title: string; risk_group: string }[] } | null
    return NextResponse.json({
      ok: res.ok, status: res.status,
      fixes: body?.fixes?.map((f) => ({ id: f.id, title: f.title, risk: f.risk_group })) ?? body,
    })
  }

  // Applique UN correctif via le pipeline complet (backup→apply→verify→proof).
  if (action === 'applyfix') {
    const fixId = request.nextUrl.searchParams.get('fix_id')
    const res = await fetch(`${request.nextUrl.origin}/api/fixes/apply`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-modify-internal': process.env.CRON_SECRET ?? '' },
      body: JSON.stringify({ fix_id: fixId, confirm_high_risk: false }),
    })
    return NextResponse.json({ ok: res.ok, status: res.status, body: await res.json().catch(() => null) })
  }

  // Lance la chaîne "Tout appliquer" (1 correctif/étape, auto-propagée).
  if (action === 'applyall') {
    const auditId = request.nextUrl.searchParams.get('audit_id')
    const res = await fetch(`${request.nextUrl.origin}/api/fixes/apply-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-modify-internal': process.env.CRON_SECRET ?? '' },
      body: JSON.stringify({ audit_id: auditId }),
    })
    return NextResponse.json({ ok: res.ok, status: res.status, body: await res.json().catch(() => null) })
  }

  // Annule un correctif (restauration du backup, pipeline réel).
  if (action === 'rollbackfix') {
    const fixId = request.nextUrl.searchParams.get('fix_id')
    const res = await fetch(`${request.nextUrl.origin}/api/fixes/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-modify-internal': process.env.CRON_SECRET ?? '' },
      body: JSON.stringify({ fix_id: fixId }),
    })
    return NextResponse.json({ ok: res.ok, status: res.status, body: await res.json().catch(() => null) })
  }

  // Liste les correctifs d'un audit avec l'état du backup.
  if (action === 'fixes') {
    const auditId = request.nextUrl.searchParams.get('audit_id')
    const { data: fixes } = await supabase
      .from('fixes').select('id, title, status, verification_status, risk_group, file_path, original_file_content, screenshot_before, screenshot_after')
      .eq('audit_id', auditId ?? '').order('impact_euros', { ascending: false })
    return NextResponse.json({
      fixes: (fixes ?? []).map((f: Record<string, unknown>) => ({
        id: f.id, title: f.title, status: f.status, verif: f.verification_status, risk: f.risk_group,
        file: f.file_path,
        backup: f.original_file_content
          ? (String(f.original_file_content).startsWith('{"__modify_backup"') ? 'group_a_json' : `theme_file(${String(f.original_file_content).length}b)`)
          : null,
        shots: [f.screenshot_before ? 'before' : null, f.screenshot_after ? 'after' : null].filter(Boolean),
      })),
    })
  }

  // Trace de chaîne : logs de réception/envoi pour un audit.
  if (action === 'trace') {
    const auditId = request.nextUrl.searchParams.get('audit_id')
    const { data: trace } = await supabase
      .from('audit_logs').select('action, details, status, created_at')
      .eq('details->>audit_id', auditId ?? '')
      .order('created_at', { ascending: true }).limit(60)
    return NextResponse.json({ trace })
  }

  // status — latest audit + progress + compact results
  const { data: audit } = await supabase
    .from('audits').select('*').eq('store_id', store.id)
    .order('created_at', { ascending: false }).limit(1).single()
  if (!audit) return NextResponse.json({ audit: null })

  const { data: logs } = await supabase
    .from('audit_logs').select('details').eq('action', 'audit_category_done')
    .eq('details->>audit_id', audit.id)
  const doneCats = (logs ?? []).map((l: { details: { category?: string; count?: number } }) =>
    `${l.details?.category}:${l.details?.count}`)

  type R = { category: string; title: string; impact_euros: number; priority: string; capability?: string; affected_items?: string[] }
  const results: R[] = Array.isArray(audit.results) ? audit.results : []
  return NextResponse.json({
    audit_id: audit.id,
    status: audit.status,
    created_at: audit.created_at,
    total_impact: audit.total_impact_euros,
    categories_done: doneCats,
    problem_count: results.length,
    problems: results.map((r) => ({
      cat: r.category, title: r.title, eur: r.impact_euros, prio: r.priority,
      cap: r.capability, items: (r.affected_items ?? []).slice(0, 5),
    })),
  })
}
