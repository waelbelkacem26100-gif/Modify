import crypto from 'crypto'

export const SHOPIFY_API_VERSION = '2025-01'

function shopifyHeaders(accessToken: string): HeadersInit {
  return {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json',
  }
}

// Must stay in sync with [access_scopes] in shopify.app.toml.
export const SHOPIFY_SCOPES = [
  'read_themes',
  'write_themes',
  'read_products',
  'write_products',
  'read_content',
  'write_content',
  'read_analytics',
  'read_orders',
].join(',')

export function buildInstallUrl(shop: string, state: string): string {
  const redirectUri = encodeURIComponent(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/callback`
  )

  return (
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${process.env.SHOPIFY_CLIENT_ID}` +
    `&scope=${SHOPIFY_SCOPES}` +
    `&redirect_uri=${redirectUri}` +
    `&state=${state}`
  )
}

export interface TokenResult {
  accessToken: string
  // Shopify now issues EXPIRING offline tokens; null for legacy non-expiring.
  expiresIn: number | null
  // Refresh token (only present with expiring offline tokens) — lets us mint a
  // fresh access token server-side without any merchant interaction.
  refreshToken: string | null
}

interface TokenResponse {
  access_token?: string
  expires_in?: number
  refresh_token?: string
  error?: string
  error_description?: string
}

function parseTokenResponse(status: number, text: string, label = 'oauth'): TokenResult {
  let data: TokenResponse = {}
  try { data = JSON.parse(text) } catch { /* non-JSON error body */ }

  // Log EXACTLY what Shopify returned, with secrets redacted. This is the ground
  // truth for what token type Shopify issues. Offline tokens (which we request)
  // come back with ONLY `access_token` + `scope` — by design they never carry
  // `expires_in` or `refresh_token` (Shopify offline tokens do not expire, and
  // Shopify OAuth has no refresh-token grant at all).
  const redacted: Record<string, unknown> = { ...(data as Record<string, unknown>) }
  if (typeof redacted.access_token === 'string') {
    redacted.access_token = `${redacted.access_token.slice(0, 8)}…(${redacted.access_token.length} chars)`
  }
  if (typeof redacted.refresh_token === 'string') {
    redacted.refresh_token = `present(${redacted.refresh_token.length} chars)`
  }
  console.log(`[shopify token ${label}] HTTP ${status} | keys=[${Object.keys(data).join(',')}] | payload=`,
    JSON.stringify(redacted))

  if (status >= 400 || !data.access_token) {
    const detail = data.error_description ?? data.error ?? text.slice(0, 300)
    throw new Error(`Token request failed (HTTP ${status}): ${detail}`)
  }
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? null,
    refreshToken: data.refresh_token ?? null,
  }
}

export async function exchangeCodeForToken(shop: string, code: string): Promise<TokenResult> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      code,
    }),
  })
  return parseTokenResponse(res.status, await res.text(), 'authorization_code')
}

// Mints a fresh access token from a refresh token (no browser / merchant needed).
export async function refreshAccessToken(shop: string, refreshToken: string): Promise<TokenResult> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  const result = parseTokenResponse(res.status, await res.text(), 'refresh_token')
  // Shopify may rotate the refresh token; keep the old one if it didn't.
  return { ...result, refreshToken: result.refreshToken ?? refreshToken }
}

/**
 * Token Exchange: trades a Shopify session token for an EXPIRING offline access
 * token. This is the only way to obtain expiring tokens (the authorization-code
 * grant only yields the now-rejected non-expiring ones).
 */
export async function exchangeSessionToken(shop: string, sessionToken: string): Promise<TokenResult> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token: sessionToken,
      subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
      requested_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token',
    }),
  })
  return parseTokenResponse(res.status, await res.text(), 'token_exchange')
}

export function validateHmac(query: Record<string, string>): boolean {
  const { hmac, signature: _sig, ...params } = query

  if (!hmac) return false

  const message = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')

  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET!)
    .update(message)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hmac, 'hex'))
  } catch {
    return false
  }
}

/**
 * Verifies a Shopify webhook signature: base64 HMAC-SHA256 of the RAW request
 * body, keyed with the app's client secret, compared against the
 * X-Shopify-Hmac-Sha256 header. Must be given the unparsed body.
 */
