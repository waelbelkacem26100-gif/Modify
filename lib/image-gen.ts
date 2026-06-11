import { getProductsDetailed, createProductImage, type ShopifyProduct } from '@/lib/shopify'
import { logAction } from '@/lib/audit-log'
import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export interface ImageGenResult {
  ok: boolean
  productTitle?: string
  before?: string | null   // existing first image URL
  after?: string[]         // resulting gallery (existing + generated), up to 3
  generated?: number
  reason?: string
}

/** Builds two relevant DALL·E 3 prompts from the product's own data. */
function buildPrompts(p: ShopifyProduct): { lifestyle: string; white: string } {
  const name = p.title
  const cat = p.product_type || p.tags?.split(',')[0]?.trim() || 'produit'
  const desc = (p.body_html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240)
  const ctx = desc ? ` Contexte produit : ${desc}.` : ''
  return {
    white: `Professional e-commerce product photography of "${name}" (${cat}), centered on a clean pure white seamless background, soft studio lighting, sharp focus, high detail, realistic, no text, no watermark, no people.${ctx}`,
    lifestyle: `Lifestyle photograph of "${name}" (${cat}) shown in a real, natural everyday setting where it is actually used, warm natural light, appealing and authentic, realistic, no text, no watermark.${ctx}`,
  }
}

/** Generates one image via OpenAI DALL·E 3, returned as base64 (no key → null). */
async function dalle3(prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) { console.warn('[image-gen] OPENAI_API_KEY not set — skipping'); return null }
  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'standard', response_format: 'b64_json' }),
    })
    if (!res.ok) { console.error('[image-gen] DALL·E error', res.status, (await res.text()).slice(0, 200)); return null }
    const data = await res.json() as { data?: { b64_json?: string }[] }
    return data.data?.[0]?.b64_json ?? null
  } catch (e) {
    console.error('[image-gen] DALL·E threw', String(e)); return null
  }
}

/**
 * For a product with too few photos: generates a lifestyle + a white-background
 * photo with DALL·E 3 and uploads them to the Shopify product. Returns the
 * before image and the resulting gallery for the before/after view.
 */
export async function generateProductImages(store: Store, supabase: SupabaseClient, fixId: string): Promise<ImageGenResult> {
  if (!process.env.OPENAI_API_KEY) return { ok: false, reason: 'no_openai_key' }

  const products = await getProductsDetailed(store.shop_domain, store.access_token, 50)
  // Target the product that most needs photos (fewest images).
  const target = [...products].sort((a, b) => (a.images?.length ?? 0) - (b.images?.length ?? 0))[0]
  if (!target) return { ok: false, reason: 'no_product' }

  const before = target.images?.[0]?.src ?? null
  const prompts = buildPrompts(target)
  const newSrcs: string[] = []

  for (const [kind, prompt] of [['lifestyle', prompts.lifestyle], ['white', prompts.white]] as const) {
    const b64 = await dalle3(prompt)
    if (!b64) continue
    try {
      const img = await createProductImage(store.shop_domain, store.access_token, target.id, {
        attachmentBase64: b64,
        filename: `modify-${kind}-${Date.now()}.png`,
        alt: target.title,
      })
      if (img?.src) newSrcs.push(img.src)
    } catch (e) {
      console.error('[image-gen] upload failed', String(e))
    }
  }

  if (newSrcs.length === 0) return { ok: false, productTitle: target.title, before, reason: 'generation_failed' }

  const after = [...(before ? [before] : []), ...newSrcs].slice(0, 3)
  // Persist the before/after for the UI (reusing the screenshot columns: text URLs).
  await supabase.from('fixes').update({
    screenshot_before: before,
    screenshot_after: after.join(','),
    status: 'applied',
    verification_status: 'verified',
  }).eq('id', fixId)

  await logAction(supabase, store.id, 'product_images_generated',
    { product: target.title, generated: newSrcs.length }, 'success', fixId)

  return { ok: true, productTitle: target.title, before, after, generated: newSrcs.length }
}
