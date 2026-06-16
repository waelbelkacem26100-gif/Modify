import { getThemes } from '@/lib/shopify'
import { appBlockForFix, enableProductAppBlock } from '@/lib/shopify-app-blocks'
import { logAction } from '@/lib/audit-log'
import type { Store, Fix } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

/**
 * themes/publish → réinstalle les App Blocks Modify sur le nouveau thème actif.
 * Source de vérité : les correctifs `applied` du marchand qui ont posé un App
 * Block (badges de confiance, urgence, avis, cross-sell…). Idempotent : un block
 * déjà présent n'est pas dupliqué.
 */
export async function reinstallAppBlocks(store: Store, supabase: SupabaseClient): Promise<{ reinstalled: number; specs: string[] }> {
  // Thème principal (le nouveau publié)
  const themes = await getThemes(store.shop_domain, store.access_token)
  const main = themes.find((t) => t.role === 'main') ?? themes[0]
  if (!main) return { reinstalled: 0, specs: [] }

  // Correctifs appliqués de la boutique (tous audits) → ceux avec un App Block
  const { data: audits } = await supabase.from('audits').select('id').eq('store_id', store.id)
  const auditIds = (audits ?? []).map((a: { id: string }) => a.id)
  if (!auditIds.length) return { reinstalled: 0, specs: [] }
  const { data: fixes } = await supabase
    .from('fixes').select('type, title, status').in('audit_id', auditIds).eq('status', 'applied')

  // Specs uniques d'App Blocks à réinstaller
  const specByHandle = new Map<string, ReturnType<typeof appBlockForFix>>()
  for (const f of (fixes ?? []) as Pick<Fix, 'type' | 'title'>[]) {
    const spec = appBlockForFix(f)
    if (spec) specByHandle.set(spec.handle, spec)
  }

  let reinstalled = 0
  const specs: string[] = []
  for (const spec of specByHandle.values()) {
    if (!spec) continue
    try {
      const r = await enableProductAppBlock(store.shop_domain, store.access_token, String(main.id), spec)
      if (r.status === 'applied' || r.status === 'already') { reinstalled++; specs.push(spec.handle) }
    } catch { /* best-effort par block */ }
  }

  if (specs.length) {
    await logAction(supabase, store.id, 'autopilot_theme_reinstalled',
      { theme_id: String(main.id), blocks: reinstalled, specs }, 'success')
  }
  return { reinstalled, specs }
}
