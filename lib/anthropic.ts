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
Risk group: ${issue.risk_group}

Current Liquid code:
\`\`\`liquid
${liquidCode.slice(0, 3000)}
\`\`\`

Return a JSON object with exactly this structure:
{
  "anchor": "a unique Liquid tag or expression from the file used as injection point (must appear verbatim in the file)",
  "code": "the new Liquid code to inject immediately after the anchor line"
}

Rules:
- "anchor" must be a complete Liquid expression or tag that appears exactly once in the file (e.g. "{{ product.title }}", "{% endschema %}", "{% if product.available %}")
- "code" is inserted on a new line directly after the line containing the anchor
- Make minimal, targeted changes that directly address the conversion issue
- Return ONLY valid JSON, no markdown`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  const result = JSON.parse(content.text) as { anchor: string; code: string }
  return { before: result.anchor, after: result.code }
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