export function verifyWebhookHmac(rawBody: string, hmacHeader: string | null): boolean {
  if (!hmacHeader) return false
  const secret = process.env.SHOPIFY_CLIENT_SECRET
  if (!secret) return false

  const digest = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64')
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader))
  } catch {
    return false
  }
}

export async function getShopInfo(shopDomain: string, accessToken: string) {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/shop.json`,
    { headers: shopifyHeaders(accessToken) }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`shop.json failed (HTTP ${res.status}): ${body.slice(0, 200)}`)
  }
  const data = (await res.json()) as { shop?: Record<string, unknown> }
  return data.shop ?? {}
}

export async function getThemes(shopDomain: string, accessToken: string) {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/themes.json`,
    { headers: shopifyHeaders(accessToken) }
  )
  const data = (await res.json()) as { themes: ShopifyTheme[] }
  return data.themes
}

export async function getThemeAssets(shopDomain: string, accessToken: string, themeId: string) {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/themes/${themeId}/assets.json`,
    { headers: shopifyHeaders(accessToken) }
  )
  const data = (await res.json()) as { assets: ShopifyAsset[] }
  return data.assets
}

export async function getThemeAsset(
  shopDomain: string,
  accessToken: string,
  themeId: string,
  key: string
) {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(key)}`,
    { headers: shopifyHeaders(accessToken) }
  )
  const data = (await res.json()) as { asset: ShopifyAsset }
  return data.asset
}

/**
 * Thrown when Shopify refuses theme-file writes. Since 2024 the REST Asset
 * write endpoint returns 404 and the GraphQL themeFilesUpsert returns
 * ACCESS_DENIED unless the app holds a Shopify-granted theme-files exemption
 * (write_themes scope alone is no longer sufficient).
 */
export class ThemeWriteForbiddenError extends Error {
  constructor(public status: number, public detail: string) {
    super(`THEME_WRITE_FORBIDDEN (${status}): ${detail}`)
    this.name = 'ThemeWriteForbiddenError'
  }
}

/**
 * Thrown when Shopify rejects a section asset write (HTTP 422) because the file
 * uses the new THEME BLOCKS architecture: its {% schema %} `presets` reference
 * block types (e.g. "group", "email-signup") defined under /blocks/. The REST
 * Assets API re-validates the schema in isolation and can't resolve those theme
 * blocks, so it rejects the write as "undefined block type" — even for a
 * byte-identical re-upload. Themes like Horizon cannot have such sections edited
 * via the REST Assets API at all. This is distinct from a permissions problem.
 */
export class ThemeBlocksIncompatibleError extends Error {
  constructor(public status: number, public detail: string) {
    super(`THEME_BLOCKS_INCOMPATIBLE (${status}): ${detail}`)
    this.name = 'ThemeBlocksIncompatibleError'
  }
}

// Signature of the theme-blocks validation rejection in Shopify's 422 body.
function isThemeBlocksRejection(body: string): boolean {
  return /undefined block type|invalid block type|Invalid preset/i.test(body)
}

export async function updateThemeAsset(
  shopDomain: string,
  accessToken: string,
  themeId: string,
  key: string,
  value: string
) {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/themes/${themeId}/assets.json`,
    {
      method: 'PUT',
      headers: shopifyHeaders(accessToken),
      body: JSON.stringify({ asset: { key, value } }),
    }
  )
  if (!res.ok) {
    const body = await res.text()
    // 404/403 on a theme asset PUT = Shopify blocks theme-file writes (deprecated
    // REST endpoint / missing theme-files exemption), not a transient error.
    if (res.status === 404 || res.status === 403) {
      throw new ThemeWriteForbiddenError(res.status, body.slice(0, 200))
    }
    // 422 with a block/preset validation message = the section uses theme blocks
    // the REST Assets API can't resolve (e.g. Horizon's footer). Unwriteable by
    // design — surface it specifically instead of as a generic failure.
    if (res.status === 422 && isThemeBlocksRejection(body)) {
      throw new ThemeBlocksIncompatibleError(res.status, body.slice(0, 300))
    }
    throw new Error(`Shopify PUT asset ${key} failed ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

export async function getProducts(shopDomain: string, accessToken: string, limit = 20) {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=${limit}&fields=id,title,body_html,images,variants,status`,
    { headers: shopifyHeaders(accessToken) }
  )
  const data = (await res.json()) as { products: ShopifyProduct[] }
  return data.products
}

export async function getOrdersForDateRange(
  shopDomain: string,
  accessToken: string,
  dateMin: string,
  dateMax: string
): Promise<ShopifyOrder[]> {
  const params = new URLSearchParams({
    status: 'any',
    financial_status: 'paid',
    created_at_min: dateMin,
    created_at_max: dateMax,
    limit: '250',
    fields: 'id,total_price,created_at',
  })

  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/orders.json?${params}`,
    { headers: shopifyHeaders(accessToken) }
  )
  const data = (await res.json()) as { orders: ShopifyOrder[] }
  return data.orders ?? []
}

