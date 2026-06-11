import { getProductsDetailed, createProductImage, type ShopifyProduct } from '@/lib/shopify'
import { logAction } from '@/lib/audit-log'
import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

// gpt-image-1, quality 'medium', 1024x1024 ≈ $0.04 / image. Used for cost logging.
const COST_PER_IMAGE_USD = 0.04
// Filename marker that identifies a photo WE generated (vs the merchant's own).
const MODIFY_TAG = 'modify-'
// A product is "done" once it has at least this many photos.
const MIN_PHOTOS = 3

// Result for the single-shot / looping callers (apply route, weekly cron).
export interface ImageGenResult {
  ok: boolean
  productTitle?: string
  before?: string | null
  after?: string[]
  generated?: number
  reason?: string
  detail?: string
}

// Progress for the batched, client-polled flow (one batch per call).
export interface ImageGenProgress {
  ok: boolean
  done: boolean              // every product now has its photos
  total: number              // products that needed photos (done + remaining)
  processed: number          // products whose photos are now on Shopify
  generatedThisBatch: number // images uploaded in this call
  costUsdThisBatch: number   // estimated $ spent in this call
  current?: string           // last product processed in this batch
  before?: string | null
  after?: string[]
  reason?: string
  detail?: string
}

/** Builds three product-specific gpt-image-1 prompts from the product's own data. */
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
async function gptImage(prompt: string): Promise<{ b64: string | null; error?: string }> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return { b64: null, error: 'OPENAI_API_KEY absente côté serveur' }
  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1024x1024', quality: 'medium' }),
    })
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300)
      console.error('[image-gen] OpenAI error', res.status, body)
      return { b64: null, error: `OpenAI ${res.status}: ${body}` }
    }
    const data = await res.json() as { data?: { b64_json?: string }[] }
    const b64 = data.data?.[0]?.b64_json ?? null
    return { b64, error: b64 ? undefined : 'OpenAI: réponse sans image (b64_json vide)' }
  } catch (e) {
    console.error('[image-gen] OpenAI threw', String(e))
    return { b64: null, error: `OpenAI exception: ${String(e)}` }
  }
}

function hasModifyImage(p: ShopifyProduct): boolean {
  return (p.images ?? []).some((i) => (i.src ?? '').includes(MODIFY_TAG))
}

/** Generates + uploads the 3 photos for ONE product (sequential to cap concurrency). */
async function generateForProduct(store: Store, product: ShopifyProduct): Promise<{ srcs: string[]; error?: string }> {
  const prompts = buildPrompts(product)
  const kinds = [['white', prompts.white], ['lifestyle', prompts.lifestyle], ['detail', prompts.detail]] as const
  const srcs: string[] = []
  let firstError: string | undefined
  for (const [kind, prompt] of kinds) {
    const { b64, error } = await gptImage(prompt)
    if (!b64) { if (!firstError && error) firstError = error; continue }
    try {
      const img = await createProductImage(store.shop_domain, store.access_token, product.id, {
        attachmentBase64: b64, filename: `modify-${kind}-${Date.now()}.png`, alt: product.title,
      })
      if (img?.src) srcs.push(img.src)
      else if (!firstError) firstError = 'Shopify: image uploadée sans URL renvoyée'
    } catch (e) {
      console.error('[image-gen] upload failed', product.id, String(e))
      if (!firstError) firstError = `Upload Shopify échoué: ${String(e)}`
    }
  }
  return { srcs, error: srcs.length === 0 ? firstError : undefined }
}

/** Marks the fix applied + sets a representative before/after gallery. */
async function finalizeApplied(store: Store, supabase: SupabaseClient, fixId: string, products: ShopifyProduct[]) {
  const rep = products.find(hasModifyImage)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = { status: 'applied', verification_status: 'verified' }
  if (rep) {
    const orig = (rep.images ?? []).find((i) => !(i.src ?? '').includes(MODIFY_TAG))
    const modifyImgs = (rep.images ?? []).filter((i) => (i.src ?? '').includes(MODIFY_TAG)).map((i) => i.src)
    update.screenshot_before = orig?.src ?? rep.images?.[0]?.src ?? null
    update.screenshot_after = modifyImgs.slice(0, 3).join(',')
  }
  await supabase.from('fixes').update(update).eq('id', fixId)
  await logAction(supabase, store.id, 'all_product_images_generated',
    { products_with_photos: products.filter(hasModifyImage).length }, 'success', fixId)
}

