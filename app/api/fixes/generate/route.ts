import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getThemes, getThemeAssets, getThemeAsset } from '@/lib/shopify'
import { generateFix } from '@/lib/anthropic'
import { classifyRiskGroup } from '@/lib/theme-backup'
import type { Store, Audit, AuditResult, RiskGroup } from '@/types'

function findRelevantFile(category: string, fileKeys: string[]): string | null {
  const patterns: Record<string, string[]> = {
    theme: ['sections/main-product.liquid', 'sections/product-template.liquid', 'templates/product.liquid'],
    product: ['sections/main-product.liquid', 'sections/product-template.liquid'],
    trust: ['sections/main-product.liquid', 'sections/footer.liquid'],
    speed: ['layout/theme.liquid'],
    checkout: ['sections/cart-template.liquid', 'snippets/cart-drawer.liquid'],
  }

  for (const candidate of patterns[category] ?? []) {
    if (fileKeys.includes(candidate)) return candidate
  }

  const fallbacks: Record<string, RegExp> = {
    theme: /sections\/.*product/,
    product: /sections\/.*product|templates\/product/,
    trust: /footer|product/,
    speed: /layout\/theme/,
    checkout: /cart|checkout/,
  }

  return fileKeys.find((k) => fallbacks[category]?.test(k)) ?? null
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json() as { audit_id: string; issue: AuditResult }
  const { audit_id, issue } = body

  if (!audit_id || !issue) {
    return NextResponse.json({ error: 'Missing audit_id or issue' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()

  // ── Classify FIRST — determines whether liquid generation is needed at all ──
  const riskGroup: RiskGroup = classifyRiskGroup(issue.category, issue.title, issue.risk_group)

  // Verify ownership
  const { data: audit } = await supabase
    .from('audits')
    .select('*, stores(*)')
    .eq('id', audit_id)
    .single()

  if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 })

  const typedAudit = audit as Audit & { stores: Store }
  if (typedAudit.stores.user_id !== userId) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const store = typedAudit.stores

  // Check if a fix already exists — but clean up stale Group A fixes with liquid data
  const { data: existing } = await supabase
    .from('fixes')
    .select('*')
    .eq('audit_id', audit_id)
    .eq('title', issue.title)
    .limit(1)
    .single()

  if (existing) {
    if (riskGroup === 'a' && (existing.liquid_before || existing.liquid_after || existing.risk_group !== 'a')) {
      // Stale fix: had liquid data but should be Group A — clear it in place
      const { data: cleaned } = await supabase
        .from('fixes')
        .update({ risk_group: 'a', liquid_before: null, liquid_after: null, file_path: null, theme_id: null })
        .eq('id', existing.id)
        .select()
        .single()
      return NextResponse.json({ fix: cleaned ?? existing })
    }
    return NextResponse.json({ fix: existing })
  }

  // Get theme files (only needed for B/C Liquid fixes)
  const themes = await getThemes(store.shop_domain, store.access_token)
  const mainTheme = themes.find((t) => t.role === 'main') ?? themes[0]

  if (!mainTheme) {
    return NextResponse.json({ error: 'No theme found' }, { status: 404 })
  }

  let liquidBefore: string | null = null
  let liquidAfter: string | null = null
  let relevantFile: string | null = null

  // Group A: no Liquid — descriptions applied via Products API at apply time
  if (riskGroup !== 'a') {
    const assets = await getThemeAssets(store.shop_domain, store.access_token, String(mainTheme.id))
    relevantFile = findRelevantFile(issue.category, assets.map((a) => a.key))
    if (relevantFile) {
      const asset = await getThemeAsset(
        store.shop_domain,
        store.access_token,
        String(mainTheme.id),
        relevantFile
      )
      if (asset?.value) {
        const result = await generateFix(issue, asset.value, relevantFile, riskGroup)
        liquidBefore = result.before
        liquidAfter = result.after
      }
    }
  }

  const { data: fix, error } = await supabase
    .from('fixes')
    .insert({
      audit_id,
      type: issue.category,
      title: issue.title,
      description: issue.description,
      impact_euros: issue.impact_euros,
      status: 'pending',
      liquid_before: liquidBefore,
      liquid_after: liquidAfter,
      file_path: relevantFile,
      theme_id: riskGroup !== 'a' && mainTheme ? String(mainTheme.id) : null,
      risk_group: riskGroup,
      verification_status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to save fix' }, { status: 500 })

  return NextResponse.json({ fix })
}