export interface ShopifyOrder {
  id: number
  total_price: string
  created_at: string
}

export async function createBackupTheme(
  shopDomain: string,
  accessToken: string,
  name?: string
): Promise<ShopifyTheme> {
  const date = new Date().toISOString().split('T')[0]
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/themes.json`,
    {
      method: 'POST',
      headers: shopifyHeaders(accessToken),
      body: JSON.stringify({
        theme: { name: name ?? `Modify Backup ${date}`, role: 'unpublished' },
      }),
    }
  )
  const data = (await res.json()) as { theme: ShopifyTheme }
  return data.theme
}

// ─── Full theme duplication (for safe, promotable Group C previews) ─────────────

const TEXT_ASSET_RE = /\.(liquid|json|js|css|scss|svg|txt|md)$/i

async function putAssetValue(
  shopDomain: string, accessToken: string, themeId: string, key: string, value: string
): Promise<void> {
  await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/themes/${themeId}/assets.json`,
    { method: 'PUT', headers: shopifyHeaders(accessToken), body: JSON.stringify({ asset: { key, value } }) }
  )
}

async function putAssetSrc(
  shopDomain: string, accessToken: string, themeId: string, key: string, src: string
): Promise<void> {
  await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/themes/${themeId}/assets.json`,
    { method: 'PUT', headers: shopifyHeaders(accessToken), body: JSON.stringify({ asset: { key, src } }) }
  )
}

/**
 * Creates an unpublished theme that is a FULL copy of `sourceThemeId`.
 * Text assets are copied by value; binary assets (images, fonts) by `src`
 * referencing the source theme's CDN URL. Best-effort: per-asset failures are
 * logged and skipped. Used for Group C previews so the theme can later be
 * promoted to main WITHOUT missing files.
 */
export async function duplicateTheme(
  shopDomain: string,
  accessToken: string,
  sourceThemeId: string,
  name: string
): Promise<{ themeId: string; copied: number; failed: number }> {
  const created = await createBackupTheme(shopDomain, accessToken, name)
  const newId = String(created.id)

  const assets = await getThemeAssets(shopDomain, accessToken, sourceThemeId)
  let copied = 0
  let failed = 0

  for (const a of assets) {
    try {
      if (TEXT_ASSET_RE.test(a.key)) {
        const full = await getThemeAsset(shopDomain, accessToken, sourceThemeId, a.key)
        if (full?.value != null) {
          await putAssetValue(shopDomain, accessToken, newId, a.key, full.value)
          copied++
        } else if (a.public_url) {
          await putAssetSrc(shopDomain, accessToken, newId, a.key, a.public_url)
          copied++
        }
      } else if (a.public_url) {
        await putAssetSrc(shopDomain, accessToken, newId, a.key, a.public_url)
        copied++
      }
    } catch (e) {
      failed++
      console.error('[duplicateTheme] skip', a.key, '→', String(e))
    }
  }

  console.log(`[duplicateTheme] ${newId} ← ${sourceThemeId}: ${copied} copied, ${failed} failed`)
  return { themeId: newId, copied, failed }
}

/**
 * Safety guard before promoting a preview theme to main: confirms the theme
 * has the critical files a published theme needs. Prevents promoting an
 * incomplete duplicate (which would break the storefront).
 */
export async function themeHasCoreFiles(
  shopDomain: string,
  accessToken: string,
  themeId: string
): Promise<boolean> {
  const layout = await getThemeAsset(shopDomain, accessToken, themeId, 'layout/theme.liquid')
  if (!layout?.value || layout.value.length < 100) return false
  if (!/<\/head>/i.test(layout.value) || !/<\/body>/i.test(layout.value)) return false
  return true
}

export async function verifyThemeAsset(
  shopDomain: string,
  accessToken: string,
  themeId: string,
  filePath: string,
  expectedSnippet: string
): Promise<boolean> {
  try {
    const asset = await getThemeAsset(shopDomain, accessToken, themeId, filePath)
    if (!asset?.value) return false
    // Check first 200 chars of the expected snippet to account for minor whitespace diffs
    return asset.value.includes(expectedSnippet.trim().slice(0, 200))
  } catch {
    return false
  }
}

export async function promoteThemeToMain(
  shopDomain: string,
  accessToken: string,
  themeId: string
): Promise<void> {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/themes/${themeId}.json`,
    {
      method: 'PUT',
      headers: shopifyHeaders(accessToken),
      body: JSON.stringify({ theme: { id: parseInt(themeId), role: 'main' } }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to promote theme ${themeId}: ${err}`)
  }
}

export interface ShopifyTheme {
  id: number
  name: string
  role: 'main' | 'unpublished' | 'demo'
  created_at: string
  updated_at: string
}

export interface ShopifyAsset {
  key: string
  value?: string
  public_url?: string
  size?: number
  content_type?: string
}

export interface ShopifyProduct {
  id: number
  title: string
  body_html: string
  tags: string
  handle: string
  product_type: string
  images: Array<{ id: number; src: string; alt?: string }>
  variants: Array<{
    id: number
    title: string
    price: string
    compare_at_price: string | null
    option1?: string
    option2?: string
    option3?: string
  }>
  status: string
}

export async function getProduct(
  shopDomain: string,
  accessToken: string,
  productId: number
): Promise<ShopifyProduct | null> {
  try {
    const res = await fetch(
      `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}.json?fields=id,title,body_html`,
      { headers: shopifyHeaders(accessToken) }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { product?: ShopifyProduct }
    return data.product ?? null
  } catch {
    return null
  }
}

export async function getProductsDetailed(
  shopDomain: string,
  accessToken: string,
  limit = 50
): Promise<ShopifyProduct[]> {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=${limit}&status=active`,
    { headers: shopifyHeaders(accessToken) }
  )
  const data = (await res.json()) as { products: ShopifyProduct[] }
  return data.products ?? []
}

