import { runStoreAudit } from '@/lib/run-audit'
import { applyPendingFixesForStore } from '@/lib/apply-pending'
import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export interface MaintenanceResult {
  auditId: string | null
  newIssues: number
  generated: number
  applied: number
  failed: number
}

/**
 * Full weekly auto-maintenance for one store (auto mode):
 *   1. run a fresh 100+ point audit,
 *   2. generate the new fixes (prioritised by what works best on this store),
 *   3. apply them automatically.
 * Each applied fix is logged to audit_logs by the apply pipeline it reuses.
 */
export async function runWeeklyMaintenance(store: Store, supabase: SupabaseClient): Promise<MaintenanceResult> {
  // 1. Fresh audit
  const { data: audit } = await supabase
    .from('audits').insert({ store_id: store.id, status: 'running' }).select('id').single()
  const auditId: string | null = audit?.id ?? null
  if (!auditId) return { auditId: null, newIssues: 0, generated: 0, applied: 0, failed: 0 }
  await runStoreAudit(store, auditId, supabase)

  // 2. Generate fixes for the new audit (reuse the tested generator via internal auth)
  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const secret = process.env.CRON_SECRET ?? ''
  let generated = 0
  try {
    const res = await fetch(`${base}/api/fixes/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-modify-internal': secret },
      body: JSON.stringify({ audit_id: auditId }),
    })
    if (res.ok) {
      const d = await res.json() as { fixes?: unknown[] }
      generated = (d.fixes ?? []).length
    }
  } catch (e) {
    console.error('[weekly-maintenance] generate failed for', store.shop_domain, String(e))
  }

  // 3. Apply everything pending (logs each action via the apply pipeline)
  const { applied, failed } = await applyPendingFixesForStore(store, supabase)

  const { data: a } = await supabase.from('audits').select('results').eq('id', auditId).maybeSingle()
  const newIssues = Array.isArray(a?.results) ? a.results.length : 0
  return { auditId, newIssues, generated, applied, failed }
}
