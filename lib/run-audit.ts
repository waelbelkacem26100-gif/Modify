import { runFullAuditSequential } from '@/lib/audit/orchestrator'
import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

/**
 * Runs the full store audit for an existing audit row (status 'running').
 *
 * v2 : délègue à l'orchestrateur 6 catégories (lib/audit/) — 6 agents IA
 * spécialisés sur données réelles. Signature conservée pour la maintenance
 * hebdo (cron) qui l'appelle séquentiellement. Le flux interactif
 * (/api/audit/start) utilise la chaîne étape-par-étape pour la contrainte 60s.
 * Always settles the audit row to 'completed' or 'failed'.
 */
export async function runStoreAudit(store: Store, auditId: string, supabase: SupabaseClient): Promise<void> {
  try {
    await runFullAuditSequential(store, auditId, supabase)
  } catch (err) {
    console.error('Audit failed:', err)
    await supabase.from('audits').update({ status: 'failed' }).eq('id', auditId)
  }
}
