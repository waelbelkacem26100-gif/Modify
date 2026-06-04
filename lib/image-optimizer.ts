import {
  getProductsDetailed,
  getProductImages,
  createProductImage,
  deleteProductImage,
} from '@/lib/shopify'
import { headImageSize, compressFromUrl, SIZE_THRESHOLD_BYTES } from '@/lib/image-compress'
import { logAction } from '@/lib/audit-log'
import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

// Transparent estimate: heavier product images slow the page and cost
// conversions. We surface MB saved as the hard number and derive a modest
// €/month estimate from it.
const EUR_PER_MB_SAVED = 5

export interface OptimizeSummary {
  scanned: number
  optimized: number
  failed: number
  savedBytes: number
  savedMb: number
  estimatedImpactEuros: number
}

/**
 * Finds product images over 500 KB, recompresses them with Sharp, and replaces
 * them on Shopify (create compressed copy preserving alt/position/variant
 * associations, then delete the original). Capped per run for serverless time
 * limits. Every replacement is recorded in image_optimizations + audit_logs.
 */
export async function optimizeStoreImages(
  store: Store,
  supabase: SupabaseClient,
  cap = 15
): Promise<OptimizeSummary> {
  const summary: OptimizeSummary = {
    scanned: 0, optimized: 0, failed: 0, savedBytes: 0, savedMb: 0, estimatedImpactEuros: 0,
  }

  const products = await getProductsDetailed(store.shop_domain, store.access_token, 100)

  for (const product of products) {
    if (summary.optimized >= cap) break

    const images = await getProductImages(store.shop_domain, store.access_token, product.id)
    for (const image of images) {
      if (summary.optimized >= cap) break
      if (!image.src) continue
      summary.scanned++

      try {
        const size = await headImageSize(image.src)
        if (size == null || size < SIZE_THRESHOLD_BYTES) continue

        const compressed = await compressFromUrl(image.src)
        if (!compressed) continue // not worth replacing

        const filename = `modify-${product.id}-${image.id}.${compressed.ext}`
        const created = await createProductImage(store.shop_domain, store.access_token, product.id, {
          attachmentBase64: compressed.buffer.toString('base64'),
          filename,
          alt: image.alt,
          position: image.position,
          variantIds: image.variant_ids,
        })

        // Replace succeeded — remove the original heavy image
        await deleteProductImage(store.shop_domain, store.access_token, product.id, image.id)

        await supabase.from('image_optimizations').insert({
          store_id: store.id,
          product_id: product.id,
          old_image_id: image.id,
          new_image_id: created.id,
          old_src: image.src,
          original_bytes: compressed.originalSize,
          new_bytes: compressed.newSize,
          saved_bytes: compressed.savedBytes,
        })

        summary.optimized++
        summary.savedBytes += compressed.savedBytes
        console.log(`[img-opt] ${product.id}/${image.id}: ${(compressed.originalSize / 1024).toFixed(0)}KB → ${(compressed.newSize / 1024).toFixed(0)}KB`)
      } catch (e) {
        summary.failed++
        console.error(`[img-opt] failed ${product.id}/${image.id}:`, String(e))
      }
    }
  }

  summary.savedMb = +(summary.savedBytes / (1024 * 1024)).toFixed(2)
  summary.estimatedImpactEuros = Math.round(summary.savedMb * EUR_PER_MB_SAVED)

  await logAction(supabase, store.id, 'images_optimized', {
    scanned: summary.scanned,
    optimized: summary.optimized,
    failed: summary.failed,
    saved_mb: summary.savedMb,
  }, summary.failed > 0 && summary.optimized === 0 ? 'failed' : 'success')

  return summary
}
