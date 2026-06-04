import Anthropic from '@anthropic-ai/sdk'
import type { AuditResult } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export interface StoreDataForAudit {
  shopDomain: string
  themeName: string
  themeFiles: string[]
  productCount: number
  sampleProducts: Array<{
    title: string
    hasDescription: boolean
    imageCount: number
    variantCount: number
    hasCompareAtPrice: boolean
  }>
}

export async function auditStore(storeData: StoreDataForAudit): Promise<AuditResult[]> {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a Shopify conversion rate optimization expert. Analyze this store and identify conversion issues.

Store domain: ${storeData.shopDomain}
Theme: ${storeData.themeName}
Total products: ${storeData.productCount}

Theme files available:
${storeData.themeFiles.slice(0, 30).join('\n')}

Sample products analysis:
${JSON.stringify(storeData.sampleProducts, null, 2)}

Return a JSON array of 6-10 conversion issues. Each issue must follow this exact structure:
{
  "id": "unique-kebab-case-id",
  "category": "theme|product|trust|speed|checkout",
  "title": "Short issue title",
  "description": "2-3 sentence detailed description of the problem",
  "impact_euros": 450,
  "priority": "high|medium|low",
  "fix_available": true,
  "recommendation": "Specific actionable recommendation",
  "risk_group": "a|b|c"
}

risk_group must be:
  "a" = only needs Products API or metafields — NO Liquid file change (e.g. missing description, missing meta SEO)
  "b" = modifies non-critical Liquid sections — trust badge, breadcrumb, urgency indicator, CTA styling
  "c" = HIGH RISK — modifies navigation, checkout flow, main layout, homepage structure

Focus on:
- Missing trust signals (reviews, guarantees, security badges)
- Poor product page UX (missing/weak descriptions, insufficient images, no urgency)
- Checkout friction (missing express checkout, too many steps)
- Mobile optimization issues
- Missing social proof
- No upsell/cross-sell
- Abandoned cart recovery gaps
- Poor CTA placement or copy

Estimate realistic monthly revenue impact in euros. Return ONLY valid JSON array, no markdown.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  return JSON.parse(content.text) as AuditResult[]
}

export async function generateFix(
  issue: AuditResult,
  liquidCode: string,
  filePath: string,
  riskGroup?: string
): Promise<{ before: string | null; after: string | null }> {
  // Group A fixes go via Products API — no Liquid file change needed.
  // Prefer the caller-supplied classified riskGroup over issue.risk_group (Claude's raw value).
  if ((riskGroup ?? issue.risk_group) === 'a') {
    return { before: null, after: null }
  }

  const realAnchors = extractRealAnchors(liquidCode)

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a Shopify Liquid expert. Generate a fix for this conversion issue using anchor-based injection.

Issue: ${issue.title}
Category: ${issue.category}
Description: ${issue.description}
Recommendation: ${issue.recommendation}
File: ${filePath}

VALID ANCHORS — copy one character-for-character (these are extracted from the actual file):
${realAnchors.map((a) => `  ${a}`).join('\n')}

Current Liquid code:
\`\`\`liquid
${liquidCode.slice(0, 3000)}
\`\`\`

Return a JSON object with exactly this structure:
{
  "anchor": "one line from the VALID ANCHORS list above, copied exactly",
  "code": "the new Liquid code to inject immediately after the anchor line"
}

Rules:
- "anchor" MUST be copied verbatim from the VALID ANCHORS list — do NOT invent new anchors
- Prefer {{ product.title }} or {{ product.price | money }} as anchors for visibility-related fixes
- "code" is inserted on a new line directly after the line containing the anchor
- Make minimal, targeted changes that directly address the conversion issue
- Return ONLY valid JSON, no markdown`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  const result = JSON.parse(content.text) as { anchor: string; code: string }

  // Safety check: if Claude ignored the list and invented an anchor that doesn't exist,
  // fall back to the first universal anchor found in the file
  const anchor = liquidCode.includes(result.anchor)
    ? result.anchor
    : realAnchors.find((a) => ANCHOR_FALLBACK_PRIORITY.includes(a)) ?? realAnchors[0] ?? result.anchor

  return { before: anchor, after: result.code }
}

