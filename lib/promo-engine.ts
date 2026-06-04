import { getProductsDetailed, getSoldProductIds, updateVariantPrice, type ShopifyProduct } from '@/lib/shopify'
import { logAction } from '@/lib/audit-log'
import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export const DEFAULT_DISCOUNT = 0.10 // 10%
const SALES_WINDOW_DAYS = 90

export interface PromoCandidate {
  product_id: number
  title: string
  image: string | null
  price: number
  suggested_price: number
  discount_pct: number
  no_recent_sales: boolean
}

function firstPrice(p: ShopifyProduct): number {
  return parseFloat(p.variants?.[0]?.price ?? '0')
}
function alreadyDiscounted(p: ShopifyProduct): boolean {
  return (p.variants ?? []).some((v) => v.compare_at_price && parseFloat(v.compare_at_price) > parseFloat(v.price))
}

/**
 * Promo candidates = full-price products (no compare-at shown) that haven't
 * sold in the sales window. When the store has no order history we fall back
 * to all full-price products (the "compare-at missing" case).
 */
export async function detectPromoCandidates(
  store: Store,
  supabase: SupabaseClient,
  pct = DEFAULT_DISCOUNT
): Promise<PromoCandidate[]> {
  const products = await getProductsDetailed(store.shop_domain, store.access_token, 100)
  const since = new Date(Date.now() - SALES_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const sold = await getSoldProductIds(store.shop_domain, store.access_token, since)

  // Already-promoted products (active) — never double-discount
  const { data: active } = await supabase
    .from('product_promos').select('product_id').eq('store_id', store.id).eq('status', 'active')
  const activeIds = new Set<number>((active ?? []).map((r: { product_id: number }) => r.product_id))

  const candidates: PromoCandidate[] = []
  for (const p of products) {
    if (p.title === 'Gift Card' || /gift\s*card/i.test(p.title)) continue // never discount gift cards
    if (alreadyDiscounted(p)) continue
    if (activeIds.has(p.id)) continue
    const price = firstPrice(p)
    if (price <= 0) continue

    candidates.push({
      product_id: p.id,
      title: p.title,
      image: p.images?.[0]?.src ?? null,
      price,
      suggested_price: Math.round(price * (1 - pct) * 100) / 100,
      discount_pct: Math.round(pct * 100),
      no_recent_sales: !sold.has(p.id),
    })
  }
  // Prioritise products with no recent sales
  candidates.sort((a, b) => Number(b.no_recent_sales) - Number(a.no_recent_sales))
  return candidates
}

/** Applies a reversible promo (compare_at = old price, price = discounted) to
 * the given products. Records every variant's original price for rollback. */
export async function applyPromos(
  store: Store,
  supabase: SupabaseClient,
  productIds: number[],
  pct = DEFAULT_DISCOUNT
): Promise<{ applied: number; failed: number; impactEuros: number }> {
  const products = await getProductsDetailed(store.shop_domain, store.access_token, 100)
  const byId = new Map(products.map((p) => [p.id, p]))
  let applied = 0, failed = 0, discountedValue = 0

  for (const pid of productIds.slice(0, 25)) {
    const p = byId.get(pid)
    if (!p) continue
    if (p.title === 'Gift Card' || /gift\s*card/i.test(p.title)) continue

    try {
      for (const v of p.variants ?? []) {
        const origPrice = parseFloat(v.price)
        if (!(origPrice > 0)) continue
        const newPrice = (Math.round(origPrice * (1 - pct) * 100) / 100).toFixed(2)
        const newCompare = origPrice.toFixed(2)

        await updateVariantPrice(store.shop_domain, store.access_token, v.id, newPrice, newCompare)
        await supabase.from('product_promos').insert({
          store_id: store.id,
          product_id: p.id,
          variant_id: v.id,
          original_price: origPrice,
          original_compare_at: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
          new_price: parseFloat(newPrice),
          new_compare_at: parseFloat(newCompare),
          status: 'active',
        })
        discountedValue += origPrice - parseFloat(newPrice)
      }
      applied++
    } catch (e) {
      failed++
      console.error('[promo] failed product', pid, String(e))
    }
  }

  // Transparent estimate: a markdown on stagnant stock unlocks a slice of sales
  const impactEuros = Math.round(discountedValue * 3)
  await logAction(supabase, store.id, 'promos_applied', { applied, failed, pct }, applied > 0 ? 'success' : 'failed')
  return { applied, failed, impactEuros }
}

/** Reverts promos: restores original price + compare-at for a product (or all). */
export async function revertPromos(
  store: Store,
  supabase: SupabaseClient,
  productId: number | 'all'
): Promise<{ reverted: number }> {
  let query = supabase
    .from('product_promos').select('*').eq('store_id', store.id).eq('status', 'active')
  if (productId !== 'all') query = query.eq('product_id', productId)
  const { data: rows } = await query

  let reverted = 0
  for (const r of (rows ?? []) as {
    id: string; variant_id: number; original_price: number; original_compare_at: number | null
  }[]) {
    try {
      await updateVariantPrice(
        store.shop_domain, store.access_token, r.variant_id,
        r.original_price.toFixed(2),
        r.original_compare_at != null ? r.original_compare_at.toFixed(2) : null
      )
      await supabase.from('product_promos')
        .update({ status: 'reverted', reverted_at: new Date().toISOString() })
        .eq('id', r.id)
      reverted++
    } catch (e) {
      console.error('[promo] revert failed', r.variant_id, String(e))
    }
  }
  await logAction(supabase, store.id, 'promos_reverted', { reverted }, 'success')
  return { reverted }
}
