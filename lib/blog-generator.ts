import {
  getProductsDetailed,
  getOrCreateBlog,
  listArticles,
  createArticle,
} from '@/lib/shopify'
import { generateBlogArticle } from '@/lib/anthropic'
import { generateIllustration } from '@/lib/blog-illustration'
import { logAction } from '@/lib/audit-log'
import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

// SEO value of one indexed article — transparent estimate surfaced as €/mois.
const EUR_PER_ARTICLE = 40

export interface BlogGenResult {
  created: boolean
  article_id?: number
  title?: string
  url?: string
  estimatedImpactEuros: number
  reason?: string
}

/** Derive a niche string + product examples from the store's catalogue. */
function deriveNiche(products: { title: string; product_type: string; tags: string }[]) {
  const types = new Set<string>()
  const tags = new Set<string>()
  for (const p of products) {
    if (p.product_type) types.add(p.product_type)
    for (const t of (p.tags || '').split(',').map((s) => s.trim()).filter(Boolean)) tags.add(t)
  }
  const niche = [...types, ...tags].slice(0, 12).join(', ') || 'e-commerce généraliste'
  const examples = products.map((p) => p.title).filter(Boolean).slice(0, 8)
  return { niche, examples }
}

/**
 * Generates one SEO blog article and publishes it to the store's blog.
 * Shared by the manual endpoint and the weekly cron.
 */
export async function generateAndPublishArticle(
  store: Store,
  supabase: SupabaseClient
): Promise<BlogGenResult> {
  const blog = await getOrCreateBlog(store.shop_domain, store.access_token)
  if (!blog) {
    return { created: false, estimatedImpactEuros: 0, reason: 'no_blog' }
  }

  const products = await getProductsDetailed(store.shop_domain, store.access_token, 50)
  const { niche, examples } = deriveNiche(products)

  // Internal links the article should weave in (title → product URL).
  const productLinks = products
    .filter((p) => p.handle)
    .slice(0, 6)
    .map((p) => ({ title: p.title, url: `https://${store.shop_domain}/products/${p.handle}` }))

  // Recent titles — both from Shopify and our own records — to avoid repetition
  const existing = await listArticles(store.shop_domain, store.access_token, blog.id, 20)
  const recentTitles = existing.map((a) => a.title)

  const article = await generateBlogArticle({
    shopName: store.shop_name ?? store.shop_domain,
    niche,
    productExamples: examples,
    recentTitles,
    productLinks,
  })

  // Illustration éditoriale gpt-image-1 (1 article = 1 image à la une).
  // JAMAIS bloquante : si la génération échoue, l'article part sans image.
  let illustration: string | null = null
  try {
    const ill = await generateIllustration(article.title, article.summary)
    illustration = ill.b64
    if (ill.b64) {
      await logAction(supabase, store.id, 'blog_illustration_generated',
        { title: article.title, cost_usd: ill.costUsd }, 'success')
    }
  } catch (e) { console.error('[blog] illustration failed (publishing without):', String(e)) }

  const created = await createArticle(store.shop_domain, store.access_token, blog.id, {
    title: article.title,
    bodyHtml: article.body_html,
    summaryHtml: article.summary,
    tags: article.tags,
    author: 'Modify',
    published: true,
    metaDescription: article.meta_description,
    imageAttachmentBase64: illustration,
    imageAlt: article.title,
  })

  const url = `https://${store.shop_domain}/blogs/${blog.handle}/${created.handle}`

  await supabase.from('blog_articles').insert({
    store_id: store.id,
    blog_id: blog.id,
    article_id: created.id,
    title: created.title,
    handle: created.handle,
    url,
    tags: article.tags,
  })

  await logAction(supabase, store.id, 'blog_article_published',
    { article_id: created.id, title: created.title }, 'success')

  return {
    created: true,
    article_id: created.id,
    title: created.title,
    url,
    estimatedImpactEuros: EUR_PER_ARTICLE,
  }
}
