import { getProductsDetailed } from '@/lib/shopify'
import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export type ScreenshotWhen = 'before' | 'after'

/**
 * Captures a screenshot of `url` via ScreenshotOne (free tier). Returns the JPEG
 * bytes, or null if the API key is missing or the capture fails (tolerant — the
 * fix still applies without a screenshot).
 */
export async function captureScreenshot(url: string): Promise<ArrayBuffer | null> {
  const key = process.env.SCREENSHOTONE_ACCESS_KEY
  if (!key) { console.warn('[screenshot] SCREENSHOTONE_ACCESS_KEY not set — skipping'); return null }
  const params = new URLSearchParams({
    access_key: key,
    url,
    format: 'jpg',
    image_quality: '78',
    viewport_width: '1280',
    viewport_height: '1400',
    device_scale_factor: '1',
    full_page: 'false',
    block_cookie_banners: 'true',
    block_chats: 'true',
    cache: 'false',
  })
  try {
    const res = await fetch(`https://api.screenshotone.com/take?${params}`)
    if (!res.ok) { console.error('[screenshot] API error', res.status, (await res.text()).slice(0, 200)); return null }
    return await res.arrayBuffer()
  } catch (e) {
    console.error('[screenshot] capture threw', String(e))
    return null
  }
}

/** A representative product page URL for the store (first active product). */
export async function productUrlForStore(store: Store): Promise<string> {
  try {
    const products = await getProductsDetailed(store.shop_domain, store.access_token, 1)
    const handle = products[0]?.handle
    if (handle) return `https://${store.shop_domain}/products/${handle}`
  } catch { /* fall through */ }
  return `https://${store.shop_domain}`
}

/** Uploads JPEG bytes to the public `screenshots` bucket and returns the URL. */
async function uploadScreenshot(supabase: SupabaseClient, bytes: ArrayBuffer, path: string): Promise<string | null> {
  const { error } = await supabase.storage.from('screenshots').upload(path, bytes, {
    contentType: 'image/jpeg', upsert: true,
  })
  if (error) { console.error('[screenshot] upload failed', error.message); return null }
  const { data } = supabase.storage.from('screenshots').getPublicUrl(path)
  return data?.publicUrl ?? null
}

/** True when the storefront is password-protected (a screenshot would only show
 * the password page — never store that as "proof"). */
async function storefrontIsGated(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } })
    return /\/password/.test(res.url)
  } catch {
    return true
  }
}

/**
 * Captures the store's product page and stores it on the fix as the before/after
 * screenshot. Called by the apply flow (orchestrated by the merchant's single
 * "Appliquer" click — no manual action). Best-effort.
 */
export async function captureFixScreenshot(
  store: Store, fixId: string, when: ScreenshotWhen, supabase: SupabaseClient
): Promise<string | null> {
  const url = await productUrlForStore(store)
  // Honnêteté : vitrine sous mot de passe → pas de fausse "preuve".
  if (await storefrontIsGated(url)) {
    console.warn('[screenshot] storefront password-protected — skipping', url)
    return null
  }
  const bytes = await captureScreenshot(url)
  if (!bytes) return null
  const publicUrl = await uploadScreenshot(supabase, bytes, `${store.id}/${fixId}-${when}-${Date.now()}.jpg`)
  if (!publicUrl) return null
  const col = when === 'before' ? 'screenshot_before' : 'screenshot_after'
  await supabase.from('fixes').update({ [col]: publicUrl }).eq('id', fixId)
  return publicUrl
}
