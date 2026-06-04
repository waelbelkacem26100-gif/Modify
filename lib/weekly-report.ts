import type { Store } from '@/types'
import type { WeeklyReportData } from '@/lib/email'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

/** Gathers the last 7 days of Modify activity for a store into a report. */
export async function buildWeeklyReport(
  store: Store,
  supabase: SupabaseClient
): Promise<WeeklyReportData> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://modify-coral.vercel.app'

  // Audits for this store (newest first)
  const { data: audits } = await supabase
    .from('audits')
    .select('id, total_impact_euros, results')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  const auditIds: string[] = (audits ?? []).map((a: { id: string }) => a.id)
  const latestAudit = (audits ?? [])[0] as { results?: unknown[] } | undefined

  // Fixes applied in the last 7 days → € recovered + count
  let recoveredEuros = 0
  let fixesApplied = 0
  let potentialEuros = 0
  if (auditIds.length) {
    const { data: applied } = await supabase
      .from('fixes')
      .select('impact_euros')
      .in('audit_id', auditIds)
      .eq('status', 'applied')
      .gte('created_at', since)
    recoveredEuros = (applied ?? []).reduce((s: number, f: { impact_euros: number }) => s + (f.impact_euros ?? 0), 0)
    fixesApplied = (applied ?? []).length

    const { data: pending } = await supabase
      .from('fixes')
      .select('impact_euros')
      .in('audit_id', auditIds)
      .eq('status', 'pending')
    potentialEuros = (pending ?? []).reduce((s: number, f: { impact_euros: number }) => s + (f.impact_euros ?? 0), 0)
  }

  // Images compressed this week
  const { data: imgRows } = await supabase
    .from('image_optimizations')
    .select('saved_bytes')
    .eq('store_id', store.id)
    .gte('created_at', since)
  const imagesOptimized = (imgRows ?? []).length
  const savedBytes = (imgRows ?? []).reduce((s: number, r: { saved_bytes: number }) => s + (r.saved_bytes ?? 0), 0)
  const mbSaved = +(savedBytes / (1024 * 1024)).toFixed(1)

  // Articles published this week
  const { count: articlesPublished } = await supabase
    .from('blog_articles')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', store.id)
    .gte('created_at', since)

  // PageSpeed latest + delta vs previous
  const { data: psRows } = await supabase
    .from('pagespeed_scores')
    .select('score')
    .eq('store_id', store.id)
    .eq('strategy', 'mobile')
    .order('created_at', { ascending: false })
    .limit(2)
  const pageSpeedScore = psRows?.[0]?.score ?? null
  const pageSpeedDelta =
    psRows && psRows.length === 2 ? psRows[0].score - psRows[1].score : null

  return {
    shopName: store.shop_name ?? store.shop_domain,
    recoveredEuros,
    potentialEuros,
    fixesApplied,
    imagesOptimized,
    mbSaved,
    articlesPublished: articlesPublished ?? 0,
    pageSpeedScore,
    pageSpeedDelta,
    newIssues: latestAudit?.results?.length ?? 0,
    dashboardUrl: `${appUrl}/dashboard`,
  }
}
