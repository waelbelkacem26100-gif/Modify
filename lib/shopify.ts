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
  images: Array<{ src: string }>
  variants: Array<{ price: string; compare_at_price: string | null }>
  status: string
}
