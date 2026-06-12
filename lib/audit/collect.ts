import { getThemes, getProductsDetailed, SHOPIFY_API_VERSION } from '@/lib/shopify'
import { runPageSpeed } from '@/lib/pagespeed'
import type { Store } from '@/types'
import type { AuditAgentInput, ProductForAudit, PageForAudit, ProblemCategory } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'

/** Strips scripts/styles/svg/comments and collapses whitespace — keeps the
 * meaningful structure (nav, headings, buttons, meta, json-ld markers). */
export function cleanHtml(html: string, cap = 12000): string {
  const cleaned = html
    .replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, (m) =>
      `<!--JSONLD:${m.slice(0, 400).replace(/-->/g, '')}-->`) // keep a marker of structured data
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, '<svg/>')
    .replace(/<!--(?!JSONLD)[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
  return cleaned.slice(0, cap)
}

async function fetchStorefront(url: string, mobile = false): Promise<string | null> {
  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 12_000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': mobile ? MOBILE_UA : DESKTOP_UA, 'Accept-Language': 'fr' },
      redirect: 'follow',
    })
    clearTimeout(t)
    if (!res.ok) return null
    const html = await res.text()
    // Password-protected storefront → useless capture
    if (/\/password/.test(res.url) || /password\s*page/i.test(html.slice(0, 2000))) return null
    return cleanHtml(html)
  } catch {
    return null
  }
}

async function getShopPages(shop: string, token: string): Promise<PageForAudit[]> {
  try {
    const res = await fetch(
      `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/pages.json?limit=50&fields=id,title,handle,body_html`,
      { headers: { 'X-Shopify-Access-Token': token } }
    )
    if (!res.ok) return []
    const data = await res.json() as { pages?: { title: string; handle: string; body_html: string | null }[] }
    return (data.pages ?? []).map((p) => ({
      title: p.title,
      handle: p.handle,
      body_words: (p.body_html ?? '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length,
    }))
  } catch {
    return []
  }
}

/** Revenue of the last 30 days from the conversions table (real Shopify orders). */
async function monthlyRevenue(storeId: string, supabase: SupabaseClient): Promise<number | null> {
  const since = new Date(Date.now() - 30 * 864e5).toISOString().split('T')[0]
  const { data } = await supabase
    .from('conversions').select('revenue').eq('store_id', storeId).gte('date', since)
  if (!data?.length) return null
  const total = data.reduce((s: number, r: { revenue: number }) => s + Number(r.revenue || 0), 0)
  return total > 0 ? Math.round(total) : null
}

/** What each agent actually needs — keeps every step fast (≤60s Vercel). */
const NEEDS: Record<ProblemCategory, { home?: boolean; product?: boolean; cart?: boolean; mobile?: boolean; pages?: boolean; pagespeed?: boolean }> = {
  products: {},
  uiux: { home: true },
  perf_seo: { home: true, product: true, pagespeed: true },
  trust: { home: true, product: true, pages: true },
  funnel: { product: true, cart: true },
  mobile: { mobile: true },
}

/**
 * Collects the REAL store data one agent needs. Called per audit step so each
 * step stays well under the 60s function budget.
 */
export async function collectForCategory(
  store: Store, category: ProblemCategory, supabase: SupabaseClient
): Promise<AuditAgentInput> {
  const needs = NEEDS[category]
  const base = `https://${store.shop_domain}`

  const [themes, rawProducts, revenue] = await Promise.all([
    getThemes(store.shop_domain, store.access_token).catch(() => []),
    getProductsDetailed(store.shop_domain, store.access_token, 50).catch(() => []),
    monthlyRevenue(store.id, supabase),
  ])
  const themeName = (themes.find((t) => t.role === 'main') ?? themes[0])?.name ?? 'Inconnu'

  const products: ProductForAudit[] = rawProducts.map((p) => ({
    id: p.id,
    title: p.title,
    handle: p.handle,
    product_type: p.product_type ?? '',
    price: p.variants?.[0]?.price ?? null,
    compare_at_price: p.variants?.[0]?.compare_at_price ?? null,
    description_words: (p.body_html ?? '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length,
    has_description: Boolean(p.body_html?.trim()),
    image_count: p.images?.length ?? 0,
    images_missing_alt: (p.images ?? []).filter((i) => !i.alt?.trim()).length,
    variant_count: p.variants?.length ?? 0,
    variant_titles: (p.variants ?? []).slice(0, 4).map((v) => v.title ?? '').filter(Boolean),
    tags: p.tags ?? '',
  }))

  const productHandle = products[0]?.handle ?? null
  const productUrl = productHandle ? `${base}/products/${productHandle}` : null

  const [homeHtml, productHtml, cartHtml, homeHtmlMobile, productHtmlMobile, pages, pagespeed] = await Promise.all([
    needs.home ? fetchStorefront(base) : Promise.resolve(null),
    needs.product && productUrl ? fetchStorefront(productUrl) : Promise.resolve(null),
    needs.cart ? fetchStorefront(`${base}/cart`) : Promise.resolve(null),
    needs.mobile ? fetchStorefront(base, true) : Promise.resolve(null),
    needs.mobile && productUrl ? fetchStorefront(productUrl, true) : Promise.resolve(null),
    needs.pages ? getShopPages(store.shop_domain, store.access_token) : Promise.resolve([]),
    needs.pagespeed ? runPageSpeed(base, 'mobile') : Promise.resolve(null),
  ])

  return {
    shopDomain: store.shop_domain,
    shopName: store.shop_name ?? store.shop_domain,
    themeName,
    revenueMonthly: revenue,
    products,
    pages,
    homeHtml,
    productHtml,
    productUrl,
    cartHtml,
    homeHtmlMobile,
    productHtmlMobile,
    pagespeed,
  }
}
