import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getValidAccessToken } from '@/lib/shopify-token'
import { getThemes, getThemeAssets, getProducts } from '@/lib/shopify'
import { auditStore } from '@/lib/anthropic'
import { runPageSpeed, pageSpeedImpactEuros } from '@/lib/pagespeed'
import { snapshotStoreScore } from '@/lib/store-score'
import type { Store, Audit, AuditResult } from '@/types'

export const maxDuration = 300

const STALE_AUDIT_MS = 120_000 // 2 minutes

// GET — fetch latest audit, auto-fail stale ones
export async function GET() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!store) return NextResponse.json({ audit: null })

  const { data: audit } = await supabase
    .from('audits')
    .select('*')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!audit) return NextResponse.json({ audit: null })

  // Auto-fail audits stuck in 'running' for more than 2 minutes
  if (audit.status === 'running') {
    const ageMs = Date.now() - new Date(audit.created_at).getTime()
    if (ageMs > STALE_AUDIT_MS) {
      await supabase
        .from('audits')
        .update({ status: 'failed' })
        .eq('id', audit.id)
      return NextResponse.json({ audit: { ...audit, status: 'failed' }, timedOut: true })
    }
  }

  return NextResponse.json({ audit })
}

// POST — launch new audit
export async function POST() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!store) {
    return NextResponse.json({ error: 'No store connected' }, { status: 404 })
  }

  const typedStore = store as Store
  // Refresh the expiring offline token before the background audit uses it.
  await getValidAccessToken(typedStore, supabase)

  const { data: audit, error: createError } = await supabase
    .from('audits')
    .insert({ store_id: typedStore.id, status: 'running' })
    .select()
    .single()

  if (createError || !audit) {
    return NextResponse.json({ error: 'Failed to create audit' }, { status: 500 })
  }

  const typedAudit = audit as Audit

  runAuditAsync(typedStore, typedAudit.id, supabase).catch(console.error)

  return NextResponse.json({ audit: typedAudit })
}

async function runAuditAsync(
  store: Store,
  auditId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  try {
    const themes = await getThemes(store.shop_domain, store.access_token)
    const mainTheme = themes.find((t) => t.role === 'main') ?? themes[0]

    const assets = mainTheme
      ? await getThemeAssets(store.shop_domain, store.access_token, String(mainTheme.id))
      : []

    const products = await getProducts(store.shop_domain, store.access_token, 20)

    const storeData = {
      shopDomain: store.shop_domain,
      themeName: mainTheme?.name ?? 'Unknown',
      themeFiles: assets.map((a) => a.key),
      productCount: products.length,
      sampleProducts: products.slice(0, 8).map((p) => ({
        title: p.title,
        hasDescription: Boolean(p.body_html && p.body_html.length > 50),
        imageCount: p.images?.length ?? 0,
        variantCount: p.variants?.length ?? 0,
        hasCompareAtPrice: p.variants?.some((v) => v.compare_at_price) ?? false,
      })),
    }

    // Run the AI audit and the real PageSpeed measurement in parallel.
    // PageSpeed is tolerant (returns null on failure) so it never blocks the audit.
    const homepageUrl = `https://${store.shop_domain}`
    const [results, pageSpeed] = await Promise.all([
      auditStore(storeData),
      runPageSpeed(homepageUrl, 'mobile'),
    ])

    // Persist the PageSpeed score for week-by-week tracking + add a real,
    // measured "speed" item to the audit results (replaces Claude's guess).
    if (pageSpeed) {
      await supabase.from('pagespeed_scores').insert({
        store_id: store.id,
        audit_id: auditId,
        strategy: pageSpeed.strategy,
        tested_url: pageSpeed.url,
        score: pageSpeed.score,
        lcp_ms: pageSpeed.lcpMs,
        cls: pageSpeed.cls,
        tbt_ms: pageSpeed.tbtMs,
        fcp_ms: pageSpeed.fcpMs,
        speed_index_ms: pageSpeed.speedIndexMs,
        tti_ms: pageSpeed.ttiMs,
        opportunities: pageSpeed.opportunities,
      })

      // Drop any AI-guessed speed item — we have a measured one now
      const nonSpeed = results.filter((r) => r.category !== 'speed')
      const impact = pageSpeedImpactEuros(pageSpeed.score)
      const measured: AuditResult = {
        id: 'pagespeed-mobile',
        category: 'speed',
        title: `Vitesse mobile : ${pageSpeed.score}/100`,
        description:
          pageSpeed.score >= 90
            ? 'Vos pages se chargent rapidement sur mobile — rien à corriger.'
            : pageSpeed.score >= 50
              ? 'Vos pages mettent un peu trop de temps à s’afficher sur mobile : certains visiteurs partent avant l’achat.'
              : 'Vos pages sont lentes sur mobile : beaucoup de visiteurs abandonnent avant même de voir vos produits.',
        impact_euros: impact,
        priority: pageSpeed.score >= 90 ? 'low' : pageSpeed.score >= 50 ? 'medium' : 'high',
        fix_available: false,
        recommendation:
          pageSpeed.score >= 90
            ? 'Vitesse déjà optimale.'
            : 'Modify allège automatiquement vos images chaque semaine pour accélérer vos pages.',
        risk_group: 'a',
      }
      results.length = 0
      results.push(measured, ...nonSpeed)
    }

    const totalImpact = results.reduce((s, r) => s + r.impact_euros, 0)

    await supabase
      .from('audits')
      .update({ status: 'completed', results, total_impact_euros: totalImpact })
      .eq('id', auditId)

    // Snapshot the global Modify Score so the evolution chart updates right
    // after each scan (tolerant — never fails the audit).
    try {
      await snapshotStoreScore(store, supabase)
    } catch (e) {
      console.error('Score snapshot failed:', e)
    }
  } catch (err) {
    console.error('Audit failed:', err)
    await supabase.from('audits').update({ status: 'failed' }).eq('id', auditId)
  }
}
