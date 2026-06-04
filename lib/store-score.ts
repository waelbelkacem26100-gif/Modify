import { getProductsDetailed } from '@/lib/shopify'
import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export interface ScoreComponents {
  speed: number
  content: number
  fixes: number
  seo: number
}

export interface ScoreBreakdown {
  score: number
  recovered_euros: number
  potential_euros: number
  components: ScoreComponents
}

const WEIGHTS = { speed: 0.30, content: 0.35, fixes: 0.25, seo: 0.10 }
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/**
 * Computes the global Modify Score (0–100) from real signals plus the two
 * figures that actually matter to the merchant: € recovered and € still on
 * the table. Never throws — degrades to neutral values on missing data.
 */
export async function computeStoreScore(store: Store, supabase: SupabaseClient): Promise<ScoreBreakdown> {
  // ── Speed: latest mobile PageSpeed score ──────────────────────────────────
  let speed = 70
  const { data: ps } = await supabase
    .from('pagespeed_scores').select('score')
    .eq('store_id', store.id).eq('strategy', 'mobile')
    .order('created_at', { ascending: false }).limit(1)
  if (ps?.[0]?.score != null) speed = ps[0].score

  // ── Content: % products with description + % images with alt text ─────────
  let content = 70
  try {
    const products = await getProductsDetailed(store.shop_domain, store.access_token, 50)
    if (products.length) {
      const withDesc = products.filter((p) => p.body_html && p.body_html.trim().length > 30).length
      let imgTotal = 0, imgWithAlt = 0
      for (const p of products) {
        for (const im of p.images ?? []) {
          imgTotal++
          if (im.alt && im.alt.trim()) imgWithAlt++
        }
      }
      const descRatio = withDesc / products.length
      const altRatio = imgTotal ? imgWithAlt / imgTotal : 1
      content = clamp((descRatio * 0.6 + altRatio * 0.4) * 100)
    }
  } catch {
    // keep neutral
  }

  // ── Fixes: resolution rate + € recovered / potential ──────────────────────
  let fixes = 70
  let recovered_euros = 0
  let potential_euros = 0
  const { data: audits } = await supabase
    .from('audits').select('id').eq('store_id', store.id)
    .order('created_at', { ascending: false })
  const auditIds: string[] = (audits ?? []).map((a: { id: string }) => a.id)
  if (auditIds.length) {
    const { data: allFixes } = await supabase
      .from('fixes').select('impact_euros, status').in('audit_id', auditIds)
    const list = (allFixes ?? []) as { impact_euros: number; status: string }[]
    const applied = list.filter((f) => f.status === 'applied' || f.status === 'preview')
    const pending = list.filter((f) => f.status === 'pending')
    recovered_euros = applied.reduce((s, f) => s + (f.impact_euros ?? 0), 0)
    potential_euros = pending.reduce((s, f) => s + (f.impact_euros ?? 0), 0)
    const actionable = applied.length + pending.length
    if (actionable > 0) fixes = clamp((applied.length / actionable) * 100)
  }

  // ── SEO: blog articles published in the last 30 days ──────────────────────
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count: articleCount } = await supabase
    .from('blog_articles').select('id', { count: 'exact', head: true })
    .eq('store_id', store.id).gte('created_at', since30)
  const seo = clamp(Math.min((articleCount ?? 0), 4) / 4 * 100)

  const components: ScoreComponents = { speed, content, fixes, seo }
  const score = clamp(
    speed * WEIGHTS.speed + content * WEIGHTS.content + fixes * WEIGHTS.fixes + seo * WEIGHTS.seo
  )

  return { score, recovered_euros, potential_euros, components }
}

/** Computes the score and persists a snapshot for week-by-week tracking. */
export async function snapshotStoreScore(store: Store, supabase: SupabaseClient): Promise<ScoreBreakdown> {
  const breakdown = await computeStoreScore(store, supabase)
  await supabase.from('store_score_snapshots').insert({
    store_id: store.id,
    score: breakdown.score,
    recovered_euros: breakdown.recovered_euros,
    potential_euros: breakdown.potential_euros,
    components: breakdown.components,
  })
  return breakdown
}
