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
  getProduct,
  getProductWithImages,
  updateProductDescription,
  updateProductImageAlt,
  updateProductMetafields,
} from '@/lib/shopify'
import { generateFix, generateProductDescription, buildProductHtml, extractRealAnchors } from '@/lib/anthropic'
import { getOrCreateSessionBackup, classifyRiskGroup } from '@/lib/theme-backup'
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
      const riskGroup: RiskGroup = classifyRiskGroup(issue.category, issue.title, issue.risk_group)
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
              const fix = await generateFix(issue, asset.value, relevantFile, riskGroup)
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

  // ── Debug: log raw DB state before any classification ─────────────────────
  console.log('[PATCH /fixes/apply] fix loaded from DB:', {
    fix_id: typedFix.id,
    risk_group_db: typedFix.risk_group,
    type: typedFix.type,
    title: typedFix.title,
    file_path: typedFix.file_path,
    theme_id: typedFix.theme_id,
    liquid_before: typedFix.liquid_before?.slice(0, 120) ?? null,
    liquid_after: typedFix.liquid_after?.slice(0, 120) ?? null,
  })

  const riskGroup: RiskGroup = classifyRiskGroup(typedFix.type, typedFix.title, typedFix.risk_group)

  console.log('[PATCH /fixes/apply] classifyRiskGroup result:', riskGroup,
    '(db was:', typedFix.risk_group, ')')

  // Group C requires explicit confirmation
  if (riskGroup === 'c' && !confirm_high_risk) {
    return NextResponse.json({
      error: 'Ce correctif est classé RISQUE ÉLEVÉ. Confirmez avec confirm_high_risk:true.',
      code: 'HIGH_RISK_CONFIRMATION_REQUIRED',
      risk_group: 'c',
    }, { status: 428 })
  }

  // ── Group A: apply via Products/Assets API (no anchor injection) ─────────
  if (riskGroup === 'a') {
    return applyGroupA(store, supabase, fix_id, typedFix.type, typedFix.title)
  }

  console.log('[PATCH /fixes/apply] → taking GROUP B/C path (Liquid injection)')

  // ── Fallback: null liquid fields = product description fix slipped through ──
  if (!typedFix.liquid_before || !typedFix.liquid_after) {
    console.log('[PATCH /fixes/apply] Fallback: null liquid fields — routing to Products API')
    return applyGroupA(store, supabase, fix_id, typedFix.type, typedFix.title)
  }

  // ── Group B/C: require file_path (theme_id resolved live below) ─────────
  if (!typedFix.file_path) {
    return NextResponse.json({ error: 'Correctif incomplet — régénérez-le depuis le panel' }, { status: 400 })
  }

  try {
    // ── Step 1a: Resolve the active (main) theme ID live ───────────────────
    // Never trust fix.theme_id from DB — it may point to a deleted theme.
    const themes = await getThemes(store.shop_domain, store.access_token)
    const activeTheme = themes.find((t) => t.role === 'main') ?? themes[0]
    if (!activeTheme) {
      return NextResponse.json({ error: 'Thème principal introuvable sur cette boutique' }, { status: 502 })
    }
    const activeThemeId = String(activeTheme.id)
    console.log('[B/C] Active theme:', activeThemeId, activeTheme.name,
      '| stored theme_id was:', typedFix.theme_id ?? '(null)')

    // ── Step 1b: Ensure session backup exists ──────────────────────────────
    const backupThemeId = await getOrCreateSessionBackup(store, supabase)
    await logAction(supabase, store.id, 'session_backup_ready',
      { backup_theme_id: backupThemeId }, 'success', fix_id)

    // ── Step 2: Read current file from active theme ────────────────────────
    const asset = await getThemeAsset(
      store.shop_domain, store.access_token, activeThemeId, typedFix.file_path
    )

    if (!asset?.value) {
      await logAction(supabase, store.id, 'file_read_failed',
        { file: typedFix.file_path }, 'failed', fix_id)
      return NextResponse.json({ error: 'Impossible de lire le fichier thème Shopify' }, { status: 502 })
    }
    const fileContent: string = asset.value

    // ── Step 3: Anchor-based injection with live-file fallback ───────────
    // NEVER inject around a schema block: matches {% schema %}, {%- schema -%},
    // {% endschema %} and trimmed variants. Injecting there corrupts the JSON
    // settings block and breaks the whole section.
    const isSchemaAnchor = (a: string) => /schema\s*-?%\}/.test(a) || /\{%-?\s*schema/.test(a)

    // If the DB-stored anchor is a schema tag (stale/bad data), don't even try it
    let updatedCode = isSchemaAnchor(typedFix.liquid_before)
      ? null
      : applyAnchorInjection(fileContent, typedFix.liquid_before, typedFix.liquid_after)
    let usedAnchor = typedFix.liquid_before

    if (updatedCode === null) {
      // Primary anchor unusable — extract real anchors from the live file,
      // excluding ALL schema/endschema variants
      const realAnchors = extractRealAnchors(fileContent).filter(
        (a) => a !== typedFix.liquid_before && !isSchemaAnchor(a) && a.length >= 10
      )
      console.log('[B/C] Primary anchor not found:', JSON.stringify(typedFix.liquid_before))
      console.log('[B/C] Real anchors available:', realAnchors.slice(0, 5))

      for (const candidate of realAnchors) {
        const attempt = applyAnchorInjection(fileContent, candidate, typedFix.liquid_after)
        if (attempt !== null && attempt !== fileContent) {
          updatedCode = attempt
          usedAnchor = candidate
          console.log('[B/C] Auto-healed anchor:', JSON.stringify(candidate))
          await logAction(supabase, store.id, 'anchor_auto_healed',
            { file: typedFix.file_path, stale: typedFix.liquid_before, healed: candidate }, 'warning', fix_id)
          // Persist working anchor so next apply succeeds on first try
          await supabase.from('fixes').update({ liquid_before: candidate }).eq('id', fix_id)
          break
        }
      }
    }

    if (updatedCode === null) {
      await logAction(supabase, store.id, 'anchor_not_found',
        { file: typedFix.file_path, group: riskGroup, tried: typedFix.liquid_before }, 'failed', fix_id)
      return NextResponse.json({
        error: `Aucune ancre valide trouvée dans ${typedFix.file_path}. Ancre tentée : "${typedFix.liquid_before}". Régénérez le correctif.`,
        code: 'ANCHOR_NOT_FOUND',
      }, { status: 422 })
    }

    // Idempotency — injected code already present, nothing to write
    if (updatedCode === fileContent) {
      console.log('[B/C] Idempotent — fix already applied, skipping upload')
      await supabase.from('fixes').update({ status: 'applied', verification_status: 'verified' }).eq('id', fix_id)
      return NextResponse.json({ success: true, group: riskGroup, note: 'already_applied' })
    }

    console.log('[B/C] Injecting via anchor:', JSON.stringify(usedAnchor))

    // ── Step 4: Snapshot to backup theme ──────────────────────────────────
    if (backupThemeId) {
      await updateThemeAsset(
        store.shop_domain, store.access_token, backupThemeId, typedFix.file_path, fileContent
      )
      await logAction(supabase, store.id, 'file_snapshot_saved',
        { file: typedFix.file_path, backup_theme: backupThemeId }, 'success', fix_id)
    }

    // ── Step 5: Apply fix to active theme ─────────────────────────────────
    console.log('[PUT] writing to theme:', activeThemeId, '| active:', activeThemeId, '| backup:', backupThemeId)
    await updateThemeAsset(
      store.shop_domain, store.access_token, activeThemeId, typedFix.file_path, updatedCode
    )
    await logAction(supabase, store.id, 'fix_applied_to_theme',
      { file: typedFix.file_path, theme_id: activeThemeId, group: riskGroup }, 'success', fix_id)

    // ── Step 6: Post-modification verification ─────────────────────────────
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const freshAsset = await getThemeAsset(
      store.shop_domain, store.access_token, activeThemeId, typedFix.file_path
    )
    const freshContent = freshAsset?.value ?? ''

    const verified = freshContent.length > 0 && freshContent !== fileContent

    if (!verified) {
      await logAction(supabase, store.id, 'verification_failed',
        { file: typedFix.file_path, reason: freshContent === fileContent ? 'content_unchanged' : 'empty_response' },
        'failed', fix_id)

      await updateThemeAsset(
        store.shop_domain, store.access_token, activeThemeId, typedFix.file_path, fileContent
      )
      await logAction(supabase, store.id, 'auto_rollback_executed',
        { file: typedFix.file_path }, 'warning', fix_id)

      await supabase.from('fixes').update({
        status: 'failed',
        verification_status: 'failed',
      }).eq('id', fix_id)

      return NextResponse.json({
        error: `Rollback automatique exécuté — le fichier ${typedFix.file_path} n'a pas changé après l'écriture Shopify.`,
        code: 'VERIFICATION_FAILED',
      }, { status: 422 })
    }

    // ── Step 7: Persist everything (update theme_id to active) ────────────
    await supabase.from('fixes').update({
      status: 'applied',
      verification_status: 'verified',
      original_file_content: fileContent,
      backup_theme_id: backupThemeId,
      theme_id: activeThemeId,
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

type GroupASubtype = 'description' | 'alt' | 'json-ld' | 'meta'

// Tight, specific phrase matching so Group B/C fixes are never mis-routed here.
// Order matters: alt → json-ld → meta → description (default).
function classifyGroupASubtype(type: string, title: string): GroupASubtype {
  const t = `${type} ${title}`.toLowerCase()
  if (/alt[\s-]?text|alt attribute|texte alternatif|image alt/.test(t)) return 'alt'
  if (/json[\s-]?ld|structured data|données structurées|rich snippet|schema\.org/.test(t)) return 'json-ld'
  if (/meta[\s-]?(title|description|tag)|balise meta|title tag|meta seo/.test(t)) return 'meta'
  return 'description'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function applyGroupA(
  store: Store, supabase: any, fix_id: string, fixType: string, fixTitle: string
): Promise<NextResponse> {
  const subtype = classifyGroupASubtype(fixType, fixTitle)
  console.log('[Group A] subtype:', subtype, '| type:', fixType, '| title:', fixTitle)
  switch (subtype) {
    case 'alt':     return applyGroupAAltText(store, supabase, fix_id)
    case 'json-ld': return applyGroupAJsonLd(store, supabase, fix_id)
    case 'meta':    return applyGroupAMeta(store, supabase, fix_id)
    default:        return applyGroupADescriptions(store, supabase, fix_id)
  }
}

// ── Group A · descriptions (existing behaviour — unchanged) ──────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function applyGroupADescriptions(store: Store, supabase: any, fix_id: string): Promise<NextResponse> {
  const tokenPreview = store.access_token
    ? `${store.access_token.slice(0, 6)}…${store.access_token.slice(-4)}`
    : '(null)'
  console.log('[Group A] shop:', store.shop_domain, '| token:', tokenPreview)

  try {
    const products = await getProducts(store.shop_domain, store.access_token, 50)
    console.log('[Group A] GET products →', products.length, 'total |',
      products.map((p) => `${p.id}:${p.title.slice(0, 20)}(desc:${!!p.body_html?.trim()})`).join(', '))

    const productsWithoutDesc = products.filter((p) => !p.body_html?.trim())
    console.log('[Group A] without description:', productsWithoutDesc.length,
      '| IDs:', productsWithoutDesc.map((p) => p.id).join(', '))

    // All products already described — idempotent success
    if (productsWithoutDesc.length === 0) {
      await supabase.from('fixes').update({ status: 'applied', verification_status: 'verified' }).eq('id', fix_id)
      return NextResponse.json({ success: true, group: 'a', updated: 0, note: 'all_already_described' })
    }

    let updatedCount = 0
    for (const product of productsWithoutDesc.slice(0, 10)) {
      try {
        const descResult = await generateProductDescription({
          title: product.title,
          product_type: product.product_type,
          tags: product.tags,
          variants: product.variants,
          image_count: product.images.length,
        })
        const html = buildProductHtml(descResult)
        console.log('[Group A] PUT /products/', product.id, product.title, '| html length:', html.length)
        await updateProductDescription(
          store.shop_domain, store.access_token, product.id, html,
          descResult.seo_title, descResult.meta_description
        )
        // B3 fix: verify via GET that body_html actually changed
        const verified = await getProduct(store.shop_domain, store.access_token, product.id)
        if (!verified?.body_html?.trim()) {
          console.error('[Group A] ✗ verification failed for', product.id, '— body_html empty after PUT')
          throw new Error(`Verification failed: body_html empty after PUT for product ${product.id}`)
        }
        console.log('[Group A] ✓ verified product', product.id, '— body_html length:', verified.body_html.length)
        updatedCount++
      } catch (perProductErr) {
        console.error('[Group A] ✗ failed product', product.id, product.title, '→', String(perProductErr))
      }
    }

    console.log('[Group A] done —', updatedCount, '/', Math.min(productsWithoutDesc.length, 10), 'updated')

    // B2 fix: fail explicitly when every PUT failed
    if (updatedCount === 0) {
      await logAction(supabase, store.id, 'all_product_updates_failed',
        { total: productsWithoutDesc.length }, 'failed', fix_id)
      await supabase.from('fixes').update({ status: 'failed', verification_status: 'failed' }).eq('id', fix_id)
      return NextResponse.json({
        error: `Aucun produit mis à jour (${productsWithoutDesc.length} tentatives échouées). Vérifiez le scope write_products du token Shopify.`,
        code: 'NO_PRODUCTS_UPDATED',
      }, { status: 502 })
    }

    await logAction(supabase, store.id, 'product_descriptions_applied',
      { updated: updatedCount, total: productsWithoutDesc.length }, 'success', fix_id)
    await supabase.from('fixes').update({ status: 'applied', verification_status: 'verified' }).eq('id', fix_id)
    return NextResponse.json({ success: true, group: 'a', updated: updatedCount })
  } catch (e) {
    console.error('[Group A] fatal error (GET products failed?):', e)
    await logAction(supabase, store.id, 'product_fix_error', { error: String(e) }, 'failed', fix_id)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour des descriptions produit' }, { status: 502 })
  }
}

// ── Group A · image alt text ─────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function applyGroupAAltText(store: Store, supabase: any, fix_id: string): Promise<NextResponse> {
  console.log('[Group A · alt] shop:', store.shop_domain)
  try {
    const products = await getProducts(store.shop_domain, store.access_token, 50)
    let updated = 0
    let scanned = 0

    for (const product of products.slice(0, 25)) {
      // images missing alt text
      const missing = (product.images ?? []).filter((img) => !img.alt?.trim())
      if (missing.length === 0) continue
      scanned += missing.length
      for (const img of missing) {
        try {
          // SEO-correct, deterministic alt text derived from the product title
          await updateProductImageAlt(store.shop_domain, store.access_token, product.id, img.id, product.title)
          updated++
          console.log('[Group A · alt] ✓', product.id, 'image', img.id)
        } catch (perImgErr) {
          console.error('[Group A · alt] ✗', product.id, 'image', img.id, '→', String(perImgErr))
        }
      }
    }

    console.log('[Group A · alt] done —', updated, '/', scanned, 'images updated')

    if (scanned > 0 && updated === 0) {
      await logAction(supabase, store.id, 'alt_text_all_failed', { scanned }, 'failed', fix_id)
      await supabase.from('fixes').update({ status: 'failed', verification_status: 'failed' }).eq('id', fix_id)
      return NextResponse.json({ error: `Aucun alt text appliqué (${scanned} tentatives). Vérifiez write_products.`, code: 'NO_ALT_UPDATED' }, { status: 502 })
    }

    await logAction(supabase, store.id, 'alt_text_applied', { updated, scanned }, 'success', fix_id)
    await supabase.from('fixes').update({ status: 'applied', verification_status: 'verified' }).eq('id', fix_id)
    return NextResponse.json({ success: true, group: 'a', subtype: 'alt', updated })
  } catch (e) {
    console.error('[Group A · alt] fatal:', e)
    await logAction(supabase, store.id, 'alt_text_error', { error: String(e) }, 'failed', fix_id)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour des textes alternatifs' }, { status: 502 })
  }
}

// ── Group A · SEO metafields only (title_tag / description_tag) ──────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function applyGroupAMeta(store: Store, supabase: any, fix_id: string): Promise<NextResponse> {
  console.log('[Group A · meta] shop:', store.shop_domain)
  try {
    const products = await getProducts(store.shop_domain, store.access_token, 50)
    let updated = 0

    for (const product of products.slice(0, 15)) {
      try {
        // Reuse the description generator purely for its seo_title + meta_description
        const seo = await generateProductDescription({
          title: product.title,
          product_type: product.product_type,
          tags: product.tags,
          variants: product.variants,
          image_count: product.images.length,
        })
        await updateProductMetafields(
          store.shop_domain, store.access_token, product.id,
          seo.seo_title ?? product.title, seo.meta_description
        )
        updated++
        console.log('[Group A · meta] ✓', product.id)
      } catch (perErr) {
        console.error('[Group A · meta] ✗', product.id, '→', String(perErr))
      }
    }

    console.log('[Group A · meta] done —', updated, 'products')
    if (updated === 0) {
      await logAction(supabase, store.id, 'meta_all_failed', {}, 'failed', fix_id)
      await supabase.from('fixes').update({ status: 'failed', verification_status: 'failed' }).eq('id', fix_id)
      return NextResponse.json({ error: 'Aucun meta tag appliqué. Vérifiez write_products.', code: 'NO_META_UPDATED' }, { status: 502 })
    }

    await logAction(supabase, store.id, 'meta_tags_applied', { updated }, 'success', fix_id)
    await supabase.from('fixes').update({ status: 'applied', verification_status: 'verified' }).eq('id', fix_id)
    return NextResponse.json({ success: true, group: 'a', subtype: 'meta', updated })
  } catch (e) {
    console.error('[Group A · meta] fatal:', e)
    await logAction(supabase, store.id, 'meta_error', { error: String(e) }, 'failed', fix_id)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour des meta tags' }, { status: 502 })
  }
}

// ── Group A · JSON-LD structured data (theme.liquid injection) ──────────────
const JSONLD_MARKER = 'Modify JSON-LD structured data'
const JSONLD_BLOCK = `  {% comment %} ${JSONLD_MARKER} {% endcomment %}
  {%- if template contains 'product' -%}
    <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": {{ product.title | json }},
        "description": {{ product.description | strip_html | truncatewords: 50 | json }},
        "sku": {{ product.selected_or_first_available_variant.sku | json }},
        "offers": {
          "@type": "Offer",
          "price": {{ product.price | divided_by: 100.0 | json }},
          "priceCurrency": {{ shop.currency | json }},
          "availability": "{% if product.available %}https://schema.org/InStock{% else %}https://schema.org/OutOfStock{% endif %}"
        }
      }
    </script>
  {%- endif -%}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function applyGroupAJsonLd(store: Store, supabase: any, fix_id: string): Promise<NextResponse> {
  console.log('[Group A · json-ld] shop:', store.shop_domain)
  try {
    // Resolve active theme live (never trust stored theme_id)
    const themes = await getThemes(store.shop_domain, store.access_token)
    const activeTheme = themes.find((t) => t.role === 'main') ?? themes[0]
    if (!activeTheme) {
      return NextResponse.json({ error: 'Thème principal introuvable' }, { status: 502 })
    }
    const activeThemeId = String(activeTheme.id)
    const filePath = 'layout/theme.liquid'

    const asset = await getThemeAsset(store.shop_domain, store.access_token, activeThemeId, filePath)
    if (!asset?.value) {
      return NextResponse.json({ error: 'Impossible de lire layout/theme.liquid' }, { status: 502 })
    }
    const fileContent = asset.value

    // Idempotent: already injected
    if (fileContent.includes(JSONLD_MARKER)) {
      await supabase.from('fixes').update({ status: 'applied', verification_status: 'verified', theme_id: activeThemeId }).eq('id', fix_id)
      return NextResponse.json({ success: true, group: 'a', subtype: 'json-ld', note: 'already_applied' })
    }

    // Inject right before </head>
    const headIdx = fileContent.search(/<\/head>/i)
    if (headIdx === -1) {
      await logAction(supabase, store.id, 'jsonld_no_head', { file: filePath }, 'failed', fix_id)
      return NextResponse.json({ error: 'Balise </head> introuvable dans layout/theme.liquid', code: 'NO_HEAD_TAG' }, { status: 422 })
    }
    const updated = fileContent.slice(0, headIdx) + JSONLD_BLOCK + '\n' + fileContent.slice(headIdx)

    // Snapshot original for rollback, then write
    await updateThemeAsset(store.shop_domain, store.access_token, activeThemeId, filePath, updated)

    await new Promise((r) => setTimeout(r, 2000))
    const fresh = await getThemeAsset(store.shop_domain, store.access_token, activeThemeId, filePath)
    if (!fresh?.value || !fresh.value.includes(JSONLD_MARKER)) {
      // rollback
      await updateThemeAsset(store.shop_domain, store.access_token, activeThemeId, filePath, fileContent)
      await logAction(supabase, store.id, 'jsonld_verify_failed', { file: filePath }, 'failed', fix_id)
      return NextResponse.json({ error: 'Vérification JSON-LD échouée — rollback exécuté.', code: 'VERIFICATION_FAILED' }, { status: 422 })
    }

    await logAction(supabase, store.id, 'jsonld_applied', { file: filePath, theme_id: activeThemeId }, 'success', fix_id)
    await supabase.from('fixes').update({
      status: 'applied', verification_status: 'verified',
      file_path: filePath, theme_id: activeThemeId, original_file_content: fileContent,
    }).eq('id', fix_id)
    return NextResponse.json({ success: true, group: 'a', subtype: 'json-ld' })
  } catch (e) {
    console.error('[Group A · json-ld] fatal:', e)
    await logAction(supabase, store.id, 'jsonld_error', { error: String(e) }, 'failed', fix_id)
    return NextResponse.json({ error: 'Erreur lors de l\'injection du JSON-LD' }, { status: 502 })
  }
}

function applyAnchorInjection(fileContent: string, anchor: string, code: string): string | null {
  // Idempotency — if injected code is already present, signal no-op via fileContent
  const trimmed = code.trim()
  if (trimmed.length >= 20 && fileContent.includes(trimmed)) {
    return fileContent
  }

  const idx = fileContent.indexOf(anchor)
  if (idx === -1) {
    // Anchor not present in file — caller must try a fallback
    return null
  }
  const lineEnd = fileContent.indexOf('\n', idx + anchor.length)
  const insertAt = lineEnd === -1 ? fileContent.length : lineEnd + 1
  return fileContent.slice(0, insertAt) + code + '\n' + fileContent.slice(insertAt)
}

function findRelevantFile(category: string, fileKeys: string[]): string | null {
  // B5 fix: sync with generate/route.ts — add templates/product.liquid for theme,
  // remove 'product' (always Group A, never reaches this code path)
  const patterns: Record<string, string[]> = {
    theme:    ['sections/main-product.liquid', 'sections/product-template.liquid', 'templates/product.liquid'],
    trust:    ['sections/main-product.liquid', 'sections/footer.liquid'],
    speed:    ['layout/theme.liquid'],
    checkout: ['sections/cart-template.liquid', 'snippets/cart-drawer.liquid'],
  }

  for (const candidate of patterns[category] ?? []) {
    if (fileKeys.includes(candidate)) return candidate
  }

  const fallbacks: Record<string, RegExp> = {
    theme:    /sections\/.*product/,
    trust:    /footer|product/,
    speed:    /layout\/theme/,
    checkout: /cart|checkout/,
  }

  return fileKeys.find((k) => fallbacks[category]?.test(k)) ?? null
}
