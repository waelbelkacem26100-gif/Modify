import crypto from 'crypto'

export const SHOPIFY_API_VERSION = '2025-01'

function shopifyHeaders(accessToken: string): HeadersInit {
  return {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json',
  }
}

export function buildInstallUrl(shop: string, state: string): string {
  const scopes = [
    'read_themes',
    'write_themes',
    'read_products',
    'write_products',
    'read_content',
    'write_content',
    'read_analytics',
    'read_orders',
    'read_script_tags',
    'write_script_tags',
  ].join(',')

  const redirectUri = encodeURIComponent(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/callback`
  )

  return (
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${process.env.SHOPIFY_CLIENT_ID}` +
    `&scope=${scopes}` +
    `&redirect_uri=${redirectUri}` +
    `&state=${state}`
  )
}

export async function exchangeCodeForToken(shop: string, code: string): Promise<string> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      code,
    }),
  })

  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('Failed to obtain access token')
  return data.access_token
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

export async function getShopInfo(shopDomain: string, accessToken: string) {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/shop.json`,
    { headers: shopifyHeaders(accessToken) }
  )
  const data = (await res.json()) as { shop: Record<string, unknown> }
  return data.shop
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
