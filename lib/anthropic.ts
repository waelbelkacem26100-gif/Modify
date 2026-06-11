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
    max_tokens: 16000,
    messages: [
      {
        role: 'user',
        content: `Tu es l'auditeur de conversion e-commerce le plus rigoureux au monde pour Shopify. Tu réalises un AUDIT PREMIUM APPROFONDI : tu passes en revue PLUS DE 100 POINTS de contrôle de conversion, puis tu listes CHAQUE problème réel détecté.

Boutique : ${storeData.shopDomain}
Thème : ${storeData.themeName}
Nombre de produits : ${storeData.productCount}

Fichiers du thème disponibles :
${storeData.themeFiles.slice(0, 40).join('\n')}

Analyse d'un échantillon de produits :
${JSON.stringify(storeData.sampleProducts, null, 2)}

═══ RÉFÉRENTIEL D'AUDIT (100+ points à évaluer) ═══
Passe en revue ces familles. Pour CHAQUE point réellement problématique, crée une entrée.

1. RÉASSURANCE & CONFIANCE (catégorie "trust") : badges paiement sécurisé, garantie satisfait/remboursé, politique de retour visible, avis clients & notes, témoignages, nombre de ventes/clients, labels qualité, moyens de paiement affichés, mentions légales, page "à propos", coordonnées de contact, réponse aux objections.
2. FICHES PRODUIT (catégorie "product") : descriptions absentes/trop courtes/peu vendeuses, bénéfices vs caractéristiques, nombre et qualité des photos, photos lifestyle, vidéo, zoom, texte alternatif des images (SEO), titres optimisés, variantes claires, guide des tailles, stock affiché, prix barré/promo, livraison estimée, FAQ produit, cross-sell/upsell, produits complémentaires, métadonnées SEO (titre/description Google).
3. URGENCE & RARETÉ (catégorie "trust" ou "product") : stock limité, compte à rebours, offre limitée, "X personnes regardent", ventes récentes.
4. APPARENCE & NAVIGATION (catégorie "theme") : clarté du menu, barre de recherche, fil d'ariane, page d'accueil orientée conversion, bannière de valeur, collections mises en avant, cohérence visuelle, lisibilité mobile, boutons d'appel à l'action visibles et clairs, pied de page utile, popup newsletter, bannière livraison gratuite.
5. TUNNEL D'ACHAT & PANIER (catégorie "checkout") : bouton ajout au panier visible, mini-panier/drawer, paiement express (Shop Pay, Apple/Google Pay), frais de livraison annoncés tôt, code promo, panier abandonné, étapes trop nombreuses, réassurance au checkout.
6. RÉFÉRENCEMENT & CONTENU (catégorie "product" ou "theme") : balises titres, descriptions Google, blog/articles, maillage interne, vitesse perçue.

═══ FORMAT DE SORTIE ═══
Renvoie UNIQUEMENT un tableau JSON valide (aucun markdown). Vise un audit COMPLET : liste TOUS les problèmes réels trouvés (en général 18 à 35 entrées pour une vraie boutique). Chaque entrée :
{
  "id": "identifiant-unique-en-minuscules",
  "category": "theme|product|trust|speed|checkout",
  "title": "Titre court et simple, en français (PAS de jargon technique)",
  "description": "1 à 2 phrases en français simple : le problème et pourquoi il fait perdre des ventes. AUCUN terme technique (pas de LCP, CLS, Liquid, API, etc.).",
  "impact_euros": 450,
  "priority": "high|medium|low",
  "fix_available": true,
  "recommendation": "Action concrète en français simple",
  "risk_group": "a|b|c"
}

RÈGLES :
- N'écris JAMAIS de jargon technique dans title/description/recommendation (interdits : LCP, CLS, TBT, Liquid, API, metafield, JSON-LD…). Parle business et bénéfice client.
- "category" = l'une des 5 valeurs exactes (theme, product, trust, speed, checkout).
- "impact_euros" = estimation mensuelle réaliste du manque à gagner (entier), proportionnée à la taille de la boutique.
- "priority" : "high" = gros impact direct sur les ventes ; "medium" = impact notable ; "low" = amélioration de confort.
- risk_group : "a" = API produits/SEO uniquement (description, texte alternatif, métadonnées) ; "b" = bloc ajouté à une page (badges, avis, urgence, cross-sell) ; "c" = RISQUE ÉLEVÉ (navigation, checkout, structure d'accueil).
- N'invente pas de faux problèmes : si un point est correct, ne le liste pas. Mais sois exhaustif sur les points réellement faibles.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  // Tolerate occasional markdown fences around the JSON array.
  const raw = content.text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  return JSON.parse(raw) as AuditResult[]
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
  // Internal links to weave into the article (title → absolute product URL).
  productLinks?: { title: string; url: string }[]
}

export interface BlogArticleResult {
  title: string
  body_html: string
  summary: string
  tags: string
  meta_description: string
}

export async function generateBlogArticle(ctx: BlogArticleContext): Promise<BlogArticleResult> {
  const links = (ctx.productLinks ?? []).slice(0, 6)
  const linksBlock = links.length
    ? links.map((l) => `- ${l.title} → ${l.url}`).join('\n')
    : '- (aucun lien produit fourni)'

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 8000,
    messages: [
      {
        role: 'user',
        content: `Tu es un expert SEO et copywriter e-commerce francophone. Tu écris des articles de blog LONGS et de QUALITÉ qui attirent du trafic organique qualifié et poussent subtilement vers les produits d'une boutique.

Boutique : ${ctx.shopName}
Niche / thématique : ${ctx.niche}
Exemples de produits : ${ctx.productExamples.slice(0, 8).join(', ') || 'Non spécifié'}

LIENS INTERNES à intégrer naturellement dans l'article (utilise la vraie URL en <a href="...">) :
${linksBlock}

Articles déjà publiés (NE PAS répéter ces sujets, choisis un angle frais) :
${ctx.recentTitles.length ? ctx.recentTitles.map((t) => `- ${t}`).join('\n') : '- (aucun)'}

Génère UN article de blog SEO complet, **de 2000 mots minimum**, optimisé pour le référencement Google ET pour être cité par les IA (ChatGPT, Perplexity) : structure claire, réponses directes, sections bien titrées.

Retourne UNIQUEMENT un JSON valide :
{
  "title": "Titre accrocheur et optimisé SEO (50-65 caractères, contient le mot-clé principal)",
  "body_html": "Article HTML de 2000 mots MINIMUM. Structure : <p>intro qui répond d'emblée à l'intention de recherche</p>, plusieurs <h2> (et <h3> si utile), paragraphes <p>, listes <ul><li>, et 2 à 4 LIENS INTERNES <a href=\\"URL exacte fournie ci-dessus\\">ancre naturelle</a> vers les produits. Termine par une conclusion qui invite à découvrir la boutique. HTML propre uniquement (h2, h3, p, ul, li, a, strong).",
  "summary": "Extrait de 1-2 phrases (max 160 caractères)",
  "tags": "3 à 5 tags séparés par des virgules, en rapport avec la niche",
  "meta_description": "Meta description SEO de 150-155 caractères max, incitative au clic"
}

Règles :
- Tout en français, ton expert mais accessible.
- body_html : **2000 mots minimum**, conseils concrets et utiles (pas de remplissage).
- Intègre 2 à 4 liens internes en utilisant EXACTEMENT les URLs fournies.
- Pour l'optimisation IA (GEO) : réponds clairement aux questions que se poseraient les lecteurs, avec des phrases factuelles et citables.
- Retourne UNIQUEMENT le JSON, pas de markdown.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  const raw = content.text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  return JSON.parse(raw) as BlogArticleResult
}

// ─── GEO: structured product FAQ (for AI citation + FAQ schema) ──────────────────

export interface ProductFaq { question: string; answer: string }

/** Generates 3 concise, factual FAQ entries for a product (used as a metafield
 * the theme can render as FAQPage structured data — boosts AI/Google citations). */
export async function generateProductFaq(p: { title: string; product_type?: string }): Promise<ProductFaq[]> {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Produit : "${p.title}"${p.product_type ? ` (${p.product_type})` : ''}.
Génère 3 questions-réponses fréquentes (FAQ) qu'un acheteur se pose, en français, factuelles et concises (réponse 1-2 phrases). Optimisé pour être cité par les IA.
Retourne UNIQUEMENT un JSON : [{"question":"...","answer":"..."}, ...] (exactement 3). Pas de markdown.`,
      },
    ],
  })
  const content = message.content[0]
  if (content.type !== 'text') return []
  const raw = content.text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  try {
    const arr = JSON.parse(raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1)) as ProductFaq[]
    return arr.filter((f) => f?.question && f?.answer).slice(0, 3)
  } catch {
    return []
  }
}

// ─── Accompaniment agent (premium chatbot) ──────────────────────────────────────

export interface AgentMessage { role: 'user' | 'assistant'; content: string }

/**
 * Premium accompaniment agent: a senior e-commerce advisor that knows everything
 * about the merchant's store (audits, fixes, products, revenue, SEO…) via the
 * `context` snapshot, and answers in simple French with concrete, data-grounded
 * advice. Proactively surfaces high-impact unapplied fixes.
 */
export async function agentChat(context: string, messages: AgentMessage[]): Promise<string> {
  const system = `Tu es l'agent d'accompagnement premium de Modify : un expert e-commerce/Shopify de haut niveau qui conseille personnellement ce marchand.

Tu CONNAIS sa boutique grâce aux données ci-dessous. Réponds toujours :
- en FRANÇAIS simple, chaleureux et direct (pas de jargon technique : pas de "LCP", "Liquid", "metafield"…) ;
- avec des conseils CONCRETS et chiffrés en €, fondés sur les VRAIES données ci-dessous (cite les chiffres réels) ;
- de façon PROACTIVE : si un correctif à fort impact n'est pas encore appliqué, signale-le ("Vous n'avez pas encore appliqué X — ça pourrait vous rapporter €Y/mois") ;
- en expliquant ce que Modify a déjà fait et pourquoi quand c'est pertinent ;
- concis (réponses courtes et actionnables, pas de pavés).

Si une donnée n'est pas dans le contexte, dis-le honnêtement plutôt que d'inventer.

═══ DONNÉES DE LA BOUTIQUE ═══
${context}`

  const res = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1200,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  })
  const block = res.content[0]
  return block && block.type === 'text' ? block.text : ''
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

// ─── Guided accompaniment (what Modify can't fully automate) ─────────────────────

export type GuideType = 'photos' | 'theme_ux' | 'marketing' | 'products'

export interface GuideStep { title: string; detail: string }
export interface GeneratedGuide {
  title: string
  impact_euros: number
  summary: string
  steps: GuideStep[]
}

export interface GuideContext {
  shopName: string
  niche: string
  themeName: string
  productExamples: string[]
  weakPhotoProducts: string[]
  score: number
  recoveredEuros: number
}

const GUIDE_PROMPTS: Record<GuideType, (c: GuideContext) => string> = {
  photos: (c) => `Tu es directeur artistique e-commerce. La boutique "${c.shopName}" (niche : ${c.niche}) a des photos produit faibles sur : ${c.weakPhotoProducts.slice(0, 10).join(', ') || 'plusieurs produits'}.
Génère un BRIEF PHOTO actionnable que le marchand peut exécuter avec un smartphone. Sois concret : prises de vue exactes, fond, lumière, angles, mise en scène, priorités.`,

  theme_ux: (c) => `Tu es expert UX/CRO Shopify. Boutique "${c.shopName}" (niche : ${c.niche}, thème : ${c.themeName}).
Détecte les problèmes UX courants de ce type de thème et donne pour CHAQUE problème le correctif EXACT à copier-coller (CSS ou réglage précis), avec où le coller dans l'éditeur de thème. Le marchand doit pouvoir appliquer sans réfléchir.`,

  marketing: (c) => `Tu es stratège marketing e-commerce. Boutique "${c.shopName}" (niche : ${c.niche}). Score Modify actuel : ${c.score}/100, déjà €${c.recoveredEuros} récupérés. Produits : ${c.productExamples.slice(0, 6).join(', ')}.
Génère un PLAN MARKETING de la semaine, concret et basé sur ces données : actions jour par jour (réseaux sociaux, email, promo, contenu), réalistes pour un solo-entrepreneur.`,

  products: (c) => `Tu es analyste tendances e-commerce. Boutique "${c.shopName}" (niche : ${c.niche}). Catalogue actuel : ${c.productExamples.slice(0, 8).join(', ')}.
Suggère de NOUVEAUX produits à ajouter, alignés sur les tendances de la niche et complémentaires au catalogue. Pour chacun : pourquoi il se vendrait, prix conseillé indicatif.`,
}

export async function generateGuide(type: GuideType, ctx: GuideContext): Promise<GeneratedGuide> {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 3072,
    messages: [
      {
        role: 'user',
        content: `${GUIDE_PROMPTS[type](ctx)}

Retourne UNIQUEMENT un JSON valide avec cette structure exacte :
{
  "title": "Titre court de la mission",
  "impact_euros": 350,
  "summary": "1-2 phrases : le problème et le gain attendu",
  "steps": [
    { "title": "Étape 1 — titre court", "detail": "Instruction concrète et précise, prête à exécuter" },
    { "title": "Étape 2 — ...", "detail": "..." }
  ]
}

Règles :
- Tout en français
- 4 à 7 étapes, chacune réellement actionnable (pas de généralités)
- impact_euros : estimation mensuelle réaliste du gain
- Retourne UNIQUEMENT le JSON`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return JSON.parse(content.text) as GeneratedGuide
}
