import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getThemes, getThemeAssets, getThemeAsset, updateThemeAsset } from '@/lib/shopify'
import { generateFix } from '@/lib/anthropic'
import type { Store, Audit, AuditResult, Fix } from '@/types'

// GET — list fixes for latest audit
export async function GET() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!store) return NextResponse.json({ fixes: [] })

  const { data: audit } = await supabase
    .from('audits')
    .select('id')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!audit) return NextResponse.json({ fixes: [] })

  const { data: fixes } = await supabase
    .from('fixes')
    .select('*')
    .eq('audit_id', audit.id)
    .order('impact_euros', { ascending: false })

  return NextResponse.json({ fixes: fixes ?? [] })
}

// POST — generate fixes for an audit (generate_only: true) or apply immediately
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json() as { audit_id: string; generate_only?: boolean }
  const { audit_id, generate_only } = body

  const supabase = await createServiceRoleClient()

  // Verify ownership
  const { data: audit } = await supabase
    .from('audits')
    .select('*, stores(*)')
    .eq('id', audit_id)
    .single()

  if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 })

  const auditTyped = audit as Audit & { stores: Store }
  if (auditTyped.stores.user_id !== userId) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const store = auditTyped.stores
  const results: AuditResult[] = auditTyped.results ?? []

  if (results.length === 0) {
    return NextResponse.json({ error: 'No audit results to fix' }, { status: 400 })
  }

  // Get main theme
  const themes = await getThemes(store.shop_domain, store.access_token)
  const mainTheme = themes.find((t) => t.role === 'main') ?? themes[0]
  if (!mainTheme) {
    return NextResponse.json({ error: 'No theme found' }, { status: 404 })
  }

  const assets = await getThemeAssets(store.shop_domain, store.access_token, String(mainTheme.id))

  // Generate fixes for issues that have fix_available
  const fixableIssues = results.filter((r) => r.fix_available).slice(0, 5) // limit to 5

  const fixInserts = await Promise.all(
    fixableIssues.map(async (issue) => {
      // Find a relevant theme file for the issue
      const relevantFile = findRelevantFile(issue.category, assets.map((a) => a.key))

      let liquidBefore: string | null = null
      let liquidAfter: string | null = null

      if (relevantFile) {
        try {
          const asset = await getThemeAsset(
            store.shop_domain,
            store.access_token,
            String(mainTheme.id),
            relevantFile
          )
          if (asset?.value) {
            const fix = await generateFix(issue, asset.value, relevantFile)
            liquidBefore = fix.before
            liquidAfter = fix.after
          }
        } catch (e) {
          console.error('Fix generation failed for', issue.id, e)
        }
      }

      return {
        audit_id,
        type: issue.category,
        title: issue.title,
        description: issue.description,
        impact_euros: issue.impact_euros,
        status: 'pending',
        liquid_before: liquidBefore,
        liquid_after: liquidAfter,
        file_path: relevantFile,
        theme_id: String(mainTheme.id),
      }
    })
  )

  const { data: insertedFixes, error } = await supabase
    .from('fixes')
    .insert(fixInserts)
    .select()

  if (error) {
    return NextResponse.json({ error: 'Failed to save fixes' }, { status: 500 })
  }

  return NextResponse.json({ fixes: insertedFixes, generated: true })
}

// PATCH — apply a specific fix
export async function PATCH(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json() as { fix_id: string }
  const { fix_id } = body

  const supabase = await createServiceRoleClient()

  const { data: fix } = await supabase
    .from('fixes')
    .select('*, audits(*, stores(*))')
    .eq('id', fix_id)
    .single()

  if (!fix) return NextResponse.json({ error: 'Fix not found' }, { status: 404 })

  const typedFix = fix as Fix & { audits: Audit & { stores: Store } }
  const store = typedFix.audits.stores

  if (store.user_id !== userId) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Apply the fix to the theme
  if (typedFix.theme_id && typedFix.file_path && typedFix.liquid_before && typedFix.liquid_after) {
    try {
      const asset = await getThemeAsset(
        store.shop_domain,
        store.access_token,
        typedFix.theme_id,
        typedFix.file_path
      )

      if (asset?.value) {
        const updatedCode = asset.value.replace(typedFix.liquid_before, typedFix.liquid_after)
        await updateThemeAsset(
          store.shop_domain,
          store.access_token,
          typedFix.theme_id,
          typedFix.file_path,
          updatedCode
        )
      }
    } catch (e) {
      console.error('Failed to apply fix to Shopify:', e)
    }
  }

  // Update status
  await supabase.from('fixes').update({ status: 'applied' }).eq('id', fix_id)

  return NextResponse.json({ success: true })
}

function findRelevantFile(category: string, fileKeys: string[]): string | null {
  const patterns: Record<string, string[]> = {
    theme: ['sections/product-template.liquid', 'templates/product.liquid', 'sections/main-product.liquid'],
    product: ['sections/main-product.liquid', 'sections/product-template.liquid', 'templates/product.json'],
    trust: ['sections/footer.liquid', 'snippets/trust-badge.liquid', 'sections/main-product.liquid'],
    speed: ['layout/theme.liquid', 'snippets/head-scripts.liquid'],
    checkout: ['layout/checkout.liquid', 'snippets/cart-drawer.liquid', 'sections/cart-template.liquid'],
  }

  const candidates = patterns[category] ?? []
  for (const candidate of candidates) {
    if (fileKeys.includes(candidate)) return candidate
  }

  // Fallback: find any matching file
  const fallbacks: Record<string, RegExp> = {
    theme: /sections\/.*product/,
    product: /sections\/.*product|templates\/product/,
    trust: /footer|trust/,
    speed: /layout\/theme/,
    checkout: /cart|checkout/,
  }

  const fallback = fallbacks[category]
  if (fallback) {
    return fileKeys.find((k) => fallback.test(k)) ?? null
  }

  return null
}
