import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import {
  getThemes,
  getThemeAssets,
  getThemeAsset,
  updateThemeAsset,
  verifyThemeAsset,
  getProducts,
  updateProductDescription,
} from '@/lib/shopify'
import { generateFix, generateProductDescription, buildProductHtml } from '@/lib/anthropic'
import { getOrCreateSessionBackup, computeRiskGroup } from '@/lib/theme-backup'
import { logAction } from '@/lib/audit-log'
import type { Store, Audit, AuditResult, Fix, RiskGroup } from '@/types'

// ─── GET: list fixes for latest audit ────────────────────────────────────────

export async function GET() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores').select('id').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).single()

  if (!store) return NextResponse.json({ fixes: [] })

  const { data: audit } = await supabase
    .from('audits').select('id').eq('store_id', store.id)
    .order('created_at', { ascending: false }).limit(1).single()

  if (!audit) return NextResponse.json({ fixes: [] })

  const { data: fixes } = await supabase
    .from('fixes').select('*').eq('audit_id', audit.id)
    .order('impact_euros', { ascending: false })

  return NextResponse.json({ fixes: fixes ?? [] })
}

// ─── POST: generate fixes for an audit ───────────────────────────────────────

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json() as { audit_id: string }
  const { audit_id } = body

  const supabase = await createServiceRoleClient()

  const { data: audit } = await supabase
    .from('audits').select('*, stores(*)').eq('id', audit_id).single()

  if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 })

  const auditTyped = audit as Audit & { stores: Store }
  if (auditTyped.stores.user_id !== userId) return new NextResponse('Forbidden', { status: 403 })

  const store = auditTyped.stores
  const results: AuditResult[] = auditTyped.results ?? []

  if (results.length === 0) return NextResponse.json({ error: 'No audit results' }, { status: 400 })

  const themes = await getThemes(store.shop_domain, store.access_token)
  const mainTheme = themes.find((t) => t.role === 'main') ?? themes[0]
  if (!mainTheme) return NextResponse.json({ error: 'No theme found' }, { status: 404 })

  const assets = await getThemeAssets(store.shop_domain, store.access_token, String(mainTheme.id))

  const fixableIssues = results.filter((r) => r.fix_available).slice(0, 5)

  const fixInserts = await Promise.all(
    fixableIssues.map(async (issue) => {
      const riskGroup: RiskGroup = issue.risk_group ?? computeRiskGroup(issue.category)
      let liquidBefore: string | null = null
      let liquidAfter: string | null = null
      let originalFileContent: string | null = null
      let relevantFile: string | null = null

      // Group A: descriptions applied via Products API at apply time — no Liquid needed
      if (riskGroup !== 'a') {
        relevantFile = findRelevantFile(issue.category, assets.map((a) => a.key))
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
        theme_id: riskGroup !== 'a' ? String(mainTheme.id) : null,
        original_file_content: originalFileContent,
        risk_group: riskGroup,
        verification_status: 'pending',
      }
    })
  )

  const { data: insertedFixes, error } = await supabase
    .from('fixes').insert(fixInserts).select()

  if (error) return NextResponse.json({ error: 'Failed to save fixes' }, { status: 500 })

  return NextResponse.json({ fixes: insertedFixes, generated: true })
}

// ─── PATCH: apply a specific fix with full safety system ─────────────────────

