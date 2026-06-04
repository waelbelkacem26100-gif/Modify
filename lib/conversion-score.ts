import type { ShopifyProduct } from '@/lib/shopify'

export interface ProductScore {
  score: number // 0–10, one decimal
  reasons: string[] // what's missing / good
}

/**
 * Per-product conversion score out of 10, from real catalogue attributes.
 * Pure function — no API calls, no side effects.
 */
export function computeProductScore(product: ShopifyProduct): ProductScore {
  const reasons: string[] = []
  let score = 0

  // Description (max 3)
  const descLen = (product.body_html ?? '').replace(/<[^>]+>/g, '').trim().length
  if (descLen >= 120) { score += 3 }
  else if (descLen >= 30) { score += 1.5; reasons.push('Description trop courte') }
  else { reasons.push('Description manquante') }

  // Images (max 2)
  const imgCount = product.images?.length ?? 0
  if (imgCount >= 3) { score += 2 }
  else if (imgCount >= 1) { score += 1; reasons.push('Ajouter plus d\'images (3+)') }
  else { reasons.push('Aucune image') }

  // Alt text (max 1.5)
  const imgs = product.images ?? []
  const withAlt = imgs.filter((i) => i.alt && i.alt.trim()).length
  if (imgs.length > 0) {
    const ratio = withAlt / imgs.length
    score += ratio * 1.5
    if (ratio < 1) reasons.push('Alt text incomplet sur les images')
  }

  // On sale / compare-at (max 1.5)
  const onSale = (product.variants ?? []).some(
    (v) => v.compare_at_price && parseFloat(v.compare_at_price) > parseFloat(v.price)
  )
  if (onSale) { score += 1.5 }
  else { reasons.push('Aucune promo affichée (compare-at)') }

  // Variant choice (max 1)
  if ((product.variants?.length ?? 0) >= 2) { score += 1 }

  // Base for being a real, titled product (max 1)
  if (product.title?.trim()) score += 1

  return { score: Math.round(Math.min(10, score) * 10) / 10, reasons }
}
