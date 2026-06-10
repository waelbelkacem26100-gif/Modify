import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export interface PendingFix { id: string; title: string; impact_euros: number }

/** Pending fixes for a store's latest audit (what the weekly email lists). */
export async function getPendingFixes(store: Store, supabase: SupabaseClient): Promise<PendingFix[]> {
  const { data: audit } = await supabase
    .from('audits').select('id').eq('store_id', store.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!audit) return []
  const { data: fixes } = await supabase
    .from('fixes').select('id, title, impact_euros').eq('audit_id', audit.id).eq('status', 'pending')
  return (fixes ?? []) as PendingFix[]
}

/**
 * Applies every pending fix for a store by calling Modify's own apply endpoint
 * with the internal secret — reusing the exact, tested apply pipeline (theme app
 * blocks, product API, Liquid) instead of duplicating it. Used by the weekly
 * cron (auto mode) and the 1-click approval link (approval mode).
 */
export async function applyPendingFixesForStore(
  store: Store, supabase: SupabaseClient
): Promise<{ applied: number; failed: number }> {
  const pending = await getPendingFixes(store, supabase)
  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const secret = process.env.CRON_SECRET ?? ''
  let applied = 0, failed = 0
  for (const f of pending) {
    try {
      const res = await fetch(`${base}/api/fixes/apply`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-modify-internal': secret },
        body: JSON.stringify({ fix_id: f.id, confirm_high_risk: true }),
      })
      if (res.ok) applied++; else failed++
    } catch {
      failed++
    }
  }
  return { applied, failed }
}
