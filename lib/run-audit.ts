import { getThemes, getThemeAssets, getProducts } from '@/lib/shopify'
import { auditStore } from '@/lib/anthropic'
import { runPageSpeed, pageSpeedImpactEuros } from '@/lib/pagespeed'
import { snapshotStoreScore } from '@/lib/store-score'
import type { Store, AuditResult } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

/**
 * Runs the full store audit for an existing audit row (status 'running'):
 * gathers theme + product data, runs the AI 100+ point audit and a real mobile
 * speed measurement, then persists results and snapshots the score. Shared by
 * the manual /api/audit/start flow and the weekly auto-maintenance cron.
 * Always settles the audit row to 'completed' or 'failed'.
 */
export async function runStoreAudit(store: Store, auditId: string, supabase: SupabaseClient): Promise<void> {
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

    const homepageUrl = `https://${store.shop_domain}`
    const [results, pageSpeed] = await Promise.all([
      auditStore(storeData),
      runPageSpeed(homepageUrl, 'mobile'),
    ])

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

      // Replace the AI-guessed speed item with the real measurement (jargon-free).
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

    try { await snapshotStoreScore(store, supabase) } catch (e) { console.error('Score snapshot failed:', e) }
  } catch (err) {
    console.error('Audit failed:', err)
    await supabase.from('audits').update({ status: 'failed' }).eq('id', auditId)
  }
}
