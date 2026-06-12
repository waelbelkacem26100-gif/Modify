import {
  getProduct,
  getProductSeoMeta,
  getProductWithImages,
  updateProductDescription,
  updateProductImageAlt,
  updateProductMetafields,
} from '@/lib/shopify'
import { logAction } from '@/lib/audit-log'
import type { Store, Fix } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

/**
 * Pipeline correctifs v2 — étape BACKUP pour les correctifs Groupe A (API
 * produits : descriptions, textes d'images, titres/descriptions Google).
 *
 * Zéro migration : le snapshot JSON est stocké dans fixes.original_file_content
 * (colonne texte, inutilisée pour les fixes Groupe A puisque file_path est
 * null). Le marqueur __modify_backup le distingue d'un fichier thème.
 *
 * Le pipeline complet est : BACKUP → APPLY → VERIFY (relecture Shopify) →
 * PROOF (screenshot si pertinent) → STATUS ("Corrigé" SSI verify == true).
 */
export interface GroupABackup {
  __modify_backup: 'v1'
  taken_at: string
  products: Array<{
    id: number
    title?: string
    body_html?: string | null
    seo_title?: string | null
    meta_description?: string | null
    images?: { id: number; alt: string | null }[]
  }>
}

export function parseGroupABackup(fix: Pick<Fix, 'file_path' | 'original_file_content'>): GroupABackup | null {
  if (fix.file_path || !fix.original_file_content) return null
  try {
    const parsed = JSON.parse(fix.original_file_content) as GroupABackup
    return parsed.__modify_backup === 'v1' ? parsed : null
  } catch {
    return null
  }
}

/** Persists the snapshot on the fix row (BACKUP step). Never overwrites an
 * existing backup — the FIRST state is the one rollback must restore. */
export async function saveGroupABackup(
  supabase: SupabaseClient, fixId: string, storeId: string, backup: GroupABackup
): Promise<void> {
  const { data: existing } = await supabase
    .from('fixes').select('original_file_content, file_path').eq('id', fixId).single()
  if (existing && !existing.file_path && existing.original_file_content) {
    try {
      if ((JSON.parse(existing.original_file_content) as GroupABackup).__modify_backup === 'v1') return
    } catch { /* not a backup → safe to overwrite */ }
  }
  await supabase.from('fixes').update({ original_file_content: JSON.stringify(backup) }).eq('id', fixId)
  await logAction(supabase, storeId, 'fix_backup_saved',
    { fix_id: fixId, products: backup.products.length }, 'success', fixId)
}

/** Snapshots the CURRENT description + SEO meta of the given products. */
export async function snapshotProductsContent(
  store: Store, productIds: number[]
): Promise<GroupABackup> {
  const products = await Promise.all(productIds.slice(0, 15).map(async (id) => {
    const [p, seo] = await Promise.all([
      getProduct(store.shop_domain, store.access_token, id),
      getProductSeoMeta(store.shop_domain, store.access_token, id),
    ])
    return {
      id,
      title: p?.title,
      body_html: p?.body_html ?? null,
      seo_title: seo.titleTag,
      meta_description: seo.descriptionTag,
    }
  }))
  return { __modify_backup: 'v1', taken_at: new Date().toISOString(), products }
}

/** Snapshots the CURRENT alt texts of the given product images. */
export async function snapshotProductsAlt(
  store: Store, items: { productId: number; imageIds: number[] }[]
): Promise<GroupABackup> {
  const products = await Promise.all(items.slice(0, 25).map(async ({ productId, imageIds }) => {
    const p = await getProductWithImages(store.shop_domain, store.access_token, productId)
    const images = (p?.images ?? [])
      .filter((img) => imageIds.includes(img.id))
      .map((img) => ({ id: img.id, alt: img.alt ?? null }))
    return { id: productId, title: p?.title, images }
  }))
  return { __modify_backup: 'v1', taken_at: new Date().toISOString(), products }
}

export interface RestoreResult { restored: number; failed: number }

/** ROLLBACK Groupe A : restaure les valeurs exactes du snapshot via l'API. */
export async function restoreGroupABackup(
  store: Store, backup: GroupABackup
): Promise<RestoreResult> {
  let restored = 0, failed = 0
  for (const p of backup.products) {
    try {
      // Descriptions + SEO meta (body_html peut légitimement être null/vide :
      // on restaure alors une description vide — l'état d'origine).
      if ('body_html' in p) {
        await updateProductDescription(
          store.shop_domain, store.access_token, p.id, p.body_html ?? '',
          p.seo_title ?? undefined, p.meta_description ?? undefined
        )
      } else if (p.seo_title != null || p.meta_description != null) {
        await updateProductMetafields(
          store.shop_domain, store.access_token, p.id, p.seo_title, p.meta_description
        )
      }
      // Alt texts
      for (const img of p.images ?? []) {
        await updateProductImageAlt(store.shop_domain, store.access_token, p.id, img.id, img.alt ?? '')
      }
      restored++
    } catch (e) {
      console.error('[fix-pipeline] restore failed for product', p.id, String(e))
      failed++
    }
  }
  return { restored, failed }
}