export async function updateProductDescription(
  shopDomain: string,
  accessToken: string,
  productId: number,
  bodyHtml: string,
  seoTitle?: string | null,
  metaDescription?: string | null
): Promise<void> {
  interface Metafield {
    key: string
    value: string
    type: string
    namespace: string
  }
  interface ProductUpdate {
    id: number
    body_html: string
    metafields?: Metafield[]
  }

  const productUpdate: ProductUpdate = { id: productId, body_html: bodyHtml }
  const metafields: Metafield[] = []

  if (seoTitle) {
    metafields.push({ key: 'title_tag', value: seoTitle, type: 'single_line_text_field', namespace: 'global' })
  }
  if (metaDescription) {
    metafields.push({ key: 'description_tag', value: metaDescription, type: 'single_line_text_field', namespace: 'global' })
  }
  if (metafields.length > 0) productUpdate.metafields = metafields

  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}.json`,
    {
      method: 'PUT',
      headers: shopifyHeaders(accessToken),
      body: JSON.stringify({ product: productUpdate }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Shopify PUT /products/${productId} failed: ${err}`)
  }
}

// ─── Group A handlers: image alt text + SEO metafields ──────────────────────────

/** Sets an arbitrary product metafield (used for GEO FAQ data). Best-effort. */
export async function setProductMetafield(
  shopDomain: string,
  accessToken: string,
  productId: number,
  namespace: string,
  key: string,
  value: string,
  type = 'json'
): Promise<void> {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/metafields.json`,
    {
      method: 'POST',
      headers: shopifyHeaders(accessToken),
      body: JSON.stringify({ metafield: { namespace, key, value, type } }),
    }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`metafield ${namespace}.${key} failed ${res.status}: ${body.slice(0, 150)}`)
  }
}

/** Reads a product's SEO metafields (global.title_tag / global.description_tag). */
export async function getProductSeoMeta(
  shopDomain: string,
  accessToken: string,
  productId: number
): Promise<{ titleTag: string | null; descriptionTag: string | null }> {
  try {
    const res = await fetch(
      `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/metafields.json?namespace=global`,
      { headers: shopifyHeaders(accessToken) }
    )
    if (!res.ok) return { titleTag: null, descriptionTag: null }
    const data = (await res.json()) as { metafields?: { key: string; value: string }[] }
    const find = (k: string) => data.metafields?.find((m) => m.key === k)?.value ?? null
    return { titleTag: find('title_tag'), descriptionTag: find('description_tag') }
  } catch {
    return { titleTag: null, descriptionTag: null }
  }
}

export async function getProductWithImages(
  shopDomain: string,
  accessToken: string,
  productId: number
): Promise<ShopifyProduct | null> {
  try {
    const res = await fetch(
      `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}.json?fields=id,title,images`,
      { headers: shopifyHeaders(accessToken) }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { product?: ShopifyProduct }
    return data.product ?? null
  } catch {
    return null
  }
}

export async function updateProductImageAlt(
  shopDomain: string,
  accessToken: string,
  productId: number,
  imageId: number,
  alt: string
): Promise<void> {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/images/${imageId}.json`,
    {
      method: 'PUT',
      headers: shopifyHeaders(accessToken),
      body: JSON.stringify({ image: { id: imageId, alt } }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Shopify PUT image alt ${productId}/${imageId} failed: ${err}`)
  }
}

export async function updateProductMetafields(
  shopDomain: string,
  accessToken: string,
  productId: number,
  seoTitle?: string | null,
  metaDescription?: string | null
): Promise<void> {
  interface Metafield { key: string; value: string; type: string; namespace: string }
  const metafields: Metafield[] = []
  if (seoTitle) {
    metafields.push({ key: 'title_tag', value: seoTitle, type: 'single_line_text_field', namespace: 'global' })
  }
  if (metaDescription) {
    metafields.push({ key: 'description_tag', value: metaDescription, type: 'single_line_text_field', namespace: 'global' })
  }
  if (metafields.length === 0) return

  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}.json`,
    {
      method: 'PUT',
      headers: shopifyHeaders(accessToken),
      // Note: no body_html — only the SEO metafields are updated
      body: JSON.stringify({ product: { id: productId, metafields } }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Shopify PUT metafields ${productId} failed: ${err}`)
  }
}

// ─── Product images (compression / re-upload) ───────────────────────────────────

export interface ShopifyImage {
  id: number
  product_id: number
  position: number
  alt: string | null
  width: number
  height: number
  src: string
  variant_ids: number[]
}

export async function getProductImages(
  shopDomain: string,
  accessToken: string,
  productId: number
): Promise<ShopifyImage[]> {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/images.json`,
    { headers: shopifyHeaders(accessToken) }
  )
  if (!res.ok) return []
  const data = (await res.json()) as { images: ShopifyImage[] }
  return data.images ?? []
}

/** Uploads a new product image from a base64 attachment, preserving alt /
 * position / variant associations. Returns the created image. */
export async function createProductImage(
  shopDomain: string,
  accessToken: string,
  productId: number,
  opts: { attachmentBase64: string; filename: string; alt?: string | null; position?: number; variantIds?: number[] }
): Promise<ShopifyImage> {
  const image: Record<string, unknown> = {
    attachment: opts.attachmentBase64,
    filename: opts.filename,
  }
  if (opts.alt != null) image.alt = opts.alt
  if (opts.position != null) image.position = opts.position
  if (opts.variantIds?.length) image.variant_ids = opts.variantIds

  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/images.json`,
    {
      method: 'POST',
      headers: shopifyHeaders(accessToken),
      body: JSON.stringify({ image }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Shopify POST image for ${productId} failed ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = (await res.json()) as { image: ShopifyImage }
  return data.image
}

export async function deleteProductImage(
  shopDomain: string,
  accessToken: string,
  productId: number,
  imageId: number
): Promise<void> {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/images/${imageId}.json`,
    { method: 'DELETE', headers: shopifyHeaders(accessToken) }
  )
  if (!res.ok && res.status !== 404) {
    const err = await res.text()
    throw new Error(`Shopify DELETE image ${productId}/${imageId} failed ${res.status}: ${err.slice(0, 200)}`)
  }
}

// ─── Blog & articles (SEO content) ──────────────────────────────────────────────

export interface ShopifyBlog {
  id: number
  handle: string
  title: string
}

export interface ShopifyArticle {
  id: number
  blog_id: number
  title: string
  handle: string
  published_at: string | null
  created_at: string
}

export async function getBlogs(shopDomain: string, accessToken: string): Promise<ShopifyBlog[]> {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/blogs.json`,
    { headers: shopifyHeaders(accessToken) }
  )
  if (!res.ok) return []
  const data = (await res.json()) as { blogs: ShopifyBlog[] }
  return data.blogs ?? []
}

/** Returns the first blog, creating a default "Blog" one if none exists. */
export async function getOrCreateBlog(shopDomain: string, accessToken: string): Promise<ShopifyBlog | null> {
  const blogs = await getBlogs(shopDomain, accessToken)
  if (blogs.length > 0) return blogs[0]

  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/blogs.json`,
    {
      method: 'POST',
      headers: shopifyHeaders(accessToken),
      body: JSON.stringify({ blog: { title: 'Blog' } }),
    }
  )
  if (!res.ok) return null
  const data = (await res.json()) as { blog: ShopifyBlog }
  return data.blog
}

