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

/** Tests réels d'indexation : robots.txt (existe ? bloque tout ?) et sitemap.xml. */
async function checkIndexation(base: string): Promise<{ robotsTxt: { exists: boolean; blocksAll: boolean }; sitemapExists: boolean }> {
  const fetchHead = async (url: string) => {
    try {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 8_000)
      const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': DESKTOP_UA } })
      clearTimeout(t)
      return res.ok ? await res.text() : null
    } catch { return null }
  }
  const [robots, sitemap] = await Promise.all([
    fetchHead(`${base}/robots.txt`),
    fetchHead(`${base}/sitemap.xml`),
  ])
  return {
    robotsTxt: {
      exists: robots != null,
      blocksAll: robots != null && /User-agent:\s*\*\s*[\r\n]+\s*Disallow:\s*\/\s*$/im.test(robots),
    },
    sitemapExists: sitemap != null && sitemap.includes('<'),
  }
}

/** Recherche interne réellement testée via l'endpoint public Shopify suggest.json. */
async function runSearchTests(base: string, products: ProductForAudit[]): Promise<{ query: string; results: number; topTitles: string[] }[]> {
  // Requêtes qu'un vrai client taperait : types de produits + mot significatif d'un titre.
  const queries = new Set<string>()
  for (const p of products) {
    if (p.product_type && queries.size < 2) queries.add(p.product_type.toLowerCase())
  }
  for (const p of products) {
    const word = p.title.split(/\s+/).find((w) => w.length >= 5 && !/^\d/.test(w))
    if (word && queries.size < 4) queries.add(word.toLowerCase())
  }
  const out: { query: string; results: number; topTitles: string[] }[] = []
  for (const q of [...queries].slice(0, 3)) {
    try {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 8_000)
      const res = await fetch(
        `${base}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=5`,
        { signal: controller.signal, headers: { 'User-Agent': DESKTOP_UA } })
      clearTimeout(t)
      if (!res.ok) continue
      const data = await res.json() as { resources?: { results?: { products?: { title: string }[] } } }
      const prods = data.resources?.results?.products ?? []
      out.push({ query: q, results: prods.length, topTitles: prods.slice(0, 3).map((p) => p.title) })
    } catch { /* requête test ratée → on ne l'inclut pas, jamais de donnée inventée */ }
  }
  return out
}

/** Détection DÉTERMINISTE de descriptions quasi identiques (pénalité contenu dupliqué). */
function findDuplicateDescriptions(products: ProductForAudit[]): string[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-zà-ÿ0-9\s]/g, '').split(/\s+/).filter(Boolean).slice(0, 40)
  const pairs: string[] = []
  const withDesc = products.filter((p) => p.description_excerpt.length > 80)
  for (let i = 0; i < withDesc.length && pairs.length < 5; i++) {
    for (let j = i + 1; j < withDesc.length && pairs.length < 5; j++) {
      const a = norm(withDesc[i].description_excerpt), b = new Set(norm(withDesc[j].description_excerpt))
      if (a.length < 15) continue
      const common = a.filter((w) => b.has(w)).length
      if (common / a.length > 0.8) pairs.push(`${withDesc[i].title} ↔ ${withDesc[j].title}`)
    }
  }
  return pairs
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
const NEEDS: Record<ProblemCategory, {
  home?: boolean; product?: boolean; cart?: boolean; collection?: boolean
  mobile?: boolean; pages?: boolean; pagespeed?: boolean
  indexation?: boolean; search?: boolean; duplicates?: boolean
}> = {
  products: {},
  uiux: { home: true, product: true, pages: true, search: true },
  perf_seo: { home: true, product: true, pagespeed: true, indexation: true, duplicates: true },
  trust: { home: true, product: true, pages: true },
  funnel: { home: true, product: true, cart: true, collection: true },
  mobile: { mobile: true },
  competitive: {},
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

  const products: ProductForAudit[] = rawProducts.map((p) => {
    const text = (p.body_html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const words = text.split(/\s+/).filter(Boolean)
    return {
      id: p.id,
      title: p.title,
      handle: p.handle,
      product_type: p.product_type ?? '',
      price: p.variants?.[0]?.price ?? null,
      compare_at_price: p.variants?.[0]?.compare_at_price ?? null,
      description_words: words.length,
      has_description: Boolean(text),
      description_excerpt: words.slice(0, 50).join(' '),
      image_count: p.images?.length ?? 0,
      images_missing_alt: (p.images ?? []).filter((i) => !i.alt?.trim()).length,
      variant_count: p.variants?.length ?? 0,
      variant_titles: (p.variants ?? []).slice(0, 4).map((v) => v.title ?? '').filter(Boolean),
      tags: p.tags ?? '',
    }
  })

  const productHandle = products[0]?.handle ?? null
  const productUrl = productHandle ? `${base}/products/${productHandle}` : null

  // v5 — honnêteté PSI : vitrine protégée ⇒ Lighthouse mesurerait la page de
  // MOT DE PASSE, pas la boutique. On saute la mesure plutôt que de mentir.
  let psiAllowed = false
  if (needs.pagespeed) {
    try {
      const res = await fetch(base, { redirect: 'follow', headers: { 'User-Agent': DESKTOP_UA } })
      psiAllowed = !/\/password/.test(res.url)
    } catch { psiAllowed = false }
  }

  const [homeHtml, productHtml, cartHtml, collectionHtml, homeHtmlMobile, productHtmlMobile, pages, pagespeed, pagespeedProduct, indexation, searchTests] = await Promise.all([
    needs.home ? fetchStorefront(base) : Promise.resolve(null),
    needs.product && productUrl ? fetchStorefront(productUrl) : Promise.resolve(null),
    needs.cart ? fetchStorefront(`${base}/cart`) : Promise.resolve(null),
    needs.collection ? fetchStorefront(`${base}/collections/all`) : Promise.resolve(null),
    needs.mobile ? fetchStorefront(base, true) : Promise.resolve(null),
    needs.mobile && productUrl ? fetchStorefront(productUrl, true) : Promise.resolve(null),
    needs.pages ? getShopPages(store.shop_domain, store.access_token) : Promise.resolve([]),
    needs.pagespeed && psiAllowed ? runPageSpeed(base, 'mobile') : Promise.resolve(null),
    needs.pagespeed && psiAllowed && productUrl ? runPageSpeed(productUrl, 'mobile') : Promise.resolve(null),
    needs.indexation ? checkIndexation(base) : Promise.resolve(null),
    needs.search ? runSearchTests(base, products) : Promise.resolve(null),
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
    collectionHtml,
    homeHtmlMobile,
    productHtmlMobile,
    pagespeed,
    pagespeedProduct,
    robotsTxt: indexation?.robotsTxt ?? null,
    sitemapExists: indexation?.sitemapExists ?? null,
    searchTests,
    duplicateDescriptionPairs: needs.duplicates ? findDuplicateDescriptions(products) : null,
  }
}
