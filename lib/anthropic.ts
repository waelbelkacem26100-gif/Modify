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
  "recommendation": "Specific actionable recommendation"
}

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
  filePath: string
): Promise<{ before: string; after: string }> {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a Shopify Liquid expert. Generate a fix for this conversion issue.

Issue: ${issue.title}
Category: ${issue.category}
Description: ${issue.description}
Recommendation: ${issue.recommendation}
File: ${filePath}

Current Liquid code:
\`\`\`liquid
${liquidCode.slice(0, 3000)}
\`\`\`

Return a JSON object with exactly this structure:
{
  "before": "the original code snippet that needs changing (exact excerpt)",
  "after": "the fixed code snippet replacing it"
}

Make minimal, targeted changes. The fix should directly address the conversion issue. Return ONLY valid JSON, no markdown.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  return JSON.parse(content.text) as { before: string; after: string }
}