/**
 * Processes ONE batch of products (default 3) that still have fewer than 3
 * photos: for each, generates 3 photos (white bg, lifestyle, detail) with
 * gpt-image-1 and uploads them to Shopify. Shopify is the source of truth, so
 * the operation is idempotent and resumable — the client polls until `done`.
 * The fix is only marked applied when EVERY product has its photos.
 */
export async function generateProductImagesBatch(
  store: Store, supabase: SupabaseClient, fixId: string, batchSize = 3,
): Promise<ImageGenProgress> {
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, done: false, total: 0, processed: 0, generatedThisBatch: 0, costUsdThisBatch: 0, reason: 'no_openai_key' }
  }

  const products = await getProductsDetailed(store.shop_domain, store.access_token, 250)
  const targets = products.filter((p) => (p.images?.length ?? 0) < MIN_PHOTOS)
  const alreadyDone = products.filter((p) => (p.images?.length ?? 0) >= MIN_PHOTOS && hasModifyImage(p)).length
  const total = targets.length + alreadyDone

  if (products.length === 0) return { ok: false, done: false, total: 0, processed: 0, generatedThisBatch: 0, costUsdThisBatch: 0, reason: 'no_product' }

  // Nothing left to do → finished.
  if (targets.length === 0) {
    await finalizeApplied(store, supabase, fixId, products)
    return { ok: true, done: true, total, processed: total, generatedThisBatch: 0, costUsdThisBatch: 0 }
  }

  // Process up to `batchSize` products in parallel (max concurrency).
  const batch = targets.slice(0, batchSize)
  const results = await Promise.all(batch.map((p) => generateForProduct(store, p)))

  const generatedThisBatch = results.reduce((s, r) => s + r.srcs.length, 0)
  const succeededProducts = results.filter((r) => r.srcs.length >= 1).length
  const costUsdThisBatch = +(generatedThisBatch * COST_PER_IMAGE_USD).toFixed(2)
  const firstError = results.find((r) => r.error)?.error

  console.log(`[image-gen] batch ${succeededProducts}/${batch.length} produits, ${generatedThisBatch} images, ~$${costUsdThisBatch} (déjà faits: ${alreadyDone}/${total})`)

  // Reference before/after gallery from the first product that succeeded.
  const okIdx = results.findIndex((r) => r.srcs.length > 0)
  if (okIdx >= 0) {
    await supabase.from('fixes').update({
      screenshot_before: batch[okIdx].images?.[0]?.src ?? null,
      screenshot_after: results[okIdx].srcs.slice(0, 3).join(','),
    }).eq('id', fixId)
  }

  await logAction(supabase, store.id, 'product_images_generated',
    { batch: batch.map((p) => p.title), generated: generatedThisBatch, cost_usd: costUsdThisBatch }, 'success', fixId)

  // No progress at all this batch → stop (avoids an infinite client loop).
  if (succeededProducts === 0) {
    return { ok: false, done: false, total, processed: alreadyDone, generatedThisBatch, costUsdThisBatch, reason: 'generation_failed', detail: firstError }
  }

  const remainingAfter = targets.length - succeededProducts
  const processed = total - remainingAfter
  const done = remainingAfter <= 0
  if (done) await finalizeApplied(store, supabase, fixId, products)

  return { ok: true, done, total, processed, generatedThisBatch, costUsdThisBatch, current: batch[batch.length - 1]?.title }
}

/**
 * Single-call wrapper for non-interactive callers (apply route / weekly cron):
 * loops batches until every product is done or a soft time budget is reached.
 */
export async function generateProductImages(store: Store, supabase: SupabaseClient, fixId: string): Promise<ImageGenResult> {
  const start = Date.now()
  let totalGen = 0
  let last: ImageGenProgress | null = null
  // Stay under the function's maxDuration; cron can re-call to finish the rest.
  while (Date.now() - start < 250_000) {
    const p = await generateProductImagesBatch(store, supabase, fixId, 3)
    last = p
    totalGen += p.generatedThisBatch
    if (!p.ok) return { ok: false, reason: p.reason, detail: p.detail, generated: totalGen }
    if (p.done) break
  }
  return { ok: true, generated: totalGen, productTitle: last?.current }
}
