import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const maxDuration = 60

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
