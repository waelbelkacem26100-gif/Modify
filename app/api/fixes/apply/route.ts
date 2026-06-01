import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import {
  getThemes,
  getThemeAssets,
  getThemeAsset,
  updateThemeAsset,
  createBackupTheme,
} from '@/lib/shopify'
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

// POST — generate fixes for an audit
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json() as { audit_id: string }
  const { audit_id } = body

  const supabase = await createServiceRoleClient()

  const { data: audit } = await supabase
    .from('audits')
    .select('*, stores(*)')
    .eq('id', audit_id)
    .single()

  if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 })

  const auditTyped = audit as Audit & { stores: Store }
  if (auditTyped.stores.user_id !== userId) return new NextResponse('Forbidden', { status: 403 })

  const store = auditTyped.stores
  const results: AuditResult[] = auditTyped.results ?? []

  if (results.length === 0) {
    return NextResponse.json({ error: 'No audit results to fix' }, { status: 400 })
  }

  const themes = await getThemes(store.shop_domain, store.access_token)
  const mainTheme = themes.find((t) => t.role === 'main') ?? themes[0]
  if (!mainTheme) return NextResponse.json({ error: 'No theme found' }, { status: 404 })

  const assets = await getThemeAssets(store.shop_domain, store.access_token, String(mainTheme.id))
  const fixableIssues = results.filter((r) => r.fix_available).slice(0, 5)

  const fixInserts = await Promise.all(
    fixableIssues.map(async (issue) => {
      const relevantFile = findRelevantFile(issue.category, assets.map((a) => a.key))
      let liquidBefore: string | null = null
      let liquidAfter: string | null = null
      let originalFileContent: string | null = null

      if (relevantFile) {
        try {
          const asset = await getThemeAsset(
            store.shop_domain, store.access_token, String(mainTheme.id), relevantFile
          )
          if (asset?.value) {
            originalFileContent = asset.value
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
        original_file_content: originalFileContent,
      }
    })
  )

  const { data: insertedFixes, error } = await supabase
    .from('fixes')
    .insert(fixInserts)
    .select()

  if (error) return NextResponse.json({ error: 'Failed to save fixes' }, { status: 500 })

  return NextResponse.json({ fixes: insertedFixes, generated: true })
}

// PATCH — apply a specific fix with backup-before-write
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

  if (store.user_id !== userId) return new NextResponse('Forbidden', { status: 403 })

  if (!typedFix.theme_id || !typedFix.file_path || !typedFix.liquid_before || !typedFix.liquid_after) {
    return NextResponse.json({ error: 'Correctif incomplet — régénérez-le' }, { status: 400 })
  }

  try {
    // 1. Fetch current file from Shopify
    const asset = await getThemeAsset(
      store.shop_domain, store.access_token, typedFix.theme_id, typedFix.file_path
    )

    if (!asset?.value) {
      return NextResponse.json(
        { error: 'Impossible de lire le fichier thème Shopify' },
        { status: 502 }
      )
    }

    // 2. Verify the replace will actually work
    const updatedCode = asset.value.replace(typedFix.liquid_before, typedFix.liquid_after)
    if (updatedCode === asset.value) {
      return NextResponse.json(
        {
          error:
            "Le correctif n'a pas pu être appliqué — le thème a peut-être été modifié depuis la génération. Régénérez le correctif.",
          code: 'REPLACE_NO_MATCH',
        },
        { status: 422 }
      )
    }

    // 3. Create or reuse a backup theme for this audit
    let backupThemeId = typedFix.backup_theme_id

    if (!backupThemeId) {
      // Check if another fix in this audit already has a backup theme
      const { data: existingBackupFix } = await supabase
        .from('fixes')
        .select('backup_theme_id')
        .eq('audit_id', typedFix.audit_id)
        .not('backup_theme_id', 'is', null)
        .limit(1)
        .single()

      backupThemeId = existingBackupFix?.backup_theme_id ?? null
    }

    if (!backupThemeId) {
      // Create a new backup theme
      const backupTheme = await createBackupTheme(store.shop_domain, store.access_token)
      backupThemeId = String(backupTheme.id)
    }

    // 4. Copy the current file to the backup theme before modifying
    await updateThemeAsset(
      store.shop_domain,
      store.access_token,
      backupThemeId,
      typedFix.file_path,
      asset.value
    )

    // 5. Apply the fix to the main theme
    await updateThemeAsset(
      store.shop_domain, store.access_token, typedFix.theme_id, typedFix.file_path, updatedCode
    )

    // 6. Persist backup_theme_id and original_file_content
    await supabase
      .from('fixes')
      .update({
        status: 'applied',
        backup_theme_id: backupThemeId,
        original_file_content: asset.value,
      })
      .eq('id', fix_id)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Failed to apply fix:', e)
    return NextResponse.json(
      { error: "Erreur lors de la communication avec l'API Shopify" },
      { status: 502 }
    )
  }
}

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
