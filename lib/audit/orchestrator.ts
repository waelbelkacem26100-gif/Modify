import { logAction } from '@/lib/audit-log'
import { snapshotStoreScore } from '@/lib/store-score'
import { collectForCategory } from './collect'
import { CATEGORY_ORDER, AUDIT_CATEGORIES, type Problem, type ProblemCategory } from './types'
import type { AuditAgent } from './agents/shared'
import { productPagesAgent } from './agents/product-pages'
import { uiUxAgent } from './agents/ui-ux'
import { performanceSeoAgent } from './agents/performance-seo'
import { trustAgent } from './agents/trust'
import { funnelAgent } from './agents/funnel'
import { mobileAgent } from './agents/mobile'
import { competitiveAgent } from './agents/competitive'
import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

const AGENTS: Record<ProblemCategory, AuditAgent> = {
  products: productPagesAgent,
  uiux: uiUxAgent,
  perf_seo: performanceSeoAgent,
  trust: trustAgent,
  funnel: funnelAgent,
  mobile: mobileAgent,
  competitive: competitiveAgent,
}

export interface StepResult {
  ok: boolean
  category: ProblemCategory
  count: number
  /** Index of the next step, or null when the audit is complete. */
  nextIndex: number | null
  error?: string
}

/**
 * Runs ONE audit step (one category agent) and persists its problems.
 *
 * Architecture Vercel Hobby : chaque étape = collecte ciblée (~5s) + 1 appel IA
 * (~20-30s), bien sous les 60s. La progression est suivie SANS migration via
 * audit_logs (action 'audit_category_done'), et les problèmes sont accumulés
 * dans audits.results (lecture-modification-écriture).
 */
export async function runAuditStep(
  store: Store, auditId: string, stepIndex: number, supabase: SupabaseClient
): Promise<StepResult> {
  const category = CATEGORY_ORDER[stepIndex]
  if (!category) return { ok: false, category: 'products', count: 0, nextIndex: null, error: 'invalid step' }

  // Garde anti-double-exécution : si le watchdog a relancé une étape qui avait
  // en fait abouti (lenteur, pas mort), on la saute et on enchaîne directement.
  const { data: doneLog } = await supabase
    .from('audit_logs').select('id').eq('action', 'audit_category_done')
    .eq('details->>audit_id', auditId).eq('details->>category', category).limit(1).maybeSingle()
  if (doneLog) {
    const isLastDone = stepIndex >= CATEGORY_ORDER.length - 1
    return { ok: true, category, count: 0, nextIndex: isLastDone ? null : stepIndex + 1 }
  }

  let problems: Problem[] = []
  try {
    const input = await collectForCategory(store, category, supabase)
    problems = await AGENTS[category].run(input)
  } catch (e) {
    console.error(`[audit] agent ${category} failed:`, String(e))
    // Un agent qui échoue ne tue pas l'audit : on continue avec 0 problème
    // pour cette catégorie et on le journalise honnêtement.
    await logAction(supabase, store.id, 'audit_agent_failed',
      { audit_id: auditId, category, error: String(e).slice(0, 300) }, 'failed')
  }

  // Append to audits.results (read-modify-write — single chain, no concurrency).
  const { data: audit } = await supabase.from('audits').select('results').eq('id', auditId).single()
  const existing: Problem[] = Array.isArray(audit?.results) ? audit.results : []
  const merged = [...existing.filter((p) => p.category !== category), ...problems]
  await supabase.from('audits').update({ results: merged }).eq('id', auditId)

  await logAction(supabase, store.id, 'audit_category_done',
    { audit_id: auditId, category, index: stepIndex, count: problems.length }, 'success')

  const isLast = stepIndex >= CATEGORY_ORDER.length - 1
  if (isLast) {
    const totalImpact = merged.reduce((s, p) => s + (p.impact_euros || 0), 0)
    await supabase.from('audits').update({
      status: 'completed',
      results: merged,
      total_impact_euros: totalImpact,
    }).eq('id', auditId)
    await logAction(supabase, store.id, 'audit_completed',
      { audit_id: auditId, problems: merged.length, total_impact: totalImpact }, 'success')
    try { await snapshotStoreScore(store, supabase) } catch { /* best-effort */ }
  }

  return { ok: true, category, count: problems.length, nextIndex: isLast ? null : stepIndex + 1 }
}

/**
 * Sequential full audit — for headless callers (weekly cron) where chaining via
 * HTTP isn't needed. Same agents, same persistence.
 */
export async function runFullAuditSequential(store: Store, auditId: string, supabase: SupabaseClient): Promise<void> {
  for (let i = 0; i < CATEGORY_ORDER.length; i++) {
    await runAuditStep(store, auditId, i, supabase)
  }
}

/** Progress of a running audit, computed from audit_logs (zero-DDL). */
export async function auditProgress(auditId: string, supabase: SupabaseClient): Promise<{
  done: number
  total: number
  current: string | null
  categories: { key: ProblemCategory; emoji: string; label: string; done: boolean; count: number }[]
}> {
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('details')
    .eq('action', 'audit_category_done')
    .eq('details->>audit_id', auditId)
  const doneByCat = new Map<string, number>()
  for (const l of logs ?? []) {
    const d = l.details as { category?: string; count?: number }
    if (d?.category) doneByCat.set(d.category, d.count ?? 0)
  }
  const categories = CATEGORY_ORDER.map((key) => ({
    key,
    emoji: AUDIT_CATEGORIES[key].emoji,
    label: AUDIT_CATEGORIES[key].label,
    done: doneByCat.has(key),
    count: doneByCat.get(key) ?? 0,
  }))
  const done = categories.filter((c) => c.done).length
  const currentKey = CATEGORY_ORDER[done] ?? null
  return {
    done,
    total: CATEGORY_ORDER.length,
    current: currentKey ? AUDIT_CATEGORIES[currentKey].progressLabel : null,
    categories,
  }
}
