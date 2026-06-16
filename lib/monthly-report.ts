import type { Store } from '@/types'
import type { MonthlyReportData } from '@/lib/email'
import { buildProofRecords } from '@/lib/proofs/build-proof'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

/** 1-2 preuves texte du mois (avant/après Google réels) pour l'email — best-effort. */
async function monthProofExamples(store: Store, supabase: SupabaseClient, since: string) {
  try {
    const { proofs } = await buildProofRecords(store, supabase, { limit: 20 })
    return proofs
      .filter((p) => p.proofType === 'google_preview' && p.after.text && new Date(p.appliedAt) >= new Date(since))
      .slice(0, 2)
      .map((p) => ({
        title: p.title,
        before: p.before.text || 'Aucun titre Google personnalisé',
        after: p.after.text!,
      }))
  } catch {
    return [] // l'email part sans preuves plutôt que de ne pas partir
  }
}

/** Gathers a store's last-30-day activity into a monthly report. */
export async function buildMonthlyReport(store: Store, supabase: SupabaseClient): Promise<MonthlyReportData> {
  const monthSince = new Date(Date.now() - 30 * 864e5).toISOString()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://modify-coral.vercel.app'

  const { data: audits } = await supabase.from('audits').select('id').eq('store_id', store.id)
  const auditIds = (audits ?? []).map((a: { id: string }) => a.id)

  let totalRecovered = 0, monthRecovered = 0, fixesApplied = 0
  let appliedList: { title: string; impact_euros: number }[] = []
  let pendingList: { title: string; impact_euros: number }[] = []
  if (auditIds.length) {
    const { data: rows } = await supabase
      .from('fixes').select('title, impact_euros, status, created_at').in('audit_id', auditIds)
    const fixes = (rows ?? []) as { title: string; impact_euros: number; status: string; created_at: string }[]
    const applied = fixes.filter((f) => f.status === 'applied')
    totalRecovered = applied.reduce((s, f) => s + (f.impact_euros ?? 0), 0)
    const monthApplied = applied.filter((f) => new Date(f.created_at) >= new Date(monthSince))
    monthRecovered = monthApplied.reduce((s, f) => s + (f.impact_euros ?? 0), 0)
    fixesApplied = monthApplied.length
    appliedList = monthApplied.sort((a, b) => b.impact_euros - a.impact_euros).slice(0, 8)
      .map((f) => ({ title: f.title, impact_euros: f.impact_euros }))
    pendingList = fixes.filter((f) => f.status === 'pending').sort((a, b) => b.impact_euros - a.impact_euros).slice(0, 5)
      .map((f) => ({ title: f.title, impact_euros: f.impact_euros }))
  }

  const { count: articles } = await supabase
    .from('blog_articles').select('id', { count: 'exact', head: true }).eq('store_id', store.id).gte('created_at', monthSince)
  const { count: winning } = await supabase
    .from('winning_products').select('id', { count: 'exact', head: true }).eq('store_id', store.id).gte('created_at', monthSince)

  const { data: snaps } = await supabase
    .from('store_score_snapshots').select('score, created_at').eq('store_id', store.id)
    .order('created_at', { ascending: false }).limit(12)
  const rows = (snaps ?? []) as { score: number; created_at: string }[]
  const scoreNow = rows[0]?.score ?? 0
  const monthAgo = rows.find((r) => new Date(r.created_at) <= new Date(monthSince))
  const scoreDelta = monthAgo ? scoreNow - monthAgo.score : null

  // Insights v10 : veille concurrentielle + tendances du mois (si présentes).
  const insights: string[] = []
  const { data: alerts } = await supabase
    .from('competitor_alerts').select('new_value, impact_assessment')
    .eq('store_id', store.id).gte('created_at', monthSince).order('created_at', { ascending: false }).limit(1)
  if (alerts?.[0]?.new_value) insights.push(`🔍 Concurrence : ${alerts[0].new_value}`)
  const { data: trends } = await supabase
    .from('trend_predictions').select('keyword, recommended_action')
    .eq('store_id', store.id).gte('created_at', monthSince).order('created_at', { ascending: false }).limit(1)
  if (trends?.[0]?.keyword) insights.push(`🔥 Tendance : « ${trends[0].keyword} » — ${trends[0].recommended_action ?? ''}`)

  return {
    shopName: store.shop_name ?? store.shop_domain,
    monthRecovered, totalRecovered, fixesApplied, appliedList,
    articles: articles ?? 0, winningProducts: winning ?? 0,
    scoreNow, scoreDelta, pendingList,
    dashboardUrl: `${appUrl}/dashboard/resultats`,
    proofExamples: await monthProofExamples(store, supabase, monthSince),
    insights,
  }
}
