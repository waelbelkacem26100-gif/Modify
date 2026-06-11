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

/**
 * Generates one image via OpenAI's image API, returned as base64 + exact error.
 * Uses gpt-image-1 (OpenAI's current image model): dall-e-3 is not available on
 * project keys, and gpt-image-1 always returns b64_json (no response_format).
 */
async function dalle3(prompt: string): Promise<{ b64: string | null; error?: string }> {
  const key = process.env.OPENAI_API_KEY
  if (!key) { console.warn('[image-gen] OPENAI_API_KEY not set — skipping'); return { b64: null, error: 'OPENAI_API_KEY absente côté serveur' } }
  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1024x1024', quality: 'medium' }),
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
 * For a product with too few photos: generates 3 photos (white background,
 * lifestyle, detail) with gpt-image-1 and uploads them to the Shopify product.
 * Returns the before image and the resulting gallery for the before/after view.
 */
export async function generateProductImages(store: Store, supabase: SupabaseClient, fixId: string): Promise<ImageGenResult> {
  if (!process.env.OPENAI_API_KEY) return { ok: false, reason: 'no_openai_key' }

  const products = await getProductsDetailed(store.shop_domain, store.access_token, 50)
  // Target the product that most needs photos (fewest images).
  const target = [...products].sort((a, b) => (a.images?.length ?? 0) - (b.images?.length ?? 0))[0]
  if (!target) return { ok: false, reason: 'no_product' }

  const before = target.images?.[0]?.src ?? null
  const prompts = buildPrompts(target)

  // 3 photos par produit : fond blanc, situation réelle (lifestyle), détail.
  // Générées + uploadées en PARALLÈLE pour rester sous la limite de durée Vercel.
  const kinds = [['white', prompts.white], ['lifestyle', prompts.lifestyle], ['detail', prompts.detail]] as const
  const results = await Promise.all(kinds.map(async ([kind, prompt]): Promise<{ src?: string; error?: string }> => {
    const { b64, error } = await dalle3(prompt)
    if (!b64) return { error: error ?? 'OpenAI: image vide' }
    try {
      const img = await createProductImage(store.shop_domain, store.access_token, target.id, {
        attachmentBase64: b64,
        filename: `modify-${kind}-${Date.now()}.png`,
        alt: target.title,
      })
      return img?.src ? { src: img.src } : { error: 'Shopify: image uploadée sans URL renvoyée' }
    } catch (e) {
      console.error('[image-gen] upload failed', String(e))
      return { error: `Upload Shopify échoué: ${String(e)}` }
    }
  }))

  const newSrcs = results.map((r) => r.src).filter((s): s is string => Boolean(s))
  const firstError = results.find((r) => r.error)?.error // exact cause, for diagnostics

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
