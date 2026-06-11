import {
  getProductsDetailed, getProductImages, updateProductImageAlt,
  updateProductMetafields, setProductMetafield,
} from '@/lib/shopify'
import { generateProductDescription, generateProductFaq } from '@/lib/anthropic'
import { logAction } from '@/lib/audit-log'
import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export interface SeoFixResult {
  productsUpdated: number
  metasUpdated: number
  altsUpdated: number
  faqsGenerated: number
}

/**
 * Applies SEO + GEO corrections across the catalogue (bounded to `limit`
 * products): rewrites & applies SEO meta titles + Google descriptions, fills in
 * missing image alt texts, and generates a structured product FAQ (GEO — helps
 * AI engines cite the page). Best-effort per product; each action is logged.
 */
export async function fixAllSeo(store: Store, supabase: SupabaseClient, limit = 12): Promise<SeoFixResult> {
  const products = await getProductsDetailed(store.shop_domain, store.access_token, 50)
  let productsUpdated = 0, metasUpdated = 0, altsUpdated = 0, faqsGenerated = 0

  for (const p of products.slice(0, limit)) {
    let touched = false

    // 1. SEO meta title + Google description
    try {
      const gen = await generateProductDescription({
        title: p.title,
        product_type: p.product_type ?? '',
        tags: p.tags ?? '',
        variants: (p.variants ?? []).slice(0, 5).map((v) => ({
          title: v.title, price: v.price, option1: v.option1, option2: v.option2,
        })),
        image_count: p.images?.length ?? 0,
      })
      await updateProductMetafields(store.shop_domain, store.access_token, p.id, gen.seo_title, gen.meta_description)
      metasUpdated++; touched = true
    } catch (e) {
      console.error('[seo-fix] meta failed for', p.id, String(e))
    }

    // 2. Missing image alt texts (descriptive, from the product name)
    try {
      const imgs = await getProductImages(store.shop_domain, store.access_token, p.id)
      let i = 0
      for (const img of imgs) {
        i++
        if (!img.alt || !img.alt.trim()) {
          await updateProductImageAlt(store.shop_domain, store.access_token, p.id, img.id,
            i === 1 ? p.title : `${p.title} — photo ${i}`)
          altsUpdated++; touched = true
        }
      }
    } catch (e) {
      console.error('[seo-fix] alt failed for', p.id, String(e))
    }

    // 3. GEO: structured FAQ metafield
    try {
      const faq = await generateProductFaq({ title: p.title, product_type: p.product_type })
      if (faq.length) {
        await setProductMetafield(store.shop_domain, store.access_token, p.id, 'global', 'faq', JSON.stringify(faq), 'json')
        faqsGenerated++
      }
    } catch (e) {
      console.error('[seo-fix] faq failed for', p.id, String(e))
    }

    if (touched) productsUpdated++
  }

  await logAction(supabase, store.id, 'seo_fix_all_applied',
    { productsUpdated, metasUpdated, altsUpdated, faqsGenerated }, 'success')

  return { productsUpdated, metasUpdated, altsUpdated, faqsGenerated }
}
