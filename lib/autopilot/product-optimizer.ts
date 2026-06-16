import Anthropic from '@anthropic-ai/sdk'
import {
  SHOPIFY_API_VERSION,
  getProductSeoMeta, updateProductMetafields, updateProductImageAlt, setProductMetafield,
} from '@/lib/shopify'
import { logAction } from '@/lib/audit-log'
import type { Store } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const hdr = (token: string) => ({ 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' })

interface ProductImage { id: number; alt: string | null }
interface ShopifyProductFull {
  id: number
  title: string
  body_html: string | null
  product_type: string | null
  tags: string | null
  images: ProductImage[]
  variants: { price: string | null }[]
}

interface OptimizationOutput {
  metaTitle: string
  metaDescription: string
  altTexts: string[]           // un par image, dans l'ordre
  crossSell: string[]          // 3 titres de produits complémentaires
}

export interface OptimizeReport {
  productId: string
  title: string
  changes: string[]
  backup: { titleTag: string | null; descriptionTag: string | null; alts: ProductImage[] }
  output: OptimizationOutput
}

/**
 * Pilote automatique v10 — optimise UN produit (meta SEO + alt texts + cross-sell).
 * RÉVERSIBLE : l'état avant (metafields SEO + alts) est sauvegardé dans le retour
 * et journalisé. Ne touche PAS la description visible (body_html) sur ce premier run.
 */
export async function optimizeProduct(
  store: Store, productId: string | number, supabase: SupabaseClient
): Promise<OptimizeReport> {
  const pid = Number(productId)

  // 1. Récupère le produit complet
  const res = await fetch(
    `https://${store.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/products/${pid}.json?fields=id,title,body_html,product_type,tags,images,variants`,
    { headers: hdr(store.access_token) }
  )
  if (!res.ok) throw new Error(`fetch product ${pid} failed: ${res.status}`)
  const product = ((await res.json()) as { product: ShopifyProductFull }).product
  if (!product) throw new Error('PRODUCT_NOT_FOUND')

  // 2. Autres produits (titres) pour le cross-sell
  const listRes = await fetch(
    `https://${store.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=30&fields=id,title`,
    { headers: hdr(store.access_token) }
  )
  const others = listRes.ok
    ? ((await listRes.json()) as { products: { id: number; title: string }[] }).products
        .filter((p) => p.id !== pid).map((p) => p.title)
    : []

  // 3. Sauvegarde de l'état avant
  const beforeSeo = await getProductSeoMeta(store.shop_domain, store.access_token, pid)
  const beforeAlts = product.images.map((i) => ({ id: i.id, alt: i.alt ?? null }))

  // 4. Génération IA (claude-opus-4-8) — JSON strict, compact
  const plainDesc = (product.body_html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800)
  const price = product.variants?.[0]?.price ?? '?'
  const prompt = `Tu es expert SEO e-commerce français. Optimise ce produit Shopify.

Produit : "${product.title}"
Type : ${product.product_type || '—'} · Prix : ${price}€ · Tags : ${product.tags || '—'}
Description actuelle (extrait) : ${plainDesc || '(vide)'}
Nombre d'images : ${product.images.length}
Autres produits de la boutique (pour cross-sell) : ${others.slice(0, 20).join(', ') || '(aucun)'}

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour :
{
  "metaTitle": "titre Google 50-60 caractères, mot-clé principal en premier",
  "metaDescription": "meta description engageante 150-160 caractères, bénéfice + appel à l'action",
  "altTexts": [${product.images.map(() => '"texte alternatif descriptif et naturel, pas de keyword stuffing"').join(', ')}],
  "crossSell": ["titre produit complémentaire 1", "titre produit 2", "titre produit 3"]
}
La langue est le français. altTexts DOIT avoir exactement ${product.images.length} élément(s).`

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })
  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected AI response')
  const raw = content.text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const out = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? raw) as OptimizationOutput

  // 5. Application (réversible)
  const changes: string[] = []
  if (out.metaTitle || out.metaDescription) {
    await updateProductMetafields(store.shop_domain, store.access_token, pid, out.metaTitle?.slice(0, 70) ?? null, out.metaDescription?.slice(0, 320) ?? null)
    changes.push('Titre & description Google optimisés')
  }
  let altCount = 0
  for (let i = 0; i < product.images.length; i++) {
    const alt = out.altTexts?.[i]
    if (alt && product.images[i]?.id) {
      try { await updateProductImageAlt(store.shop_domain, store.access_token, pid, product.images[i].id, alt.slice(0, 480)); altCount++ } catch { /* best-effort */ }
    }
  }
  if (altCount > 0) changes.push(`${altCount} texte(s) descriptif(s) d'image ajouté(s)`)
  if (Array.isArray(out.crossSell) && out.crossSell.length) {
    try {
      await setProductMetafield(store.shop_domain, store.access_token, pid, 'modify', 'cross_sell', JSON.stringify(out.crossSell.slice(0, 3)), 'json')
      changes.push('Produits complémentaires suggérés')
    } catch { /* best-effort */ }
  }

  const report: OptimizeReport = {
    productId: String(pid),
    title: product.title,
    changes,
    backup: { titleTag: beforeSeo.titleTag, descriptionTag: beforeSeo.descriptionTag, alts: beforeAlts },
    output: out,
  }

  // 6. Journalisation (audit_logs) — visible dans le Pilote automatique
  await logAction(supabase, store.id, 'autopilot_product_optimized',
    { product_id: String(pid), title: product.title, changes, backup: report.backup }, 'success')

  return report
}