export async function listArticles(
  shopDomain: string,
  accessToken: string,
  blogId: number,
  limit = 20
): Promise<ShopifyArticle[]> {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/blogs/${blogId}/articles.json?limit=${limit}&fields=id,blog_id,title,handle,published_at,created_at`,
    { headers: shopifyHeaders(accessToken) }
  )
  if (!res.ok) return []
  const data = (await res.json()) as { articles: ShopifyArticle[] }
  return data.articles ?? []
}

export async function createArticle(
  shopDomain: string,
  accessToken: string,
  blogId: number,
  opts: {
    title: string
    bodyHtml: string
    summaryHtml?: string
    tags?: string
    author?: string
    published?: boolean
    metaDescription?: string | null
  }
): Promise<ShopifyArticle> {
  interface ArticlePayload {
    title: string
    body_html: string
    summary_html?: string
    tags?: string
    author?: string
    published: boolean
    metafields?: Array<{ key: string; value: string; type: string; namespace: string }>
  }
  const article: ArticlePayload = {
    title: opts.title,
    body_html: opts.bodyHtml,
    published: opts.published ?? true,
  }
  if (opts.summaryHtml) article.summary_html = opts.summaryHtml
  if (opts.tags) article.tags = opts.tags
  if (opts.author) article.author = opts.author
  if (opts.metaDescription) {
    article.metafields = [
      { key: 'description_tag', value: opts.metaDescription, type: 'single_line_text_field', namespace: 'global' },
    ]
  }

  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/blogs/${blogId}/articles.json`,
    {
      method: 'POST',
      headers: shopifyHeaders(accessToken),
      body: JSON.stringify({ article }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Shopify POST article failed ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = (await res.json()) as { article: ShopifyArticle }
  return data.article
}

// ─── Pricing & promos (variant price / compare-at) ──────────────────────────────

export async function updateVariantPrice(
  shopDomain: string,
  accessToken: string,
  variantId: number,
  price: string,
  compareAtPrice: string | null
): Promise<void> {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/variants/${variantId}.json`,
    {
      method: 'PUT',
      headers: shopifyHeaders(accessToken),
      body: JSON.stringify({ variant: { id: variantId, price, compare_at_price: compareAtPrice } }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Shopify PUT variant ${variantId} failed ${res.status}: ${err.slice(0, 200)}`)
  }
}