export async function PATCH(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const body = await request.json() as { fix_id: string; confirm_high_risk?: boolean }
  const { fix_id, confirm_high_risk = false } = body

  const supabase = await createServiceRoleClient()

  const { data: fix } = await supabase
    .from('fixes').select('*, audits(*, stores(*))').eq('id', fix_id).single()

  if (!fix) return NextResponse.json({ error: 'Fix not found' }, { status: 404 })

  const typedFix = fix as Fix & { audits: Audit & { stores: Store } }
  const store = typedFix.audits.stores

  if (store.user_id !== userId) return new NextResponse('Forbidden', { status: 403 })

  const riskGroup: RiskGroup = typedFix.risk_group ?? computeRiskGroup(typedFix.type)

  // Group C requires explicit confirmation
  if (riskGroup === 'c' && !confirm_high_risk) {
    return NextResponse.json({
      error: 'Ce correctif est classé RISQUE ÉLEVÉ. Confirmez avec confirm_high_risk:true.',
      code: 'HIGH_RISK_CONFIRMATION_REQUIRED',
      risk_group: 'c',
    }, { status: 428 })
  }

  // ── Group A: apply via Products API (no Liquid change) ───────────────────
  if (riskGroup === 'a') {
    try {
      const products = await getProducts(store.shop_domain, store.access_token, 50)
      const productsWithoutDesc = products.filter((p) => !p.body_html?.trim())

      for (const product of productsWithoutDesc.slice(0, 10)) {
        const descResult = await generateProductDescription({
          title: product.title,
          product_type: product.product_type,
          tags: product.tags,
          variants: product.variants,
          image_count: product.images.length,
        })
        const html = buildProductHtml(descResult)
        await updateProductDescription(
          store.shop_domain, store.access_token, product.id, html,
          descResult.seo_title, descResult.meta_description
        )
      }

      await logAction(supabase, store.id, 'product_descriptions_applied',
        { updated: Math.min(productsWithoutDesc.length, 10) }, 'success', fix_id)

      await supabase.from('fixes').update({
        status: 'applied',
        verification_status: 'verified',
      }).eq('id', fix_id)

      return NextResponse.json({ success: true, group: 'a' })
    } catch (e) {
      console.error('Product description fix error:', e)
      await logAction(supabase, store.id, 'product_fix_error', { error: String(e) }, 'failed', fix_id)
      return NextResponse.json({ error: 'Erreur lors de la mise à jour des descriptions produit' }, { status: 502 })
    }
  }

  // ── Group B/C: Liquid anchor-based injection ──────────────────────────────
  if (!typedFix.theme_id || !typedFix.file_path || !typedFix.liquid_before || !typedFix.liquid_after) {
    return NextResponse.json({ error: 'Correctif incomplet — régénérez-le depuis le panel' }, { status: 400 })
  }

  try {
    // ── Step 1: Ensure session backup exists ───────────────────────────────
    const backupThemeId = await getOrCreateSessionBackup(store, supabase)
    await logAction(supabase, store.id, 'session_backup_ready',
      { backup_theme_id: backupThemeId }, 'success', fix_id)

    // ── Step 2: Read current file from main theme ──────────────────────────
    const asset = await getThemeAsset(
      store.shop_domain, store.access_token, typedFix.theme_id, typedFix.file_path
    )

    if (!asset?.value) {
      await logAction(supabase, store.id, 'file_read_failed',
        { file: typedFix.file_path }, 'failed', fix_id)
      return NextResponse.json({ error: 'Impossible de lire le fichier thème Shopify' }, { status: 502 })
    }

    // ── Step 3: Anchor-based injection ────────────────────────────────────
    const updatedCode = applyAnchorInjection(asset.value, typedFix.liquid_before, typedFix.liquid_after)
    if (updatedCode === null) {
      await logAction(supabase, store.id, 'anchor_not_found',
        { file: typedFix.file_path, group: riskGroup }, 'failed', fix_id)
      return NextResponse.json({
        error: "L'ancre d'injection est introuvable dans le fichier. Régénérez le correctif.",
        code: 'ANCHOR_NOT_FOUND',
      }, { status: 422 })
    }

    // ── Step 4: Snapshot to backup theme ──────────────────────────────────
    if (backupThemeId) {
      await updateThemeAsset(
        store.shop_domain, store.access_token, backupThemeId, typedFix.file_path, asset.value
      )
      await logAction(supabase, store.id, 'file_snapshot_saved',
        { file: typedFix.file_path, backup_theme: backupThemeId }, 'success', fix_id)
    }

    // ── Step 5: Apply fix to main theme ────────────────────────────────────
    await updateThemeAsset(
      store.shop_domain, store.access_token, typedFix.theme_id, typedFix.file_path, updatedCode
    )
    await logAction(supabase, store.id, 'fix_applied_to_theme',
      { file: typedFix.file_path, group: riskGroup }, 'success', fix_id)

    // ── Step 6: Post-modification verification ─────────────────────────────
    const verified = await verifyThemeAsset(
      store.shop_domain, store.access_token, typedFix.theme_id, typedFix.file_path,
      typedFix.liquid_after
    )

    if (!verified) {
      await logAction(supabase, store.id, 'verification_failed',
        { file: typedFix.file_path }, 'failed', fix_id)

      await updateThemeAsset(
        store.shop_domain, store.access_token, typedFix.theme_id, typedFix.file_path, asset.value
      )
      await logAction(supabase, store.id, 'auto_rollback_executed',
        { file: typedFix.file_path }, 'warning', fix_id)

      await supabase.from('fixes').update({
        status: 'failed',
        verification_status: 'failed',
      }).eq('id', fix_id)

      return NextResponse.json({
        error: 'La modification a été annulée automatiquement — la vérification post-application a échoué.',
        code: 'VERIFICATION_FAILED',
      }, { status: 422 })
    }

    // ── Step 7: Persist everything ─────────────────────────────────────────
    await supabase.from('fixes').update({
      status: 'applied',
      verification_status: 'verified',
      original_file_content: asset.value,
      backup_theme_id: backupThemeId,
    }).eq('id', fix_id)

    await logAction(supabase, store.id, 'verification_passed',
      { file: typedFix.file_path, group: riskGroup }, 'success', fix_id)

    return NextResponse.json({ success: true, group: riskGroup })

  } catch (e) {
    console.error('Apply fix error:', e)
    await logAction(supabase, store.id, 'apply_error',
      { error: String(e) }, 'failed', fix_id)
    return NextResponse.json({ error: "Erreur de communication avec l'API Shopify" }, { status: 502 })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function applyAnchorInjection(fileContent: string, anchor: string, code: string): string | null {
  const idx = fileContent.indexOf(anchor)
  if (idx === -1) return null
  const lineEnd = fileContent.indexOf('\n', idx + anchor.length)
  const insertAt = lineEnd === -1 ? fileContent.length : lineEnd + 1
  return fileContent.slice(0, insertAt) + code + '\n' + fileContent.slice(insertAt)
}

function findRelevantFile(category: string, fileKeys: string[]): string | null {
  const patterns: Record<string, string[]> = {
    theme: ['sections/main-product.liquid', 'sections/product-template.liquid'],
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
