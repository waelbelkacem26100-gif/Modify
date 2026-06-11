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
  detail?: string          // exact DALL·E / Shopify error, surfaced for diagnostics
}

/** Builds three relevant DALL·E 3 prompts from the product's own data. */
function buildPrompts(p: ShopifyProduct): { white: string; lifestyle: string; detail: string } {
  const name = p.title
  const cat = p.product_type || p.tags?.split(',')[0]?.trim() || 'produit'
  const desc = (p.body_html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240)
  const ctx = desc ? ` Contexte produit : ${desc}.` : ''
  return {
    white: `Professional e-commerce product photography of "${name}" (${cat}), centered on a clean pure white seamless background, soft studio lighting, sharp focus, high detail, realistic, no text, no watermark, no people.${ctx}`,
    lifestyle: `Lifestyle photograph of "${name}" (${cat}) shown in a real, natural everyday setting where it is actually used, warm natural light, appealing and authentic, realistic, no text, no watermark.${ctx}`,
    detail: `Close-up macro detail photograph of "${name}" (${cat}) highlighting its texture, material and finish, professional studio lighting, very sharp focus, clean neutral background, realistic, no text, no watermark.${ctx}`,
  }
}

/** Generates one image via OpenAI DALL·E 3, returned as base64 + exact error. */
async function dalle3(prompt: string): Promise<{ b64: string | null; error?: string }> {
  const key = process.env.OPENAI_API_KEY
  if (!key) { console.warn('[image-gen] OPENAI_API_KEY not set — skipping'); return { b64: null, error: 'OPENAI_API_KEY absente côté serveur' } }
  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'standard', response_format: 'b64_json' }),
    })
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300)
      console.error('[image-gen] DALL·E error', res.status, body)
      return { b64: null, error: `OpenAI ${res.status}: ${body}` }
    }
    const data = await res.json() as { data?: { b64_json?: string }[] }
    const b64 = data.data?.[0]?.b64_json ?? null
    return { b64, error: b64 ? undefined : 'OpenAI: réponse sans image (b64_json vide)' }
  } catch (e) {
    console.error('[image-gen] DALL·E threw', String(e))
    return { b64: null, error: `OpenAI exception: ${String(e)}` }
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
  let firstError: string | undefined // exact cause of the first failure, for diagnostics

  // 3 photos par produit : fond blanc, situation réelle (lifestyle), détail.
  for (const [kind, prompt] of [['white', prompts.white], ['lifestyle', prompts.lifestyle], ['detail', prompts.detail]] as const) {
    const { b64, error } = await dalle3(prompt)
    if (!b64) { if (!firstError && error) firstError = error; continue }
    try {
      const img = await createProductImage(store.shop_domain, store.access_token, target.id, {
        attachmentBase64: b64,
        filename: `modify-${kind}-${Date.now()}.png`,
        alt: target.title,
      })
      if (img?.src) newSrcs.push(img.src)
      else if (!firstError) firstError = 'Shopify: image uploadée sans URL renvoyée'
    } catch (e) {
      console.error('[image-gen] upload failed', String(e))
      if (!firstError) firstError = `Upload Shopify échoué: ${String(e)}`
    }
  }

  // Honnêteté : on ne marque "appliqué" QUE si de vraies images sont sur Shopify.
  if (newSrcs.length === 0) return { ok: false, productTitle: target.title, before, reason: 'generation_failed', detail: firstError }

  const after = newSrcs.slice(0, 3) // les photos réellement générées et uploadées
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