/** Product IDs that sold at least once since `sinceISO` (from order line items). */
export async function getSoldProductIds(
  shopDomain: string,
  accessToken: string,
  sinceISO: string
): Promise<Set<number>> {
  const sold = new Set<number>()
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&created_at_min=${encodeURIComponent(sinceISO)}&limit=250&fields=line_items,created_at`,
    { headers: shopifyHeaders(accessToken) }
  )
  if (!res.ok) return sold
  const data = (await res.json()) as { orders?: { line_items?: { product_id?: number }[] }[] }
  for (const o of data.orders ?? []) {
    for (const li of o.line_items ?? []) {
      if (li.product_id) sold.add(li.product_id)
    }
  }
  return sold
}

// ─── Collections (cross-sell merchandising) ─────────────────────────────────────

export interface ShopifyCollection { id: number; title: string; handle: string }

export async function createCustomCollection(
  shopDomain: string,
  accessToken: string,
  title: string,
  productIds: number[]
): Promise<ShopifyCollection> {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/custom_collections.json`,
    {
      method: 'POST',
      headers: shopifyHeaders(accessToken),
      body: JSON.stringify({
        custom_collection: {
          title,
          collects: productIds.map((id) => ({ product_id: id })),
        },
      }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Shopify POST collection failed ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = (await res.json()) as { custom_collection: ShopifyCollection }
  return data.custom_collection
}