// Priority-ordered fallback anchors.
// Covers Dawn (Shopify default), Debut, Venture, and simple custom themes.
// `extractRealAnchors` filters this list against the actual file at runtime.
export const ANCHOR_FALLBACK_PRIORITY = [
  // Dawn / modern themes — product.title rendered with | escape filter
  '<h1>{{ product.title | escape }}</h1>',
  '{{ product.title | escape }}',
  // Classic / minimal themes — no filter
  '{{ product.title }}',
  // Description block (Dawn uses {%- ... -%} trimming)
  '{%- if product.description != blank -%}',
  '{% if product.description != blank %}',
  '{{ product.description }}',
  // Price — rendered differently per theme; try both
  '{{ product.price | money }}',
  '{{ product.price }}',
  // Schema markers — always present in any .liquid section file
  '{% schema %}',
  '{% endschema %}',
]

export function extractRealAnchors(liquidCode: string): string[] {
  const seen = new Set<string>()
  const results: string[] = []

  const add = (s: string) => {
    const t = s.trim()
    if (t && t.length <= 120 && !seen.has(t)) {
      seen.add(t)
      results.push(t)
    }
  }

  // {{ product.xxx }} and {{ product.xxx | filter }} expressions
  const exprRe = /\{\{-?\s*product\.[a-zA-Z_.|\s\[\]'"(),\-\w]+?\s*-?\}\}/g
  for (const m of liquidCode.matchAll(exprRe)) add(m[0])

  // {% if/unless/form ... %} tags that reference product, cart, or available
  const tagRe = /\{%-?\s*(?:if|unless|form)\s[^%\n]{0,100}-?%\}/g
  for (const m of liquidCode.matchAll(tagRe)) {
    if (/product|available|cart/.test(m[0])) add(m[0])
  }

  // {% schema %} / {% endschema %} — always unique in a section file
  for (const token of ['{% schema %}', '{% endschema %}', '{%- schema -%}', '{%- endschema -%}']) {
    if (liquidCode.includes(token)) add(token)
  }

  // Prioritise: put ANCHOR_FALLBACK_PRIORITY anchors at the front
  const priority = ANCHOR_FALLBACK_PRIORITY.filter((a) => results.includes(a))
  const rest = results.filter((a) => !priority.includes(a))
  return [...priority, ...rest].slice(0, 20)
}

// ─── Product descriptions ─────────────────────────────────────────────────────

export interface ProductDescriptionResult {
  description_html: string
  bullet_points: string[]
  meta_description: string
  seo_title: string | null
}

export interface ProductDataForDescription {
  title: string
  product_type: string
  tags: string
  variants: Array<{ title: string; price: string; option1?: string; option2?: string }>
  image_count: number
}

export async function generateProductDescription(
  product: ProductDataForDescription
): Promise<ProductDescriptionResult> {
  const variantSummary = product.variants
    .slice(0, 6)
    .map((v) => `${v.option1 ?? v.title} — ${parseFloat(v.price).toLocaleString('fr-FR')}€`)
    .join(', ')

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Tu es un expert copywriter e-commerce spécialisé dans les fiches produit haute conversion pour Shopify. Tu écris en français, avec un ton professionnel, bénéfice-first et orienté conversion.

Génère une fiche produit premium pour :
Produit : ${product.title}
Type : ${product.product_type || 'Non spécifié'}
Tags : ${product.tags || 'Aucun'}
Variantes disponibles : ${variantSummary || 'Taille unique'}
Nombre d'images : ${product.image_count}

Retourne UNIQUEMENT un JSON valide avec cette structure exacte :
{
  "description_html": "<p>Description principale 150-200 mots. Commence par le bénéfice ou le désir du client. Évoque ensuite le produit, ses matériaux ou fabrication si pertinent, les cas d'usage concrets, et un détail qui crée de la désirabilité. Zéro cliché marketing générique. HTML propre, une seule balise p.</p>",
  "bullet_points": [
    "Point 1 : commence par un verbe ou adjectif fort, spécifique au produit",
    "Point 2 : avantage concret et mesurable si possible",
    "Point 3 : différenciant ou caractéristique clé",
    "Point 4 : usage ou bénéfice pratique",
    "Point 5 : rassurance ou promesse (livraison, qualité, garantie…)"
  ],
  "meta_description": "155 caractères max — mot-clé principal naturellement intégré, formulation incitative au clic",
  "seo_title": "Titre SEO enrichi en mots-clés si le titre actuel est court ou vague, sinon null"
}

Règles :
- Tout en français
- Description : 150 à 200 mots, bénéfices concrets, zéro cliché
- Bullet points : 5 exactement, commencent par un mot fort
- Meta description : MAXIMUM 155 caractères, compte soigneusement
- seo_title : null si le titre original est déjà bon
- Retourne UNIQUEMENT le JSON, pas de markdown ni d'explication`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  return JSON.parse(content.text) as ProductDescriptionResult
}

export function buildProductHtml(result: ProductDescriptionResult): string {
  const bullets = result.bullet_points.map((bp) => `  <li>✓ ${bp}</li>`).join('\n')
  return `${result.description_html}\n\n<ul>\n${bullets}\n</ul>`
}

// ─── SEO blog articles ──────────────────────────────────────────────────────────

export interface BlogArticleContext {
  shopName: string
  niche: string
  productExamples: string[]
  recentTitles: string[]
}

export interface BlogArticleResult {
  title: string
  body_html: string
  summary: string
  tags: string
  meta_description: string
}

export async function generateBlogArticle(ctx: BlogArticleContext): Promise<BlogArticleResult> {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Tu es un expert SEO et copywriter e-commerce francophone. Tu écris des articles de blog qui attirent du trafic organique qualifié et qui poussent subtilement vers les produits d'une boutique.

Boutique : ${ctx.shopName}
Niche / thématique : ${ctx.niche}
Exemples de produits : ${ctx.productExamples.slice(0, 8).join(', ') || 'Non spécifié'}

Articles déjà publiés (NE PAS répéter ces sujets, choisis un angle frais) :
${ctx.recentTitles.length ? ctx.recentTitles.map((t) => `- ${t}`).join('\n') : '- (aucun)'}

Génère UN article de blog SEO complet, optimisé pour le référencement et la conversion.

Retourne UNIQUEMENT un JSON valide avec cette structure exacte :
{
  "title": "Titre accrocheur et optimisé SEO (50-65 caractères, contient le mot-clé principal)",
  "body_html": "<p>Introduction qui accroche...</p><h2>Sous-titre 1</h2><p>...</p><h2>Sous-titre 2</h2><p>...</p>... Article de 700-900 mots, structuré avec des balises h2/h3, listes <ul> si pertinent. Ton expert mais accessible. Intègre naturellement des mots-clés de la niche. Termine par un paragraphe qui invite à découvrir les produits de la boutique. HTML propre uniquement.",
  "summary": "Extrait de 1-2 phrases pour la prévisualisation (max 160 caractères)",
  "tags": "3 à 5 tags séparés par des virgules, en rapport avec la niche",
  "meta_description": "Meta description SEO de 150-155 caractères max, incitative au clic"
}

Règles :
- Tout en français
- Article réellement utile : conseils concrets, pas de remplissage
- body_html : 700 à 900 mots, HTML propre (h2, h3, p, ul/li uniquement)
- Aucun cliché marketing générique
- Retourne UNIQUEMENT le JSON, pas de markdown ni d'explication`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  return JSON.parse(content.text) as BlogArticleResult
}

// ─── Bundle / cross-sell suggestions ────────────────────────────────────────────

export interface BundleSuggestion {
  title: string
  product_titles: string[]
  reason: string
}

export async function suggestBundles(
  products: { title: string; product_type: string }[]
): Promise<BundleSuggestion[]> {
  const catalogue = products
    .slice(0, 40)
    .map((p) => `- ${p.title}${p.product_type ? ` (${p.product_type})` : ''}`)
    .join('\n')

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Tu es un expert merchandising e-commerce. Voici le catalogue d'une boutique :
${catalogue}

Propose 2 à 4 "packs" de produits complémentaires (achetés naturellement ensemble) pour augmenter le panier moyen.

Retourne UNIQUEMENT un JSON valide :
{
  "bundles": [
    {
      "title": "Nom court et vendeur du pack",
      "product_titles": ["Titre produit exact 1", "Titre produit exact 2"],
      "reason": "Pourquoi ces produits vont ensemble (1 phrase)"
    }
  ]
}

Règles :
- Utilise UNIQUEMENT des titres présents dans le catalogue ci-dessus, à l'identique
- 2 à 3 produits par pack
- Packs réellement complémentaires, pas aléatoires
- Tout en français
- Retourne UNIQUEMENT le JSON`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  const parsed = JSON.parse(content.text) as { bundles: BundleSuggestion[] }
  return parsed.bundles ?? []
}
