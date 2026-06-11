import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000

export interface TypeEffectiveness {
  type: string
  applied: number
  failed: number
  successRate: number
  avgImpact: number
  score: number // successRate × avgImpact — used for ranking
}

/**
 * Continuous improvement: analyses the outcomes of every fix Modify has applied
 * to THIS store and ranks fix types by real effectiveness (success rate × average
 * recovered €). Returns null until there are at least 4 weeks of history, so new
 * stores fall back to a sensible default ordering.
 */
export async function getTypeEffectiveness(store: Store, supabase: SupabaseClient): Promise<TypeEffectiveness[] | null> {
  const { data: audits } = await supabase
    .from('audits').select('id, created_at').eq('store_id', store.id)
  if (!audits?.length) return null

  const earliest = Math.min(...audits.map((a: { created_at: string }) => new Date(a.created_at).getTime()))
  if (Date.now() - earliest < FOUR_WEEKS_MS) return null // not enough history yet

  const auditIds = audits.map((a: { id: string }) => a.id)
  const { data: fixes } = await supabase
    .from('fixes').select('type, status, impact_euros').in('audit_id', auditIds)
  if (!fixes?.length) return null

  const byType: Record<string, { applied: number; failed: number; impact: number }> = {}
  for (const f of fixes as { type: string; status: string; impact_euros: number }[]) {
    const t = f.type || 'other'
    byType[t] ??= { applied: 0, failed: 0, impact: 0 }
    if (f.status === 'applied') { byType[t].applied++; byType[t].impact += f.impact_euros ?? 0 }
    else if (f.status === 'failed') byType[t].failed++
  }

  const stats: TypeEffectiveness[] = Object.entries(byType).map(([type, s]) => {
    const total = s.applied + s.failed
    const successRate = total ? s.applied / total : 0
    const avgImpact = s.applied ? s.impact / s.applied : 0
    return { type, applied: s.applied, failed: s.failed, successRate, avgImpact, score: successRate * avgImpact }
  })
  stats.sort((a, b) => b.score - a.score)
  return stats
}

/** Priority-ordered fix types learned for this store (most effective first). */
export async function getLearnedPriority(store: Store, supabase: SupabaseClient): Promise<string[] | null> {
  const stats = await getTypeEffectiveness(store, supabase)
  return stats ? stats.map((s) => s.type) : null
}

/**
 * Orders fixable issues by the store's learned priority (most effective types
 * first). Falls back to impact-desc when there's no learning yet.
 */
export function prioritizeIssues<T extends { category: string; impact_euros: number }>(
  issues: T[], learnedOrder: string[] | null
): T[] {
  if (!learnedOrder) return [...issues].sort((a, b) => b.impact_euros - a.impact_euros)
  const rank = new Map(learnedOrder.map((t, i) => [t, i]))
  return [...issues].sort((a, b) => {
    const ra = rank.get(a.category) ?? 999
    const rb = rank.get(b.category) ?? 999
    if (ra !== rb) return ra - rb
    return b.impact_euros - a.impact_euros
  })
}
