import { getProductsDetailed, getProductSeoMeta } from '@/lib/shopify'
import type { Store } from '@/types'

export interface SeoProblem {
  id: string
  title: string
  count: number
  impact_euros: number
  severity: 'high' | 'medium' | 'low'
}

export interface SeoAuditResult {
  score: number
  productsAnalyzed: number
  metrics: { metaTitle: number; metaDesc: number; altText: number; description: number }
  problems: SeoProblem[]
}

const SAMPLE = 25

function plainLen(html: string | null | undefined): number {
  return (html ?? '').replace(/<[^>]+>/g, '').trim().length
}

/**
 * Deterministic on-demand SEO audit (no AI): measures coverage of SEO meta
 * titles, Google descriptions (meta description), image alt texts and product
 * descriptions, then returns a /100 score and a jargon-free, €-quantified
 * problems list.
 */
export async function runSeoAudit(store: Store): Promise<SeoAuditResult> {
  const products = await getProductsDetailed(store.shop_domain, store.access_token, 50)
  const sample = products.slice(0, SAMPLE)
  const n = sample.length || 1

  let metaTitleOk = 0, metaDescOk = 0, descOk = 0, imgsTotal = 0, imgsWithAlt = 0
  for (const p of sample) {
    const meta = await getProductSeoMeta(store.shop_domain, store.access_token, p.id)
    if (meta.titleTag && meta.titleTag.length >= 10) metaTitleOk++
    if (meta.descriptionTag && meta.descriptionTag.length >= 50) metaDescOk++
    if (plainLen(p.body_html) >= 120) descOk++
    for (const img of p.images ?? []) { imgsTotal++; if (img.alt && img.alt.trim()) imgsWithAlt++ }
  }

  const pct = (x: number, d: number) => (d ? Math.round((x / d) * 100) : 100)
  const metrics = {
    metaTitle: pct(metaTitleOk, n),
    metaDesc: pct(metaDescOk, n),
    altText: pct(imgsWithAlt, imgsTotal),
    description: pct(descOk, n),
  }
  const score = Math.round(metrics.metaTitle * 0.3 + metrics.metaDesc * 0.3 + metrics.altText * 0.25 + metrics.description * 0.15)

  const missTitle = n - metaTitleOk, missDesc = n - metaDescOk, missAlt = imgsTotal - imgsWithAlt, missBody = n - descOk
  const problems: SeoProblem[] = []
  if (missTitle > 0) problems.push({ id: 'meta-title', title: `${missTitle} produit(s) sans titre optimisé pour Google`, count: missTitle, impact_euros: missTitle * 15, severity: 'high' })
  if (missDesc > 0) problems.push({ id: 'meta-desc', title: `${missDesc} produit(s) sans description Google (le texte qui s’affiche dans les résultats)`, count: missDesc, impact_euros: missDesc * 12, severity: 'high' })
  if (missAlt > 0) problems.push({ id: 'alt', title: `${missAlt} image(s) sans description — invisibles pour Google Images`, count: missAlt, impact_euros: Math.min(missAlt, 60) * 4, severity: 'medium' })
  if (missBody > 0) problems.push({ id: 'description', title: `${missBody} produit(s) avec une fiche trop courte pour bien se référencer`, count: missBody, impact_euros: missBody * 10, severity: 'medium' })
  problems.sort((a, b) => b.impact_euros - a.impact_euros)

  return { score, productsAnalyzed: n, metrics, problems }
}
