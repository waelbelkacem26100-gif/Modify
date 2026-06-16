import { getProductSeoMeta, updateProductMetafields } from '@/lib/shopify'
import { logAction } from '@/lib/audit-log'
import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

const SHOPIFY_API_VERSION = '2026-04'
const hdr = (t: string) => ({ 'X-Shopify-Access-Token': t, 'Content-Type': 'application/json' })

// Fenêtre anti-boucle : un products/update arrivé < 90s après NOTRE écriture est
// l'écho de notre propre optimisation → on l'ignore.
const SELF_WRITE_WINDOW_MS = 90_000

interface SeoApplied { title_tag: string | null; description_tag: string | null; at: number }

async function readSeoApplied(store: Store, pid: number): Promise<SeoApplied | null> {
  try {
    const res = await fetch(
      `https://${store.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/products/${pid}/metafields.json?namespace=modify`,
      { headers: hdr(store.access_token) }
    )
    if (!res.ok) return null
    const mf = ((await res.json()) as { metafields?: { key: string; value: string }[] }).metafields ?? []
    const raw = mf.find((m) => m.key === 'seo_applied')?.value
    return raw ? (JSON.parse(raw) as SeoApplied) : null
  } catch { return null }
}

export interface RegressionResult { restored: boolean; reason: string; changes: string[] }

/**
 * Détection de régression (products/update) : si une app tierce a écrasé / vidé
 * le titre ou la description Google que Modify avait posés, on les restaure.
 * On ne touche JAMAIS la description visible (body_html) : choix du marchand.
 * Garde anti-boucle : on ignore l'écho de nos propres écritures.
 */
export async function checkAndRestore(store: Store, productId: string | number, supabase: SupabaseClient): Promise<RegressionResult> {
  const pid = Number(productId)
  const applied = await readSeoApplied(store, pid)
  if (!applied) return { restored: false, reason: 'jamais optimisé par Modify', changes: [] }

  // Anti-boucle : écho de notre propre écriture
  if (Date.now() - (applied.at ?? 0) < SELF_WRITE_WINDOW_MS) {
    return { restored: false, reason: 'écho de notre propre écriture (ignoré)', changes: [] }
  }

  const current = await getProductSeoMeta(store.shop_domain, store.access_token, pid)
  const titleRegressed = applied.title_tag && current.titleTag !== applied.title_tag
  const descRegressed = applied.description_tag && current.descriptionTag !== applied.description_tag
  if (!titleRegressed && !descRegressed) {
    return { restored: false, reason: 'aucune régression', changes: [] }
  }

  // Restauration des metafields SEO écrasés
  await updateProductMetafields(
    store.shop_domain, store.access_token, pid,
    titleRegressed ? applied.title_tag : null,
    descRegressed ? applied.description_tag : null,
  )
  const changes: string[] = []
  if (titleRegressed) changes.push('Titre Google restauré')
  if (descRegressed) changes.push('Description Google restaurée')

  await logAction(supabase, store.id, 'autopilot_regression_restored',
    { product_id: String(pid), changes, overwritten_by: 'app tierce' }, 'success')

  return { restored: true, reason: 'régression détectée', changes }
}
